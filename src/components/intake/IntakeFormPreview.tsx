import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Home,
  LayoutGrid,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";

interface IntakeFormPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PREVIEW_STEPS = [
  {
    icon: User,
    titleKey: "intake.preview.step1Title",
    fields: [
      { labelKey: "intake.preview.fieldName", required: true },
      { labelKey: "intake.preview.fieldEmail", required: true },
      { labelKey: "intake.preview.fieldPhone", required: false },
    ],
  },
  {
    icon: Home,
    titleKey: "intake.preview.step2Title",
    fields: [
      { labelKey: "intake.preview.fieldAddress", required: true },
      { labelKey: "intake.preview.fieldPostalCode", required: false },
      { labelKey: "intake.preview.fieldCity", required: false },
      { labelKey: "intake.preview.fieldPropertyType", required: false },
    ],
  },
  {
    icon: LayoutGrid,
    titleKey: "intake.preview.step3Title",
    fields: [
      { labelKey: "intake.preview.fieldAddRooms", required: true },
      { labelKey: "intake.preview.fieldRoomDesc", required: false },
      { labelKey: "intake.preview.fieldCondition", required: false },
      { labelKey: "intake.preview.fieldImages", required: false },
    ],
  },
  {
    icon: FileText,
    titleKey: "intake.preview.step4Title",
    fields: [
      { labelKey: "intake.preview.fieldComments", required: false },
      { labelKey: "intake.preview.fieldAttachments", required: false },
    ],
  },
];

export function IntakeFormPreview({ open, onOpenChange }: IntakeFormPreviewProps) {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);

  const currentStep = PREVIEW_STEPS[activeStep];
  const Icon = currentStep.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-muted-foreground" />
            {t("intake.preview.title")}
          </DialogTitle>
          <DialogDescription>
            {t("intake.preview.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step indicators */}
          <div className="flex justify-center gap-2">
            {PREVIEW_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <button
                  key={index}
                  onClick={() => setActiveStep(index)}
                  className={`flex items-center justify-center h-10 w-10 rounded-full transition-colors ${
                    activeStep === index
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <StepIcon className="h-5 w-5" />
                </button>
              );
            })}
          </div>

          {/* Step content */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("intake.preview.step")} {activeStep + 1} / {PREVIEW_STEPS.length}
                </p>
                <h3 className="font-medium">
                  {t(currentStep.titleKey)}
                </h3>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                {t("intake.preview.fieldsAsked")}
              </p>
              {currentStep.fields.map((field, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm p-2 rounded bg-background"
                >
                  <span className="flex-1">{t(field.labelKey)}</span>
                  {field.required ? (
                    <Badge variant="default" className="text-xs">
                      {t("intake.preview.required")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {t("intake.preview.optional")}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
              disabled={activeStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t("intake.preview.prev")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveStep((prev) => Math.min(PREVIEW_STEPS.length - 1, prev + 1))}
              disabled={activeStep === PREVIEW_STEPS.length - 1}
            >
              {t("intake.preview.next")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Info text */}
          <p className="text-xs text-center text-muted-foreground">
            {t("intake.preview.infoText")}
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
