import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sparkles, MapPin, Clock, Package, ArrowRight } from "lucide-react";
import type { GuestTask, GuestRoom } from "@/types/guest.types";
import {
  detectWorkType,
  computeFloorAreaSqm,
  computeWallAreaSqm,
  WORK_TYPE_LABEL_KEYS,
} from "@/lib/materialRecipes";
import type { RecipeRoom, WorkType } from "@/lib/materialRecipes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function guestRoomToRecipe(room: GuestRoom): RecipeRoom {
  return {
    dimensions: {
      area_sqm: room.area_sqm ?? undefined,
      width_mm: room.width_mm ?? undefined,
      height_mm: room.height_mm ?? undefined,
    },
    ceiling_height_mm: room.ceiling_height_mm ?? 2400,
  };
}

const WORK_TYPE_COLORS: Record<WorkType, string> = {
  painting: "bg-amber-100 text-amber-800",
  flooring: "bg-emerald-100 text-emerald-800",
  tiling: "bg-blue-100 text-blue-800",
  demolition: "bg-red-100 text-red-800",
  spackling: "bg-slate-100 text-slate-800",
  sanding: "bg-orange-100 text-orange-800",
  carpentry: "bg-yellow-100 text-yellow-800",
  electrical: "bg-violet-100 text-violet-800",
  plumbing: "bg-cyan-100 text-cyan-800",
};

// Default market rate ranges (SEK/h)
const DEFAULT_MARKET_RATES: Record<WorkType, [number, number]> = {
  painting: [350, 550],
  flooring: [400, 600],
  tiling: [450, 700],
  demolition: [350, 500],
  spackling: [350, 550],
  sanding: [350, 500],
  carpentry: [450, 700],
  electrical: [500, 800],
  plumbing: [500, 800],
};

// Default productivity rates (m²/h)
const DEFAULT_PRODUCTIVITY: Record<WorkType, number> = {
  painting: 10,
  flooring: 5,
  tiling: 3,
  demolition: 8,
  spackling: 6,
  sanding: 12,
  carpentry: 4,
  electrical: 3,
  plumbing: 2,
};

// Default material unit prices (SEK)
const DEFAULT_UNIT_PRICES: Partial<Record<WorkType, number>> = {
  painting: 150,
  flooring: 300,
  tiling: 500,
};

// Default paint settings
const DEFAULT_COVERAGE = 10; // m²/L
const DEFAULT_COATS = 2;
const DEFAULT_WASTE = 1.1;

// localStorage key for guest estimation overrides
const STORAGE_KEY = "renofine_guest_estimation_overrides";

interface EstimationOverrides {
  productivity?: Partial<Record<WorkType, number>>;
  marketRateLow?: Partial<Record<WorkType, number>>;
  marketRateHigh?: Partial<Record<WorkType, number>>;
  unitPrice?: Partial<Record<WorkType, number>>;
  paintCoverage?: number;
  paintCoats?: number;
  wasteFactor?: number;
}

function loadOverrides(): EstimationOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOverrides(overrides: EstimationOverrides): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // localStorage full — ignore
  }
}

// ---------------------------------------------------------------------------
// Editable value component — green dotted underline, click to edit
// ---------------------------------------------------------------------------

interface EditableValueProps {
  value: number;
  suffix?: string;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  tooltip?: string;
}

