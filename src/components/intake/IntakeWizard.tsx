import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Send, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

import { ContactStep } from "./steps/ContactStep";
import { PropertyStep } from "./steps/PropertyStep";
import { RoomsStep } from "./steps/RoomsStep";
import { SummaryStep } from "./steps/SummaryStep";
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

export interface IntakeFormData {
  // Step 1: Contact
  customerName: string;
  customerEmail: string;
  customerPhone: string;

  // Step 2: Property
  propertyAddress: string;
  propertyPostalCode: string;
  propertyCity: string;
  propertyType: PropertyType | "";

  // Step 3: Rooms
  rooms: IntakeRoom[];

  // Step 4: Summary
  additionalComments: string;
  attachments: string[];
}

const INITIAL_FORM_DATA: IntakeFormData = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  propertyAddress: "",
  propertyPostalCode: "",
  propertyCity: "",
  propertyType: "",
  rooms: [],
  additionalComments: "",
  attachments: [],
};

const TOTAL_STEPS = 4;

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

  const updateFormData = useCallback((updates: Partial<IntakeFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.customerName.trim() && formData.customerEmail.trim());
      case 2:
        return !!formData.propertyAddress.trim();
      case 3:
        return formData.rooms.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  }, [currentStep, formData]);

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
      await submitIntakeRequest(intakeRequest.token, {
        customer_name: formData.customerName.trim(),
        customer_email: formData.customerEmail.trim(),
        customer_phone: formData.customerPhone.trim() || undefined,
        property_address: formData.propertyAddress.trim(),
        property_postal_code: formData.propertyPostalCode.trim() || undefined,
        property_city: formData.propertyCity.trim() || undefined,
        property_type: formData.propertyType || undefined,
        project_description: formData.additionalComments.trim() || undefined,
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
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {t("intake.stepOf", { current: currentStep, total: TOTAL_STEPS })}
          </span>
          <span>
            {currentStep === 1 && t("intake.step1Title")}
            {currentStep === 2 && t("intake.step2Title")}
            {currentStep === 3 && t("intake.step3Title")}
            {currentStep === 4 && t("intake.step4Title")}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="pt-6">
          {currentStep === 1 && (
            <ContactStep formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 2 && (
            <PropertyStep formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 3 && (
            <RoomsStep formData={formData} updateFormData={updateFormData} token={intakeRequest.token} />
          )}
          {currentStep === 4 && (
            <SummaryStep formData={formData} updateFormData={updateFormData} token={intakeRequest.token} />
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
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
