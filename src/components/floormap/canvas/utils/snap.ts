/**
 * Grid Snapping Helpers
 *
 * Utilities for snapping points and movements to the grid.
 * Used during shape drawing, placement, and dragging operations.
 */

/**
 * Get snap size based on zoom level and user settings.
 * Respects projectSettings.gridInterval but enforces minimum based on zoom
 * to prevent frustrating micro-movements when zoomed out.
 */
export const getSnapSize = (
  zoomLevel: number,
  pixelsPerMm: number,
  forWalls: boolean = false,
  userGridInterval?: number
): number => {
  // Get minimum practical snap size based on zoom level
  // (prevents snapping in 1cm increments when zoomed out to see entire floor)
  let minSnapMm: number;
  if (zoomLevel < 0.5) {
    minSnapMm = 1000; // At extreme zoom out, don't snap finer than 1m
  } else if (zoomLevel < 1.0) {
    minSnapMm = 500; // At overview, don't snap finer than 50cm
  } else if (zoomLevel < 2.0) {
    minSnapMm = 250; // At normal view, don't snap finer than 25cm
  } else {
    minSnapMm = 50; // At detail view, allow snap as fine as 5cm
  }

  // Use user's setting, but enforce minimum based on zoom
  const effectiveSnapMm = userGridInterval
    ? Math.max(userGridInterval, minSnapMm)
    : minSnapMm;

  // Convert mm to pixels
  return effectiveSnapMm * pixelsPerMm;
};

/**
 * Snap a point to the grid.
 */
export const snapToGrid = (
  point: { x: number; y: number },
  snapSize: number,
  enabled: boolean
): { x: number; y: number } => {
  if (!enabled) return point;
  return {
    x: Math.round(point.x / snapSize) * snapSize,
    y: Math.round(point.y / snapSize) * snapSize,
  };
};

/**
 * Snap delta (movement) to grid - for dragging objects.
 */
export const snapDelta = (
  delta: { x: number; y: number },
  snapSize: number,
  enabled: boolean
): { x: number; y: number } => {
  if (!enabled) return delta;
  return {
    x: Math.round(delta.x / snapSize) * snapSize,
    y: Math.round(delta.y / snapSize) * snapSize,
  };
};
