import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, Plus, Trash2, ChevronDown, ChevronUp, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRoomSuggestions } from "@/services/intakeService";
import type { StepProps, WizardRoom } from "./types";

export function RoomsStep({ formData, updateFormData }: StepProps) {
  const { t } = useTranslation();
  const [customRoomDialogOpen, setCustomRoomDialogOpen] = useState(false);
  const [customRoomName, setCustomRoomName] = useState("");
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);

  const roomSuggestions = getRoomSuggestions().map((r) => ({
    ...r,
    name: t(`intake.room.${r.nameKey}`, r.nameKey),
  }));
  const selectedRoomNames = new Set(formData.rooms.map((r) => r.name));

  const handleToggleRoom = (name: string) => {
    if (selectedRoomNames.has(name)) {
      updateFormData({
        rooms: formData.rooms.filter((r) => r.name !== name),
      });
    } else {
      const newRoom: WizardRoom = {
        id: crypto.randomUUID(),
        name,
        ceiling_height_mm: 2400,
      };
      updateFormData({ rooms: [...formData.rooms, newRoom] });
    }
  };

  const handleAddCustomRoom = () => {
    if (!customRoomName.trim()) return;
    const newRoom: WizardRoom = {
      id: crypto.randomUUID(),
      name: customRoomName.trim(),
      ceiling_height_mm: 2400,
    };
    updateFormData({ rooms: [...formData.rooms, newRoom] });
    setCustomRoomName("");
    setCustomRoomDialogOpen(false);
  };

  const handleRemoveRoom = (roomId: string) => {
    updateFormData({
      rooms: formData.rooms.filter((r) => r.id !== roomId),
    });
    if (expandedRoomId === roomId) setExpandedRoomId(null);
  };

  const handleUpdateRoom = (roomId: string, updates: Partial<WizardRoom>) => {
    updateFormData({
      rooms: formData.rooms.map((r) =>
        r.id === roomId ? { ...r, ...updates } : r
      ),
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold">
          {t("guidedSetup.selectRoomsTitle")}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {t("guidedSetup.selectRoomsDesc")}
        </p>
      </div>

      {/* Room suggestions grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {roomSuggestions.map((room) => {
          const isSelected = selectedRoomNames.has(room.name);
          return (
            <button
              key={room.name}
              type="button"
              onClick={() => handleToggleRoom(room.name)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 sm:p-3 rounded-lg border-2 transition-all",
                "hover:border-primary/50 hover:bg-accent/50",
                isSelected ? "border-primary bg-primary/5" : "border-muted"
              )}
            >
              <span className="text-xl sm:text-2xl">{room.icon}</span>
              <span className="text-xs font-medium text-center leading-tight">
                {room.name}
              </span>
              {isSelected && <Check className="h-3 w-3 text-primary" />}
            </button>
          );
        })}

        {/* Add custom room button */}
        <button
          type="button"
          onClick={() => setCustomRoomDialogOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 p-2 sm:p-3 rounded-lg border-2 border-dashed transition-all",
            "hover:border-primary/50 hover:bg-accent/50 border-muted"
          )}
        >
          <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground text-center leading-tight">
            {t("intake.addCustomRoom")}
          </span>
        </button>
      </div>

      {/* Selected rooms with expandable dimension cards */}
      {formData.rooms.length > 0 && (
        <div className="space-y-3 mt-4">
          <Label className="text-sm text-muted-foreground">
            {t("intake.roomsSelected", { count: formData.rooms.length })}
          </Label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {formData.rooms.map((room) => {
              const isExpanded = expandedRoomId === room.id;
              return (
                <div
                  key={room.id}
                  className="rounded-lg border bg-card overflow-hidden"
                >
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-medium text-sm">{room.name}</span>
                      {(room.width_m && room.depth_m) ? (
                        <span className="text-xs text-muted-foreground">
                          {room.width_m} × {room.depth_m} m ({room.area_sqm} m²)
                        </span>
                      ) : room.area_sqm ? (
                        <span className="text-xs text-muted-foreground">
                          {room.area_sqm} m²
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          setExpandedRoomId(isExpanded ? null : room.id)
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveRoom(room.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (() => {
                    const computedArea = (room.width_m && room.depth_m)
                      ? Math.round(room.width_m * room.depth_m * 100) / 100
                      : null;
                    const hasMismatch = computedArea !== null
                      && room.area_sqm !== undefined
                      && Math.abs(room.area_sqm - computedArea) >= 0.01;

                    return (
                      <div className="px-3 pb-3 pt-0 border-t space-y-3">
                        <p className="text-xs text-muted-foreground pt-2">
                          {t("guidedSetup.roomDimensions")}
                        </p>

                        {/* Length × Width → auto Area + Ceiling height — all on one row */}
                        <div className="grid grid-cols-4 gap-2 items-end">
                          <div className="space-y-1">
                            <Label htmlFor={`width-${room.id}`} className="text-xs">
                              {t("rooms.width", "Längd (m)")}
                            </Label>
                            <Input
                              id={`width-${room.id}`}
                              type="number"
                              step="0.1"
                              min="0"
                              value={room.width_m ?? ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                const newArea = (val && room.depth_m) ? Math.round(val * room.depth_m * 100) / 100 : room.area_sqm;
                                handleUpdateRoom(room.id, { width_m: val, area_sqm: newArea });
                              }}
                              placeholder="4"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`depth-${room.id}`} className="text-xs">
                              {t("rooms.depth", "Bredd (m)")}
                            </Label>
                            <Input
                              id={`depth-${room.id}`}
                              type="number"
                              step="0.1"
                              min="0"
                              value={room.depth_m ?? ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                const newArea = (room.width_m && val) ? Math.round(room.width_m * val * 100) / 100 : room.area_sqm;
                                handleUpdateRoom(room.id, { depth_m: val, area_sqm: newArea });
                              }}
                              placeholder="3"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`area-${room.id}`} className="text-xs">
                              {t("guidedSetup.areaSqm")}
                            </Label>
                            <Input
                              id={`area-${room.id}`}
                              type="number"
                              step="0.1"
                              min="0"
                              value={room.area_sqm ?? ""}
                              onChange={(e) =>
                                handleUpdateRoom(room.id, {
                                  area_sqm: e.target.value ? parseFloat(e.target.value) : undefined,
                                })
                              }
                              placeholder="12"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`height-${room.id}`} className="text-xs">
                              {t("guidedSetup.ceilingHeight")}
                            </Label>
                            <Input
                              id={`height-${room.id}`}
                              type="number"
                              step="100"
                              min="1000"
                              max="5000"
                              value={room.ceiling_height_mm}
                              onChange={(e) =>
                                handleUpdateRoom(room.id, {
                                  ceiling_height_mm: e.target.value
                                    ? parseInt(e.target.value, 10)
                                    : 2400,
                              })
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                        {/* Mismatch warning */}
                        {hasMismatch && (
                          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                            <TriangleAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>
                              {t("rooms.areaMismatch", "Ytan stämmer inte med längd × bredd")} ({computedArea} m²).{" "}
                              <button
                                type="button"
                                className="underline font-medium"
                                onClick={() => handleUpdateRoom(room.id, { area_sqm: computedArea! })}
                              >
                                {t("rooms.useComputedArea", "Använd beräknad yta")}
                              </button>
                            </span>
                          </div>
                        )}
                    </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {formData.rooms.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">
          {t("intake.noRoomsSelected")}
        </p>
      )}

      {/* Custom room name dialog */}
      <Dialog open={customRoomDialogOpen} onOpenChange={setCustomRoomDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("intake.addCustomRoom")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customRoomName">{t("intake.customRoomName")}</Label>
              <Input
                id="customRoomName"
                value={customRoomName}
                onChange={(e) => setCustomRoomName(e.target.value)}
                placeholder={t("guidedSetup.customRoomPlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomRoom();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCustomRoomDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleAddCustomRoom}
              disabled={!customRoomName.trim()}
            >
              {t("common.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
