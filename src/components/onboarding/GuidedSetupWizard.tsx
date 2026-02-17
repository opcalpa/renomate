import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
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
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  Plus,
  Pencil,
  Trash2,
  Check,
  Sparkles,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getRoomSuggestions,
  getWorkTypes,
  type IntakeRoom,
  type WorkType,
} from "@/services/intakeService";
import { createProjectFromGuidedSetup } from "@/services/intakeService";

interface GuidedSetupWizardProps {
  onComplete: (projectId: string) => void;
  onCancel: () => void;
  userType: "homeowner" | "contractor";
  profileId: string;
}

interface GuidedFormData {
  projectName: string;
  address: string;
  postalCode: string;
  city: string;
  commonWorkTypes: WorkType[];
  rooms: IntakeRoom[];
}

const INITIAL_FORM_DATA: GuidedFormData = {
  projectName: "",
  address: "",
  postalCode: "",
  city: "",
  commonWorkTypes: [],
  rooms: [],
};

// Common work types typically applied to whole apartment
const COMMON_WORK_TYPES: Array<{ value: WorkType; labelKey: string; icon: string }> = [
  { value: "malning", labelKey: "intake.workType.malning", icon: "🎨" },
  { value: "golv", labelKey: "intake.workType.golv", icon: "🪵" },
  { value: "snickeri", labelKey: "intake.workType.snickeri", icon: "🪚" },
  { value: "el", labelKey: "intake.workType.el", icon: "⚡" },
];

const TOTAL_STEPS = 4;

