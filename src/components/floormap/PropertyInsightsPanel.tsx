import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Home, Grid3X3 } from "lucide-react";
import { useFloorMapStore } from "./store";
import { computeRoomInsightsFromShapes } from "./utils/roomInsights";
import { cn } from "@/lib/utils";

export const PropertyInsightsPanel: React.FC = () => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const shapes = useFloorMapStore((s) => s.shapes);
  const currentPlanId = useFloorMapStore((s) => s.currentPlanId);
  const pixelsPerMm = useFloorMapStore((s) => s.scaleSettings.pixelsPerMm);
  const gridVisible = useFloorMapStore((s) => s.projectSettings.gridVisible);
  const toggleGrid = useFloorMapStore((s) => s.toggleGrid);

  const planShapes = useMemo(
    () => shapes.filter((s) => s.type === "room" && s.planId === currentPlanId),
    [shapes, currentPlanId]
  );

  const { rooms, totals } = useMemo(
    () => computeRoomInsightsFromShapes(planShapes, pixelsPerMm),
    [planShapes, pixelsPerMm]
  );

  if (totals.roomCount === 0) {
    return (
      <div className="fixed bottom-4 left-20 z-20">
        <div className="bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border text-sm text-muted-foreground flex items-center">
          <div className="flex items-center gap-2 px-4 py-3">
            <Home className="h-4 w-4" />
            {t("insights.noRooms", "Draw rooms to see insights")}
          </div>
          <div className="w-px h-6 bg-border" />
          <button
            type="button"
            onClick={toggleGrid}
            title={gridVisible ? "Dölj rutnät" : "Visa rutnät"}
            className={cn(
              "px-3 py-3 hover:bg-accent/50 transition-colors rounded-r-lg",
              gridVisible ? "text-blue-600" : "text-muted-foreground"
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-20 z-20 max-w-xs w-full">
      <div className="bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border overflow-hidden">
        {/* Collapsed pill / header */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Home className="h-4 w-4 text-primary" />
              <span>{totals.areaSqm.toFixed(1)} m²</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">
                {totals.roomCount} {t("insights.rooms", "rooms")}
              </span>
            </div>
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <div className="w-px h-6 bg-border" />
          <button
            type="button"
            onClick={toggleGrid}
            title={gridVisible ? "Dölj rutnät" : "Visa rutnät"}
            className={cn(
              "px-3 py-3 hover:bg-accent/50 transition-colors",
              gridVisible ? "text-blue-600" : "text-muted-foreground"
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
        </div>

        {/* Expanded detail table */}
        {expanded && (
          <div className="border-t">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="text-left px-4 py-2 font-medium">
                    {t("insights.room", "Room")}
                  </th>
                  <th className="text-right px-2 py-2 font-medium">
                    {t("insights.area", "Area")}
                  </th>
                  <th className="text-right px-2 py-2 font-medium">
                    {t("insights.wallArea", "Wall area")}
                  </th>
                  <th className="text-right px-4 py-2 font-medium">
                    {t("insights.paint", "Paint")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr
                    key={room.id}
                    className="border-b last:border-b-0 hover:bg-accent/30"
                  >
                    <td className="px-4 py-2 font-medium truncate max-w-[100px]">
                      {room.name}
                    </td>
                    <td className="text-right px-2 py-2 tabular-nums">
                      {room.areaSqm.toFixed(1)} m²
                    </td>
                    <td className="text-right px-2 py-2 tabular-nums">
                      {room.wallAreaSqm.toFixed(1)} m²
                    </td>
                    <td className="text-right px-4 py-2 tabular-nums">
                      {room.paintLiters} {t("insights.liters", "L")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold border-t bg-muted/30">
                  <td className="px-4 py-2">
                    {t("insights.total", "Total")}
                  </td>
                  <td className="text-right px-2 py-2 tabular-nums">
                    {totals.areaSqm.toFixed(1)} m²
                  </td>
                  <td className="text-right px-2 py-2 tabular-nums">
                    {totals.wallAreaSqm.toFixed(1)} m²
                  </td>
                  <td className="text-right px-4 py-2 tabular-nums">
                    {totals.paintLiters} {t("insights.liters", "L")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
