import { useTranslation } from "react-i18next";
import { Camera, ImageIcon } from "lucide-react";
import type { IntakeFormData } from "../IntakeWizard";
import { IntakeFileUploader } from "../IntakeFileUploader";

interface PhotosStepProps {
  formData: IntakeFormData;
  updateFormData: (updates: Partial<IntakeFormData>) => void;
  token: string;
}

export function PhotosStep({ formData, updateFormData, token }: PhotosStepProps) {
  const { t } = useTranslation();

  const updateRoomImages = (roomId: string, images: string[]) => {
    const newRooms = formData.rooms.map((r) =>
      r.id === roomId ? { ...r, images } : r
    );
    updateFormData({ rooms: newRooms });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">
          {t("intake.photosTitle", "Add photos")}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("intake.photosSubtitle", "Photos of the current state help the builder understand the scope. You can also add them later.")}
        </p>
      </div>

      {/* Per-room photo upload */}
      {formData.rooms.length > 0 && (
        <div className="space-y-4">
          {formData.rooms.map((room) => (
            <div
              key={room.id}
              className="rounded-lg border p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{room.name}</span>
                {room.images.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({room.images.length})
                  </span>
                )}
              </div>
              <IntakeFileUploader
                token={token}
                folder={`rooms/${room.id}`}
                files={room.images}
                onFilesChange={(images) => updateRoomImages(room.id, images)}
                accept="image/*"
                maxFiles={5}
                showCamera={true}
                compact={true}
              />
            </div>
          ))}
        </div>
      )}

      {formData.rooms.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t("intake.noRoomsForPhotos", "Add rooms in the previous step to upload photos per room")}</p>
        </div>
      )}

      {/* General attachments */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">
            {t("intake.generalAttachments", "General files")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("intake.generalAttachmentsHint", "Floor plans, certificates, or other documents")}
          </p>
        </div>
        <IntakeFileUploader
          token={token}
          folder="attachments"
          files={formData.attachments}
          onFilesChange={(attachments) => updateFormData({ attachments })}
          accept="image/*,application/pdf"
          maxFiles={10}
          showCamera={true}
          compact={false}
        />
      </div>
    </div>
  );
}
