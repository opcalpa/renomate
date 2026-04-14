import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWorkTypes } from "@/services/intakeService";
import type { WorkType } from "@/services/intakeService";
import type { PlanningStepProps, RoomSpecificWork } from "./types";

export function RoomSpecificStep({ formData, updateFormData }: PlanningStepProps) {
  const { t } = useTranslation();
  const workTypes = getWorkTypes();
  const [expandedRoom, setExpandedRoom] = useState<string | null>(
    formData.rooms[0]?.id ?? null
  );

  const getWork = (roomId: string): RoomSpecificWork =>
    formData.roomSpecificWork[roomId] ?? { description: "", workTypes: [] };

  const updateWork = (roomId: string, updates: Partial<RoomSpecificWork>) => {
    const current = getWork(roomId);
    updateFormData({
      roomSpecificWork: {
        ...formData.roomSpecificWork,
        [roomId]: { ...current, ...updates },
      },
    });
  };

  const toggleWorkType = (roomId: string, wt: WorkType) => {
    const current = getWork(roomId);
    const next = current.workTypes.includes(wt)
      ? current.workTypes.filter((w) => w !== wt)
      : [...current.workTypes, wt];
    updateWork(roomId, { workTypes: next });
  };

  // Filter out global work types to avoid confusion
  const availableWorkTypes = workTypes.filter(
    ({ value }) => !formData.globalWorkTypes.includes(value)
  );

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">
          {t("planningWizard.step4Title", "Specific work per room")}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("planningWizard.step4Desc", "Describe what's unique to each room. Work types selected in the previous step are already included.")}
        </p>
      </div>

      <div className="space-y-2">
        {formData.rooms.map((room) => {
          const expanded = expandedRoom === room.id;
          const work = getWork(room.id);
          const aiRoom = formData.aiParsed?.rooms.find((r) => r.nameKey === room.nameKey);
          const hasContent = work.description.trim() || work.workTypes.length > 0;

          return (
            <div key={room.id} className="rounded-lg border bg-background overflow-hidden">
              {/* Header */}
              <button
                type="button"
                className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedRoom(expanded ? null : room.id)}
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm font-medium flex-1">{room.name}</span>
                {hasContent && !expanded && (
                  <span className="text-[10px] text-primary font-medium px-1.5 py-0.5 rounded-full bg-primary/10">
                    {work.workTypes.length + (work.description.trim() ? 1 : 0)}
                  </span>
                )}
                {aiRoom && aiRoom.suggestedWorkTypes.length > 0 && (
                  <Sparkles className="h-3 w-3 text-primary shrink-0" />
                )}
              </button>

              {/* Content */}
              {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t">
                  {/* Free text description */}
                  <div className="pt-3">
                    <textarea
                      className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 leading-relaxed"
                      placeholder={t("planningWizard.roomWorkDesc", "Describe what should be done in {{room}}...", { room: room.name })}
                      value={work.description}
                      onChange={(e) => updateWork(room.id, { description: e.target.value })}
                    />
                  </div>

                  {/* Room-specific work types (excluding globals) */}
                  {availableWorkTypes.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                        {t("planningWizard.additionalWork", "Additional work types")}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {availableWorkTypes.map(({ value, label }) => {
                          const selected = work.workTypes.includes(value);
                          const aiSuggested = aiRoom?.suggestedWorkTypes.includes(value);
                          return (
                            <button
                              key={value}
                              type="button"
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all border",
                                selected
                                  ? "border-primary bg-primary/10 text-primary"
                                  : aiSuggested
                                    ? "border-primary/30 text-primary/70 hover:bg-primary/5"
                                    : "border-muted text-muted-foreground hover:border-primary/30"
                              )}
                              onClick={() => toggleWorkType(room.id, value)}
                            >
                              {t(`intake.workType.${value}`, label)}
                              {aiSuggested && !selected && <Sparkles className="h-2.5 w-2.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Show what global work types apply */}
                  {formData.globalWorkTypes.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {t("planningWizard.alsoIncludes", "Also includes:")}{" "}
                      {formData.globalWorkTypes.map((wt) => t(`intake.workType.${wt}`, wt)).join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
