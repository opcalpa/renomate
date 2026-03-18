import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ComboboxSelect } from "../fields/ComboboxSelect";
import { MultiSelect } from "../fields/MultiSelect";
import {
  WALL_TREATMENT_OPTIONS,
  DOOR_TYPE_OPTIONS,
  TRIM_TYPE_OPTIONS,
} from "../constants";
import type { SectionProps, WallSpec, JoinerySpec } from "../types";

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

export function VerticalSection({ formData, updateSpec }: SectionProps) {
  const { t } = useTranslation();
  const wallSpec = formData.wall_spec as WallSpec;
  const joinerySpec = formData.joinery_spec as JoinerySpec;

  return (
    <div className="space-y-1">
      {/* Väggar */}
      <SubHeader label={t("rooms.walls")} />
      <div className="divide-y divide-border/50">
        <SpecRow label={t("rooms.surfaceTreatment")}>
          <MultiSelect
            options={WALL_TREATMENT_OPTIONS}
            selected={wallSpec?.treatments || []}
            onChange={(values) => updateSpec("wall_spec", { ...wallSpec, treatments: values })}
            placeholder={t("rooms.selectTreatment")}
          />
        </SpecRow>
        <SpecRow label={t("rooms.mainColor")}>
          <Input
            id="wall-main-color"
            value={wallSpec?.main_color || ""}
            onChange={(e) => updateSpec("wall_spec", { ...wallSpec, main_color: e.target.value })}
            placeholder={t("rooms.colorPlaceholder")}
            className="h-8"
          />
        </SpecRow>
        {/* Accentvägg — checkbox row */}
        <div className="flex items-center gap-3 py-1.5">
          <span className="text-sm text-muted-foreground shrink-0 w-28">{t("rooms.featureWall")}</span>
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
        </div>
        {wallSpec?.has_accent_wall && (
          <SpecRow label={t("rooms.accentWallColor")}>
            <Input
              id="accent-wall-color"
              value={wallSpec?.accent_wall_color || ""}
              onChange={(e) =>
                updateSpec("wall_spec", { ...wallSpec, accent_wall_color: e.target.value })
              }
              placeholder={t("rooms.colorPlaceholder")}
              className="h-8"
            />
          </SpecRow>
        )}
      </div>

      {/* Snickerier */}
      <div className="border-t pt-2">
        <SubHeader label={t("rooms.joinery")} />
      </div>
      <div className="divide-y divide-border/50">
        <SpecRow label={t("rooms.doorType")}>
          <ComboboxSelect
            id="door-type"
            options={DOOR_TYPE_OPTIONS}
            value={joinerySpec?.door_type || ""}
            onChange={(value) => updateSpec("joinery_spec", { ...joinerySpec, door_type: value })}
            placeholder={t("rooms.selectDoorType")}
          />
        </SpecRow>
        <SpecRow label={t("rooms.trimMolding")}>
          <ComboboxSelect
            id="trim-type"
            options={TRIM_TYPE_OPTIONS}
            value={joinerySpec?.trim_type || ""}
            onChange={(value) => updateSpec("joinery_spec", { ...joinerySpec, trim_type: value })}
            placeholder={t("rooms.selectTrimType")}
          />
        </SpecRow>
      </div>
    </div>
  );
}
