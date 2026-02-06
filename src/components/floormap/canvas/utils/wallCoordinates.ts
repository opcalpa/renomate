/**
 * Wall Coordinate Transformation Utilities
 *
 * Provides coordinate transformations between:
 * - World coordinates (floorplan view, in mm)
 * - Wall-relative coordinates (object position relative to wall)
 * - Elevation view coordinates (screen pixels in elevation canvas)
 *
 * This enables IKEA Kitchen Planner / Revit-style synchronization
 * where objects placed in either view automatically sync to the other.
 */

import { FloorMapShape, WallRelativePosition, LineCoordinates } from '../../types';

/**
 * Extracted wall geometry for calculations
 */
export interface WallGeometry {
  x1: number;           // Start point X (mm)
  y1: number;           // Start point Y (mm)
  x2: number;           // End point X (mm)
  y2: number;           // End point Y (mm)
  length: number;       // Total length (mm)
  angle: number;        // Angle in radians (from positive X axis)
  unitX: number;        // Unit vector X component (along wall)
  unitY: number;        // Unit vector Y component (along wall)
  normalX: number;      // Normal vector X (perpendicular, into room)
  normalY: number;      // Normal vector Y (perpendicular, into room)
}

/**
 * Extract wall geometry from a wall shape.
 * Works with wall, line, and other linear shapes.
 */
export function getWallGeometry(wall: FloorMapShape): WallGeometry | null {
  if (!wall || !wall.coordinates) return null;

  const coords = wall.coordinates as LineCoordinates;
  if (typeof coords.x1 !== 'number' || typeof coords.y1 !== 'number' ||
      typeof coords.x2 !== 'number' || typeof coords.y2 !== 'number') {
    return null;
  }

  const { x1, y1, x2, y2 } = coords;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length < 1) return null; // Degenerate wall

  const angle = Math.atan2(dy, dx);
  const unitX = dx / length;
  const unitY = dy / length;

  // Normal vector (perpendicular to wall, 90 degrees counter-clockwise)
  // This points "into the room" by convention
  const normalX = -unitY;
  const normalY = unitX;

  return {
    x1, y1, x2, y2,
    length,
    angle,
    unitX, unitY,
    normalX, normalY,
  };
}

/**
 * Convert world coordinates (floorplan) to wall-relative position.
 *
 * @param worldX - Object center X in world coordinates (mm)
 * @param worldY - Object center Y in world coordinates (mm)
 * @param wall - The wall shape to attach to
 * @param objectWidth - Object width along wall direction (mm)
 * @param objectDepth - Object depth perpendicular to wall (mm)
 * @param objectHeight - Object height (vertical, mm)
 * @param elevationBottom - Height from floor (mm)
 * @returns Partial wall-relative position (missing wallId)
 */
export function worldToWallRelative(
  worldX: number,
  worldY: number,
  wall: FloorMapShape,
  objectWidth: number,
  objectDepth: number,
  objectHeight: number = 0,
  elevationBottom: number = 0
): Partial<WallRelativePosition> | null {
  const geom = getWallGeometry(wall);
  if (!geom) return null;

  // Project object center onto wall line
  // Vector from wall start to object
  const toObjX = worldX - geom.x1;
  const toObjY = worldY - geom.y1;

  // Distance along wall (dot product with unit vector)
  const distanceAlongWall = toObjX * geom.unitX + toObjY * geom.unitY;

  // Perpendicular distance (dot product with normal)
  const perpDistance = toObjX * geom.normalX + toObjY * geom.normalY;

  // distanceFromWallStart is the position of the object's leading edge
  // (left edge when looking at the wall from the room)
  const distanceFromWallStart = distanceAlongWall - objectWidth / 2;

  return {
    wallId: wall.id,
    distanceFromWallStart,
    perpendicularOffset: perpDistance - objectDepth / 2,
    elevationBottom,
    width: objectWidth,
    height: objectHeight,
    depth: objectDepth,
  };
}

/**
 * Convert wall-relative position to world coordinates (floorplan).
 *
 * @param wallRelative - Wall-relative position data
 * @param wall - The wall shape
 * @returns World coordinates { x, y, rotation } or null if invalid
 */
