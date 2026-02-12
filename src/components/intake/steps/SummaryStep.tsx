import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MapPin, Home, Wrench, Paperclip, ImageIcon } from "lucide-react";
import type { IntakeFormData } from "../IntakeWizard";
import { IntakeFileUploader } from "../IntakeFileUploader";

interface SummaryStepProps {
  formData: IntakeFormData;
  updateFormData: (updates: Partial<IntakeFormData>) => void;
  token: string;
}

export function SummaryStep({ formData, updateFormData, token }: SummaryStepProps) {
  const { t } = useTranslation();

  const propertyTypeLabel = formData.propertyType
    ? t(`intake.${formData.propertyType}`)
    : null;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">{t("intake.summary")}</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {t("intake.summaryDescription")}
        </p>
      </div>

      {/* Contact info summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            {t("intake.yourDetails")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="space-y-1">
            <p className="font-medium">{formData.customerName}</p>
            <p className="text-muted-foreground">{formData.customerEmail}</p>
            {formData.customerPhone && (
              <p className="text-muted-foreground">{formData.customerPhone}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Property info summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {t("intake.theProperty")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="space-y-1">
            <p className="font-medium">{formData.propertyAddress}</p>
            {(formData.propertyPostalCode || formData.propertyCity) && (
              <p className="text-muted-foreground">
                {[formData.propertyPostalCode, formData.propertyCity]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            )}
            {propertyTypeLabel && (
              <Badge variant="outline" className="mt-2">
                <Home className="h-3 w-3 mr-1" />
                {propertyTypeLabel}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rooms summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            {t("intake.roomsToRenovate")} ({formData.rooms.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="space-y-4">
            {formData.rooms.map((room) => (
              <div key={room.id} className="border-b pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{room.name}</span>
                  <Badge
                    variant={
                      room.priority === "high"
                        ? "destructive"
                        : room.priority === "low"
                        ? "secondary"
                        : "outline"
                    }
                    className="text-xs"
                  >
                    {t(`intake.priority${room.priority.charAt(0).toUpperCase() + room.priority.slice(1)}`)}
                  </Badge>
                </div>
                {room.description && (
                  <p className="text-muted-foreground text-sm mb-2">
                    {room.description}
                  </p>
                )}
                {room.work_types.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {room.work_types.map((wt) => (
                      <Badge key={wt} variant="secondary" className="text-xs">
                        {t(`intake.workType.${wt}`)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional comments */}
      <div className="space-y-2">
        <Label htmlFor="additionalComments">{t("intake.additionalComments")}</Label>
        <Textarea
          id="additionalComments"
          value={formData.additionalComments}
          onChange={(e) => updateFormData({ additionalComments: e.target.value })}
          placeholder={t("intake.additionalCommentsPlaceholder")}
          rows={3}
        />
      </div>

      {/* File attachments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            {t("intake.attachments")}
            <span className="text-xs text-muted-foreground font-normal">
              ({t("intake.optional")})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="text-muted-foreground mb-4">
            {t("intake.attachmentsDescription")}
          </p>
          <IntakeFileUploader
            token={token}
            folder="attachments"
            files={formData.attachments}
            onFilesChange={(attachments) => updateFormData({ attachments })}
            accept="image/*,application/pdf"
            maxFiles={10}
            showCamera={true}
          />
        </CardContent>
      </Card>

      {/* Photos summary for rooms */}
      {formData.rooms.some((room) => room.images.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              {t("intake.uploadedRoomPhotos")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="space-y-3">
              {formData.rooms
                .filter((room) => room.images.length > 0)
                .map((room) => (
                  <div key={room.id}>
                    <p className="text-xs text-muted-foreground mb-2">
                      {room.name} ({room.images.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {room.images.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`${room.name} ${index + 1}`}
                          className="w-16 h-16 object-cover rounded-md border"
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
