/**
 * View Synchronization Utilities
 *
 * Synchronizes objects between Floorplan and Elevation views.
 * When an object moves in one view, its position updates in the other.
 *
 * Key concept: Objects store their position relative to walls (WallRelativePosition),
 * not in absolute world coordinates. This enables bidirectional sync.
 */

import { FloorMapShape, WallRelativePosition, WallObjectCategory, SymbolCoordinates, RectangleCoordinates } from '../../types';
import {
  getWallGeometry,
  worldToWallRelative,
  wallRelativeToWorld,
  findNearestWallForPoint,
  calculateWallAttachment,
  elevationToWallRelative,
} from './wallCoordinates';
import { getDefaultsForCategory, inferCategoryFromSymbolType } from './wallObjectDefaults';

/**
 * After moving/resizing an object in Floorplan view,
 * update its wallRelative data based on new world position.
 *
 * @param shape - The shape that was moved
 * @param walls - All wall shapes in the current plan
 * @returns Updated shape with synchronized wallRelative data, or null if no change
 */
export function syncWallRelativeFromFloorplan(
  shape: FloorMapShape,
  walls: FloorMapShape[]
): Partial<FloorMapShape> | null {
  // Only sync shapes that have wall-relative data or could be attached to a wall
  if (!shape.wallRelative) return null;

  // Get object center from current coordinates
  const coords = shape.coordinates;
  let centerX: number;
  let centerY: number;
  let width: number;
  let depth: number;

  if ('x' in coords && 'width' in coords) {
    // Symbol or rectangle coordinates
    const symCoords = coords as SymbolCoordinates | RectangleCoordinates;
    if ('left' in symCoords) {
      // Rectangle coordinates
      centerX = (symCoords as RectangleCoordinates).left + (symCoords as RectangleCoordinates).width / 2;
      centerY = (symCoords as RectangleCoordinates).top + (symCoords as RectangleCoordinates).height / 2;
      width = (symCoords as RectangleCoordinates).width;
      depth = (symCoords as RectangleCoordinates).height;
    } else {
      // Symbol coordinates
      centerX = (symCoords as SymbolCoordinates).x + (symCoords as SymbolCoordinates).width / 2;
      centerY = (symCoords as SymbolCoordinates).y + (symCoords as SymbolCoordinates).height / 2;
      width = (symCoords as SymbolCoordinates).width;
      depth = (symCoords as SymbolCoordinates).height;
    }
  } else {
    return null; // Unsupported coordinate type
  }

  // Find the wall this object is attached to
  const wall = walls.find(w => w.id === shape.wallRelative?.wallId);
  if (!wall) return null;

  // Calculate new wall-relative position
  const newWallRelative = worldToWallRelative(
    centerX,
    centerY,
    wall,
    shape.wallRelative.width,
    shape.wallRelative.depth,
    shape.wallRelative.height,
    shape.wallRelative.elevationBottom
  );

  if (!newWallRelative) return null;

  return {
    wallRelative: {
      ...shape.wallRelative,
      ...newWallRelative,
    },
  };
}

/**
 * After moving/resizing an object in Elevation view,
 * update its wallRelative data and world coordinates.
 *
 * @param shape - The shape that was moved in elevation view
 * @param wall - The wall the shape is attached to
 * @param newElevationX - New screen X position in elevation view
 * @param newElevationY - New screen Y position in elevation view
 * @param newWidth - New width in screen pixels
 * @param newHeight - New height in screen pixels
 * @param canvasParams - Elevation canvas parameters
 * @returns Updated shape with synchronized coordinates
 */
