/**
 * COORDINATE SYSTEM UTILITIES
 * ============================
 * 
 * This module provides helper functions for converting between pixel coordinates 
 * (canvas space) and millimeter coordinates (world space) for architectural drawings.
 * 
 * COORDINATE SYSTEM OVERVIEW:
 * ---------------------------
 * - Internal Storage: All building objects (walls, windows, doors) store coordinates in MILLIMETERS (mm)
 * - Canvas Rendering: Canvas uses PIXELS for drawing
 * - Conversion: The ViewState zoom and pan values control the mapping
 * 
 * SCALE FACTOR:
 * -------------
 * Base ratio: 1 pixel = 1 millimeter (at zoom = 1.0)
 * - zoom = 1.0: 1px = 1mm (1:1)
 * - zoom = 2.0: 2px = 1mm (zoomed in, objects appear larger)
 * - zoom = 0.5: 0.5px = 1mm (zoomed out, objects appear smaller)
 * 
 * PAN OFFSET:
 * -----------
 * panX and panY represent the canvas offset in pixels. When a user pans the view,
 * these values change to simulate camera movement.
 * 
 * TYPICAL USAGE:
 * --------------
 * 1. User clicks on canvas → pixelToWorld() → store in mm
 * 2. Render object → worldToPixel() → draw on canvas
 * 3. Snap to grid → use mm-based grid size
 */

import { ViewState } from '../types';

/**
 * Convert canvas pixel coordinates to world coordinates (millimeters)
 * 
 * @param pixelX - X coordinate in canvas pixels
 * @param pixelY - Y coordinate in canvas pixels
 * @param viewState - Current view state (zoom, panX, panY)
 * @returns World coordinates in millimeters
 * 
 * @example
 * // User clicks at pixel (100, 200) on canvas
 * // With zoom=1.0, panX=50, panY=50
 * const worldCoords = pixelToWorld(100, 200, viewState);
 * // Result: { x: 50mm, y: 150mm }
 */
export const pixelToWorld = (
  pixelX: number,
  pixelY: number,
  viewState: ViewState
): { x: number; y: number } => {
  const { zoom, panX, panY } = viewState;
  
  // Remove pan offset and scale by zoom factor
  const worldX = (pixelX - panX) / zoom;
  const worldY = (pixelY - panY) / zoom;
  
  return { x: worldX, y: worldY };
};

/**
 * Convert world coordinates (millimeters) to canvas pixel coordinates
 * 
 * @param worldX - X coordinate in millimeters
 * @param worldY - Y coordinate in millimeters
 * @param viewState - Current view state (zoom, panX, panY)
 * @returns Canvas coordinates in pixels
 * 
 * @example
 * // Render a wall stored at (1000mm, 2000mm)
 * // With zoom=1.5, panX=100, panY=100
 * const pixelCoords = worldToPixel(1000, 2000, viewState);
 * // Result: { x: 1600px, y: 3100px }
 */
export const worldToPixel = (
  worldX: number,
  worldY: number,
  viewState: ViewState
): { x: number; y: number } => {
  const { zoom, panX, panY } = viewState;
  
  // Scale by zoom factor and add pan offset
  const pixelX = worldX * zoom + panX;
  const pixelY = worldY * zoom + panY;
  
  return { x: pixelX, y: pixelY };
};

/**
 * Convert a distance/length from pixels to millimeters
 * 
 * @param pixelDistance - Distance in pixels
 * @param zoom - Current zoom level
 * @returns Distance in millimeters
 * 
 * @example
 * // User draws a line 100px long at zoom=2.0
 * const lengthMM = pixelDistanceToWorld(100, 2.0);
 * // Result: 50mm
 */
export const pixelDistanceToWorld = (
  pixelDistance: number,
  zoom: number
): number => {
  return pixelDistance / zoom;
};

/**
 * Convert a distance/length from millimeters to pixels
 * 
 * @param worldDistance - Distance in millimeters
 * @param zoom - Current zoom level
 * @returns Distance in pixels
 * 
 * @example
 * // Render a 1000mm wall at zoom=1.5
 * const pixelLength = worldDistanceToPixel(1000, 1.5);
 * // Result: 1500px
 */
export const worldDistanceToPixel = (
  worldDistance: number,
  zoom: number
): number => {
  return worldDistance * zoom;
};

/**
 * Get the visible world bounds (in mm) for the current viewport
 * 
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @param viewState - Current view state
 * @returns Bounding box in world coordinates (mm)
 * 
 * @example
 * const bounds = getVisibleWorldBounds(1920, 1080, viewState);
 * // Result: { minX: 0, minY: 0, maxX: 1920, maxY: 1080, width: 1920, height: 1080 }
 */
export const getVisibleWorldBounds = (
  canvasWidth: number,
  canvasHeight: number,
  viewState: ViewState
): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} => {
  const topLeft = pixelToWorld(0, 0, viewState);
  const bottomRight = pixelToWorld(canvasWidth, canvasHeight, viewState);
  
  return {
    minX: topLeft.x,
    minY: topLeft.y,
    maxX: bottomRight.x,
    maxY: bottomRight.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
};

/**
 * Snap world coordinate to grid (in mm)
 * 
 * @param worldCoord - Coordinate in millimeters
 * @param gridSizeMM - Grid size in millimeters
 * @param enabled - Whether snapping is enabled
 * @returns Snapped coordinate in millimeters
 * 
 * @example
 * // Snap to 500mm (50cm) grid
 * const snapped = snapToGridWorld(1234, 500, true);
 * // Result: 1000mm
 */
export const snapToGridWorld = (
  worldCoord: number,
  gridSizeMM: number,
  enabled: boolean
): number => {
  if (!enabled || gridSizeMM === 0) return worldCoord;
  return Math.round(worldCoord / gridSizeMM) * gridSizeMM;
};

/**
 * Calculate distance between two world points (in mm)
 * 
 * @param x1 - First point X in millimeters
 * @param y1 - First point Y in millimeters
 * @param x2 - Second point X in millimeters
 * @param y2 - Second point Y in millimeters
 * @returns Distance in millimeters
 */
export const worldDistance = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * STANDARD SCALES FOR ARCHITECTURAL DRAWINGS
 * ===========================================
 * Common scales used in architectural plans:
 * 
 * - 1:50  → 1mm on paper = 50mm in reality  (common for floor plans)
 * - 1:100 → 1mm on paper = 100mm in reality (overview plans)
 * - 1:20  → 1mm on paper = 20mm in reality  (detailed sections)
 * - 1:500 → 1mm on paper = 500mm in reality (site plans)
 * 
 * In this digital tool, we use 1:1 at base zoom, allowing users to
 * freely zoom in/out as needed.
 */
export const ARCHITECTURAL_SCALES = {
  DETAIL: 1 / 20,    // 1:20
  FLOOR_PLAN: 1 / 50,  // 1:50
  OVERVIEW: 1 / 100,   // 1:100
  SITE: 1 / 500,       // 1:500
};

/**
 * Get a recommended zoom level for a specific architectural scale
 * 
 * @param scale - Architectural scale (e.g., 1/50 for 1:50)
 * @param screenDPI - Screen DPI (default 96)
 * @returns Recommended zoom level
 */
export const getZoomForScale = (scale: number, screenDPI: number = 96): number => {
  // Convert mm to pixels based on DPI
  const mmToPixel = screenDPI / 25.4; // 1 inch = 25.4mm
  return scale * mmToPixel;
};
