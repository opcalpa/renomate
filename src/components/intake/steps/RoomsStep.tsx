import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, Trash2, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntakeFormData } from "../IntakeWizard";
import {
  getRoomSuggestions,
  getWorkTypes,
  type IntakeRoom,
  type WorkType,
} from "@/services/intakeService";

interface RoomsStepProps {
  formData: IntakeFormData;
  updateFormData: (updates: Partial<IntakeFormData>) => void;
  token: string;
}

export function RoomsStep({ formData, updateFormData }: RoomsStepProps) {
  const { t } = useTranslation();
  const [customRoomDialogOpen, setCustomRoomDialogOpen] = useState(false);
  const [customRoomName, setCustomRoomName] = useState("");
  const [workTypesOpen, setWorkTypesOpen] = useState<Record<string, boolean>>({});

  const roomSuggestions = getRoomSuggestions().map((r) => ({
    ...r,
    name: t(`intake.room.${r.nameKey}`, r.nameKey),
  }));
  const workTypes = getWorkTypes();

  const selectedRoomNames = new Set(formData.rooms.map((r) => r.name));

  const toggleRoom = (name: string) => {
    if (selectedRoomNames.has(name)) {
      updateFormData({
        rooms: formData.rooms.filter((r) => r.name !== name),
      });
    } else {
      const newRoom: IntakeRoom = {
        id: crypto.randomUUID(),
        name,
        description: "",
        work_types: [],
        priority: "medium",
        images: [],
      };
      updateFormData({ rooms: [...formData.rooms, newRoom] });
    }
  };

  const handleAddCustomRoom = () => {
    if (!customRoomName.trim()) return;
    const newRoom: IntakeRoom = {
      id: crypto.randomUUID(),
      name: customRoomName.trim(),
      description: "",
      work_types: [],
      priority: "medium",
      images: [],
    };
    updateFormData({ rooms: [...formData.rooms, newRoom] });
    setCustomRoomName("");
    setCustomRoomDialogOpen(false);
  };

  const updateRoomDimension = (roomId: string, field: "widthM" | "depthM", value: string) => {
    const newRooms = formData.rooms.map((r) => {
      if (r.id !== roomId) return r;
      const dims = { ...(r as IntakeRoom & { widthM?: number; depthM?: number }) };
      if (value) {
        (dims as Record<string, unknown>)[field] = parseFloat(value);
      } else {
        delete (dims as Record<string, unknown>)[field];
      }
      return dims as IntakeRoom;
    });
    updateFormData({ rooms: newRooms });
  };

  const toggleWorkType = (roomId: string, workType: WorkType) => {
    const newRooms = formData.rooms.map((r) => {
      if (r.id !== roomId) return r;
      const hasType = r.work_types.includes(workType);
      return {
        ...r,
        work_types: hasType
          ? r.work_types.filter((wt) => wt !== workType)
          : [...r.work_types, workType],
      };
    });
    updateFormData({ rooms: newRooms });
  };

  const removeRoom = (roomId: string) => {
    updateFormData({
      rooms: formData.rooms.filter((r) => r.id !== roomId),
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">{t("intake.roomsTitle", "Which rooms are included?")}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("intake.roomsSubtitle", "Select rooms and optionally add dimensions. The builder can adjust later.")}
        </p>
      </div>

      {/* Room suggestions grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {roomSuggestions.map((room) => {
          const isSelected = selectedRoomNames.has(room.name);
          return (
            <button
              key={room.nameKey}
              type="button"
              onClick={() => toggleRoom(room.name)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2.5 rounded-lg border-2 transition-all",
                "hover:border-primary/50 hover:bg-accent/50",
                isSelected ? "border-primary bg-primary/5" : "border-muted"
              )}
            >
              <span className="text-xl">{room.icon}</span>
              <span className="text-xs font-medium text-center leading-tight">{room.name}</span>
              {isSelected && <Check className="h-3 w-3 text-primary" />}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setCustomRoomDialogOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 p-2.5 rounded-lg border-2 border-dashed transition-all",
            "hover:border-primary/50 hover:bg-accent/50 border-muted"
          )}
        >
          <Plus className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {t("intake.addCustomRoom")}
          </span>
        </button>
      </div>

      {/* Selected rooms with dimensions */}
      {formData.rooms.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("intake.roomDimensionsHint", "Add dimensions if you know them (optional)")}
          </p>
          {formData.rooms.map((room) => {
            const roomWithDims = room as IntakeRoom & { widthM?: number; depthM?: number };
            const area = roomWithDims.widthM && roomWithDims.depthM
              ? (roomWithDims.widthM * roomWithDims.depthM).toFixed(1)
              : null;

            return (
              <div key={room.id} className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{room.name}</span>
                  <div className="flex items-center gap-2">
                    {area && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {area} m²
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRoom(room.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Dimensions: width x depth */}
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="h-8 text-sm w-20 tabular-nums"
                    placeholder={t("intake.width", "Width")}
                    value={roomWithDims.widthM ?? ""}
                    onChange={(e) => updateRoomDimension(room.id, "widthM", e.target.value)}
                    step="0.1"
                    min="0"
                  />
                  <span className="text-xs text-muted-foreground">×</span>
                  <Input
                    type="number"
                    className="h-8 text-sm w-20 tabular-nums"
                    placeholder={t("intake.depth", "Depth")}
                    value={roomWithDims.depthM ?? ""}
                    onChange={(e) => updateRoomDimension(room.id, "depthM", e.target.value)}
                    step="0.1"
                    min="0"
                  />
                  <span className="text-xs text-muted-foreground">m</span>
                </div>

                {/* Expandable work types */}
                <Collapsible
                  open={workTypesOpen[room.id]}
                  onOpenChange={(open) => setWorkTypesOpen((prev) => ({ ...prev, [room.id]: open }))}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronDown className={cn("h-3 w-3 transition-transform", workTypesOpen[room.id] && "rotate-180")} />
                      {t("intake.showWorkTypes", "Work types")}
                      {room.work_types.length > 0 && (
                        <span className="text-primary">({room.work_types.length})</span>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="flex flex-wrap gap-1.5">
                      {workTypes.map((wt) => {
                        const isSelected = room.work_types.includes(wt.value);
                        return (
                          <button
                            key={wt.value}
                            type="button"
                            onClick={() => toggleWorkType(room.id, wt.value)}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-xs border transition-all",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-input hover:bg-accent"
                            )}
                          >
                            {t(`intake.workType.${wt.value}`)}
                          </button>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Show selected work types as badges when collapsed */}
                {!workTypesOpen[room.id] && room.work_types.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {room.work_types.map((wt) => (
                      <Badge key={wt} variant="secondary" className="text-xs">
                        {t(`intake.workType.${wt}`)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
            <Input
              value={customRoomName}
              onChange={(e) => setCustomRoomName(e.target.value)}
              placeholder={t("intake.customRoomPlaceholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomRoom();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomRoomDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAddCustomRoom} disabled={!customRoomName.trim()}>
              {t("common.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
