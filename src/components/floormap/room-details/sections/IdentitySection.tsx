import { useTranslation } from "react-i18next";
import { Home, Ruler, Calendar, AlertTriangle, TriangleAlert } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComboboxFretext } from "../fields/ComboboxFretext";
import {
  ROOM_NAME_SUGGESTION_KEYS,
  ROOM_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from "../constants";
import type { IdentitySectionProps } from "../types";

export function IdentitySection({
  formData,
  updateFormData,
  areaSqm,
  perimeterMm,
  createdAt,
}: IdentitySectionProps) {
  const { t, i18n } = useTranslation();

  // Format created date
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString(i18n.language === 'sv' ? 'sv-SE' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  // Auto-calculate area from width × depth
  const handleWidthChange = (mm: number | undefined) => {
    const updates: Partial<typeof formData> = { width_mm: mm };
    if (mm && formData.depth_mm) {
      updates.area_sqm = (mm * formData.depth_mm) / 1_000_000;
    }
    updateFormData(updates);
  };

  const handleDepthChange = (mm: number | undefined) => {
    const updates: Partial<typeof formData> = { depth_mm: mm };
    if (mm && formData.width_mm) {
      updates.area_sqm = (formData.width_mm * mm) / 1_000_000;
    }
    updateFormData(updates);
  };

  // Computed wall area for display
  const ceilingHeightM = formData.ceiling_height_mm / 1000;
  const wallArea = perimeterMm ? (perimeterMm / 1000) * ceilingHeightM : null;
  const paintableWallArea = wallArea && formData.non_paintable_area_sqm
    ? Math.max(0, wallArea - formData.non_paintable_area_sqm)
    : wallArea;

  return (
    <div className="space-y-4">
      {/* Created date - shown at top for existing rooms */}
      {formattedDate && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground pb-2 border-b">
          <Calendar className="h-4 w-4" />
          <span>{t('rooms.createdOn', 'Skapad')}: {formattedDate}</span>
        </div>
      )}

      {/* Room name with combobox */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Home className="h-4 w-4 text-gray-600" />
          <Label htmlFor="room-name">{t('identitySection.roomName')}</Label>
        </div>
        <ComboboxFretext
          id="room-name"
          suggestionKeys={ROOM_NAME_SUGGESTION_KEYS}
          value={formData.name}
          onChange={(value) => updateFormData({ name: value })}
          placeholder={t('identitySection.selectOrType')}
          searchPlaceholder={t('identitySection.searchOrType')}
        />
      </div>

      {/* Status and Priority side by side */}
      <div className="grid grid-cols-2 gap-4">
        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="room-status">{t('rooms.status')}</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => updateFormData({ status: value })}
          >
            <SelectTrigger id="room-status">
              <SelectValue placeholder={t('identitySection.selectStatus')} />
            </SelectTrigger>
            <SelectContent>
              {ROOM_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-gray-600" />
            <Label htmlFor="room-priority">{t("rooms.priority")}</Label>
          </div>
          <Select
            value={formData.priority}
            onValueChange={(value) => updateFormData({ priority: value })}
          >
            <SelectTrigger id="room-priority">
              <SelectValue placeholder={t("rooms.selectPriority", "Välj prioritet")} />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dimensions section */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-gray-600" />
          <Label className="text-sm font-medium">{t('rooms.dimensions', 'Dimensioner')}</Label>
        </div>

        {/* Area */}
        <div className="space-y-1">
          <Label htmlFor="room-area" className="text-xs text-muted-foreground">{t('rooms.area')} (m²)</Label>
          <Input
            id="room-area"
            type="number"
            min={0}
            step={0.01}
            placeholder="—"
            value={formData.area_sqm ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              updateFormData({ area_sqm: v ? parseFloat(v) : undefined });
            }}
          />
          {/* Mismatch warning when area doesn't match width × depth */}
          {formData.width_mm && formData.depth_mm && formData.area_sqm !== undefined && (() => {
            const computed = (formData.width_mm! * formData.depth_mm!) / 1_000_000;
            const diff = Math.abs(formData.area_sqm! - computed);
            if (diff < 0.01) return null;
            return (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                <TriangleAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <span>{t('rooms.areaMismatch', 'Ytan stämmer inte med bredd × djup')} ({computed.toFixed(2)} m²). </span>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs text-amber-800 underline"
                    onClick={() => updateFormData({ width_mm: undefined, depth_mm: undefined })}
                  >
                    {t('rooms.clearWidthDepth', 'Rensa bredd/djup')}
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Width and Depth side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="room-width" className="text-xs text-muted-foreground">{t('rooms.width', 'Bredd')} (mm)</Label>
            <Input
              id="room-width"
              type="number"
              min={0}
              step={1}
              placeholder="—"
              value={formData.width_mm ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                handleWidthChange(v ? parseFloat(v) : undefined);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="room-depth" className="text-xs text-muted-foreground">{t('rooms.depth', 'Djup')} (mm)</Label>
            <Input
              id="room-depth"
              type="number"
              min={0}
              step={1}
              placeholder="—"
              value={formData.depth_mm ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                handleDepthChange(v ? parseFloat(v) : undefined);
              }}
            />
          </div>
        </div>

        {/* Ceiling height */}
        <div className="space-y-1">
          <Label htmlFor="ceiling-height" className="text-xs text-muted-foreground">{t('identitySection.ceilingHeight')} (mm)</Label>
          <Input
            id="ceiling-height"
            type="number"
            min={1000}
            max={10000}
            step={100}
            value={formData.ceiling_height_mm}
            onChange={(e) =>
              updateFormData({ ceiling_height_mm: parseInt(e.target.value) || 2400 })
            }
          />
        </div>

        {/* Non-paintable area */}
        <div className="space-y-1">
          <Label htmlFor="non-paintable-area" className="text-xs text-muted-foreground">
            {t('rooms.nonPaintableArea', 'Icke-målningsbar yta')} (m²)
          </Label>
          <Input
            id="non-paintable-area"
            type="number"
            min={0}
            step={0.1}
            placeholder="—"
            value={formData.non_paintable_area_sqm ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              updateFormData({ non_paintable_area_sqm: v ? parseFloat(v) : undefined });
            }}
          />
          <p className="text-xs text-muted-foreground">
            {t('rooms.nonPaintableAreaHint', 'Fönster, garderober, dörrar m.m. som dras av från väggyta vid färgberäkning')}
          </p>
        </div>

        {/* Computed wall area summary */}
        {wallArea !== null && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2 space-y-0.5">
            <div>{t('rooms.wallArea', 'Väggarea')}: {wallArea.toFixed(1)} m²</div>
            {formData.non_paintable_area_sqm ? (
              <div>{t('rooms.paintableWallArea', 'Målningsbar väggyta')}: {paintableWallArea?.toFixed(1)} m²</div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
