import type { Room } from "./types";

const DEFAULT_CEILING_MM = 2400;

/** Wall area in m² = perimeter(m) × ceiling height(m) */
export function computeWallArea(room: Room): number | null {
  const perimeterMm = room.dimensions?.perimeter_mm;
  if (!perimeterMm) return null;
  const ceilingMm = room.ceiling_height_mm ?? DEFAULT_CEILING_MM;
  return (perimeterMm / 1000) * (ceilingMm / 1000);
}

/** Paintable wall area = total wall area - non-paintable area (windows, wardrobes, etc.) */
export function computePaintableWallArea(room: Room): number | null {
  const wallArea = computeWallArea(room);
  if (!wallArea || wallArea <= 0) return null;
  const nonPaintable = room.dimensions?.non_paintable_area_sqm ?? 0;
  return Math.max(0, wallArea - nonPaintable);
}

/** Paint estimate in liters = ceil(paintableWallArea / 10 × 2) — same formula as QuickInfoSection */
export function computePaintEstimate(room: Room): number | null {
  const paintable = computePaintableWallArea(room);
  if (!paintable || paintable <= 0) return null;
  return Math.ceil((paintable / 10) * 2);
}