export function syncFromElevation(
  shape: FloorMapShape,
  wall: FloorMapShape,
  newElevationX: number,
  newElevationY: number,
  newWidth: number,
  newHeight: number,
  canvasParams: {
    wallHeightMM: number;
    effectiveScale: number;
    wallXOffset: number;
    wallYOffset: number;
  }
): Partial<FloorMapShape> | null {
  // Convert elevation coordinates to wall-relative
  const newWallRelative = elevationToWallRelative(
    newElevationX,
    newElevationY,
    newWidth,
    newHeight,
    wall,
    canvasParams.wallHeightMM,
    canvasParams.effectiveScale,
    canvasParams.wallXOffset,
    canvasParams.wallYOffset
  );

  if (!newWallRelative) return null;

  // Merge with existing wall-relative data (preserve depth, perpendicularOffset)
  const mergedWallRelative: WallRelativePosition = {
    wallId: wall.id,
    distanceFromWallStart: newWallRelative.distanceFromWallStart ?? shape.wallRelative?.distanceFromWallStart ?? 0,
    perpendicularOffset: shape.wallRelative?.perpendicularOffset ?? 0,
    elevationBottom: newWallRelative.elevationBottom ?? shape.wallRelative?.elevationBottom ?? 0,
    width: newWallRelative.width ?? shape.wallRelative?.width ?? 0,
    height: newWallRelative.height ?? shape.wallRelative?.height ?? 0,
    depth: shape.wallRelative?.depth ?? 0,
  };

  // Convert wall-relative back to world coordinates for floorplan view
  const worldPos = wallRelativeToWorld(mergedWallRelative, wall);
  if (!worldPos) return null;

  // Build updated coordinates based on shape type
  let newCoordinates: FloorMapShape['coordinates'];
  const coords = shape.coordinates;

  if ('x' in coords && 'width' in coords) {
    if ('left' in coords) {
      // Rectangle coordinates
      newCoordinates = {
        ...(coords as RectangleCoordinates),
        left: worldPos.x - mergedWallRelative.width / 2,
        top: worldPos.y - mergedWallRelative.depth / 2,
        width: mergedWallRelative.width,
        height: mergedWallRelative.depth,
      };
    } else {
      // Symbol coordinates
      newCoordinates = {
        ...(coords as SymbolCoordinates),
        x: worldPos.x - mergedWallRelative.width / 2,
        y: worldPos.y - mergedWallRelative.depth / 2,
        width: mergedWallRelative.width,
        height: mergedWallRelative.depth,
      };
    }
  } else {
    return null; // Unsupported coordinate type
  }

  return {
    coordinates: newCoordinates,
    rotation: worldPos.rotation,
    wallRelative: mergedWallRelative,
  };
}

/**
 * Snap an object to the nearest wall and calculate wall-relative position.
 * Used when dropping objects from the library or moving objects in floorplan.
 *
 * @param shape - The shape to snap
 * @param walls - All wall shapes in the current plan
 * @param snapThreshold - Maximum distance to snap (mm)
 * @returns Updated shape with wall-relative data, or null if no wall nearby
 */
export function snapObjectToWall(
  shape: FloorMapShape,
  walls: FloorMapShape[],
  snapThreshold: number = 500
): Partial<FloorMapShape> | null {
  // Get object center from coordinates
  const coords = shape.coordinates;
  let centerX: number;
  let centerY: number;
  let objectWidth: number;
  let objectDepth: number;

  if ('x' in coords && 'width' in coords) {
    if ('left' in coords) {
      const rectCoords = coords as RectangleCoordinates;
      centerX = rectCoords.left + rectCoords.width / 2;
      centerY = rectCoords.top + rectCoords.height / 2;
      objectWidth = rectCoords.width;
      objectDepth = rectCoords.height;
    } else {
      const symCoords = coords as SymbolCoordinates;
      centerX = symCoords.x + symCoords.width / 2;
      centerY = symCoords.y + symCoords.height / 2;
      objectWidth = symCoords.width;
      objectDepth = symCoords.height;
    }
  } else {
    return null; // Unsupported coordinate type
  }

  // Find nearest wall
  const nearest = findNearestWallForPoint(centerX, centerY, walls, snapThreshold);
  if (!nearest) return null;

  // Calculate wall-relative position
  const wallRelative = calculateWallAttachment(
    centerX,
    centerY,
    objectWidth,
    objectDepth,
    nearest.wall,
    shape.wallRelative
  );

  if (!wallRelative) return null;

  // Determine object category and set default elevation if not set
  const category = shape.objectCategory || inferCategoryFromSymbolType(shape.symbolType);
  const defaults = getDefaultsForCategory(category);

  // Fill in missing wall-relative values with defaults
  const completeWallRelative: WallRelativePosition = {
    wallId: nearest.wall.id,
    distanceFromWallStart: wallRelative.distanceFromWallStart ?? 0,
    perpendicularOffset: wallRelative.perpendicularOffset ?? 0,
    elevationBottom: shape.wallRelative?.elevationBottom ?? defaults.elevationBottom,
    width: wallRelative.width ?? objectWidth,
    height: shape.wallRelative?.height ?? defaults.defaultHeight,
    depth: wallRelative.depth ?? objectDepth,
  };

  // Convert back to world coordinates (snapped to wall)
  const worldPos = wallRelativeToWorld(completeWallRelative, nearest.wall);
  if (!worldPos) return null;

  // Build snapped coordinates
  let snappedCoordinates: FloorMapShape['coordinates'];

  if ('x' in coords && 'width' in coords) {
    if ('left' in coords) {
      snappedCoordinates = {
        ...(coords as RectangleCoordinates),
        left: worldPos.x - completeWallRelative.width / 2,
        top: worldPos.y - completeWallRelative.depth / 2,
      };
    } else {
      snappedCoordinates = {
        ...(coords as SymbolCoordinates),
        x: worldPos.x - completeWallRelative.width / 2,
        y: worldPos.y - completeWallRelative.depth / 2,
      };
    }
  } else {
    return null;
  }

  return {
    coordinates: snappedCoordinates,
    rotation: worldPos.rotation,
    wallRelative: completeWallRelative,
    objectCategory: category,
  };
}

