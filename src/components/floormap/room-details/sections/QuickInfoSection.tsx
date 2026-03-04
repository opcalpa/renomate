import { useTranslation } from "react-i18next";
import { Calculator, Package, PaintBucket } from "lucide-react";
import { FLOOR_MATERIAL_OPTIONS } from "../constants";
import type { RoomFormData, FloorSpec } from "../types";

interface QuickInfoSectionProps {
  formData: RoomFormData;
  updateFormData: (updates: Partial<RoomFormData>) => void;
  areaSqm: number | null | undefined;
  perimeterMm: number | null | undefined;
}

export function QuickInfoSection({
  formData,
  areaSqm,
  perimeterMm,
}: QuickInfoSectionProps) {
  const { t } = useTranslation();
  const floorSpec = formData.floor_spec as FloorSpec;

  // Calculate estimates
  const floorMaterialOption = FLOOR_MATERIAL_OPTIONS.find(
    (o) => o.value === floorSpec?.material
  );
  const floorMaterialLabel = floorMaterialOption
    ? t(floorMaterialOption.labelKey)
    : null;
  const floorAreaWithWaste = areaSqm ? (areaSqm * 1.1).toFixed(1) : null;

  const ceilingHeightM = formData.ceiling_height_mm / 1000;
  const totalWallArea = perimeterMm ? (perimeterMm / 1000) * ceilingHeightM : 0;
  const paintableWallArea = formData.non_paintable_area_sqm
    ? Math.max(0, totalWallArea - formData.non_paintable_area_sqm)
    : totalWallArea;
  const paintLiters = paintableWallArea > 0 ? Math.ceil((paintableWallArea / 10) * 2) : null;

  const hasEstimates = (floorMaterialLabel && floorAreaWithWaste) || paintLiters;

  // Don't render if there are no estimates to show
  if (!hasEstimates) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
        <Calculator className="h-4 w-4" />
        <span>{t("rooms.materialEstimates", "Materialberäkning")}</span>
      </div>

      <div className="space-y-1.5 text-sm">
        {floorMaterialLabel && floorAreaWithWaste && (
          <div className="flex items-center gap-2 text-blue-700">
            <Package className="h-3.5 w-3.5 text-amber-600" />
            <span>
              {floorMaterialLabel}: <strong>{floorAreaWithWaste} m²</strong>{" "}
              <span className="text-blue-500">({t("rooms.inclWaste")})</span>
            </span>
          </div>
        )}
        {paintLiters && (
          <div className="flex items-center gap-2 text-blue-700">
            <PaintBucket className="h-3.5 w-3.5 text-blue-600" />
            <span>
              {t("rooms.wallPaintShort")}: <strong>~{paintLiters} L</strong>{" "}
              <span className="text-blue-500">({t("rooms.twoCoats")})</span>
            </span>
          </div>
        )}
      </div>

      <p className="text-xs text-blue-600">
        {t("rooms.estimatesDisclaimer")}
      </p>
    </div>
  );
}
