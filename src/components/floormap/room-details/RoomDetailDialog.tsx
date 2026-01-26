import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Home, Loader2, Save, X, Trash2 } from "lucide-react";
import { RoomDetailForm } from "./RoomDetailForm";
import { useRoomForm } from "./hooks/useRoomForm";
import type { RoomDetailDialogProps } from "./types";

export function RoomDetailDialog({
  room,
  projectId,
  open,
  onOpenChange,
  onRoomUpdated,
}: RoomDetailDialogProps) {
  const {
    formData,
    updateFormData,
    updateSpec,
    saving,
    handleSave,
    handleDelete,
  } = useRoomForm({
    room,
    onRoomUpdated,
    onClose: () => onOpenChange(false),
  });

  if (!room) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <DialogTitle>Rumsdetaljer</DialogTitle>
          </div>
          <DialogDescription>
            Redigera rumsinformation och lägg till kommentarer
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
                Sparar...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Spara ändringar
              </>
            )}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={saving}>
            <Trash2 className="mr-2 h-4 w-4" />
            Ta bort rum
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Stäng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
