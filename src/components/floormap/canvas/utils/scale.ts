/**
 * Scale Conversion Helpers
 *
 * Utilities for converting between real-world dimensions (mm/cm/m) and
 * canvas pixels. Used throughout the floor planner for grid rendering,
 * dimension display, and zoom-based scale representation.
 */

export interface GridLevel {
  size: number;
  color: string;
  lineWidth: number;
  label: string;
  opacity: number;
}

// Basic unit conversions
export const getPixelsPerMm = (pixelsPerMm: number): number => pixelsPerMm;
export const getPixelsPerCm = (pixelsPerMm: number): number => pixelsPerMm * 10;
export const getPixelsPerMeter = (pixelsPerMm: number): number => pixelsPerMm * 1000;

/**
 * Get grid levels for different zoom ranges.
 * Simplified for practical floor plan work.
 * Range: 5m (overview) → 10cm (detailed work) - NO sub-10cm grids
 *
 * IMPORTANT: Grid levels that appear together must be exact multiples
 * 5m/1m=5, 1m/50cm=2, 50cm/10cm=5
 */
export const getGridLevels = (pixelsPerMm: number): Record<string, GridLevel> => {
  const pixelsPerMeter = getPixelsPerMeter(pixelsPerMm);
  const pixelsPerCm = getPixelsPerCm(pixelsPerMm);

  return {
    // Major grids - building/apartment overview
    METER_5: { size: pixelsPerMeter * 5, color: "#606060", lineWidth: 2, label: "5m", opacity: 0.9 },
    METER_1: { size: pixelsPerMeter, color: "#808080", lineWidth: 1.5, label: "1m", opacity: 0.7 },

    // Working grids - standard architectural precision
    CM_50: { size: pixelsPerCm * 50, color: "#a0a0a0", lineWidth: 1, label: "50cm", opacity: 0.5 },
    CM_10: { size: pixelsPerCm * 10, color: "#c8c8c8", lineWidth: 0.6, label: "10cm", opacity: 0.35 },
  };
};

/**
 * Get active grid levels based on current zoom.
 * Simplified zoom-based grid system for practical floor plan work.
 * All paired levels are exact multiples to prevent misaligned lines.
 */
export const getActiveGridLevels = (zoomLevel: number, pixelsPerMm: number): GridLevel[] => {
  const GRID_LEVELS = getGridLevels(pixelsPerMm);
  const levels: GridLevel[] = [];

  // Level 1: Extreme zoom out - building overview (5m only)
  if (zoomLevel < 0.5) {
    levels.push(GRID_LEVELS.METER_5);
  }
  // Level 2: Zoomed out - floor plan overview (5m + 1m, ratio 5:1)
  else if (zoomLevel < 1.0) {
    levels.push(GRID_LEVELS.METER_5, GRID_LEVELS.METER_1);
  }
  // Level 3: Standard working view - room layout (1m + 50cm, ratio 2:1)
  else if (zoomLevel < 2.0) {
    levels.push(GRID_LEVELS.METER_1, GRID_LEVELS.CM_50);
  }
  // Level 4+: Detailed view - precise work (50cm + 10cm, ratio 5:1)
  else {
    levels.push(GRID_LEVELS.CM_50, GRID_LEVELS.CM_10);
  }

  return levels;
};

/**
 * Get practical scale representation for architectural work.
 * Optimized for the simplified zoom range (0.3x - 5x).
 */
export const getScaleRepresentation = (zoom: number, pixelsPerMm: number): string => {
  // Calculate actual scale based on zoom and pixelsPerMm
  // Standard screen DPI is ~96, so 1 screen mm ≈ 3.78 pixels
  const screenPixelsPerMm = 3.78;
  const actualScale = (pixelsPerMm * zoom) / screenPixelsPerMm;

  // Convert to standard architectural scales (simplified for practical range)
  if (actualScale >= 0.35) return "1:20"; // Maximum detail (zoom 5x)
  else if (actualScale >= 0.18) return "1:50"; // Detail work (zoom 2-3x)
  else if (actualScale >= 0.09) return "1:100"; // Standard view (zoom 1x)
  else if (actualScale >= 0.045) return "1:200"; // Overview (zoom 0.5x)
  else return "1:400"; // Maximum overview (zoom 0.3x)
};

/**
 * Format dimension value in mm/cm/m for display.
 */
export const formatDimension = (valueMm: number): string => {
  if (valueMm >= 1000) {
    return `${(valueMm / 1000).toFixed(2)}m`;
  } else if (valueMm >= 10) {
    return `${(valueMm / 10).toFixed(1)}cm`;
  }
  return `${Math.round(valueMm)}mm`;
};
