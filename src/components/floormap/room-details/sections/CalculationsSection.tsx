import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseEstimationSettings } from "@/lib/materialRecipes";
import type { RecipeEstimationSettings } from "@/lib/materialRecipes";
import type { RoomFormData } from "../types";

interface CalculationsSectionProps {
  formData: RoomFormData;
  areaSqm: number | null | undefined;
  perimeterMm: number | null | undefined;
}

// Inline editable number within a formula string
function InlineNum({
  value,
  onChange,
  unit,
  min = 0.1,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  step?: number;
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v) && v > 0) onChange(v);
        }}
        className="w-10 text-center text-xs font-semibold text-primary underline underline-offset-2 bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-pointer hover:text-primary/80"
      />
      {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
    </span>
  );
}

// Save-to-profile prompt shown when a value differs from profile default
function SavePrompt({
  label,
  onSave,
  onDismiss,
}: {
  label: string;
  onSave: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 rounded px-2.5 py-1.5 mt-1">
      <span className="flex-1 text-blue-700">{label}</span>
      <button
        type="button"
        onClick={onSave}
        className="text-blue-800 font-medium hover:underline shrink-0"
      >
        Spara
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="text-blue-500 hover:underline shrink-0"
      >
        Avfärda
      </button>
    </div>
  );
}

