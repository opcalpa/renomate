import { useTranslation } from "react-i18next";
import { Package, PaintBucket, StickyNote, ChevronDown, ChevronUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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
  updateFormData,
  areaSqm,
  perimeterMm,
}: QuickInfoSectionProps) {
  const { t } = useTranslation();
  const [notesExpanded, setNotesExpanded] = useState(!!formData.notes);
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
  const wallArea = perimeterMm ? (perimeterMm / 1000) * ceilingHeightM : 0;
  const paintLiters = wallArea > 0 ? Math.ceil((wallArea / 10) * 2) : null;

  const hasEstimates = (floorMaterialLabel && floorAreaWithWaste) || paintLiters;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <Package className="h-4 w-4" />
        <span>{t("rooms.quickInfo")}</span>
      </div>

      {/* Material estimates - always visible if available */}
      {hasEstimates && (
        <div className="space-y-1.5 text-sm">
          {floorMaterialLabel && floorAreaWithWaste && (
            <div className="flex items-center gap-2 text-slate-600">
              <Package className="h-3.5 w-3.5 text-amber-600" />
              <span>
                {floorMaterialLabel}: <strong>{floorAreaWithWaste} m²</strong>{" "}
                <span className="text-slate-400">({t("rooms.inclWaste")})</span>
              </span>
            </div>
          )}
          {paintLiters && (
            <div className="flex items-center gap-2 text-slate-600">
              <PaintBucket className="h-3.5 w-3.5 text-blue-600" />
              <span>
                {t("rooms.wallPaintShort")}: <strong>~{paintLiters} L</strong>{" "}
                <span className="text-slate-400">({t("rooms.twoCoats")})</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Quick notes - collapsible */}
      <div className="pt-2 border-t border-slate-200">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-between px-0 h-auto py-1 text-slate-600 hover:text-slate-900 hover:bg-transparent"
          onClick={() => setNotesExpanded(!notesExpanded)}
        >
          <span className="flex items-center gap-2">
            <StickyNote className="h-3.5 w-3.5" />
            {t("rooms.quickNote")}
            {formData.notes && !notesExpanded && (
              <span className="text-xs text-slate-400 truncate max-w-[200px]">
                — {formData.notes.slice(0, 40)}...
              </span>
            )}
          </span>
          {notesExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {notesExpanded && (
          <Textarea
            value={formData.notes || ""}
            onChange={(e) => updateFormData({ notes: e.target.value })}
            placeholder={t("rooms.quickNotePlaceholder")}
            rows={3}
            className="mt-2 resize-none text-sm"
          />
        )}
      </div>
    </div>
  );
}
