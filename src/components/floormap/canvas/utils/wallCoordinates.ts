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

// ============================================================================
// WALL ELEVATION DATA - Wall-centric elevation view support
// ============================================================================

/**
 * Object positioned on a wall for elevation view
 */
export interface WallElevationObject {
  shape: FloorMapShape;
  type: 'door' | 'window' | 'sliding_door' | 'object' | 'symbol';
  relativeX: number;        // Distance from wall start (mm)
  width: number;            // Width along wall (mm)
  height: number;           // Height (mm)
  elevationBottom: number;  // Distance from floor (mm)
  side: 'left' | 'right';   // Which side of wall the object is on
}

/**
 * Adjacent room information for a wall
 */
export interface AdjacentRoom {
  room: FloorMapShape;
  color: string;
  name: string;
}

/**
 * Complete elevation data for a specific wall
 */
export interface WallElevationData {
  wall: FloorMapShape;
  wallGeometry: WallGeometry;
  wallLengthMM: number;
  wallHeightMM: number;
  adjacentRooms: {
    left: AdjacentRoom | null;   // Room on the "normal" side of wall
    right: AdjacentRoom | null;  // Room on the opposite side
  };
  objects: WallElevationObject[];
}

/**
 * Check if a point is inside a polygon (room)
 */
function isPointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Get complete elevation data for a specific wall.
 * This is the "Wall Projection Engine" that finds all objects attached to a wall
 * and identifies adjacent rooms for color context.
 *
 * @param wallId - The ID of the wall to analyze
 * @param allShapes - All shapes in the current plan
 * @param defaultWallHeight - Default wall height in mm (usually from project settings)
 * @returns WallElevationData or null if wall not found
 */
