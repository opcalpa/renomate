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
    titleFallback: "Kontaktuppgifter",
    fields: [
      { label: "Namn", required: true },
      { label: "E-post", required: true },
      { label: "Telefon", required: false },
    ],
  },
  {
    icon: Home,
    titleKey: "intake.preview.step2Title",
    titleFallback: "Om fastigheten",
    fields: [
      { label: "Adress", required: true },
      { label: "Postnummer", required: false },
      { label: "Ort", required: false },
      { label: "Typ av bostad (lägenhet, villa, etc.)", required: false },
    ],
  },
  {
    icon: LayoutGrid,
    titleKey: "intake.preview.step3Title",
    titleFallback: "Rum att renovera",
    fields: [
      { label: "Lägg till rum (kök, badrum, sovrum, etc.)", required: true },
      { label: "Beskrivning för varje rum", required: false },
      { label: "Nuvarande skick", required: false },
      { label: "Bilder (valfritt)", required: false },
    ],
  },
  {
    icon: FileText,
    titleKey: "intake.preview.step4Title",
    titleFallback: "Sammanfattning",
    fields: [
      { label: "Övriga kommentarer", required: false },
      { label: "Bifoga filer (ritningar, inspiration, etc.)", required: false },
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
            {t("intake.preview.title", "Förhandsvisning av formuläret")}
          </DialogTitle>
          <DialogDescription>
            {t("intake.preview.description", "Så här ser formuläret ut för din kund.")}
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
                  {t("intake.preview.step", "Steg")} {activeStep + 1} / {PREVIEW_STEPS.length}
                </p>
                <h3 className="font-medium">
                  {t(currentStep.titleKey, currentStep.titleFallback)}
                </h3>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                {t("intake.preview.fieldsAsked", "Fält som efterfrågas:")}
              </p>
              {currentStep.fields.map((field, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm p-2 rounded bg-background"
                >
                  <span className="flex-1">{field.label}</span>
                  {field.required ? (
                    <Badge variant="default" className="text-xs">
                      {t("intake.preview.required", "Obligatoriskt")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {t("intake.preview.optional", "Valfritt")}
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
              {t("intake.preview.prev", "Föregående")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveStep((prev) => Math.min(PREVIEW_STEPS.length - 1, prev + 1))}
              disabled={activeStep === PREVIEW_STEPS.length - 1}
            >
              {t("intake.preview.next", "Nästa")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Info text */}
          <p className="text-xs text-center text-muted-foreground">
            {t(
              "intake.preview.infoText",
              "Formuläret är mobilanpassat och tar ca 3-5 minuter att fylla i."
            )}
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            {t("common.close", "Stäng")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