export function wallRelativeToWorld(
  wallRelative: WallRelativePosition,
  wall: FloorMapShape
): { x: number; y: number; rotation: number } | null {
  const geom = getWallGeometry(wall);
  if (!geom) return null;

  // Object center is at distanceFromWallStart + width/2 along the wall
  const centerAlongWall = wallRelative.distanceFromWallStart + wallRelative.width / 2;

  // And at perpendicularOffset + depth/2 perpendicular to wall
  const centerPerpendicular = wallRelative.perpendicularOffset + wallRelative.depth / 2;

  // Convert to world coordinates
  const x = geom.x1 + centerAlongWall * geom.unitX + centerPerpendicular * geom.normalX;
  const y = geom.y1 + centerAlongWall * geom.unitY + centerPerpendicular * geom.normalY;

  // Rotation in degrees (wall angle converted from radians)
  const rotation = (geom.angle * 180) / Math.PI;

  return { x, y, rotation };
}

/**
 * Convert wall-relative position to elevation view coordinates.
 * In elevation view:
 * - X axis is along the wall (left to right)
 * - Y axis is vertical (bottom = floor, top = ceiling)
 * - Origin is at wall's left edge, floor level
 *
 * @param wallRelative - Wall-relative position data
 * @param wall - The wall shape
 * @param wallHeightMM - Total wall height in mm
 * @param canvasHeight - Elevation canvas height in pixels
 * @param effectiveScale - Current scale (pixels per mm)
 * @param wallXOffset - X offset where wall starts on canvas
 * @param wallYOffset - Y offset where wall top is on canvas
 * @returns Screen coordinates { x, y, width, height } in pixels
 */
export function wallRelativeToElevation(
  wallRelative: WallRelativePosition,
  wall: FloorMapShape,
  wallHeightMM: number,
  canvasHeight: number,
  effectiveScale: number,
  wallXOffset: number,
  wallYOffset: number
): { x: number; y: number; width: number; height: number } | null {
  const geom = getWallGeometry(wall);
  if (!geom) return null;

  // In elevation view, Y increases downward on screen
  // elevationBottom is distance from floor (0 = floor)
  // So screen Y = wallBottom - elevationBottom - objectHeight

  // Object position along wall -> screen X
  const screenX = wallXOffset + wallRelative.distanceFromWallStart * effectiveScale;

  // Object vertical position -> screen Y
  // Wall renders with top at wallYOffset, bottom at wallYOffset + wallHeightMM * scale
  const wallBottomY = wallYOffset + wallHeightMM * effectiveScale;
  const objectTopFromFloor = wallRelative.elevationBottom + wallRelative.height;
  const screenY = wallBottomY - objectTopFromFloor * effectiveScale;

  // Dimensions in screen pixels
  const width = wallRelative.width * effectiveScale;
  const height = wallRelative.height * effectiveScale;

  return { x: screenX, y: screenY, width, height };
}

/**
 * Convert elevation view coordinates to wall-relative position.
 *
 * @param elevationX - Screen X position in elevation view (pixels)
 * @param elevationY - Screen Y position in elevation view (pixels)
 * @param width - Object width in pixels
 * @param height - Object height in pixels
 * @param wall - The wall shape
 * @param wallHeightMM - Total wall height in mm
 * @param effectiveScale - Current scale (pixels per mm)
 * @param wallXOffset - X offset where wall starts on canvas
 * @param wallYOffset - Y offset where wall top is on canvas
 * @returns Partial wall-relative position
 */