export function getWallElevationData(
  wallId: string,
  allShapes: FloorMapShape[],
  defaultWallHeight: number = 2400
): WallElevationData | null {
  // Find the wall
  const wall = allShapes.find(s => s.id === wallId && s.type === 'wall');
  if (!wall) return null;

  const geom = getWallGeometry(wall);
  if (!geom) return null;

  const wallHeight = wall.heightMM || defaultWallHeight;

  // Find adjacent rooms by checking which rooms contain points on either side of wall
  const rooms = allShapes.filter(s => s.type === 'room');

  // Sample point on the "left" side (normal direction) of wall midpoint
  const midX = (geom.x1 + geom.x2) / 2;
  const midY = (geom.y1 + geom.y2) / 2;
  const sampleDistance = 100; // 100mm from wall center

  const leftSampleX = midX + geom.normalX * sampleDistance;
  const leftSampleY = midY + geom.normalY * sampleDistance;
  const rightSampleX = midX - geom.normalX * sampleDistance;
  const rightSampleY = midY - geom.normalY * sampleDistance;

  let leftRoom: AdjacentRoom | null = null;
  let rightRoom: AdjacentRoom | null = null;

  for (const room of rooms) {
    const coords = room.coordinates as { points?: { x: number; y: number }[] };
    if (!coords.points || coords.points.length < 3) continue;

    if (isPointInPolygon(leftSampleX, leftSampleY, coords.points)) {
      leftRoom = {
        room,
        color: room.color || 'rgba(59, 130, 246, 0.3)',
        name: room.name || 'Rum',
      };
    }
    if (isPointInPolygon(rightSampleX, rightSampleY, coords.points)) {
      rightRoom = {
        room,
        color: room.color || 'rgba(59, 130, 246, 0.3)',
        name: room.name || 'Rum',
      };
    }
  }

  // Find all objects attached to this wall
  const objects: WallElevationObject[] = [];

  // Check door_line, window_line, sliding_door_line (line-based openings)
  const openingTypes = ['door_line', 'window_line', 'sliding_door_line'] as const;
  const openingShapes = allShapes.filter(s => openingTypes.includes(s.type as any));

  for (const opening of openingShapes) {
    // Check if opening overlaps with wall
    const openingCoords = opening.coordinates as LineCoordinates;
    if (!openingCoords.x1 || !openingCoords.y1) continue;

    const openingMidX = (openingCoords.x1 + openingCoords.x2) / 2;
    const openingMidY = (openingCoords.y1 + openingCoords.y2) / 2;

    // Project opening onto wall
    const toOpeningX = openingMidX - geom.x1;
    const toOpeningY = openingMidY - geom.y1;
    const dot = toOpeningX * geom.unitX + toOpeningY * geom.unitY;
    const t = dot / geom.length;

    // Check if opening is on this wall (within wall bounds and close to wall line)
    if (t >= -0.1 && t <= 1.1) {
      const closestX = geom.x1 + t * (geom.x2 - geom.x1);
      const closestY = geom.y1 + t * (geom.y2 - geom.y1);
      const distance = Math.sqrt(
        Math.pow(openingMidX - closestX, 2) + Math.pow(openingMidY - closestY, 2)
      );

      // If opening is within 200mm of wall, consider it attached
      if (distance < 200) {
        const openingLength = Math.sqrt(
          Math.pow(openingCoords.x2 - openingCoords.x1, 2) +
          Math.pow(openingCoords.y2 - openingCoords.y1, 2)
        );

        // Determine which side of wall
        const crossProduct = toOpeningX * geom.normalY - toOpeningY * geom.normalX;
        const side = crossProduct >= 0 ? 'left' : 'right';

        // Map type to elevation type
        let type: WallElevationObject['type'] = 'door';
        let elevationBottom = 0;
        let height = 2100; // Default door height

        if (opening.type === 'window_line') {
          type = 'window';
          elevationBottom = 900; // Window sill height
          height = 1200;
        } else if (opening.type === 'sliding_door_line') {
          type = 'sliding_door';
          height = 2100;
        }

        // Use wallRelative data if available
        if (opening.wallRelative) {
          elevationBottom = opening.wallRelative.elevationBottom ?? elevationBottom;
          height = opening.wallRelative.height ?? height;
        }

        objects.push({
          shape: opening,
          type,
          relativeX: Math.max(0, t * geom.length - openingLength / 2),
          width: openingLength,
          height,
          elevationBottom,
          side,
        });
      }
    }
  }

  // Check library symbols and objects with wallRelative data
  const attachedObjects = allShapes.filter(s =>
    s.wallRelative?.wallId === wallId ||
    s.metadata?.attachedToWall === wallId ||
    s.metadata?.parentWallId === wallId
  );

  for (const obj of attachedObjects) {
    const wallRel = obj.wallRelative;
    if (!wallRel) continue;

    let type: WallElevationObject['type'] = 'object';
    if (obj.metadata?.isLibrarySymbol) {
      type = 'symbol';
    }

    // Determine side based on perpendicular offset
    const side = (wallRel.perpendicularOffset ?? 0) >= 0 ? 'left' : 'right';

    objects.push({
      shape: obj,
      type,
      relativeX: wallRel.distanceFromWallStart,
      width: wallRel.width || 600,
      height: wallRel.height || 600,
      elevationBottom: wallRel.elevationBottom || 0,
      side,
    });
  }

  // Sort objects by position along wall
  objects.sort((a, b) => a.relativeX - b.relativeX);

  return {
    wall,
    wallGeometry: geom,
    wallLengthMM: geom.length,
    wallHeightMM: wallHeight,
    adjacentRooms: {
      left: leftRoom,
      right: rightRoom,
    },
    objects,
  };
}

// ============================================================================
// COLLINEAR WALL DETECTION - Combine wall segments that form a logical wall
// ============================================================================

/**
 * A segment in the combined wall line (can be a wall or an opening)
 */
export interface CombinedWallSegment {
  type: 'wall' | 'door' | 'window' | 'sliding_door' | 'gap';
  shape: FloorMapShape | null; // null for gaps
  startPositionMM: number; // Start position along the combined line
  endPositionMM: number;   // End position along the combined line
  lengthMM: number;
  heightMM?: number;
  elevationBottom?: number; // For openings - distance from floor
}

