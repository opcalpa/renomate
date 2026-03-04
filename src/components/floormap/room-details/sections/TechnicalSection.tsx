import { useTranslation } from "react-i18next";
import { Zap, Thermometer } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ComboboxSelect } from "../fields/ComboboxSelect";
import { MultiSelect } from "../fields/MultiSelect";
import {
  ELECTRICAL_SERIES_OPTIONS,
  OUTLET_TYPE_OPTIONS,
  LIGHTING_TYPE_OPTIONS,
  HEATING_TYPE_OPTIONS,
} from "../constants";
import type { SectionProps, ElectricalSpec, HeatingSpec } from "../types";

export function TechnicalSection({
  formData,
  updateSpec,
}: SectionProps) {
  const { t } = useTranslation();
  const electricalSpec = formData.electrical_spec as ElectricalSpec;
  const heatingSpec = formData.heating_spec as HeatingSpec;

  return (
    <div className="space-y-6">
      {/* Electrical Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Zap className="h-4 w-4" />
          <span>{t('rooms.electricalAndLighting')}</span>
        </div>

        <div className="grid gap-4 pl-6">
          {/* Electrical series */}
          <div className="space-y-2">
            <Label htmlFor="electrical-series">{t('rooms.series')}</Label>
            <ComboboxSelect
              id="electrical-series"
              options={ELECTRICAL_SERIES_OPTIONS}
              value={electricalSpec?.series || ""}
              onChange={(value) =>
                updateSpec("electrical_spec", { ...electricalSpec, series: value })
              }
              placeholder={t('rooms.selectSeries')}
            />
          </div>

          {/* Outlet/switch types (multi-select) */}
          <div className="space-y-2">
            <Label id="outlet-types-label">{t('rooms.outletsAndSwitches')}</Label>
            <MultiSelect
              options={OUTLET_TYPE_OPTIONS}
              selected={electricalSpec?.outlet_types || []}
              onChange={(values) =>
                updateSpec("electrical_spec", { ...electricalSpec, outlet_types: values })
              }
              placeholder={t('rooms.selectOutletTypes')}
            />
          </div>

          {/* Lighting types (multi-select) */}
          <div className="space-y-2">
            <Label id="lighting-types-label">{t('rooms.lightingType')}</Label>
            <MultiSelect
              options={LIGHTING_TYPE_OPTIONS}
              selected={electricalSpec?.lighting_types || []}
              onChange={(values) =>
                updateSpec("electrical_spec", { ...electricalSpec, lighting_types: values })
              }
              placeholder={t('rooms.selectLightingTypes')}
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Heating Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Thermometer className="h-4 w-4" />
          <span>{t('rooms.heating')}</span>
        </div>

        <div className="grid gap-4 pl-6">
          {/* Heating type */}
          <div className="space-y-2">
            <Label htmlFor="heating-type">{t('rooms.heatingType')}</Label>
            <ComboboxSelect
              id="heating-type"
              options={HEATING_TYPE_OPTIONS}
              value={heatingSpec?.type || ""}
              onChange={(value) =>
                updateSpec("heating_spec", { ...heatingSpec, type: value })
              }
              placeholder={t('rooms.selectHeatingType')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
