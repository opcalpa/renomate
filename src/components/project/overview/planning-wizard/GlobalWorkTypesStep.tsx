import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWorkTypes } from "@/services/intakeService";
import type { WorkType } from "@/services/intakeService";
import type { PlanningStepProps } from "./types";

export function GlobalWorkTypesStep({ formData, updateFormData }: PlanningStepProps) {
  const { t } = useTranslation();
  const workTypes = getWorkTypes();
  const aiSuggested = formData.aiParsed?.globalWorkTypes ?? [];

  const isSelected = (wt: WorkType) => formData.globalWorkTypes.includes(wt);

  const toggle = (wt: WorkType) => {
    const next = isSelected(wt)
      ? formData.globalWorkTypes.filter((w) => w !== wt)
      : [...formData.globalWorkTypes, wt];
    updateFormData({ globalWorkTypes: next });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">
          {t("planningWizard.step3Title", "What's done in all rooms?")}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("planningWizard.step3Desc", "Some work is done across most rooms. Select what applies everywhere — room-specific work comes next.")}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {workTypes.map(({ value, label }) => {
          const selected = isSelected(value);
          const isSuggested = aiSuggested.includes(value);
          return (
            <button
              key={value}
              type="button"
              className={cn(
                "relative flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all text-left",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-muted hover:border-primary/30 hover:bg-muted/50"
              )}
              onClick={() => toggle(value)}
            >
              <span className={cn(
                "h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors",
                selected ? "border-primary bg-primary" : "border-muted-foreground/30"
              )}>
                {selected && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span>{t(`intake.workType.${value}`, label)}</span>
              {isSuggested && !selected && (
                <Sparkles className="h-3 w-3 text-primary ml-auto shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {formData.globalWorkTypes.length > 0 && formData.rooms.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("planningWizard.globalSummary", "This creates {{count}} tasks ({{workTypes}} work types × {{rooms}} rooms)", {
            count: formData.globalWorkTypes.length * formData.rooms.length,
            workTypes: formData.globalWorkTypes.length,
            rooms: formData.rooms.length,
          })}
        </p>
      )}
    </div>
  );
}
