import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Send, Loader2, CheckCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { DescribeStep } from "./steps/DescribeStep";
import { RoomsStep } from "./steps/RoomsStep";
import { PhotosStep } from "./steps/PhotosStep";
import { ContactSummaryStep } from "./steps/ContactSummaryStep";
import {
  submitIntakeRequest,
  type IntakeRoom,
  type PropertyType,
  type IntakeRequestWithCreator,
} from "@/services/intakeService";

interface IntakeWizardProps {
  intakeRequest: IntakeRequestWithCreator;
  onSubmitted: () => void;
}

interface AIParsedResult {
  rooms: Array<{
    nameKey: string;
    name: string;
    suggestedWorkTypes: string[];
  }>;
  globalWorkTypes: string[];
  summary: string;
}

export interface IntakeFormData {
  // Step 1: Describe
  description: string;
  propertyType: PropertyType | "";
  totalAreaSqm?: number;
  aiParsed: AIParsedResult | null;

  // Step 2: Rooms (with optional dimensions via widthM/depthM on room objects)
  rooms: IntakeRoom[];

  // Step 3: Photos (stored in rooms[].images + attachments)
  attachments: string[];

  // Step 4: Contact + Summary
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  propertyAddress: string;
  propertyPostalCode: string;
  propertyCity: string;
  additionalComments: string;
}

const INITIAL_FORM_DATA: IntakeFormData = {
  description: "",
  propertyType: "",
  totalAreaSqm: undefined,
  aiParsed: null,
  rooms: [],
  attachments: [],
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  propertyAddress: "",
  propertyPostalCode: "",
  propertyCity: "",
  additionalComments: "",
};

const TOTAL_STEPS = 4;

const STEP_TITLES = [
  "intake.describeStepTitle",
  "intake.roomsStepTitle",
  "intake.photosStepTitle",
  "intake.contactStepTitle",
] as const;

export function IntakeWizard({ intakeRequest, onSubmitted }: IntakeWizardProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<IntakeFormData>({
    ...INITIAL_FORM_DATA,
    customerName: intakeRequest.customer_name || "",
    customerEmail: intakeRequest.customer_email || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const updateFormData = useCallback((updates: Partial<IntakeFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 1:
        return formData.description.trim().length > 10;
      case 2:
        return formData.rooms.length > 0;
      case 3:
        return true; // Photos are optional
      case 4:
        return !!(formData.customerName.trim() && formData.customerEmail.trim());
      default:
        return false;
    }
  }, [currentStep, formData]);

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-renovation-description", {
        body: { description: formData.description, language: "sv" },
      });
      if (error) throw error;

      const parsed = data as AIParsedResult;

      // Pre-populate rooms from AI
      const aiRooms: IntakeRoom[] = parsed.rooms.map((r) => ({
        id: crypto.randomUUID(),
        name: r.name,
        description: "",
        work_types: r.suggestedWorkTypes as IntakeRoom["work_types"],
        priority: "medium" as const,
        images: [],
      }));

      updateFormData({
        aiParsed: parsed,
        rooms: aiRooms,
      });
    } catch {
      toast.error(t("intake.analyzeFailed", "Could not analyze. You can continue manually."));
    }
    setAnalyzing(false);
  }, [formData.description, updateFormData, t]);

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS && canProceed()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      // Build project description from free-text + AI summary
      const descriptionParts = [formData.description];
      if (formData.additionalComments.trim()) {
        descriptionParts.push(formData.additionalComments.trim());
      }

      await submitIntakeRequest(intakeRequest.token, {
        customer_name: formData.customerName.trim(),
        customer_email: formData.customerEmail.trim(),
        customer_phone: formData.customerPhone.trim() || undefined,
        property_address: formData.propertyAddress.trim() || "",
        property_postal_code: formData.propertyPostalCode.trim() || undefined,
        property_city: formData.propertyCity.trim() || undefined,
        property_type: formData.propertyType || undefined,
        project_description: descriptionParts.join("\n\n"),
        rooms_data: formData.rooms,
        images: formData.attachments,
      });

      setSubmitted(true);
      onSubmitted();
    } catch (error) {
      console.error("Failed to submit intake request:", error);
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const progressPercent = (currentStep / TOTAL_STEPS) * 100;

  // Show success screen after submission
  if (submitted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-2">{t("intake.submittedTitle")}</h2>
          <p className="text-muted-foreground mb-4">
            {t("intake.submittedDescription", {
              company: intakeRequest.creator.company_name || intakeRequest.creator.name || "oss",
            })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("intake.submittedNote", { email: formData.customerEmail })}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Personal greeting from builder */}
      {intakeRequest.greeting && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm italic text-foreground/80 whitespace-pre-wrap">
              "{intakeRequest.greeting}"
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              — {intakeRequest.creator.name || intakeRequest.creator.company_name}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("intake.stepOf", { current: currentStep, total: TOTAL_STEPS })}
          </span>
          <span>{t(STEP_TITLES[currentStep - 1])}</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="pt-6">
          {currentStep === 1 && (
            <DescribeStep
              formData={formData}
              updateFormData={updateFormData}
              onAnalyze={handleAnalyze}
              analyzing={analyzing}
            />
          )}
          {currentStep === 2 && (
            <RoomsStep formData={formData} updateFormData={updateFormData} token={intakeRequest.token} />
          )}
          {currentStep === 3 && (
            <PhotosStep formData={formData} updateFormData={updateFormData} token={intakeRequest.token} />
          )}
          {currentStep === 4 && (
            <ContactSummaryStep formData={formData} updateFormData={updateFormData} />
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("intake.back")}
        </Button>

        {currentStep < TOTAL_STEPS ? (
          <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
            {t("intake.next")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting || !canProceed()}
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("intake.submitting")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {t("intake.submit")}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