/**
 * Complete data for a combined "logical wall" (collinear segments + openings)
 */
export interface CombinedWallElevationData {
  /** All wall shapes that make up this logical wall */
  walls: FloorMapShape[];
  /** All openings (doors/windows) along this wall line */
  openings: FloorMapShape[];
  /** Unified geometry for the entire line */
  lineGeometry: {
    x1: number; y1: number; // Start of combined line
    x2: number; y2: number; // End of combined line
    angle: number;          // Angle in radians
    unitX: number; unitY: number;
    normalX: number; normalY: number;
  };
  /** Total length of the combined wall line in mm */
  totalLengthMM: number;
  /** Maximum wall height among all segments */
  wallHeightMM: number;
  /** Ordered segments along the line (walls, openings, gaps) */
  segments: CombinedWallSegment[];
  /** Adjacent rooms on each side of the wall (multiple rooms possible for long walls) */
  adjacentRooms: {
    left: AdjacentRoom[];   // Rooms on the "left" side (normal direction)
    right: AdjacentRoom[];  // Rooms on the "right" side (opposite direction)
  };
}

/**
 * Check if a wall is on the same infinite line as the reference geometry.
 * Uses angle similarity, perpendicular distance, AND proximity along the line.
 *
 * @param pixelsPerMm - Conversion factor (coordinates are in pixels)
 */
function isWallOnSameLine(
  refGeom: WallGeometry,
  wallGeom: WallGeometry,
  pixelsPerMm: number = 0.1,
  angleTolerance: number = 0.03,     // ~1.7 degrees (tight tolerance)
  perpToleranceMM: number = 150,     // 150mm perpendicular tolerance (half a wall thickness)
  maxGapAlongLineMM: number = 2000   // Max 2m gap along the line direction
): boolean {
  // Convert mm tolerances to pixels
  const perpTolerance = perpToleranceMM * pixelsPerMm;
  const maxGapAlongLine = maxGapAlongLineMM * pixelsPerMm;
  // Check angle similarity (accounting for opposite directions)
  const angleDiff = Math.abs(refGeom.angle - wallGeom.angle);
  const normalizedDiff = Math.min(
    angleDiff,
    Math.abs(angleDiff - Math.PI),
    Math.abs(angleDiff + Math.PI),
    Math.abs(angleDiff - 2 * Math.PI)
  );

  if (normalizedDiff > angleTolerance) return false;

  // Check perpendicular distance for all points of wall2
  const checkPoints = [
    { x: wallGeom.x1, y: wallGeom.y1 },
    { x: wallGeom.x2, y: wallGeom.y2 },
  ];

  for (const pt of checkPoints) {
    const toPointX = pt.x - refGeom.x1;
    const toPointY = pt.y - refGeom.y1;

    // Perpendicular distance (dot product with normal vector)
    const perpDistance = Math.abs(toPointX * refGeom.normalX + toPointY * refGeom.normalY);

    if (perpDistance > perpTolerance) return false;
  }

  // Check proximity along the line direction
  // Project both wall's endpoints onto the reference line direction
  const refStart = 0;
  const refEnd = refGeom.length;

  const wall2Projections = checkPoints.map(pt => {
    const toPointX = pt.x - refGeom.x1;
    const toPointY = pt.y - refGeom.y1;
    return toPointX * refGeom.unitX + toPointY * refGeom.unitY;
  });

  const wall2Start = Math.min(...wall2Projections);
  const wall2End = Math.max(...wall2Projections);

  // Check if the walls overlap or are within maxGapAlongLine of each other
  // Gap is positive if walls don't overlap, negative if they do
  const gap = Math.max(wall2Start - refEnd, refStart - wall2End);

  if (gap > maxGapAlongLine) return false;

  return true;
}