export function CalculationsSection({
  formData,
  areaSqm,
  perimeterMm,
}: CalculationsSectionProps) {
  const { t } = useTranslation();

  const [profileSettings, setProfileSettings] =
    useState<RecipeEstimationSettings | null>(null);

  // Local editable overrides
  const [wallCoats, setWallCoats] = useState(2);
  const [wallCoverage, setWallCoverage] = useState(10);
  const [ceilCoats, setCeilCoats] = useState(2);
  const [ceilCoverage, setCeilCoverage] = useState(10);
  const [floorWaste, setFloorWaste] = useState(10); // percent

  // Track pending save prompts
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());

  // Load profile defaults on mount
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("estimation_settings")
        .eq("user_id", user.id)
        .single();
      if (data?.estimation_settings) {
        const s = parseEstimationSettings(
          data.estimation_settings as Record<string, unknown>
        );
        setProfileSettings(s);
        setWallCoats(s.paint_coats);
        setWallCoverage(s.paint_coverage_sqm_per_liter);
        setCeilCoats(s.paint_coats);
        setCeilCoverage(s.paint_coverage_sqm_per_liter);
      }
    })();
  }, []);

  const markChanged = (key: string) =>
    setPendingSaves((prev) => new Set(prev).add(key));
  const dismissSave = (key: string) =>
    setPendingSaves((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

  const saveToProfile = async (key: string, value: number) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const updated = { ...(profileSettings ?? {}), [key]: value };
      await supabase
        .from("profiles")
        .update({ estimation_settings: updated })
        .eq("user_id", user.id);
      setProfileSettings(
        parseEstimationSettings(updated as Record<string, unknown>)
      );
      dismissSave(key);
      toast.success(t("materialRecipes.defaultSaved", "Sparad som standard"));
    } catch {
      toast.error(t("common.errorSaving", "Kunde inte spara"));
    }
  };

  // ── Derived values ──────────────────────────────────────────────────────
  const effectiveArea = formData.area_sqm ?? areaSqm ?? null;
  const perimM = perimeterMm ? perimeterMm / 1000 : null;
  const ceilingM = formData.ceiling_height_mm / 1000;
  const totalWallArea = perimM ? perimM * ceilingM : null;
  const paintableWall =
    totalWallArea !== null
      ? Math.max(0, totalWallArea - (formData.non_paintable_area_sqm ?? 0))
      : null;

  const wallPaintL =
    paintableWall !== null && wallCoverage > 0
      ? Math.ceil((paintableWall * wallCoats) / wallCoverage)
      : null;
  const ceilPaintL =
    effectiveArea !== null && ceilCoverage > 0
      ? Math.ceil((effectiveArea * ceilCoats) / ceilCoverage)
      : null;
  const floorMaterialSqm =
    effectiveArea !== null
      ? +(effectiveArea * (1 + floorWaste / 100)).toFixed(1)
      : null;
  const skirtingM = perimM !== null ? Math.ceil(perimM) : null;

  // Helper: label row for a calculation result
  function CalcResultRow({
    label,
    result,
    unit,
    missing,
  }: {
    label: string;
    result: string | null;
    unit: string;
    missing?: boolean;
  }) {
    return (
      <div className="flex items-center justify-between py-0.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        {missing || result === null ? (
          <span className="text-xs text-muted-foreground/40 italic">
            {t("rooms.missingDimensions", "Saknar mått")}
          </span>
        ) : (
          <span className="text-sm font-semibold tabular-nums">
            {result} <span className="font-normal text-muted-foreground">{unit}</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">

      {/* ── Väggfärg ─────────────────────────────────────── */}
      <div className="space-y-1">
        <CalcResultRow
          label={t("rooms.calcWallPaint", "Väggfärg")}
          result={wallPaintL !== null ? `~${wallPaintL}` : null}
          unit="L"
          missing={paintableWall === null}
        />
        {paintableWall !== null && (
          <p className="text-xs text-muted-foreground/70 leading-relaxed">
            {paintableWall.toFixed(1)} m² ×{" "}
            <InlineNum
              value={wallCoats}
              step={1}
              min={1}
              onChange={(v) => {
                setWallCoats(v);
                if (profileSettings && v !== profileSettings.paint_coats)
                  markChanged("wall_coats");
                else dismissSave("wall_coats");
              }}
              unit={t("rooms.coats", "lager")}
            />{" "}
            ÷{" "}
            <InlineNum
              value={wallCoverage}
              step={1}
              min={1}
              onChange={(v) => {
                setWallCoverage(v);
                if (
                  profileSettings &&
                  v !== profileSettings.paint_coverage_sqm_per_liter
                )
                  markChanged("wall_coverage");
                else dismissSave("wall_coverage");
              }}
              unit="m²/L"
            />
          </p>
        )}
        {pendingSaves.has("wall_coats") && (
          <SavePrompt
            label={`${t("rooms.saveCoatsAsDefault", "Spara")} ${wallCoats} ${t("rooms.coats", "lager")} ${t("rooms.asDefault", "som standard?")} `}
            onSave={() => saveToProfile("paint_coats", wallCoats)}
            onDismiss={() => dismissSave("wall_coats")}
          />
        )}
        {pendingSaves.has("wall_coverage") && (
          <SavePrompt
            label={`${t("rooms.saveCoverageAsDefault", "Spara")} ${wallCoverage} m²/L ${t("rooms.asDefault", "som standard?")}`}
            onSave={() =>
              saveToProfile("paint_coverage_sqm_per_liter", wallCoverage)
            }
            onDismiss={() => dismissSave("wall_coverage")}
          />
        )}
      </div>

      {/* ── Takfärg ──────────────────────────────────────── */}
      <div className="space-y-1 border-t pt-3">
        <CalcResultRow
          label={t("rooms.calcCeilingPaint", "Takfärg")}
          result={ceilPaintL !== null ? `~${ceilPaintL}` : null}
          unit="L"
          missing={effectiveArea === null}
        />
        {effectiveArea !== null && (
          <p className="text-xs text-muted-foreground/70 leading-relaxed">
            {effectiveArea.toFixed(1)} m² ×{" "}
            <InlineNum
              value={ceilCoats}
              step={1}
              min={1}
              onChange={(v) => {
                setCeilCoats(v);
                if (profileSettings && v !== profileSettings.paint_coats)
                  markChanged("ceil_coats");
                else dismissSave("ceil_coats");
              }}
              unit={t("rooms.coats", "lager")}
            />{" "}
            ÷{" "}
            <InlineNum
              value={ceilCoverage}
              step={1}
              min={1}
              onChange={(v) => {
                setCeilCoverage(v);
                if (
                  profileSettings &&
                  v !== profileSettings.paint_coverage_sqm_per_liter
                )
                  markChanged("ceil_coverage");
                else dismissSave("ceil_coverage");
              }}
              unit="m²/L"
            />
          </p>
        )}
        {pendingSaves.has("ceil_coats") && (
          <SavePrompt
            label={`${t("rooms.saveCoatsAsDefault", "Spara")} ${ceilCoats} ${t("rooms.coats", "lager")} ${t("rooms.asDefault", "som standard?")}`}
            onSave={() => saveToProfile("paint_coats", ceilCoats)}
            onDismiss={() => dismissSave("ceil_coats")}
          />
        )}
        {pendingSaves.has("ceil_coverage") && (
          <SavePrompt
            label={`${t("rooms.saveCoverageAsDefault", "Spara")} ${ceilCoverage} m²/L ${t("rooms.asDefault", "som standard?")}`}
            onSave={() =>
              saveToProfile("paint_coverage_sqm_per_liter", ceilCoverage)
            }
            onDismiss={() => dismissSave("ceil_coverage")}
          />
        )}
      </div>

      {/* ── Golvmaterial med spill ───────────────────────── */}
      <div className="space-y-1 border-t pt-3">
        <CalcResultRow
          label={t("rooms.calcFloorMaterial", "Golvmaterial (inkl. spill)")}
          result={floorMaterialSqm !== null ? String(floorMaterialSqm) : null}
          unit="m²"
          missing={effectiveArea === null}
        />
        {effectiveArea !== null && (
          <p className="text-xs text-muted-foreground/70 leading-relaxed">
            {effectiveArea.toFixed(1)} m² × (1 +{" "}
            <InlineNum
              value={floorWaste}
              step={1}
              min={0}
              onChange={(v) => setFloorWaste(v)}
              unit="% spill"
            />
            )
          </p>
        )}
      </div>

      {/* ── Golvlist ─────────────────────────────────────── */}
      <div className="border-t pt-3">
        <CalcResultRow
          label={t("rooms.calcSkirting", "Golvlist (löpmeter)")}
          result={skirtingM !== null ? String(skirtingM) : null}
          unit="lm"
          missing={perimM === null}
        />
        {perimM !== null && (
          <p className="text-xs text-muted-foreground/70">
            {perimM.toFixed(1)} m omkrets
          </p>
        )}
      </div>
    </div>
  );
}
