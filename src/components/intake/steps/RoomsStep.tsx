import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, X, Check, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntakeFormData } from "../IntakeWizard";
import {
  getRoomSuggestions,
  getWorkTypes,
  type IntakeRoom,
  type WorkType,
  type RoomPriority,
} from "@/services/intakeService";
import { IntakeFileUploader } from "../IntakeFileUploader";

interface RoomsStepProps {
  formData: IntakeFormData;
  updateFormData: (updates: Partial<IntakeFormData>) => void;
  token: string;
}

const PRIORITIES: Array<{ value: RoomPriority; labelKey: string }> = [
  { value: "high", labelKey: "intake.priorityHigh" },
  { value: "medium", labelKey: "intake.priorityMedium" },
  { value: "low", labelKey: "intake.priorityLow" },
];

export function RoomsStep({ formData, updateFormData, token }: RoomsStepProps) {
  const { t } = useTranslation();
  const [editingRoom, setEditingRoom] = useState<IntakeRoom | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [customRoomDialogOpen, setCustomRoomDialogOpen] = useState(false);
  const [customRoomName, setCustomRoomName] = useState("");

  const roomSuggestions = getRoomSuggestions();
  const workTypes = getWorkTypes();

  const selectedRoomNames = new Set(formData.rooms.map((r) => r.name));

  const handleSelectRoom = (name: string) => {
    if (selectedRoomNames.has(name)) {
      // Room already selected - open for editing
      const existingRoom = formData.rooms.find((r) => r.name === name);
      if (existingRoom) {
        setEditingRoom({ ...existingRoom });
        setSheetOpen(true);
      }
    } else {
      // Add new room
      const newRoom: IntakeRoom = {
        id: crypto.randomUUID(),
        name,
        description: "",
        work_types: [],
        priority: "medium",
        images: [],
      };
      setEditingRoom(newRoom);
      setSheetOpen(true);
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
    setCustomRoomName("");
    setCustomRoomDialogOpen(false);
    setEditingRoom(newRoom);
    setSheetOpen(true);
  };

  const handleSaveRoom = () => {
    if (!editingRoom) return;

    const existingIndex = formData.rooms.findIndex((r) => r.id === editingRoom.id);
    let newRooms: IntakeRoom[];

    if (existingIndex >= 0) {
      // Update existing
      newRooms = [...formData.rooms];
      newRooms[existingIndex] = editingRoom;
    } else {
      // Add new
      newRooms = [...formData.rooms, editingRoom];
    }

    updateFormData({ rooms: newRooms });
    setSheetOpen(false);
    setEditingRoom(null);
  };

  const handleRemoveRoom = (roomId: string) => {
    updateFormData({
      rooms: formData.rooms.filter((r) => r.id !== roomId),
    });
  };

  const handleEditRoom = (room: IntakeRoom) => {
    setEditingRoom({ ...room });
    setSheetOpen(true);
  };

  const toggleWorkType = (workType: WorkType) => {
    if (!editingRoom) return;

    const hasType = editingRoom.work_types.includes(workType);
    const newWorkTypes = hasType
      ? editingRoom.work_types.filter((t) => t !== workType)
      : [...editingRoom.work_types, workType];

    setEditingRoom({ ...editingRoom, work_types: newWorkTypes });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">{t("intake.selectRooms")}</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {t("intake.selectRoomsDescription")}
        </p>
      </div>

      {/* Room suggestions grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {roomSuggestions.map((room) => {
          const isSelected = selectedRoomNames.has(room.name);
          return (
            <button
              key={room.name}
              type="button"
              onClick={() => handleSelectRoom(room.name)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all",
                "hover:border-primary/50 hover:bg-accent/50",
                isSelected ? "border-primary bg-primary/5" : "border-muted"
              )}
            >
              <span className="text-2xl">{room.icon}</span>
              <span className="text-xs font-medium text-center">{room.name}</span>
              {isSelected && (
                <Check className="h-3 w-3 text-primary" />
              )}
            </button>
          );
        })}

        {/* Add custom room button */}
        <button
          type="button"
          onClick={() => setCustomRoomDialogOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 border-dashed transition-all",
            "hover:border-primary/50 hover:bg-accent/50 border-muted"
          )}
        >
          <Plus className="h-6 w-6 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {t("intake.addCustomRoom")}
          </span>
        </button>
      </div>

      {/* Selected rooms list */}
      {formData.rooms.length > 0 && (
        <div className="space-y-3 mt-6">
          <Label className="text-sm text-muted-foreground">
            {t("intake.roomsSelected", { count: formData.rooms.length })}
          </Label>
          <div className="space-y-2">
            {formData.rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-start justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{room.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {t(`intake.priority${room.priority.charAt(0).toUpperCase() + room.priority.slice(1)}`)}
                    </Badge>
                  </div>
                  {room.description && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {room.description}
                    </p>
                  )}
                  {room.work_types.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {room.work_types.map((wt) => (
                        <Badge key={wt} variant="secondary" className="text-xs">
                          {t(`intake.workType.${wt}`)}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {room.images.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <ImageIcon className="h-3 w-3" />
                      <span>
                        {t("intake.photosAttached", { count: room.images.length })}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEditRoom(room)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveRoom(room.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {formData.rooms.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">
          {t("intake.noRoomsSelected")}
        </p>
      )}

      {/* Room detail sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingRoom?.name}</SheetTitle>
            <SheetDescription>
              {t("intake.roomDescriptionPlaceholder")}
            </SheetDescription>
          </SheetHeader>

          {editingRoom && (
            <div className="space-y-6 mt-6">
              {/* Description */}
              <div className="space-y-2">
                <Label>{t("intake.roomDescription")} <span className="text-destructive">*</span></Label>
                <Textarea
                  value={editingRoom.description}
                  onChange={(e) =>
                    setEditingRoom({ ...editingRoom, description: e.target.value })
                  }
                  placeholder={t("intake.roomDescriptionPlaceholder")}
                  rows={4}
                />
              </div>

              {/* Work types */}
              <div className="space-y-3">
                <Label>{t("intake.workTypes")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("intake.workTypesDescription")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {workTypes.map((wt) => {
                    const isSelected = editingRoom.work_types.includes(wt.value);
                    return (
                      <button
                        key={wt.value}
                        type="button"
                        onClick={() => toggleWorkType(wt.value)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm border transition-all",
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
              </div>

              {/* Priority */}
              <div className="space-y-3">
                <Label>{t("intake.priority")}</Label>
                <div className="flex flex-col gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() =>
                        setEditingRoom({ ...editingRoom, priority: p.value })
                      }
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                        editingRoom.priority === p.value
                          ? "border-primary bg-primary/5"
                          : "border-input hover:bg-accent"
                      )}
                    >
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full border-2",
                          editingRoom.priority === p.value
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        )}
                      />
                      <span className="text-sm">{t(p.labelKey)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Room photos */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <Label>{t("intake.roomPhotos")}</Label>
                  <span className="text-xs text-muted-foreground">
                    ({t("intake.optional")})
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("intake.roomPhotosDescription")}
                </p>
                <IntakeFileUploader
                  token={token}
                  folder={`rooms/${editingRoom.id}`}
                  files={editingRoom.images}
                  onFilesChange={(images) =>
                    setEditingRoom({ ...editingRoom, images })
                  }
                  accept="image/*"
                  maxFiles={5}
                  showCamera={true}
                  compact={false}
                />
              </div>

              {/* Save button */}
              <Button
                onClick={handleSaveRoom}
                className="w-full"
                disabled={!editingRoom.description.trim()}
              >
                {t("intake.saveRoom")}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

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
                placeholder="t.ex. Vinkällare, Ateljé..."
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
