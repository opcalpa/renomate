import { Zap, Thermometer } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const electricalSpec = formData.electrical_spec as ElectricalSpec;
  const heatingSpec = formData.heating_spec as HeatingSpec;

  return (
    <div className="space-y-6">
      {/* Electrical Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Zap className="h-4 w-4" />
          <span>El & Belysning</span>
        </div>

        <div className="grid gap-4 pl-6">
          {/* Electrical series */}
          <div className="space-y-2">
            <Label htmlFor="electrical-series">Serie</Label>
            <Select
              value={electricalSpec?.series || ""}
              onValueChange={(value) =>
                updateSpec("electrical_spec", { ...electricalSpec, series: value })
              }
            >
              <SelectTrigger id="electrical-series">
                <SelectValue placeholder="Välj serie" />
              </SelectTrigger>
              <SelectContent>
                {ELECTRICAL_SERIES_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Outlet/switch types (multi-select) */}
          <div className="space-y-2">
            <Label id="outlet-types-label">Uttag & Brytare</Label>
            <MultiSelect
              options={OUTLET_TYPE_OPTIONS}
              selected={electricalSpec?.outlet_types || []}
              onChange={(values) =>
                updateSpec("electrical_spec", { ...electricalSpec, outlet_types: values })
              }
              placeholder="Välj typer av uttag/brytare"
            />
          </div>

          {/* Lighting types (multi-select) */}
          <div className="space-y-2">
            <Label id="lighting-types-label">Belysningstyp</Label>
            <MultiSelect
              options={LIGHTING_TYPE_OPTIONS}
              selected={electricalSpec?.lighting_types || []}
              onChange={(values) =>
                updateSpec("electrical_spec", { ...electricalSpec, lighting_types: values })
              }
              placeholder="Välj belysningstyper"
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
          <span>Värme</span>
        </div>

        <div className="grid gap-4 pl-6">
          {/* Heating type */}
          <div className="space-y-2">
            <Label htmlFor="heating-type">Typ</Label>
            <Select
              value={heatingSpec?.type || ""}
              onValueChange={(value) =>
                updateSpec("heating_spec", { ...heatingSpec, type: value })
              }
            >
              <SelectTrigger id="heating-type">
                <SelectValue placeholder="Välj värmetyp" />
              </SelectTrigger>
              <SelectContent>
                {HEATING_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
