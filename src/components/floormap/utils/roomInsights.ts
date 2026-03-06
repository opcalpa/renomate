import type { FloorMapShape } from "../types";
import { getPixelsPerMeter } from "../canvas/utils/scale";

const DEFAULT_CEILING_MM = 2400;

export interface RoomInsight {
  id: string;
  name: string;
  areaSqm: number;
  perimeterMm: number;
  wallAreaSqm: number;
  paintLiters: number;
}

export interface InsightsTotals {
  areaSqm: number;
  wallAreaSqm: number;
  paintLiters: number;
  roomCount: number;
}

/**
 * Compute area and perimeter from a room shape's polygon points.
 * Uses the shoelace formula for area and segment summation for perimeter.
 */
function computeFromPoints(
  points: { x: number; y: number }[],
  pixelsPerMm: number
): { areaSqm: number; perimeterMm: number } {
  if (points.length < 3) return { areaSqm: 0, perimeterMm: 0 };

  const pxPerMeter = getPixelsPerMeter(pixelsPerMm);

  // Shoelace formula for area
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  area = Math.abs(area / 2);
  const areaSqm = area / (pxPerMeter ** 2);

  // Perimeter
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const dx = points[j].x - points[i].x;
    const dy = points[j].y - points[i].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  const perimeterMm = (perimeter / pxPerMeter) * 1000;

  return { areaSqm, perimeterMm };
}

/**
 * Compute insights for all room shapes on the current plan.
 */
export function computeRoomInsightsFromShapes(
  shapes: FloorMapShape[],
  pixelsPerMm: number,
  ceilingMm: number = DEFAULT_CEILING_MM
): { rooms: RoomInsight[]; totals: InsightsTotals } {
  const rooms: RoomInsight[] = [];

  for (const shape of shapes) {
    if (shape.type !== "room") continue;
    const coords = shape.coordinates as { points?: { x: number; y: number }[] };
    const points = coords?.points;
    if (!points || points.length < 3) continue;

    const { areaSqm, perimeterMm } = computeFromPoints(points, pixelsPerMm);
    const perimeterM = perimeterMm / 1000;
    const ceilingM = ceilingMm / 1000;
    const wallAreaSqm = perimeterM * ceilingM;
    const paintLiters = Math.ceil((wallAreaSqm / 10) * 2);

    rooms.push({
      id: shape.id,
      name: shape.name || "Unnamed",
      areaSqm,
      perimeterMm,
      wallAreaSqm,
      paintLiters,
    });
  }

  const totals: InsightsTotals = {
    areaSqm: rooms.reduce((sum, r) => sum + r.areaSqm, 0),
    wallAreaSqm: rooms.reduce((sum, r) => sum + r.wallAreaSqm, 0),
    paintLiters: rooms.reduce((sum, r) => sum + r.paintLiters, 0),
    roomCount: rooms.length,
  };

  return { rooms, totals };
}