function EditableValue({ value, suffix, onChange, min = 0, max, step = 1, className = "", tooltip }: EditableValueProps) {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setLocalVal(String(value));
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = useCallback(() => {
    setEditing(false);
    const num = Number(localVal);
    if (!isNaN(num) && num > 0 && (max === undefined || num <= max)) {
      onChange(num);
    }
  }, [localVal, onChange, max]);

  if (editing) {
    return (
      <span className="inline-flex items-center gap-0.5">
        <Input
          ref={inputRef}
          type="number"
          step={step}
          min={min}
          max={max}
          className="h-6 w-16 text-sm px-1 tabular-nums text-right"
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={commit}
        />
        {suffix && <span className="text-sm">{suffix}</span>}
      </span>
    );
  }

  const display = typeof value === "number" && !Number.isInteger(value) ? value.toFixed(1) : value;

  const btn = (
    <button
      className={`tabular-nums border-b border-dotted border-green-500 text-green-700 hover:text-green-900 hover:border-green-700 transition-colors cursor-pointer ${className}`}
      onClick={() => setEditing(true)}
    >
      {display}{suffix}
    </button>
  );

  if (tooltip) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-[200px]">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return btn;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface GuestTaskEstimateSheetProps {
  task: GuestTask;
  room: GuestRoom | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GuestTaskEstimateSheet({
  task,
  room,
  open,
  onOpenChange,
}: GuestTaskEstimateSheetProps) {
  const { t } = useTranslation();

  const workType = useMemo(
    () => detectWorkType({ title: task.title }),
    [task.title]
  );

  const recipeRoom = useMemo(
    () => (room ? guestRoomToRecipe(room) : null),
    [room]
  );

  const floorArea = useMemo(
    () => (recipeRoom ? computeFloorAreaSqm(recipeRoom) : null),
    [recipeRoom]
  );

  const wallArea = useMemo(
    () => (recipeRoom ? computeWallAreaSqm(recipeRoom) : null),
    [recipeRoom]
  );

  // Editable overrides (persisted in localStorage)
  const [overrides, setOverrides] = useState<EstimationOverrides>(loadOverrides);

  const updateOverride = useCallback(<K extends keyof EstimationOverrides>(
    key: K,
    value: EstimationOverrides[K]
  ) => {
    setOverrides((prev) => {
      const next = { ...prev, [key]: value };
      saveOverrides(next);
      return next;
    });
  }, []);

  // Resolved values (defaults + overrides)
  const productivity = workType
    ? (overrides.productivity?.[workType] ?? DEFAULT_PRODUCTIVITY[workType])
    : 0;

  const marketLow = workType
    ? (overrides.marketRateLow?.[workType] ?? DEFAULT_MARKET_RATES[workType][0])
    : 0;

  const marketHigh = workType
    ? (overrides.marketRateHigh?.[workType] ?? DEFAULT_MARKET_RATES[workType][1])
    : 0;

  const unitPrice = workType
    ? (overrides.unitPrice?.[workType] ?? DEFAULT_UNIT_PRICES[workType] ?? 0)
    : 0;

  const paintCoverage = overrides.paintCoverage ?? DEFAULT_COVERAGE;
  const paintCoats = overrides.paintCoats ?? DEFAULT_COATS;
  const wasteFactor = overrides.wasteFactor ?? DEFAULT_WASTE;

  // Derived calculations
  const areaType = workType
    ? (["painting", "tiling", "spackling"].includes(workType) ? "wall" : "floor")
    : "floor";

  const totalArea = areaType === "wall" ? wallArea : floorArea;
  const estimatedHours = totalArea && productivity > 0
    ? Math.round((totalArea / productivity) * 2) / 2 // round to 0.5
    : null;

  // Material calculations
  const materialCalc = useMemo(() => {
    if (!workType || !totalArea || totalArea <= 0) return null;

    if (workType === "painting") {
      const qty = Math.ceil((totalArea / paintCoverage) * paintCoats);
      return {
        nameKey: "materialRecipes.wallPaint",
        nameFallback: "Wall paint",
        quantity: qty,
        unit: "L",
        formula: `${totalArea.toFixed(1)} m² / ${paintCoverage} × ${paintCoats} = ${qty}L`,
        totalCost: Math.round(qty * unitPrice),
      };
    }

    if (workType === "flooring" || workType === "tiling") {
      const qty = Math.round(totalArea * wasteFactor * 10) / 10;
      const nameKey = workType === "flooring" ? "materialRecipes.floorMaterial" : "materialRecipes.tiles";
      const nameFallback = workType === "flooring" ? "Floor material" : "Tiles";
      return {
        nameKey,
        nameFallback,
        quantity: qty,
        unit: "m²",
        formula: `${totalArea.toFixed(1)} m² × ${wasteFactor} = ${qty} m²`,
        totalCost: Math.round(qty * unitPrice),
      };
    }

    return null;
  }, [workType, totalArea, paintCoverage, paintCoats, wasteFactor, unitPrice]);

  // Cost ranges
  const laborCostLow = estimatedHours ? Math.round(estimatedHours * marketLow) : null;
  const laborCostHigh = estimatedHours ? Math.round(estimatedHours * marketHigh) : null;
  const materialCost = materialCalc?.totalCost ?? 0;
  const totalLow = laborCostLow !== null ? laborCostLow + materialCost : null;
  const totalHigh = laborCostHigh !== null ? laborCostHigh + materialCost : null;

  const hasRoomDimensions = floorArea !== null || wallArea !== null;
  const canEstimate = workType !== null && hasRoomDimensions;

  // Override helpers
  const setProductivity = useCallback((val: number) => {
    if (!workType) return;
    updateOverride("productivity", { ...overrides.productivity, [workType]: val });
  }, [workType, overrides.productivity, updateOverride]);

  const setMarketLow = useCallback((val: number) => {
    if (!workType) return;
    updateOverride("marketRateLow", { ...overrides.marketRateLow, [workType]: val });
  }, [workType, overrides.marketRateLow, updateOverride]);

  const setMarketHigh = useCallback((val: number) => {
    if (!workType) return;
    updateOverride("marketRateHigh", { ...overrides.marketRateHigh, [workType]: val });
  }, [workType, overrides.marketRateHigh, updateOverride]);

  const setUnitPrice = useCallback((val: number) => {
    if (!workType) return;
    updateOverride("unitPrice", { ...overrides.unitPrice, [workType]: val });
  }, [workType, overrides.unitPrice, updateOverride]);

  const setCoverage = useCallback((val: number) => {
    updateOverride("paintCoverage", val);
  }, [updateOverride]);

  const setCoats = useCallback((val: number) => {
    updateOverride("paintCoats", val);
  }, [updateOverride]);

  const setWaste = useCallback((val: number) => {
    updateOverride("wasteFactor", val);
  }, [updateOverride]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg">{task.title}</SheetTitle>
          {room && (
            <SheetDescription className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {room.name}
              {floorArea && (
                <span className="text-muted-foreground">
                  &middot; {floorArea.toFixed(1)} m²
                </span>
              )}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="space-y-5 pb-6">
          {/* Work type badge */}
          {workType && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <Badge
                variant="secondary"
                className={WORK_TYPE_COLORS[workType]}
              >
                {t(WORK_TYPE_LABEL_KEYS[workType])}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {t("guestEstimate.detectedType", "Detected work type")}
              </span>
            </div>
          )}

          {/* No estimation possible — hints */}
          {!canEstimate && (
            <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
              <Sparkles className="h-6 w-6 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-medium text-muted-foreground">
                {t("guestEstimate.noEstimate", "Estimation not available yet")}
              </p>
              <p className="text-xs text-muted-foreground/70">
                {!workType
                  ? t("guestEstimate.hintWorkType", "Try naming the task after the work type, e.g. \"Paint living room\" or \"Tile bathroom\"")
                  : t("guestEstimate.hintDimensions", "Add width and depth to the linked room to unlock estimates")}
              </p>
            </div>
          )}

          {/* Estimation breakdown */}
          {canEstimate && totalArea && estimatedHours && (
            <div className="space-y-4">
              {/* Editable hint */}
              <p className="text-[10px] text-muted-foreground/70 text-center">
                {t("guestEstimate.editHint", "Click green values to adjust")}
              </p>

              {/* Area calculation */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("guestEstimate.areaCalc", "Area calculation")}
                </p>
                <div className="space-y-1 text-sm">
                  {areaType === "wall" ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("guestEstimate.perimeter", "Perimeter")}</span>
                        <span className="tabular-nums">
                          {room?.width_mm && room?.height_mm
                            ? `2 × (${(room.width_mm / 1000).toFixed(1)} + ${(room.height_mm / 1000).toFixed(1)}) = ${(2 * (room.width_mm + room.height_mm) / 1000).toFixed(1)} m`
                            : "–"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("rooms.ceilingHeight")}</span>
                        <span className="tabular-nums">{((room?.ceiling_height_mm ?? 2400) / 1000).toFixed(1)} m</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>{t("rooms.wallArea")}</span>
                        <span className="tabular-nums">{wallArea?.toFixed(1)} m²</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {room?.width_mm && room?.height_mm && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("guestEstimate.dimensions", "Dimensions")}</span>
                          <span className="tabular-nums">
                            {(room.width_mm / 1000).toFixed(1)} × {(room.height_mm / 1000).toFixed(1)} m
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>{t("rooms.area")}</span>
                        <span className="tabular-nums">{floorArea?.toFixed(1)} m²</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Labor estimate */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("guestEstimate.laborEstimate", "Estimated work time")}
                  </p>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("guestEstimate.area", "Work area")}</span>
                    <span className="tabular-nums">{totalArea.toFixed(1)} m²</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("guestEstimate.rate", "Productivity")}</span>
                    <EditableValue
                      value={productivity}
                      suffix=" m²/h"
                      onChange={setProductivity}
                      min={0.5}
                      max={50}
                      step={0.5}
                      tooltip={t("guestEstimate.tipProductivity", "How many m² a professional typically completes per hour for this type of work")}
                    />
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>{t("guestEstimate.hours", "Estimated hours")}</span>
                    <span className="tabular-nums">{estimatedHours} h</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground pt-0.5">
                    <span>{t("guestEstimate.marketRate", "Market rate range")}</span>
                    <span className="flex items-center gap-0.5">
                      <EditableValue
                        value={marketLow}
                        onChange={setMarketLow}
                        min={100}
                        max={2000}
                        step={50}
                        className="text-xs"
                        tooltip={t("guestEstimate.tipMarketLow", "Lower end of what contractors typically charge per hour")}
                      />
                      <span>–</span>
                      <EditableValue
                        value={marketHigh}
                        onChange={setMarketHigh}
                        min={100}
                        max={2000}
                        step={50}
                        className="text-xs"
                        tooltip={t("guestEstimate.tipMarketHigh", "Upper end of what contractors typically charge per hour")}
                      />
                      <span> kr/h</span>
                    </span>
                  </div>
                  {laborCostLow !== null && laborCostHigh !== null && (
                    <div className="flex justify-between font-medium text-primary">
                      <span>{t("guestEstimate.laborCost", "Labor cost estimate")}</span>
                      <span className="tabular-nums">
                        {laborCostLow.toLocaleString("sv-SE")}–{laborCostHigh.toLocaleString("sv-SE")} kr
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Material estimate */}
              {materialCalc && (
                <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("guestEstimate.materialEstimate", "Material estimate")}
                    </p>
                  </div>
                  <div className="space-y-1 text-sm">
                    {/* Formula with editable params */}
                    {workType === "painting" && (
                      <div className="flex justify-between items-center text-muted-foreground text-xs">
                        <span>{t("guestEstimate.formula", "Formula")}</span>
                        <span className="flex items-center gap-0.5 tabular-nums">
                          {totalArea.toFixed(1)} m² /
                          <EditableValue
                            value={paintCoverage}
                            onChange={setCoverage}
                            min={1}
                            max={30}
                            step={0.5}
                            className="text-xs"
                            tooltip={t("guestEstimate.tipCoverage", "Coverage: how many m² one liter of paint covers in one coat")}
                          />
                          ×
                          <EditableValue
                            value={paintCoats}
                            onChange={setCoats}
                            min={1}
                            max={5}
                            step={1}
                            className="text-xs"
                            tooltip={t("guestEstimate.tipCoats", "Number of coats of paint — typically 2 for good coverage")}
                          />
                          = {materialCalc.quantity}{materialCalc.unit}
                        </span>
                      </div>
                    )}
                    {(workType === "flooring" || workType === "tiling") && (
                      <div className="flex justify-between items-center text-muted-foreground text-xs">
                        <span>{t("guestEstimate.formula", "Formula")}</span>
                        <span className="flex items-center gap-0.5 tabular-nums">
                          {totalArea.toFixed(1)} m² ×
                          <EditableValue
                            value={wasteFactor}
                            onChange={setWaste}
                            min={1}
                            max={2}
                            step={0.05}
                            className="text-xs"
                            tooltip={t("guestEstimate.tipWaste", "Waste factor: extra material for cuts and waste — 1.1 means 10% extra")}
                          />
                          = {materialCalc.quantity} {materialCalc.unit}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t(materialCalc.nameKey, materialCalc.nameFallback)}
                      </span>
                      <span className="tabular-nums font-medium">
                        ~{materialCalc.quantity} {materialCalc.unit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t("guestEstimate.unitPrice", "Unit price")}</span>
                      <EditableValue
                        value={unitPrice}
                        suffix={` kr/${materialCalc.unit}`}
                        onChange={setUnitPrice}
                        min={1}
                        max={5000}
                        step={10}
                        tooltip={t("guestEstimate.tipUnitPrice", "Average price per unit — varies by brand and quality")}
                      />
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1 text-primary">
                      <span>{t("guestEstimate.materialCost", "Material cost")}</span>
                      <span className="tabular-nums">
                        ~{materialCalc.totalCost.toLocaleString("sv-SE")} kr
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Total estimate */}
              {totalLow !== null && totalHigh !== null && (
                <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {t("guestEstimate.totalEstimate", "Total cost estimate")}
                    </span>
                    <span className="text-base font-bold tabular-nums text-primary">
                      {totalLow.toLocaleString("sv-SE")}–{totalHigh.toLocaleString("sv-SE")} kr
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {materialCalc
                      ? t("guestEstimate.disclaimer", "Based on average market rates. Actual costs depend on your contractor.")
                      : t("guestEstimate.laborOnlyDisclaimer", "Labor only. Material costs depend on your choice of materials.")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sign-up nudge */}
          {canEstimate && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
              <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
              <span>
                {t("guestEstimate.signUpHint", "Create a free account to save estimates, compare quotes, and track your renovation.")}
              </span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
