import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle, ChevronDown, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { countFilledFields } from "../utils/countFilledFields";
import type { RoomFormData, FloorSpec, CeilingSpec, WallSpec, ElectricalSpec, HeatingSpec } from "../types";

interface SpecSummarySectionProps {
  formData: RoomFormData;
  onExpandSection?: (sectionId: string) => void;
}

interface SummaryItem {
  id: string;
  label: string;
  value: string | null;
  isEmpty: boolean;
}

export function SpecSummarySection({ formData, onExpandSection }: SpecSummarySectionProps) {
  const { t } = useTranslation();
  const counts = countFilledFields(formData);

  // Build summary items
  const items: SummaryItem[] = [];

  // Floor
  const floorSpec = formData.floor_spec as FloorSpec | undefined;
  if (floorSpec?.material || floorSpec?.specification) {
    const parts: string[] = [];
    if (floorSpec.material) parts.push(t(`materials.${floorSpec.material}`, floorSpec.material));
    if (floorSpec.specification) parts.push(floorSpec.specification);
    items.push({
      id: "floor-ceiling",
      label: t("rooms.floorLabel", "Golv"),
      value: parts.join(" - "),
      isEmpty: false,
    });
  }

  // Ceiling
  const ceilingSpec = formData.ceiling_spec as CeilingSpec | undefined;
  if (ceilingSpec?.material || ceilingSpec?.color) {
    const parts: string[] = [];
    if (ceilingSpec.material) parts.push(t(`materials.${ceilingSpec.material}`, ceilingSpec.material));
    if (ceilingSpec.color) parts.push(ceilingSpec.color);
    items.push({
      id: "floor-ceiling",
      label: t("rooms.ceiling", "Tak"),
      value: parts.join(", "),
      isEmpty: false,
    });
  }

  // Walls
  const wallSpec = formData.wall_spec as WallSpec | undefined;
  if (wallSpec?.treatments?.length || wallSpec?.main_color) {
    const parts: string[] = [];
    if (wallSpec.treatments?.length) {
      parts.push(wallSpec.treatments.map((tr) => t(`treatments.${tr}`, tr)).join(", "));
    }
    if (wallSpec.main_color) parts.push(wallSpec.main_color);
    items.push({
      id: "walls-joinery",
      label: t("rooms.walls", "Väggar"),
      value: parts.join(", "),
      isEmpty: false,
    });
  }

  // Electrical
  const electricalSpec = formData.electrical_spec as ElectricalSpec | undefined;
  if (electricalSpec?.series || electricalSpec?.outlet_types?.length || electricalSpec?.lighting_types?.length) {
    const parts: string[] = [];
    if (electricalSpec.series) parts.push(t(`electrical.${electricalSpec.series}`, electricalSpec.series));
    if (electricalSpec.outlet_types?.length) parts.push(`${electricalSpec.outlet_types.length} uttagstyper`);
    if (electricalSpec.lighting_types?.length) parts.push(`${electricalSpec.lighting_types.length} belysningstyper`);
    items.push({
      id: "electrical-heating",
      label: t("rooms.electricalShort", "El"),
      value: parts.join(", "),
      isEmpty: false,
    });
  }

  // Heating
  const heatingSpec = formData.heating_spec as HeatingSpec | undefined;
  if (heatingSpec?.type) {
    items.push({
      id: "electrical-heating",
      label: t("rooms.heatingShort", "Värme"),
      value: t(`heating.${heatingSpec.type}`, heatingSpec.type),
      isEmpty: false,
    });
  }

  // Add empty placeholders for unfilled sections
  const emptyCategories: Array<{ id: string; label: string }> = [];

  if (counts.floorCeiling.filled === 0) {
    emptyCategories.push({ id: "floor-ceiling", label: t("rooms.floorAndCeiling", "Golv & Tak") });
  }
  if (counts.wallsJoinery.filled === 0) {
    emptyCategories.push({ id: "walls-joinery", label: t("rooms.wallsAndJoinery", "Väggar & Snickerier") });
  }
  if (counts.electricalHeating.filled === 0) {
    emptyCategories.push({ id: "electrical-heating", label: t("rooms.electricalAndHeating", "El & Värme") });
  }

  const totalFilled = counts.floorCeiling.filled + counts.wallsJoinery.filled + counts.electricalHeating.filled;
  const totalFields = counts.floorCeiling.total + counts.wallsJoinery.total + counts.electricalHeating.total;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <ListChecks className="h-4 w-4" />
          <span>{t("rooms.specSummary", "Specifikationer")}</span>
        </div>
        <span className="text-xs text-slate-500">
          {totalFilled}/{totalFields} {t("rooms.fieldsFilledShort", "ifyllda")}
        </span>
      </div>

      {/* Filled items */}
      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onExpandSection?.(item.id)}
              className="w-full flex items-start gap-2 text-sm text-left hover:bg-slate-100 rounded p-1 -mx-1 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span className="text-slate-700">
                <span className="font-medium">{item.label}:</span>{" "}
                <span className="text-slate-600">{item.value}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Empty categories */}
      {emptyCategories.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-slate-200">
          {emptyCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onExpandSection?.(cat.id)}
              className="w-full flex items-center gap-2 text-sm text-left hover:bg-slate-100 rounded p-1 -mx-1 transition-colors"
            >
              <Circle className="h-4 w-4 text-slate-300 flex-shrink-0" />
              <span className="text-slate-400">{cat.label}</span>
              <ChevronDown className="h-3 w-3 text-slate-300 ml-auto" />
            </button>
          ))}
        </div>
      )}

      {/* All empty state */}
      {items.length === 0 && emptyCategories.length === 0 && (
        <p className="text-sm text-slate-400">
          {t("rooms.noSpecsYet", "Inga specifikationer ännu")}
        </p>
      )}
    </div>
  );
}