export function GuidedSetupWizard({
  onComplete,
  onCancel,
  profileId,
}: GuidedSetupWizardProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<GuidedFormData>(INITIAL_FORM_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Room editing state
  const [editingRoom, setEditingRoom] = useState<IntakeRoom | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [customRoomDialogOpen, setCustomRoomDialogOpen] = useState(false);
  const [customRoomName, setCustomRoomName] = useState("");

  const roomSuggestions = getRoomSuggestions();
  const workTypes = getWorkTypes();

  // Filter out common work types from room-specific options
  const roomSpecificWorkTypes = workTypes.filter(
    wt => !formData.commonWorkTypes.includes(wt.value)
  );

  const updateFormData = useCallback((updates: Partial<GuidedFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 1:
        return !!formData.projectName.trim();
      case 2:
        return true; // Common work is optional
      case 3:
        return formData.rooms.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  }, [currentStep, formData]);

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS && canProceed()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const result = await createProjectFromGuidedSetup(
        {
          projectName: formData.projectName.trim(),
          address: formData.address.trim() || undefined,
          postalCode: formData.postalCode.trim() || undefined,
          city: formData.city.trim() || undefined,
          commonWorkTypes: formData.commonWorkTypes,
          rooms: formData.rooms,
        },
        profileId
      );

      setSubmitted(true);
      toast.success(t("guidedSetup.projectCreated"));
      onComplete(result.projectId);
    } catch (error) {
      console.error("Failed to create project from guided setup:", error);
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle common work type
  const toggleCommonWorkType = (workType: WorkType) => {
    const hasType = formData.commonWorkTypes.includes(workType);
    const newTypes = hasType
      ? formData.commonWorkTypes.filter((t) => t !== workType)
      : [...formData.commonWorkTypes, workType];
    updateFormData({ commonWorkTypes: newTypes });
  };

  // Room handling functions
  const selectedRoomNames = new Set(formData.rooms.map((r) => r.name));

  const handleQuickAddRoom = (name: string) => {
    if (selectedRoomNames.has(name)) {
      // Remove room
      updateFormData({
        rooms: formData.rooms.filter((r) => r.name !== name),
      });
    } else {
      // Add room with no extra work types
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

  const handleSaveRoom = () => {
    if (!editingRoom) return;

    const existingIndex = formData.rooms.findIndex((r) => r.id === editingRoom.id);
    let newRooms: IntakeRoom[];

    if (existingIndex >= 0) {
      newRooms = [...formData.rooms];
      newRooms[existingIndex] = editingRoom;
    } else {
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

  const toggleRoomWorkType = (workType: WorkType) => {
    if (!editingRoom) return;

    const hasType = editingRoom.work_types.includes(workType);
    const newWorkTypes = hasType
      ? editingRoom.work_types.filter((t) => t !== workType)
      : [...editingRoom.work_types, workType];

    setEditingRoom({ ...editingRoom, work_types: newWorkTypes });
  };

  const progressPercent = (currentStep / TOTAL_STEPS) * 100;

  // Calculate total tasks that will be created
  const commonTaskCount = formData.commonWorkTypes.length;
  const roomSpecificTaskCount = formData.rooms.reduce(
    (sum, room) => sum + room.work_types.length,
    0
  );
  const totalTaskCount = commonTaskCount + roomSpecificTaskCount;

  // Success screen
  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-2">{t("guidedSetup.projectCreated")}</h2>
        <p className="text-muted-foreground">
          {t("guidedSetup.projectCreatedDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {t("guidedSetup.stepOf", { current: currentStep, total: TOTAL_STEPS })}
          </span>
          <span>
            {currentStep === 1 && t("guidedSetup.propertyStep")}
            {currentStep === 2 && t("guidedSetup.commonWorkStep")}
            {currentStep === 3 && t("guidedSetup.roomsStep")}
            {currentStep === 4 && t("guidedSetup.summaryStep")}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Step 1: Project & Property */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold">{t("guidedSetup.title")}</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {t("guidedSetup.titleDesc")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectName">
              {t("guidedSetup.projectName")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="projectName"
              value={formData.projectName}
              onChange={(e) => updateFormData({ projectName: e.target.value })}
              placeholder={t("guidedSetup.projectNamePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t("projects.address")}</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => updateFormData({ address: e.target.value })}
              placeholder={t("projects.addressPlaceholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="postalCode">{t("projects.postalCode")}</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => updateFormData({ postalCode: e.target.value })}
                placeholder="123 45"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">{t("projects.city")}</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => updateFormData({ city: e.target.value })}
                placeholder={t("projects.cityPlaceholder")}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Common Work (whole apartment) */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Home className="h-5 w-5 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-semibold">{t("guidedSetup.commonWorkTitle")}</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {t("guidedSetup.commonWorkDesc")}
            </p>
          </div>

          {/* Common work type selection */}
          <div className="space-y-3">
            <Label>{t("guidedSetup.selectCommonWork")}</Label>
            <div className="grid grid-cols-2 gap-3">
              {COMMON_WORK_TYPES.map((wt) => {
                const isSelected = formData.commonWorkTypes.includes(wt.value);
                return (
                  <button
                    key={wt.value}
                    type="button"
                    onClick={() => toggleCommonWorkType(wt.value)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
                      "hover:border-primary/50 hover:bg-accent/50",
                      isSelected ? "border-primary bg-primary/5" : "border-muted"
                    )}
                  >
                    <span className="text-2xl">{wt.icon}</span>
                    <div className="flex-1">
                      <span className="font-medium text-sm">{t(wt.labelKey)}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Show all work types for more options */}
          <div className="space-y-3">
            <Label className="text-muted-foreground text-sm">{t("guidedSetup.moreWorkTypes")}</Label>
            <div className="flex flex-wrap gap-2">
              {workTypes
                .filter(wt => !COMMON_WORK_TYPES.some(cwt => cwt.value === wt.value))
                .map((wt) => {
                  const isSelected = formData.commonWorkTypes.includes(wt.value);
                  return (
                    <button
                      key={wt.value}
                      type="button"
                      onClick={() => toggleCommonWorkType(wt.value)}
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

          {formData.commonWorkTypes.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="text-muted-foreground">
                {t("guidedSetup.commonWorkPreview", { count: formData.commonWorkTypes.length })}
              </p>
            </div>
          )}

          {formData.commonWorkTypes.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-2">
              {t("guidedSetup.noCommonWorkHint")}
            </p>
          )}
        </div>
      )}

      {/* Step 3: Rooms */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold">{t("guidedSetup.selectRoomsTitle")}</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {formData.commonWorkTypes.length > 0
                ? t("guidedSetup.selectRoomsWithCommon")
                : t("guidedSetup.selectRoomsNoCommon")}
            </p>
          </div>

          {/* Room suggestions grid - quick select */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {roomSuggestions.map((room) => {
              const isSelected = selectedRoomNames.has(room.name);
              return (
                <button
                  key={room.name}
                  type="button"
                  onClick={() => handleQuickAddRoom(room.name)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 p-2 sm:p-3 rounded-lg border-2 transition-all",
                    "hover:border-primary/50 hover:bg-accent/50",
                    isSelected ? "border-primary bg-primary/5" : "border-muted"
                  )}
                >
                  <span className="text-xl sm:text-2xl">{room.icon}</span>
                  <span className="text-xs font-medium text-center leading-tight">{room.name}</span>
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

          {/* Selected rooms list with option to add room-specific work */}
          {formData.rooms.length > 0 && (
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">
                  {t("intake.roomsSelected", { count: formData.rooms.length })}
                </Label>
                {roomSpecificWorkTypes.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {t("guidedSetup.clickToAddExtra")}
                  </span>
                )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {formData.rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-start justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{room.name}</span>
                        {formData.commonWorkTypes.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {t("guidedSetup.commonWorkBadge")}
                          </Badge>
                        )}
                      </div>
                      {room.work_types.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-xs text-muted-foreground mr-1">+</span>
                          {room.work_types.map((wt) => (
                            <Badge key={wt} variant="secondary" className="text-xs">
                              {t(`intake.workType.${wt}`)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {roomSpecificWorkTypes.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEditRoom(room)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
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
                ))}
              </div>
            </div>
          )}

          {formData.rooms.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">
              {t("intake.noRoomsSelected")}
            </p>
          )}
        </div>
      )}

      {/* Step 4: Summary */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-semibold">{t("guidedSetup.readyToCreate")}</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {t("guidedSetup.readyToCreateDesc")}
            </p>
          </div>

          {/* Summary card */}
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("guidedSetup.projectName")}</p>
              <p className="font-medium">{formData.projectName}</p>
            </div>

            {formData.address && (
              <div>
                <p className="text-sm text-muted-foreground">{t("projects.address")}</p>
                <p className="font-medium">
                  {[formData.address, formData.postalCode, formData.city]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            )}

            {/* Common work tasks */}
            {formData.commonWorkTypes.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {t("guidedSetup.commonWorkSummary")}
                </p>
                <div className="space-y-1">
                  {formData.commonWorkTypes.map((wt) => (
                    <div key={wt} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="font-medium">{t(`intake.workType.${wt}`)}</span>
                      <span className="text-muted-foreground text-xs">
                        ({formData.rooms.map(r => r.name).join(", ")})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Room-specific tasks */}
            {roomSpecificTaskCount > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {t("guidedSetup.roomSpecificSummary")}
                </p>
                <div className="space-y-1">
                  {formData.rooms
                    .filter(room => room.work_types.length > 0)
                    .map((room) => (
                      <div key={room.id} className="text-sm">
                        {room.work_types.map((wt) => (
                          <div key={`${room.id}-${wt}`} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="font-medium">{t(`intake.workType.${wt}`)}</span>
                            <span className="text-muted-foreground text-xs">
                              ({room.name})
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Total tasks */}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("guidedSetup.totalTasks")}</span>
                <span className="font-medium">{totalTaskCount} {t("guidedSetup.tasks")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("guidedSetup.totalRooms")}</span>
                <span className="font-medium">{formData.rooms.length} {t("guidedSetup.roomsLabel")}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {t("guidedSetup.canEditLater")}
          </p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t">
        {currentStep === 1 ? (
          <Button variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        ) : (
          <Button variant="outline" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("intake.back")}
          </Button>
        )}

        {currentStep < TOTAL_STEPS ? (
          <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
            {t("intake.next")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting || !canProceed()} className="gap-2">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("guidedSetup.creatingProject")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t("guidedSetup.createProject")}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Room detail sheet - for adding room-specific extra work */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingRoom?.name}</SheetTitle>
            <SheetDescription>
              {t("guidedSetup.roomExtraWorkDesc")}
            </SheetDescription>
          </SheetHeader>

          {editingRoom && (
            <div className="space-y-6 mt-6">
              {/* Show common work that applies */}
              {formData.commonWorkTypes.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">{t("guidedSetup.alreadyIncluded")}</p>
                  <div className="flex flex-wrap gap-1">
                    {formData.commonWorkTypes.map((wt) => (
                      <Badge key={wt} variant="secondary" className="text-xs">
                        {t(`intake.workType.${wt}`)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra work types for this room */}
              <div className="space-y-3">
                <Label>{t("guidedSetup.addExtraWork")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("guidedSetup.addExtraWorkDesc")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {roomSpecificWorkTypes.map((wt) => {
                    const isSelected = editingRoom.work_types.includes(wt.value);
                    return (
                      <button
                        key={wt.value}
                        type="button"
                        onClick={() => toggleRoomWorkType(wt.value)}
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

              {/* Description */}
              <div className="space-y-2">
                <Label>{t("intake.roomDescription")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></Label>
                <Textarea
                  value={editingRoom.description}
                  onChange={(e) =>
                    setEditingRoom({ ...editingRoom, description: e.target.value })
                  }
                  placeholder={t("guidedSetup.roomDescriptionPlaceholder")}
                  rows={3}
                />
              </div>

              {/* Save button */}
              <Button onClick={handleSaveRoom} className="w-full">
                {t("common.done")}
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
