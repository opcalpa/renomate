import { useTranslation } from "react-i18next";
import { Square, DoorOpen } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "../fields/MultiSelect";
import {
  WALL_TREATMENT_OPTIONS,
  DOOR_TYPE_OPTIONS,
  TRIM_TYPE_OPTIONS,
} from "../constants";
import type { SectionProps, WallSpec, JoinerySpec } from "../types";

export function VerticalSection({
  formData,
  updateSpec,
}: SectionProps) {
  const { t } = useTranslation();
  const wallSpec = formData.wall_spec as WallSpec;
  const joinerySpec = formData.joinery_spec as JoinerySpec;

  return (
    <div className="space-y-6">
      {/* Walls Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Square className="h-4 w-4" />
          <span>{t('rooms.walls')}</span>
        </div>

        <div className="grid gap-4 pl-6">
          {/* Wall treatments (multi-select) */}
          <div className="space-y-2">
            <Label id="wall-treatments-label">{t('rooms.surfaceTreatment')}</Label>
            <MultiSelect
              options={WALL_TREATMENT_OPTIONS}
              selected={wallSpec?.treatments || []}
              onChange={(values) =>
                updateSpec("wall_spec", { ...wallSpec, treatments: values })
              }
              placeholder={t('rooms.selectTreatment')}
            />
          </div>

          {/* Main wall color */}
          <div className="space-y-2">
            <Label htmlFor="wall-main-color">{t('rooms.mainColor')}</Label>
            <Input
              id="wall-main-color"
              value={wallSpec?.main_color || ""}
              onChange={(e) =>
                updateSpec("wall_spec", { ...wallSpec, main_color: e.target.value })
              }
              placeholder={t('rooms.colorPlaceholder')}
            />
          </div>

          {/* Accent wall checkbox + conditional color */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-accent-wall"
                checked={wallSpec?.has_accent_wall || false}
                onCheckedChange={(checked) =>
                  updateSpec("wall_spec", {
                    ...wallSpec,
                    has_accent_wall: checked as boolean,
                    accent_wall_color: checked ? wallSpec?.accent_wall_color : undefined,
                  })
                }
              />
              <Label htmlFor="has-accent-wall" className="cursor-pointer">
                {t('rooms.featureWall')}
              </Label>
            </div>

            {wallSpec?.has_accent_wall && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="accent-wall-color">{t('rooms.accentWallColor')}</Label>
                <Input
                  id="accent-wall-color"
                  value={wallSpec?.accent_wall_color || ""}
                  onChange={(e) =>
                    updateSpec("wall_spec", {
                      ...wallSpec,
                      accent_wall_color: e.target.value,
                    })
                  }
                  placeholder={t('rooms.colorPlaceholder')}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Joinery Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <DoorOpen className="h-4 w-4" />
          <span>{t('rooms.joinery')}</span>
        </div>

        <div className="grid gap-4 pl-6">
          {/* Door type */}
          <div className="space-y-2">
            <Label htmlFor="door-type">{t('rooms.doorType')}</Label>
            <Select
              value={joinerySpec?.door_type || ""}
              onValueChange={(value) =>
                updateSpec("joinery_spec", { ...joinerySpec, door_type: value })
              }
            >
              <SelectTrigger id="door-type">
                <SelectValue placeholder={t('rooms.selectDoorType')} />
              </SelectTrigger>
              <SelectContent>
                {DOOR_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Trim type */}
          <div className="space-y-2">
            <Label htmlFor="trim-type">{t('rooms.trimMolding')}</Label>
            <Select
              value={joinerySpec?.trim_type || ""}
              onValueChange={(value) =>
                updateSpec("joinery_spec", { ...joinerySpec, trim_type: value })
              }
            >
              <SelectTrigger id="trim-type">
                <SelectValue placeholder={t('rooms.selectTrimType')} />
              </SelectTrigger>
              <SelectContent>
                {TRIM_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
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