/**
 * Detach an object from its wall, clearing wall-relative data.
 *
 * @param shape - The shape to detach
 * @returns Updated shape with cleared wall-relative data
 */
export function detachFromWall(shape: FloorMapShape): Partial<FloorMapShape> {
  return {
    wallRelative: undefined,
    objectCategory: undefined,
  };
}

/**
 * Update object's elevation (height from floor) while keeping wall attachment.
 *
 * @param shape - The shape to update
 * @param newElevationBottom - New height from floor in mm
 * @returns Updated shape
 */
export function updateObjectElevation(
  shape: FloorMapShape,
  newElevationBottom: number
): Partial<FloorMapShape> | null {
  if (!shape.wallRelative) return null;

  return {
    wallRelative: {
      ...shape.wallRelative,
      elevationBottom: Math.max(0, newElevationBottom),
    },
  };
}

/**
 * Change an object's category and update its elevation to the category default.
 *
 * @param shape - The shape to update
 * @param newCategory - New object category
 * @returns Updated shape with new category and elevation
 */
export function setObjectCategory(
  shape: FloorMapShape,
  newCategory: WallObjectCategory
): Partial<FloorMapShape> {
  const defaults = getDefaultsForCategory(newCategory);

  return {
    objectCategory: newCategory,
    wallRelative: shape.wallRelative
      ? {
          ...shape.wallRelative,
          elevationBottom: defaults.elevationBottom,
          height: shape.wallRelative.height || defaults.defaultHeight,
        }
      : undefined,
  };
}

/**
 * Check if a shape has valid wall-relative positioning.
 */
export function hasValidWallRelative(shape: FloorMapShape): boolean {
  return !!(
    shape.wallRelative &&
    shape.wallRelative.wallId &&
    typeof shape.wallRelative.distanceFromWallStart === 'number' &&
    typeof shape.wallRelative.width === 'number'
  );
}

/**
 * Initialize wall-relative data for an existing shape based on its current position.
 * Used when converting legacy shapes to the wall-relative system.
 *
 * @param shape - The shape to initialize
 * @param walls - All wall shapes
 * @param defaultCategory - Default category if none set
 * @returns Updated shape with wall-relative data, or null if no wall nearby
 */
export function initializeWallRelative(
  shape: FloorMapShape,
  walls: FloorMapShape[],
  defaultCategory: WallObjectCategory = 'custom'
): Partial<FloorMapShape> | null {
  // Skip if already has wall-relative data
  if (hasValidWallRelative(shape)) return null;

  // Try to snap to nearest wall
  const snapped = snapObjectToWall(shape, walls, 1000); // Larger threshold for initialization
  if (snapped) {
    return {
      ...snapped,
      objectCategory: shape.objectCategory || defaultCategory,
    };
  }

  return null;
}
