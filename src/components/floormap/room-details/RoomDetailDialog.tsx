import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Home, Loader2, Save, X, Trash2, Plus, Eye } from "lucide-react";
import { RoomDetailForm } from "./RoomDetailForm";
import { useRoomForm } from "./hooks/useRoomForm";
import { useTranslation } from "react-i18next";
import type { RoomDetailDialogProps } from "./types";

export function RoomDetailDialog({
  room,
  projectId,
  open,
  onOpenChange,
  onRoomUpdated,
  isCreateMode = false,
  onViewElevation,
}: RoomDetailDialogProps) {
  const { t } = useTranslation();
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
            <DialogTitle>{t('rooms.loadingRoomData', 'Loading room data')}</DialogTitle>
            <DialogDescription>{t('rooms.waitingForRoomData', 'Waiting for room data to load')}</DialogDescription>
          </VisuallyHidden>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">{t('rooms.loadingRoomData', 'Loading room data')}...</p>
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
            <DialogTitle>{isNewRoom ? t('floormap.createRoom') : t('floormap.roomDetails', 'Room details')}</DialogTitle>
          </div>
          <DialogDescription>
            {isNewRoom
              ? t('rooms.fillInNewRoomDetails', 'Fill in details for the new room')
              : t('rooms.editRoomInfoAndComments', 'Edit room information and add comments')}
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
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t flex-shrink-0">
          <Button
            onClick={handleSave}
            disabled={saving || !formData.name.trim()}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isNewRoom ? t('common.creating', 'Creating...') : t('common.saving', 'Saving...')}
              </>
            ) : (
              <>
                {isNewRoom ? (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('floormap.createRoom')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('taskPanel.saveChanges')}
                  </>
                )}
              </>
            )}
          </Button>
          {!isNewRoom && onViewElevation && (
            <Button
              variant="secondary"
              onClick={() => {
                onOpenChange(false);
                onViewElevation();
              }}
              disabled={saving}
            >
              <Eye className="mr-2 h-4 w-4" />
              {t('roomElevation.viewElevation', 'View Elevation')}
            </Button>
          )}
          {!isNewRoom && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t('floormap.deleteRoom', 'Delete room')}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            {isNewRoom ? t('common.cancel') : t('common.close', 'Close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
