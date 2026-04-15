import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, MapPin, Wrench, ImageIcon } from "lucide-react";
import type { IntakeFormData } from "../IntakeWizard";

interface ContactSummaryStepProps {
  formData: IntakeFormData;
  updateFormData: (updates: Partial<IntakeFormData>) => void;
}

export function ContactSummaryStep({ formData, updateFormData }: ContactSummaryStepProps) {
  const { t } = useTranslation();

  const totalPhotos = formData.rooms.reduce((sum, r) => sum + r.images.length, 0) + formData.attachments.length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">
          {t("intake.contactTitle", "Your details")}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("intake.contactSubtitle", "So the builder can reach you")}
        </p>
      </div>

      {/* Contact fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="customerName" className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            {t("intake.name")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="customerName"
            value={formData.customerName}
            onChange={(e) => updateFormData({ customerName: e.target.value })}
            placeholder={t("intake.namePlaceholder")}
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerEmail" className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            {t("intake.email")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="customerEmail"
            type="email"
            value={formData.customerEmail}
            onChange={(e) => updateFormData({ customerEmail: e.target.value })}
            placeholder={t("intake.emailPlaceholder")}
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerPhone" className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            {t("intake.phone")}
          </Label>
          <Input
            id="customerPhone"
            type="tel"
            value={formData.customerPhone}
            onChange={(e) => updateFormData({ customerPhone: e.target.value })}
            placeholder={t("intake.phonePlaceholder")}
            autoComplete="tel"
          />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="propertyAddress" className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {t("intake.address")}
          </Label>
          <Input
            id="propertyAddress"
            value={formData.propertyAddress}
            onChange={(e) => updateFormData({ propertyAddress: e.target.value })}
            placeholder={t("intake.addressPlaceholder")}
            autoComplete="street-address"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="propertyPostalCode">{t("intake.postalCode")}</Label>
            <Input
              id="propertyPostalCode"
              value={formData.propertyPostalCode}
              onChange={(e) => updateFormData({ propertyPostalCode: e.target.value })}
              placeholder={t("intake.postalCodePlaceholder")}
              autoComplete="postal-code"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="propertyCity">{t("intake.city")}</Label>
            <Input
              id="propertyCity"
              value={formData.propertyCity}
              onChange={(e) => updateFormData({ propertyCity: e.target.value })}
              placeholder={t("intake.cityPlaceholder")}
              autoComplete="address-level2"
            />
          </div>
        </div>
      </div>

      {/* Summary of what will be submitted */}
      <div className="border-t pt-4 space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          {t("intake.summaryOfRequest", "Your request includes:")}
        </p>

        {/* Description preview */}
        {formData.description && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {t("intake.descriptionLabel", "Description")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-sm line-clamp-3">{formData.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Rooms preview */}
        {formData.rooms.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
                <Wrench className="h-3.5 w-3.5" />
                {formData.rooms.length} {t("intake.aiRooms", "rooms")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="flex flex-wrap gap-1.5">
                {formData.rooms.map((room) => (
                  <Badge key={room.id} variant="secondary" className="text-xs">
                    {room.name}
                    {room.work_types.length > 0 && (
                      <span className="ml-1 opacity-60">({room.work_types.length})</span>
                    )}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos count */}
        {totalPhotos > 0 && (
          <Card>
            <CardContent className="px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" />
              {t("intake.totalPhotos", "{{count}} photos/files attached", { count: totalPhotos })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Additional comments */}
      <div className="space-y-2">
        <Label htmlFor="additionalComments">
          {t("intake.additionalComments")}
        </Label>
        <Textarea
          id="additionalComments"
          value={formData.additionalComments}
          onChange={(e) => updateFormData({ additionalComments: e.target.value })}
          placeholder={t("intake.additionalCommentsPlaceholder")}
          rows={3}
        />
      </div>
    </div>
  );
}
