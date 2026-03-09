import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MapPin, Clock, Package, ArrowRight } from "lucide-react";
import type { GuestTask, GuestRoom } from "@/types/guest.types";
import {
  detectWorkType,
  estimateTaskMultiRoom,
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

// Market rate ranges (SEK/h) for homeowner reference
const MARKET_RATE_RANGES: Partial<Record<WorkType, [number, number]>> = {
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

  const estimation = useMemo(() => {
    if (!workType || !recipeRoom) return null;
    return estimateTaskMultiRoom(
      { title: task.title },
      [recipeRoom]
    );
  }, [workType, recipeRoom, task.title]);

  const marketRange = workType ? MARKET_RATE_RANGES[workType] : null;

  const laborCostRange = useMemo(() => {
    if (!estimation || !marketRange) return null;
    return [
      Math.round(estimation.estimatedHours * marketRange[0]),
      Math.round(estimation.estimatedHours * marketRange[1]),
    ] as [number, number];
  }, [estimation, marketRange]);

  const totalCostRange = useMemo(() => {
    if (!laborCostRange) return null;
    const materialCost = estimation?.material?.totalCost ?? 0;
    return [
      laborCostRange[0] + materialCost,
      laborCostRange[1] + materialCost,
    ] as [number, number];
  }, [laborCostRange, estimation]);

  const hasRoomDimensions = floorArea !== null || wallArea !== null;
  const canEstimate = workType !== null && hasRoomDimensions;

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
          {canEstimate && estimation && (
            <div className="space-y-4">
              {/* Area calculation */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("guestEstimate.areaCalc", "Area calculation")}
                </p>
                <div className="space-y-1 text-sm">
                  {estimation.areaType === "wall" ? (
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
                    <span className="tabular-nums">{estimation.totalAreaSqm} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("guestEstimate.rate", "Productivity")}</span>
                    <span className="tabular-nums">{estimation.productivityRate} m²/h</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>{t("guestEstimate.hours", "Estimated hours")}</span>
                    <span className="tabular-nums">{estimation.estimatedHours} h</span>
                  </div>
                  {marketRange && (
                    <div className="flex justify-between text-xs text-muted-foreground pt-0.5">
                      <span>{t("guestEstimate.marketRate", "Market rate range")}</span>
                      <span className="tabular-nums">{marketRange[0]}–{marketRange[1]} kr/h</span>
                    </div>
                  )}
                  {laborCostRange && (
                    <div className="flex justify-between font-medium text-primary">
                      <span>{t("guestEstimate.laborCost", "Labor cost estimate")}</span>
                      <span className="tabular-nums">
                        {laborCostRange[0].toLocaleString("sv-SE")}–{laborCostRange[1].toLocaleString("sv-SE")} kr
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Material estimate */}
              {estimation.material && (
                <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("guestEstimate.materialEstimate", "Material estimate")}
                    </p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t("guestEstimate.formula", "Formula")}</span>
                      <span className="tabular-nums text-xs">{estimation.material.formula}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t(estimation.material.nameKey, estimation.material.nameFallback)}
                      </span>
                      <span className="tabular-nums font-medium">
                        ~{estimation.material.quantity} {estimation.material.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("guestEstimate.unitPrice", "Unit price")}</span>
                      <span className="tabular-nums">
                        {estimation.material.unitPrice} kr/{estimation.material.unit}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1 text-primary">
                      <span>{t("guestEstimate.materialCost", "Material cost")}</span>
                      <span className="tabular-nums">
                        ~{estimation.material.totalCost.toLocaleString("sv-SE")} kr
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Total estimate */}
              {totalCostRange && (
                <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {t("guestEstimate.totalEstimate", "Total cost estimate")}
                    </span>
                    <span className="text-base font-bold tabular-nums text-primary">
                      {totalCostRange[0].toLocaleString("sv-SE")}–{totalCostRange[1].toLocaleString("sv-SE")} kr
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {t("guestEstimate.disclaimer", "Based on average market rates. Actual costs depend on your contractor.")}
                  </p>
                </div>
              )}

              {/* Labor-only total (no material) */}
              {!estimation.material && laborCostRange && (
                <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {t("guestEstimate.totalEstimate", "Total cost estimate")}
                    </span>
                    <span className="text-base font-bold tabular-nums text-primary">
                      {laborCostRange[0].toLocaleString("sv-SE")}–{laborCostRange[1].toLocaleString("sv-SE")} kr
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {t("guestEstimate.laborOnlyDisclaimer", "Labor only. Material costs depend on your choice of materials.")}
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
