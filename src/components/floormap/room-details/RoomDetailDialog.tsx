import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Home, Loader2, Save, X, Trash2, Plus } from "lucide-react";
import { RoomDetailForm } from "./RoomDetailForm";
import { useRoomForm } from "./hooks/useRoomForm";
import type { RoomDetailDialogProps } from "./types";

export function RoomDetailDialog({
  room,
  projectId,
  open,
  onOpenChange,
  onRoomUpdated,
  isCreateMode = false,
}: RoomDetailDialogProps) {
  const {
    formData,
    updateFormData,
    updateSpec,
    saving,
    isNewRoom,
    handleSave,
    handleDelete,
  } = useRoomForm({
    room,
    projectId,
    onRoomUpdated,
    onClose: () => onOpenChange(false),
  });

  // If dialog is open but room is null and we're NOT in create mode,
  // we're waiting for room data to load - show loading spinner
  const isLoading = open && !room && !isCreateMode;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <VisuallyHidden>
            <DialogTitle>Laddar rumsdata</DialogTitle>
            <DialogDescription>Väntar på att rumsdata ska laddas</DialogDescription>
          </VisuallyHidden>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Laddar rumsdata...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2">
            {isNewRoom ? (
              <Plus className="h-5 w-5 text-primary" />
            ) : (
              <Home className="h-5 w-5 text-primary" />
            )}
            <DialogTitle>{isNewRoom ? "Skapa nytt rum" : "Rumsdetaljer"}</DialogTitle>
          </div>
          <DialogDescription>
            {isNewRoom
              ? "Fyll i uppgifter för det nya rummet"
              : "Redigera rumsinformation och lägg till kommentarer"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <RoomDetailForm
            room={room}
            projectId={projectId}
            formData={formData}
            updateFormData={updateFormData}
            updateSpec={updateSpec}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t flex-shrink-0">
          <Button
            onClick={handleSave}
            disabled={saving || !formData.name.trim()}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isNewRoom ? "Skapar..." : "Sparar..."}
              </>
            ) : (
              <>
                {isNewRoom ? (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Skapa rum
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Spara ändringar
                  </>
                )}
              </>
            )}
          </Button>
          {!isNewRoom && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              <Trash2 className="mr-2 h-4 w-4" />
              Ta bort rum
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            {isNewRoom ? "Avbryt" : "Stäng"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
