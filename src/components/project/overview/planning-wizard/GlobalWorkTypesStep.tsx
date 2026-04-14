import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { WorkType } from "@/services/intakeService";
import type { PlanningStepProps } from "./types";

// Work types that make sense as "done in all rooms"
// Excludes room-specific categories: kok, badrum, fasad, tak, tradgard
const GLOBAL_WORK_TYPES: Array<{ value: WorkType; labelKey: string }> = [
  { value: "malning", labelKey: "intake.workType.malning" },
  { value: "el", labelKey: "intake.workType.el" },
  { value: "golv", labelKey: "intake.workType.golv" },
  { value: "rivning", labelKey: "intake.workType.rivning" },
  { value: "vvs", labelKey: "intake.workType.vvs" },
  { value: "snickeri", labelKey: "intake.workType.snickeri" },
  { value: "kakel", labelKey: "intake.workType.kakel" },
  { value: "fonster_dorrar", labelKey: "intake.workType.fonster_dorrar" },
];

export function GlobalWorkTypesStep({ formData, updateFormData }: PlanningStepProps) {
  const { t } = useTranslation();
  const [customWork, setCustomWork] = useState("");
  const aiSuggested = formData.aiParsed?.globalWorkTypes ?? [];

  // Track custom global work types separately (stored as WorkType "annat" but with custom label)
  const [customGlobals, setCustomGlobals] = useState<string[]>([]);

  const isSelected = (wt: WorkType) => formData.globalWorkTypes.includes(wt);

  const toggle = (wt: WorkType) => {
    const next = isSelected(wt)
      ? formData.globalWorkTypes.filter((w) => w !== wt)
      : [...formData.globalWorkTypes, wt];
    updateFormData({ globalWorkTypes: next });
  };

  const addCustom = () => {
    if (!customWork.trim()) return;
    setCustomGlobals((prev) => [...prev, customWork.trim()]);
    // Store as "annat" work type — the description carries the label
    if (!formData.globalWorkTypes.includes("annat")) {
      updateFormData({ globalWorkTypes: [...formData.globalWorkTypes, "annat"] });
    }
    setCustomWork("");
  };

  const removeCustom = (idx: number) => {
    const next = customGlobals.filter((_, i) => i !== idx);
    setCustomGlobals(next);
    if (next.length === 0 && formData.globalWorkTypes.includes("annat")) {
      updateFormData({ globalWorkTypes: formData.globalWorkTypes.filter((w) => w !== "annat") });
    }
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
        {GLOBAL_WORK_TYPES.map(({ value, labelKey }) => {
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
              <span>{t(labelKey)}</span>
              {isSuggested && !selected && (
                <Sparkles className="h-3 w-3 text-primary ml-auto shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Custom global work types */}
      {customGlobals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {customGlobals.map((name, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-primary bg-primary/10 text-primary"
            >
              {name}
              <button type="button" className="hover:text-primary/70" onClick={() => removeCustom(idx)}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* Add custom */}
      <div className="flex gap-2">
        <Input
          placeholder={t("planningWizard.customGlobalWork", "Other work in all rooms...")}
          value={customWork}
          onChange={(e) => setCustomWork(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          className="flex-1"
        />
        <Button variant="outline" size="icon" onClick={addCustom} disabled={!customWork.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
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