/**
 * Find all collinear wall segments on the same line as a given wall.
 * This finds ALL walls that lie on the same infinite line, regardless of gaps.
 * Returns walls ordered along the line direction.
 *
 * @param pixelsPerMm - Conversion factor (coordinates are in pixels)
 */
export function findCollinearWalls(
  wallId: string,
  allShapes: FloorMapShape[],
  maxGapMM: number = 2000, // Max gap in mm to still consider as same logical wall
  pixelsPerMm: number = 0.1
): FloorMapShape[] {
  const startWall = allShapes.find(s => s.id === wallId && s.type === 'wall');
  if (!startWall) return [];

  const startGeom = getWallGeometry(startWall);
  if (!startGeom) return [];

  const allWalls = allShapes.filter(s => s.type === 'wall' && s.planId === startWall.planId);
  const collinearWalls: FloorMapShape[] = [];

  // Find ALL walls that are on the same line as the reference wall
  for (const wall of allWalls) {
    const wallGeom = getWallGeometry(wall);
    if (!wallGeom) continue;

    // Check if this wall is on the same line (pass pixelsPerMm for proper tolerance conversion)
    if (isWallOnSameLine(startGeom, wallGeom, pixelsPerMm, 0.03, 150, maxGapMM)) {
      collinearWalls.push(wall);
    }
  }

  // Ensure the start wall is included (it should always pass, but safety check)
  if (!collinearWalls.find(w => w.id === wallId)) {
    collinearWalls.push(startWall);
  }

  // If only found the original wall, return just that
  if (collinearWalls.length === 1) {
    return collinearWalls;
  }

  // Order walls along the line direction
  // Project all wall midpoints onto the reference line direction
  const referenceAngle = startGeom.angle;
  const cosA = Math.cos(referenceAngle);
  const sinA = Math.sin(referenceAngle);

  // Find the leftmost point to use as origin
  let minProj = Infinity;
  let originX = 0, originY = 0;

  for (const wall of collinearWalls) {
    const geom = getWallGeometry(wall);
    if (!geom) continue;

    for (const pt of [{ x: geom.x1, y: geom.y1 }, { x: geom.x2, y: geom.y2 }]) {
      const proj = pt.x * cosA + pt.y * sinA;
      if (proj < minProj) {
        minProj = proj;
        originX = pt.x;
        originY = pt.y;
      }
    }
  }

  // Sort walls by their starting position along the line
  collinearWalls.sort((a, b) => {
    const geomA = getWallGeometry(a)!;
    const geomB = getWallGeometry(b)!;

    const midAx = (geomA.x1 + geomA.x2) / 2;
    const midAy = (geomA.y1 + geomA.y2) / 2;
    const midBx = (geomB.x1 + geomB.x2) / 2;
    const midBy = (geomB.y1 + geomB.y2) / 2;

    const projA = (midAx - originX) * cosA + (midAy - originY) * sinA;
    const projB = (midBx - originX) * cosA + (midBy - originY) * sinA;

    return projA - projB;
  });

  return collinearWalls;
}

/**
 * Get combined elevation data for a "logical wall" - all collinear wall segments
 * plus the openings (doors/windows) between them.
 *
 * @param wallId - The ID of the starting wall
 * @param allShapes - All shapes in the plan
 * @param defaultWallHeight - Default wall height in mm
 * @param pixelsPerMm - Conversion factor from pixels to mm (coordinates are in pixels)
 */
