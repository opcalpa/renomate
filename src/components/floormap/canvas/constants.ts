/**
 * Canvas Constants
 *
 * Centralized constants for the floor map canvas.
 */

// Zoom limits
export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 5; // Optimized for practical floor plan work (10cm precision at max zoom)

// Selection colors
export const SELECTION_COLORS = {
  stroke: '#3b82f6',
  fill: 'rgba(59, 130, 246, 0.1)',
  handle: '#3b82f6',
};

// Wall defaults
export const WALL_DEFAULTS = {
  thicknessMM: 150,
  heightMM: 2400,
  strokeColor: '#1f2937',
  fillColor: 'transparent',
};

// Room defaults
export const ROOM_DEFAULTS = {
  fillColor: 'rgba(59, 130, 246, 0.2)',
  strokeColor: 'rgba(59, 130, 246, 0.8)',
};

// Helper to get admin default values from localStorage
export const getAdminDefaults = (): { wallThicknessMM: number; wallHeightMM: number } => {
  const wallThickness = localStorage.getItem("admin_wallThickness");
  const wallHeight = localStorage.getItem("admin_wallHeight");

  return {
    wallThicknessMM: wallThickness ? parseInt(wallThickness) : WALL_DEFAULTS.thicknessMM,
    wallHeightMM: wallHeight ? parseInt(wallHeight) : WALL_DEFAULTS.heightMM,
  };
};
