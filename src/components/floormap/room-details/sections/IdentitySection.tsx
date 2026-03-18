import { useTranslation } from "react-i18next";
import { Calendar, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ROOM_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from "../constants";
import type { IdentitySectionProps } from "../types";

// Compact dimension table row: label | input | unit
function DimRow({
  label,
  unit,
  value,
  step = 0.01,
  min,
  max,
  hint,
  readOnly = false,
  onChange,
}: {
  label: string;
  unit: string;
  value: number | null;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
  readOnly?: boolean;
  onChange?: (v: number | null) => void;
}) {
  const displayValue = value != null ? Number(value.toFixed(2)) : "";

  return (
    <div className="py-1.5">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm text-muted-foreground truncate">{label}</span>
        {readOnly ? (
          <span className="w-20 text-right text-sm tabular-nums text-muted-foreground pr-1">
            {value != null ? value.toFixed(2) : "—"}
          </span>
        ) : (
          <input
            type="number"
            step={step}
            min={min}
            max={max}
            placeholder="—"
            value={displayValue}
            onChange={(e) => {
              const v = e.target.value;
              onChange?.(v !== "" ? parseFloat(v) : null);
            }}
            className="w-20 text-right text-sm tabular-nums bg-transparent border border-transparent hover:border-input focus:border-primary rounded px-1.5 py-0.5 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        )}
        <span className="w-7 shrink-0 text-xs text-muted-foreground">{unit}</span>
      </div>
      {hint && <p className="text-xs text-muted-foreground/70 mt-0.5 pl-0">{hint}</p>}
    </div>
  );
}

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

      {/* Status and Priority — compact table */}
      <div className="divide-y divide-border/50">
        <div className="flex items-center gap-3 py-1.5">
          <span className="text-sm text-muted-foreground shrink-0 w-28">{t('rooms.status')}</span>
          <div className="flex-1 min-w-0">
            <Select value={formData.status} onValueChange={(value) => updateFormData({ status: value })}>
              <SelectTrigger id="room-status" className="h-8">
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
        </div>
        <div className="flex items-center gap-3 py-1.5">
          <span className="text-sm text-muted-foreground shrink-0 w-28">{t("rooms.priority")}</span>
          <div className="flex-1 min-w-0">
            <Select value={formData.priority} onValueChange={(value) => updateFormData({ priority: value })}>
              <SelectTrigger id="room-priority" className="h-8">
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
      </div>

      {/* Dimensions — compact table */}
      <div className="pt-2 border-t">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          {t('rooms.dimensions', 'Dimensioner')}
        </p>

        {/* Area mismatch warning */}
        {formData.width_mm && formData.depth_mm && formData.area_sqm !== undefined && (() => {
          const computed = (formData.width_mm! * formData.depth_mm!) / 1_000_000;
          const diff = Math.abs(formData.area_sqm! - computed);
          if (diff < 0.01) return null;
          return (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 mb-2">
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

        <div className="divide-y divide-border/50">
          {/* Bredd */}
          <DimRow
            label={t('rooms.width', 'Bredd')}
            unit="m"
            value={formData.width_mm != null ? formData.width_mm / 1000 : null}
            step={0.01}
            min={0.1}
            onChange={(m) => handleWidthChange(m != null ? Math.round(m * 1000) : undefined)}
          />
          {/* Djup */}
          <DimRow
            label={t('rooms.depth', 'Djup')}
            unit="m"
            value={formData.depth_mm != null ? formData.depth_mm / 1000 : null}
            step={0.01}
            min={0.1}
            onChange={(m) => handleDepthChange(m != null ? Math.round(m * 1000) : undefined)}
          />
          {/* Takhöjd */}
          <DimRow
            label={t('identitySection.ceilingHeight', 'Takhöjd')}
            unit="m"
            value={formData.ceiling_height_mm / 1000}
            step={0.01}
            min={1}
            max={10}
            onChange={(m) => updateFormData({ ceiling_height_mm: m != null ? Math.round(m * 1000) : 2400 })}
          />
          {/* Yta */}
          <DimRow
            label={t('rooms.area', 'Yta')}
            unit="m²"
            value={formData.area_sqm ?? null}
            step={0.01}
            min={0}
            onChange={(v) => updateFormData({ area_sqm: v ?? undefined })}
          />
          {/* Icke-målningsbar yta */}
          <DimRow
            label={t('rooms.nonPaintableArea', 'Icke-mål. yta')}
            unit="m²"
            value={formData.non_paintable_area_sqm ?? null}
            step={0.1}
            min={0}
            hint={t('rooms.nonPaintableAreaHint', 'Fönster, garderober, dörrar m.m.')}
            onChange={(v) => updateFormData({ non_paintable_area_sqm: v ?? undefined })}
          />

          {/* Computed rows — read-only */}
          {wallArea !== null && (
            <DimRow
              label={t('rooms.wallArea', 'Väggarea')}
              unit="m²"
              value={wallArea}
              readOnly
            />
          )}
          {wallArea !== null && formData.non_paintable_area_sqm ? (
            <DimRow
              label={t('rooms.paintableWallArea', 'Målningsbar väggyta')}
              unit="m²"
              value={paintableWallArea ?? null}
              readOnly
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
