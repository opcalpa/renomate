import { useTranslation } from "react-i18next";
import { Calculator, Link2, FileText, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_OPTIONS, FLOOR_MATERIAL_OPTIONS } from "../constants";
import type { SmartDataSectionProps, FloorSpec } from "../types";

export function SmartDataSection({
  formData,
  updateFormData,
  areaSqm,
  perimeterMm,
}: SmartDataSectionProps) {
  const { t } = useTranslation();
  const floorSpec = formData.floor_spec as FloorSpec;

  // Calculate material estimates
  const calculateMaterialEstimates = () => {
    if (!areaSqm) return null;

    const floorMaterial = floorSpec?.material;
    const floorMaterialOption = FLOOR_MATERIAL_OPTIONS.find(
      (o) => o.value === floorMaterial
    );
    const floorMaterialLabel = floorMaterialOption ? t(floorMaterialOption.labelKey) : undefined;

    // Add 10% waste factor for flooring
    const floorAreaWithWaste = areaSqm * 1.1;

    // Skirting calculation (perimeter in meters)
    const skirtingMeters = perimeterMm ? perimeterMm / 1000 : 0;
    // Add 10% for cuts and waste
    const skirtingWithWaste = skirtingMeters * 1.1;

    // Paint calculation (walls) - rough estimate
    // Assuming ceiling height, 2 coats, ~10m²/L coverage
    const ceilingHeightM = formData.ceiling_height_mm / 1000;
    const wallArea = perimeterMm ? (perimeterMm / 1000) * ceilingHeightM : 0;
    const paintLiters = Math.ceil(wallArea / 10 * 2); // 2 coats, 10m²/L

    // Ceiling paint
    const ceilingPaintLiters = Math.ceil(areaSqm / 10 * 2);

    return {
      floorMaterialLabel,
      floorAreaWithWaste,
      skirtingWithWaste,
      paintLiters,
      ceilingPaintLiters,
      wallArea,
    };
  };

  const estimates = calculateMaterialEstimates();

  return (
    <div className="space-y-6">
      {/* Material Estimates (read-only) */}
      {estimates && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Calculator className="h-4 w-4" />
            <span>{t('rooms.materialConsumption')}</span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {estimates.floorMaterialLabel && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {t('rooms.floor')} ({estimates.floorMaterialLabel}):
                </span>
                <span className="font-medium">
                  {estimates.floorAreaWithWaste.toFixed(1)} m² ({t('rooms.inclWaste')})
                </span>
              </div>
            )}

            {estimates.skirtingWithWaste > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('rooms.skirting')}:</span>
                <span className="font-medium">
                  {estimates.skirtingWithWaste.toFixed(1)} m ({t('rooms.inclWasteShort')})
                </span>
              </div>
            )}

            {estimates.paintLiters > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {t('rooms.wallPaint')} ({estimates.wallArea.toFixed(1)} m²):
                </span>
                <span className="font-medium">
                  ~{estimates.paintLiters} L ({t('rooms.coats')})
                </span>
              </div>
            )}

            {areaSqm && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {t('rooms.ceilingPaint')} ({areaSqm.toFixed(1)} m²):
                </span>
                <span className="font-medium">
                  ~{estimates.ceilingPaintLiters} L ({t('rooms.coats')})
                </span>
              </div>
            )}

            <div className="pt-2 border-t mt-2">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t('rooms.estimatesDisclaimer')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-t" />

      {/* Priority */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-gray-600" />
          <Label htmlFor="room-priority">{t('rooms.priority')}</Label>
        </div>
        <Select
          value={formData.priority}
          onValueChange={(value) => updateFormData({ priority: value })}
        >
          <SelectTrigger id="room-priority">
            <SelectValue placeholder={t('rooms.selectPriority', 'Select priority')} />
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

      {/* Links */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-gray-600" />
          <Label htmlFor="links">{t('rooms.links')}</Label>
        </div>
        <Input
          id="links"
          type="url"
          value={formData.links || ""}
          onChange={(e) => updateFormData({ links: e.target.value })}
          placeholder="https://..."
        />
        <p className="text-xs text-gray-500">
          {t('rooms.linksDescription')}
        </p>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-600" />
          <Label htmlFor="notes">{t('rooms.notesLabel')}</Label>
        </div>
        <Textarea
          id="notes"
          value={formData.notes || ""}
          onChange={(e) => updateFormData({ notes: e.target.value })}
          placeholder={t('rooms.notesPlaceholder')}
          rows={6}
          className="resize-none"
        />
      </div>
    </div>
  );
}