export function getCombinedWallElevationData(
  wallId: string,
  allShapes: FloorMapShape[],
  defaultWallHeight: number = 2400,
  pixelsPerMm: number = 0.1  // Default scale factor
): CombinedWallElevationData | null {
  // Find all collinear walls (pass pixelsPerMm for proper tolerance calculations)
  // Use larger gap tolerance (3.5m) to connect walls across wide openings/passages
  const walls = findCollinearWalls(wallId, allShapes, 3500, pixelsPerMm);
  if (walls.length === 0) return null;

  // Get reference geometry from first wall
  const firstGeom = getWallGeometry(walls[0]);
  if (!firstGeom) return null;

  const referenceAngle = firstGeom.angle;
  const cosA = Math.cos(referenceAngle);
  const sinA = Math.sin(referenceAngle);

  // Helper to convert pixels to mm
  const toMM = (pixels: number) => pixels / pixelsPerMm;

  // Find all endpoints and their projections onto the line
  interface ProjectedPoint {
    x: number;
    y: number;
    proj: number;
    wallId: string;
    isStart: boolean;
  }

  const points: ProjectedPoint[] = [];
  let maxHeight = defaultWallHeight;

  // Find the origin point (leftmost point)
  let originX = Infinity, originY = Infinity;
  let minProj = Infinity;

  for (const wall of walls) {
    const geom = getWallGeometry(wall);
    if (!geom) continue;

    if (wall.heightMM && wall.heightMM > maxHeight) {
      maxHeight = wall.heightMM;
    }

    for (const pt of [{ x: geom.x1, y: geom.y1 }, { x: geom.x2, y: geom.y2 }]) {
      const proj = pt.x * cosA + pt.y * sinA;
      if (proj < minProj) {
        minProj = proj;
        originX = pt.x;
        originY = pt.y;
      }
    }
  }

  // Project all wall endpoints relative to origin
  for (const wall of walls) {
    const geom = getWallGeometry(wall);
    if (!geom) continue;

    const proj1 = (geom.x1 - originX) * cosA + (geom.y1 - originY) * sinA;
    const proj2 = (geom.x2 - originX) * cosA + (geom.y2 - originY) * sinA;

    points.push({ x: geom.x1, y: geom.y1, proj: proj1, wallId: wall.id, isStart: proj1 < proj2 });
    points.push({ x: geom.x2, y: geom.y2, proj: proj2, wallId: wall.id, isStart: proj1 >= proj2 });
  }

  // Find total extent (in pixels)
  const projections = points.map(p => p.proj);
  const minX = Math.min(...projections);
  const maxX = Math.max(...projections);
  const totalLengthPixels = maxX - minX;
  const totalLengthMM = toMM(totalLengthPixels);

  // Calculate end point (in pixels for geometry)
  const endX = originX + totalLengthPixels * cosA;
  const endY = originY + totalLengthPixels * sinA;

  // Build line geometry
  const lineGeometry = {
    x1: originX,
    y1: originY,
    x2: endX,
    y2: endY,
    angle: referenceAngle,
    unitX: cosA,
    unitY: sinA,
    normalX: -sinA,
    normalY: cosA,
  };

  // Find openings along this line
  const openingTypes = ['door_line', 'window_line', 'sliding_door_line'] as const;
  const allOpenings = allShapes.filter(s => openingTypes.includes(s.type as any));
  const lineOpenings: FloorMapShape[] = [];

  // Tolerances in mm, converted to pixels
  const perpTolerancePixels = 150 * pixelsPerMm;  // 150mm perpendicular tolerance
  const endTolerancePixels = 50 * pixelsPerMm;    // 50mm tolerance at ends

  for (const opening of allOpenings) {
    const openingCoords = opening.coordinates as LineCoordinates;
    if (!openingCoords.x1 || !openingCoords.y1) continue;

    const midX = (openingCoords.x1 + openingCoords.x2) / 2;
    const midY = (openingCoords.y1 + openingCoords.y2) / 2;

    // Check if opening is on this line
    const toMidX = midX - originX;
    const toMidY = midY - originY;
    const perpDist = Math.abs(toMidX * (-sinA) + toMidY * cosA);
    const alongDist = toMidX * cosA + toMidY * sinA;

    // Opening should be close to line (perpendicular) and within the total wall length
    // Use proper pixel-based tolerances
    if (perpDist < perpTolerancePixels &&
        alongDist >= -endTolerancePixels &&
        alongDist <= totalLengthPixels + endTolerancePixels) {
      lineOpenings.push(opening);
    }
  }

  // Build ordered segments (walls and openings)
  interface TempSegment {
    type: 'wall' | 'door' | 'window' | 'sliding_door';
    shape: FloorMapShape;
    startMM: number;
    endMM: number;
  }

  const tempSegments: TempSegment[] = [];

  // Add walls - convert pixel projections to mm
  for (const wall of walls) {
    const geom = getWallGeometry(wall);
    if (!geom) continue;

    const proj1 = (geom.x1 - originX) * cosA + (geom.y1 - originY) * sinA;
    const proj2 = (geom.x2 - originX) * cosA + (geom.y2 - originY) * sinA;

    tempSegments.push({
      type: 'wall',
      shape: wall,
      startMM: toMM(Math.min(proj1, proj2)),
      endMM: toMM(Math.max(proj1, proj2)),
    });
  }

  // Add openings - convert pixel projections to mm
  for (const opening of lineOpenings) {
    const coords = opening.coordinates as LineCoordinates;
    const proj1 = (coords.x1 - originX) * cosA + (coords.y1 - originY) * sinA;
    const proj2 = (coords.x2 - originX) * cosA + (coords.y2 - originY) * sinA;

    let type: 'door' | 'window' | 'sliding_door' = 'door';
    if (opening.type === 'window_line') type = 'window';
    else if (opening.type === 'sliding_door_line') type = 'sliding_door';

    tempSegments.push({
      type,
      shape: opening,
      startMM: toMM(Math.min(proj1, proj2)),
      endMM: toMM(Math.max(proj1, proj2)),
    });
  }

  // Sort by start position
  tempSegments.sort((a, b) => a.startMM - b.startMM);

  // Convert to final segments (adding gaps where needed)
  const segments: CombinedWallSegment[] = [];
  let currentPos = 0;

  for (const seg of tempSegments) {
    // Add gap if there's space before this segment
    if (seg.startMM > currentPos + 10) { // 10mm tolerance
      segments.push({
        type: 'gap',
        shape: null,
        startPositionMM: currentPos,
        endPositionMM: seg.startMM,
        lengthMM: seg.startMM - currentPos,
      });
    }

    // Add the segment
    const isOpening = seg.type !== 'wall';
    segments.push({
      type: seg.type,
      shape: seg.shape,
      startPositionMM: seg.startMM,
      endPositionMM: seg.endMM,
      lengthMM: seg.endMM - seg.startMM,
      heightMM: isOpening
        ? (seg.type === 'window' ? 1200 : 2100)
        : (seg.shape.heightMM || defaultWallHeight),
      elevationBottom: isOpening
        ? (seg.type === 'window' ? 900 : 0)
        : undefined,
    });

    currentPos = Math.max(currentPos, seg.endMM);
  }

  // Add final gap if needed
  if (currentPos < totalLengthMM - 10) {
    segments.push({
      type: 'gap',
      shape: null,
      startPositionMM: currentPos,
      endPositionMM: totalLengthMM,
      lengthMM: totalLengthMM - currentPos,
    });
  }

  // Find ALL adjacent rooms along the wall by sampling multiple points
  // Note: Use pixel coordinates since originX/Y are in pixels
  const rooms = allShapes.filter(s => s.type === 'room');
  const sampleDist = 100; // Distance from wall line to sample point (pixels)
  const sampleIntervalMM = 500; // Sample every 500mm along the wall
  const sampleIntervalPixels = sampleIntervalMM * pixelsPerMm;

  // Calculate number of sample points
  const numSamples = Math.max(3, Math.ceil(totalLengthPixels / sampleIntervalPixels));

  // Use maps to collect unique rooms by ID
  const leftRoomsMap = new Map<string, AdjacentRoom>();
  const rightRoomsMap = new Map<string, AdjacentRoom>();

  for (let i = 0; i < numSamples; i++) {
    // Sample position along the wall (from 10% to 90% to avoid edge issues)
    const t = 0.1 + (0.8 * i / (numSamples - 1));
    const sampleX = originX + (totalLengthPixels * t) * cosA;
    const sampleY = originY + (totalLengthPixels * t) * sinA;

    // Sample points on each side of the wall
    const leftSampleX = sampleX + sampleDist * (-sinA);
    const leftSampleY = sampleY + sampleDist * cosA;
    const rightSampleX = sampleX - sampleDist * (-sinA);
    const rightSampleY = sampleY - sampleDist * cosA;

    for (const room of rooms) {
      const coords = room.coordinates as { points?: { x: number; y: number }[] };
      if (!coords.points || coords.points.length < 3) continue;

      if (isPointInPolygon(leftSampleX, leftSampleY, coords.points) && !leftRoomsMap.has(room.id)) {
        leftRoomsMap.set(room.id, {
          room,
          color: room.color || 'rgba(59, 130, 246, 0.3)',
          name: room.name || 'Rum',
        });
      }
      if (isPointInPolygon(rightSampleX, rightSampleY, coords.points) && !rightRoomsMap.has(room.id)) {
        rightRoomsMap.set(room.id, {
          room,
          color: room.color || 'rgba(59, 130, 246, 0.3)',
          name: room.name || 'Rum',
        });
      }
    }
  }

  const leftRooms = Array.from(leftRoomsMap.values());
  const rightRooms = Array.from(rightRoomsMap.values());

  return {
    walls,
    openings: lineOpenings,
    lineGeometry,
    totalLengthMM,
    wallHeightMM: maxHeight,
    segments,
    adjacentRooms: {
      left: leftRooms,
      right: rightRooms,
    },
  };
}