export function elevationToWallRelative(
  elevationX: number,
  elevationY: number,
  width: number,
  height: number,
  wall: FloorMapShape,
  wallHeightMM: number,
  effectiveScale: number,
  wallXOffset: number,
  wallYOffset: number
): Partial<WallRelativePosition> | null {
  const geom = getWallGeometry(wall);
  if (!geom || effectiveScale <= 0) return null;

  // Convert screen X to distance along wall (mm)
  const distanceFromWallStart = (elevationX - wallXOffset) / effectiveScale;

  // Convert screen Y to elevation from floor (mm)
  const wallBottomY = wallYOffset + wallHeightMM * effectiveScale;
  const objectHeightMM = height / effectiveScale;
  const objectTopFromFloor = (wallBottomY - elevationY) / effectiveScale;
  const elevationBottom = objectTopFromFloor - objectHeightMM;

  // Convert pixel dimensions to mm
  const widthMM = width / effectiveScale;
  const heightMM = height / effectiveScale;

  return {
    wallId: wall.id,
    distanceFromWallStart,
    perpendicularOffset: 0, // In elevation view, objects are assumed to be on the wall surface
    elevationBottom: Math.max(0, elevationBottom), // Clamp to floor
    width: widthMM,
    height: heightMM,
    depth: 0, // Depth is not editable from elevation view
  };
}

/**
 * Find the nearest wall to a point within a threshold distance.
 *
 * @param worldX - Point X in world coordinates (mm)
 * @param worldY - Point Y in world coordinates (mm)
 * @param walls - Array of wall shapes to search
 * @param maxDistance - Maximum perpendicular distance to consider (mm)
 * @returns Nearest wall and projection info, or null if none found
 */
export function findNearestWallForPoint(
  worldX: number,
  worldY: number,
  walls: FloorMapShape[],
  maxDistance: number = 500
): { wall: FloorMapShape; distance: number; t: number } | null {
  let nearest: { wall: FloorMapShape; distance: number; t: number } | null = null;

  for (const wall of walls) {
    const geom = getWallGeometry(wall);
    if (!geom) continue;

    // Vector from wall start to point
    const toPointX = worldX - geom.x1;
    const toPointY = worldY - geom.y1;

    // Project onto wall direction (parameter t, 0-1 along wall)
    const dot = toPointX * geom.unitX + toPointY * geom.unitY;
    const t = Math.max(0, Math.min(1, dot / geom.length));

    // Closest point on wall
    const closestX = geom.x1 + t * (geom.x2 - geom.x1);
    const closestY = geom.y1 + t * (geom.y2 - geom.y1);

    // Distance from point to closest point on wall
    const dx = worldX - closestX;
    const dy = worldY - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= maxDistance && (!nearest || distance < nearest.distance)) {
      nearest = { wall, distance, t };
    }
  }

  return nearest;
}

/**
 * Calculate the attachment point on a wall for an object.
 * Used when dragging objects in floorplan view.
 *
 * @param objectCenterX - Object center X in world coordinates
 * @param objectCenterY - Object center Y in world coordinates
 * @param objectWidth - Object width (along wall)
 * @param objectDepth - Object depth (perpendicular to wall)
 * @param wall - Target wall
 * @returns Wall-relative position for attachment
 */
export function calculateWallAttachment(
  objectCenterX: number,
  objectCenterY: number,
  objectWidth: number,
  objectDepth: number,
  wall: FloorMapShape,
  existingWallRelative?: WallRelativePosition
): Partial<WallRelativePosition> | null {
  const geom = getWallGeometry(wall);
  if (!geom) return null;

  // Project object center onto wall
  const toObjX = objectCenterX - geom.x1;
  const toObjY = objectCenterY - geom.y1;

  // Distance along wall
  let distanceAlongWall = toObjX * geom.unitX + toObjY * geom.unitY;

  // Clamp to wall bounds (object should fit on wall)
  const minDist = objectWidth / 2;
  const maxDist = geom.length - objectWidth / 2;
  distanceAlongWall = Math.max(minDist, Math.min(maxDist, distanceAlongWall));

  // Distance from wall start is object's left edge position
  const distanceFromWallStart = distanceAlongWall - objectWidth / 2;

  // Perpendicular distance (snap to wall surface)
  // Default to 0 (object touching wall) unless we have existing data
  const perpendicularOffset = existingWallRelative?.perpendicularOffset ?? 0;

  return {
    wallId: wall.id,
    distanceFromWallStart,
    perpendicularOffset,
    elevationBottom: existingWallRelative?.elevationBottom ?? 0,
    width: objectWidth,
    height: existingWallRelative?.height ?? 0,
    depth: objectDepth,
  };
}
