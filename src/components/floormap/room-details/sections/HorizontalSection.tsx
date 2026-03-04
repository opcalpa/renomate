import { useTranslation } from "react-i18next";
import { Layers } from "lucide-react";
import { Label } from "@/components/ui/label";
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

export function HorizontalSection({
  formData,
  updateSpec,
}: SectionProps) {
  const { t } = useTranslation();
  const floorSpec = formData.floor_spec as FloorSpec;
  const ceilingSpec = formData.ceiling_spec as CeilingSpec;

  return (
    <div className="space-y-6">
      {/* Floor Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Layers className="h-4 w-4" />
          <span>{t('rooms.floorLabel')}</span>
        </div>

        <div className="grid gap-4 pl-6">
          {/* Floor material */}
          <div className="space-y-2">
            <Label htmlFor="floor-material">{t('rooms.material')}</Label>
            <ComboboxSelect
              id="floor-material"
              options={FLOOR_MATERIAL_OPTIONS}
              value={floorSpec?.material || ""}
              onChange={(value) =>
                updateSpec("floor_spec", { ...floorSpec, material: value })
              }
              placeholder={t('rooms.selectFloorMaterial')}
            />
          </div>

          {/* Floor specification (free text) */}
          <div className="space-y-2">
            <Label htmlFor="floor-spec">{t('rooms.specification')}</Label>
            <Input
              id="floor-spec"
              value={floorSpec?.specification || ""}
              onChange={(e) =>
                updateSpec("floor_spec", { ...floorSpec, specification: e.target.value })
              }
              placeholder={t('rooms.specPlaceholder')}
            />
          </div>

          {/* Floor treatments (multi-select) */}
          <div className="space-y-2">
            <Label id="floor-treatments-label">{t('rooms.treatment')}</Label>
            <MultiSelect
              options={FLOOR_TREATMENT_OPTIONS}
              selected={floorSpec?.treatments || []}
              onChange={(values) =>
                updateSpec("floor_spec", { ...floorSpec, treatments: values })
              }
              placeholder={t('rooms.selectTreatments')}
            />
          </div>

          {/* Skirting */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="skirting-type">{t('rooms.skirtingType')}</Label>
              <ComboboxSelect
                id="skirting-type"
                options={SKIRTING_OPTIONS}
                value={floorSpec?.skirting_type || ""}
                onChange={(value) =>
                  updateSpec("floor_spec", { ...floorSpec, skirting_type: value })
                }
                placeholder={t('rooms.selectSkirtingType')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skirting-color">{t('rooms.skirtingColor')}</Label>
              <Input
                id="skirting-color"
                value={floorSpec?.skirting_color || ""}
                onChange={(e) =>
                  updateSpec("floor_spec", { ...floorSpec, skirting_color: e.target.value })
                }
                placeholder={t('rooms.colorPlaceholder')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Ceiling Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Layers className="h-4 w-4 rotate-180" />
          <span>{t('rooms.ceiling')}</span>
        </div>

        <div className="grid gap-4 pl-6">
          {/* Ceiling material */}
          <div className="space-y-2">
            <Label htmlFor="ceiling-material">{t('rooms.material')}</Label>
            <ComboboxSelect
              id="ceiling-material"
              options={CEILING_MATERIAL_OPTIONS}
              value={ceilingSpec?.material || ""}
              onChange={(value) =>
                updateSpec("ceiling_spec", { ...ceilingSpec, material: value })
              }
              placeholder={t('rooms.selectCeilingMaterial')}
            />
          </div>

          {/* Ceiling color */}
          <div className="space-y-2">
            <Label htmlFor="ceiling-color">{t('rooms.ceilingColor')}</Label>
            <Input
              id="ceiling-color"
              value={ceilingSpec?.color || ""}
              onChange={(e) =>
                updateSpec("ceiling_spec", { ...ceilingSpec, color: e.target.value })
              }
              placeholder={t('rooms.ceilingColorPlaceholder')}
            />
          </div>

          {/* Ceiling molding */}
          <div className="space-y-2">
            <Label htmlFor="ceiling-molding">{t('rooms.ceilingMolding')}</Label>
            <ComboboxSelect
              id="ceiling-molding"
              options={CEILING_MOLDING_OPTIONS}
              value={ceilingSpec?.molding_type || ""}
              onChange={(value) =>
                updateSpec("ceiling_spec", { ...ceilingSpec, molding_type: value })
              }
              placeholder={t('rooms.selectCeilingMolding')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