/**
 * Get all walls that belong to a specific room
 * by checking wall proximity to room edges
 */
export function getWallsForRoom(
  room: FloorMapShape,
  allShapes: FloorMapShape[],
  tolerance: number = 100
): FloorMapShape[] {
  const coords = room.coordinates as { points?: { x: number; y: number }[] };
  if (!coords.points || coords.points.length < 3) return [];

  const walls = allShapes.filter(s => s.type === 'wall');
  const matchingWalls: FloorMapShape[] = [];

  for (const wall of walls) {
    const geom = getWallGeometry(wall);
    if (!geom) continue;

    // Check if wall midpoint is close to any room edge
    const wallMidX = (geom.x1 + geom.x2) / 2;
    const wallMidY = (geom.y1 + geom.y2) / 2;

    for (let i = 0; i < coords.points.length; i++) {
      const p1 = coords.points[i];
      const p2 = coords.points[(i + 1) % coords.points.length];

      // Edge vector
      const edgeDx = p2.x - p1.x;
      const edgeDy = p2.y - p1.y;
      const edgeLength = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
      if (edgeLength < 1) continue;

      // Project wall midpoint onto edge
      const toWallX = wallMidX - p1.x;
      const toWallY = wallMidY - p1.y;
      const t = (toWallX * edgeDx + toWallY * edgeDy) / (edgeLength * edgeLength);

      if (t >= 0 && t <= 1) {
        const closestX = p1.x + t * edgeDx;
        const closestY = p1.y + t * edgeDy;
        const distance = Math.sqrt(
          Math.pow(wallMidX - closestX, 2) + Math.pow(wallMidY - closestY, 2)
        );

        if (distance < tolerance) {
          // Also check angle alignment
          const wallAngle = geom.angle;
          const edgeAngle = Math.atan2(edgeDy, edgeDx);
          const angleDiff = Math.abs(wallAngle - edgeAngle);
          const normalizedDiff = Math.min(angleDiff, Math.PI - angleDiff, Math.abs(angleDiff - Math.PI));

          if (normalizedDiff < 0.2) { // ~11 degrees tolerance
            matchingWalls.push(wall);
            break;
          }
        }
      }
    }
  }

  return matchingWalls;
}
