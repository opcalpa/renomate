import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getRoomSuggestions } from "@/services/intakeService";
import type { PlanningStepProps, PlanningWizardRoom } from "./types";

export function RoomsStep({ formData, updateFormData }: PlanningStepProps) {
  const { t } = useTranslation();
  const [customName, setCustomName] = useState("");
  const suggestions = getRoomSuggestions();

  const isSelected = (nameKey: string) => formData.rooms.some((r) => r.nameKey === nameKey);

  const toggleRoom = (nameKey: string) => {
    if (isSelected(nameKey)) {
      updateFormData({ rooms: formData.rooms.filter((r) => r.nameKey !== nameKey) });
    } else {
      const room: PlanningWizardRoom = {
        id: crypto.randomUUID(),
        name: t(`intake.room.${nameKey}`, nameKey),
        nameKey,
        aiSuggested: false,
      };
      updateFormData({ rooms: [...formData.rooms, room] });
    }
  };

  const addCustomRoom = () => {
    if (!customName.trim()) return;
    const room: PlanningWizardRoom = {
      id: crypto.randomUUID(),
      name: customName.trim(),
    };
    updateFormData({ rooms: [...formData.rooms, room] });
    setCustomName("");
  };

  const removeRoom = (id: string) => {
    updateFormData({ rooms: formData.rooms.filter((r) => r.id !== id) });
  };

  const updateRoom = (id: string, updates: Partial<PlanningWizardRoom>) => {
    updateFormData({
      rooms: formData.rooms.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">
          {t("planningWizard.step2Title", "Which rooms are involved?")}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("planningWizard.step2Desc", "Select the rooms that are part of the renovation. Add dimensions for better estimates.")}
        </p>
      </div>

      {/* Room suggestions grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {suggestions.map((s) => {
          const selected = isSelected(s.nameKey);
          const aiSuggested = formData.rooms.find((r) => r.nameKey === s.nameKey)?.aiSuggested;
          return (
            <button
              key={s.nameKey}
              type="button"
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-all hover:border-primary/50",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-muted hover:bg-muted/50"
              )}
              onClick={() => toggleRoom(s.nameKey)}
            >
              <span className="text-xl">{s.icon}</span>
              <span className="text-xs font-medium truncate w-full text-center">
                {t(`intake.room.${s.nameKey}`, s.nameKey)}
              </span>
              {aiSuggested && (
                <Sparkles className="absolute top-1 right-1 h-3 w-3 text-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Add custom room */}
      <div className="flex gap-2">
        <Input
          placeholder={t("planningWizard.customRoom", "Other room...")}
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addCustomRoom(); }}
          className="flex-1"
        />
        <Button variant="outline" size="icon" onClick={addCustomRoom} disabled={!customName.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Selected rooms with optional dimensions */}
      {formData.rooms.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t("planningWizard.selectedRooms", "Selected rooms")} ({formData.rooms.length})
          </p>
          <div className="space-y-2">
            {formData.rooms.map((room) => (
              <div key={room.id} className="flex items-center gap-2 rounded-lg border p-3 bg-background">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    {room.name}
                    {room.aiSuggested && <Sparkles className="h-3 w-3 text-primary" />}
                  </p>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      type="number"
                      placeholder={t("planningWizard.width", "Width (m)")}
                      value={room.width_m ?? ""}
                      onChange={(e) => updateRoom(room.id, { width_m: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="h-7 text-xs w-24"
                      step="0.1"
                      min="0"
                    />
                    <Input
                      type="number"
                      placeholder={t("planningWizard.depth", "Depth (m)")}
                      value={room.depth_m ?? ""}
                      onChange={(e) => updateRoom(room.id, { depth_m: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="h-7 text-xs w-24"
                      step="0.1"
                      min="0"
                    />
                    {room.width_m && room.depth_m && (
                      <span className="text-xs text-muted-foreground self-center tabular-nums">
                        = {(room.width_m * room.depth_m).toFixed(1)} m²
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => removeRoom(room.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
