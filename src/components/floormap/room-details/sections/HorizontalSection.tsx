import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { ComboboxSelect } from "../fields/ComboboxSelect";
import { MultiSelect } from "../fields/MultiSelect";
import {
  FLOOR_MATERIAL_OPTIONS,
  FLOOR_TREATMENT_OPTIONS,
  SKIRTING_OPTIONS,
  CEILING_MATERIAL_OPTIONS,
  CEILING_MOLDING_OPTIONS,
} from "../constants";
import type { SectionProps, FloorSpec, CeilingSpec } from "../types";

function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm text-muted-foreground shrink-0 w-28 truncate">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function SubHeader({ label }: { label: string }) {
  return (
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1 pb-0.5">
      {label}
    </p>
  );
}

export function HorizontalSection({ formData, updateSpec }: SectionProps) {
  const { t } = useTranslation();
  const floorSpec = formData.floor_spec as FloorSpec;
  const ceilingSpec = formData.ceiling_spec as CeilingSpec;

  return (
    <div className="space-y-1">
      {/* Golv */}
      <SubHeader label={t("rooms.floorLabel")} />
      <div className="divide-y divide-border/50">
        <SpecRow label={t("rooms.material")}>
          <ComboboxSelect
            id="floor-material"
            options={FLOOR_MATERIAL_OPTIONS}
            value={floorSpec?.material || ""}
            onChange={(value) => updateSpec("floor_spec", { ...floorSpec, material: value })}
            placeholder={t("rooms.selectFloorMaterial")}
          />
        </SpecRow>
        <SpecRow label={t("rooms.specification")}>
          <Input
            id="floor-spec"
            value={floorSpec?.specification || ""}
            onChange={(e) => updateSpec("floor_spec", { ...floorSpec, specification: e.target.value })}
            placeholder={t("rooms.specPlaceholder")}
            className="h-8"
          />
        </SpecRow>
        <SpecRow label={t("rooms.treatment")}>
          <MultiSelect
            options={FLOOR_TREATMENT_OPTIONS}
            selected={floorSpec?.treatments || []}
            onChange={(values) => updateSpec("floor_spec", { ...floorSpec, treatments: values })}
            placeholder={t("rooms.selectTreatments")}
          />
        </SpecRow>
        <SpecRow label={t("rooms.skirtingType")}>
          <ComboboxSelect
            id="skirting-type"
            options={SKIRTING_OPTIONS}
            value={floorSpec?.skirting_type || ""}
            onChange={(value) => updateSpec("floor_spec", { ...floorSpec, skirting_type: value })}
            placeholder={t("rooms.selectSkirtingType")}
          />
        </SpecRow>
        <SpecRow label={t("rooms.skirtingColor")}>
          <Input
            id="skirting-color"
            value={floorSpec?.skirting_color || ""}
            onChange={(e) => updateSpec("floor_spec", { ...floorSpec, skirting_color: e.target.value })}
            placeholder={t("rooms.colorPlaceholder")}
            className="h-8"
          />
        </SpecRow>
      </div>

      {/* Tak */}
      <div className="border-t pt-2">
        <SubHeader label={t("rooms.ceiling")} />
      </div>
      <div className="divide-y divide-border/50">
        <SpecRow label={t("rooms.material")}>
          <ComboboxSelect
            id="ceiling-material"
            options={CEILING_MATERIAL_OPTIONS}
            value={ceilingSpec?.material || ""}
            onChange={(value) => updateSpec("ceiling_spec", { ...ceilingSpec, material: value })}
            placeholder={t("rooms.selectCeilingMaterial")}
          />
        </SpecRow>
        <SpecRow label={t("rooms.ceilingColor")}>
          <Input
            id="ceiling-color"
            value={ceilingSpec?.color || ""}
            onChange={(e) => updateSpec("ceiling_spec", { ...ceilingSpec, color: e.target.value })}
            placeholder={t("rooms.ceilingColorPlaceholder")}
            className="h-8"
          />
        </SpecRow>
        <SpecRow label={t("rooms.ceilingMolding")}>
          <ComboboxSelect
            id="ceiling-molding"
            options={CEILING_MOLDING_OPTIONS}
            value={ceilingSpec?.molding_type || ""}
            onChange={(value) => updateSpec("ceiling_spec", { ...ceilingSpec, molding_type: value })}
            placeholder={t("rooms.selectCeilingMolding")}
          />
        </SpecRow>
      </div>
    </div>
  );
}
