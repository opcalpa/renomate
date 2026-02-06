/**
 * Canvas Utilities
 *
 * Re-exports all utility functions for the canvas.
 */

export { throttle } from './throttle';
export { createUnifiedDragHandlers, clearDragState } from './dragSystem';

// Wall-relative coordinate system utilities
export {
  getWallGeometry,
  worldToWallRelative,
  wallRelativeToWorld,
  wallRelativeToElevation,
  elevationToWallRelative,
  findNearestWallForPoint,
  calculateWallAttachment,
} from './wallCoordinates';

export type { WallGeometry } from './wallCoordinates';

// Wall object defaults
export {
  OBJECT_CATEGORY_DEFAULTS,
  getDefaultsForCategory,
  getDefaultElevation,
  CATEGORY_LABELS,
  getCategoryLabel,
  inferCategoryFromSymbolType,
} from './wallObjectDefaults';

export type { ObjectCategoryDefaults } from './wallObjectDefaults';

// Fit-to-content (auto-fit view to all shapes)
export { calculateFitToContent } from './fitToContent';

// View synchronization
export {
  syncWallRelativeFromFloorplan,
  syncFromElevation,
  snapObjectToWall,
  detachFromWall,
  updateObjectElevation,
  setObjectCategory,
  hasValidWallRelative,
  initializeWallRelative,
} from './viewSync';
