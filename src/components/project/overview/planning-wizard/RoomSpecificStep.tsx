import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Sparkles, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { WorkType } from "@/services/intakeService";
import type { PlanningStepProps, RoomSpecificWork } from "./types";

export function RoomSpecificStep({ formData, updateFormData }: PlanningStepProps) {
  const { t } = useTranslation();
  // Room-relevant work types only (excludes malning, el, golv etc that belong in globals)
  const ROOM_WORK_TYPES: Array<{ value: WorkType; labelKey: string }> = [
    { value: "vvs", labelKey: "intake.workType.vvs" },
    { value: "kakel", labelKey: "intake.workType.kakel" },
    { value: "snickeri", labelKey: "intake.workType.snickeri" },
    { value: "rivning", labelKey: "intake.workType.rivning" },
    { value: "kok", labelKey: "intake.workType.kok" },
    { value: "badrum", labelKey: "intake.workType.badrum" },
    { value: "fonster_dorrar", labelKey: "intake.workType.fonster_dorrar" },
    { value: "fasad", labelKey: "intake.workType.fasad" },
    { value: "tak", labelKey: "intake.workType.tak" },
    { value: "tradgard", labelKey: "intake.workType.tradgard" },
  ];
  const [customWorkInputs, setCustomWorkInputs] = useState<Record<string, string>>({});
  const [expandedRoom, setExpandedRoom] = useState<string | null>(
    formData.rooms[0]?.id ?? null
  );

  const getWork = (roomId: string): RoomSpecificWork =>
    formData.roomSpecificWork[roomId] ?? { description: "", workTypes: [], excludedGlobals: [] };

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

  // Filter out global work types to avoid duplication
  const availableWorkTypes = ROOM_WORK_TYPES.filter(
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
                  {/* Free text description — saved to task description */}
                  <div className="pt-3">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                      {t("planningWizard.roomDescription", "Description")}
                    </p>
                    <textarea
                      className="w-full min-h-[70px] px-3 py-2 text-sm rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 leading-relaxed"
                      placeholder={t("planningWizard.roomDescPlaceholder", "e.g. New tiles on floor and walls, replace sink, add heated floor...")}
                      value={work.description}
                      onChange={(e) => updateWork(room.id, { description: e.target.value })}
                    />
                  </div>

                  {/* Room-specific work types */}
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                      {t("planningWizard.roomWorkTypes", "Work types for this room")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {availableWorkTypes.map(({ value, labelKey }) => {
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
                            {t(labelKey)}
                            {aiSuggested && !selected && <Sparkles className="h-2.5 w-2.5" />}
                          </button>
                        );
                      })}
                    </div>
                    {/* Custom work type input */}
                    <div className="flex gap-1.5 mt-2">
                      <Input
                        placeholder={t("planningWizard.customRoomWork", "Other...")}
                        value={customWorkInputs[room.id] ?? ""}
                        onChange={(e) => setCustomWorkInputs((p) => ({ ...p, [room.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = (customWorkInputs[room.id] ?? "").trim();
                            if (!val) return;
                            // Add as "annat" work type with description appended
                            const desc = work.description ? `${work.description}\n${val}` : val;
                            updateWork(room.id, { description: desc });
                            setCustomWorkInputs((p) => ({ ...p, [room.id]: "" }));
                          }
                        }}
                        className="h-7 text-xs flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={!(customWorkInputs[room.id] ?? "").trim()}
                        onClick={() => {
                          const val = (customWorkInputs[room.id] ?? "").trim();
                          if (!val) return;
                          const desc = work.description ? `${work.description}\n${val}` : val;
                          updateWork(room.id, { description: desc });
                          setCustomWorkInputs((p) => ({ ...p, [room.id]: "" }));
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Global work types — clickable to exclude per room */}
                  {formData.globalWorkTypes.length > 0 && (
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">
                        {t("planningWizard.alsoIncludes", "Also includes:")}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {formData.globalWorkTypes.map((wt) => {
                          const excluded = work.excludedGlobals?.includes(wt);
                          return (
                            <button
                              key={wt}
                              type="button"
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-all border",
                                excluded
                                  ? "border-muted text-muted-foreground/40 line-through hover:text-muted-foreground"
                                  : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                              )}
                              onClick={() => {
                                const currentExcluded = work.excludedGlobals ?? [];
                                const next = excluded
                                  ? currentExcluded.filter((w) => w !== wt)
                                  : [...currentExcluded, wt];
                                updateWork(room.id, { excludedGlobals: next });
                              }}
                            >
                              {excluded ? "+" : "✓"} {t(`intake.workType.${wt}`, wt)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
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
