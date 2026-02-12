/**
 * Room Walls Utility
 *
 * Functions to find walls that belong to a room and determine their directions.
 * Used for room-centric elevation view navigation.
 */

import { FloorMapShape, PolygonCoordinates, LineCoordinates } from '../types';

/**
 * Direction of a wall relative to the room center
 */
export type WallDirection = 'north' | 'south' | 'east' | 'west';

/**
 * A wall segment with its direction relative to the room
 */
export interface RoomWall {
  wall: FloorMapShape;
  direction: WallDirection;
  /** Center point of the wall */
  center: { x: number; y: number };
  /** Angle of the wall in degrees (0 = horizontal, 90 = vertical) */
  angle: number;
  /** Length of the wall in the same units as coordinates */
  length: number;
}

/**
 * Calculate the centroid (center point) of a polygon
 */
function calculatePolygonCenter(points: { x: number; y: number }[]): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };

  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  return {
    x: sumX / points.length,
    y: sumY / points.length,
  };
}

/**
 * Check if a wall segment is close to a room edge
 * Returns the matching room edge index if found, -1 otherwise
 */
function isWallOnRoomEdge(
  wallCoords: LineCoordinates,
  roomPoints: { x: number; y: number }[],
  tolerance: number = 50
): number {
  // For each edge of the room polygon
  for (let i = 0; i < roomPoints.length; i++) {
    const p1 = roomPoints[i];
    const p2 = roomPoints[(i + 1) % roomPoints.length];

    // Calculate distance from wall endpoints to this edge
    const wallMidX = (wallCoords.x1 + wallCoords.x2) / 2;
    const wallMidY = (wallCoords.y1 + wallCoords.y2) / 2;

    // Check if wall midpoint is close to the room edge
    const edgeDx = p2.x - p1.x;
    const edgeDy = p2.y - p1.y;
    const edgeLength = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);

    if (edgeLength === 0) continue;

    // Project wall midpoint onto edge line
    const t = Math.max(0, Math.min(1,
      ((wallMidX - p1.x) * edgeDx + (wallMidY - p1.y) * edgeDy) / (edgeLength * edgeLength)
    ));

    const closestX = p1.x + t * edgeDx;
    const closestY = p1.y + t * edgeDy;

    const distance = Math.sqrt(
      Math.pow(wallMidX - closestX, 2) + Math.pow(wallMidY - closestY, 2)
    );

    // Also check if wall angle matches edge angle (within tolerance)
    const wallDx = wallCoords.x2 - wallCoords.x1;
    const wallDy = wallCoords.y2 - wallCoords.y1;
    const wallAngle = Math.atan2(wallDy, wallDx);
    const edgeAngle = Math.atan2(edgeDy, edgeDx);

    // Angles should be same or opposite (wall could be drawn in either direction)
    const angleDiff = Math.abs(wallAngle - edgeAngle);
    const anglesMatch = angleDiff < 0.2 || Math.abs(angleDiff - Math.PI) < 0.2;

    if (distance < tolerance && anglesMatch) {
      return i;
    }
  }

  return -1;
}

/**
 * Determine the direction of a wall relative to the room center
 */
function getWallDirection(
  wallCenter: { x: number; y: number },
  roomCenter: { x: number; y: number },
  wallAngle: number
): WallDirection {
  // Calculate angle from room center to wall center
  const dx = wallCenter.x - roomCenter.x;
  const dy = wallCenter.y - roomCenter.y;
  const angleToWall = Math.atan2(dy, dx) * (180 / Math.PI);

  // Normalize angle to 0-360
  const normalizedAngle = ((angleToWall % 360) + 360) % 360;

  // Determine direction based on angle
  // Note: In canvas coordinates, Y increases downward
  // So "north" is negative Y (angle around -90 or 270)
  // "south" is positive Y (angle around 90)
  // "east" is positive X (angle around 0)
  // "west" is negative X (angle around 180)

  if (normalizedAngle >= 315 || normalizedAngle < 45) {
    return 'east';
  } else if (normalizedAngle >= 45 && normalizedAngle < 135) {
    return 'south'; // In canvas coords, down is positive Y
  } else if (normalizedAngle >= 135 && normalizedAngle < 225) {
    return 'west';
  } else {
    return 'north'; // In canvas coords, up is negative Y
  }
}

/**
 * Find all walls that belong to a room
 *
 * This function finds wall shapes that align with the edges of a room polygon.
 * It also determines the direction (N/S/E/W) of each wall relative to the room.
 *
 * @param room The room shape (must be type 'room' with polygon coordinates)
 * @param allShapes All shapes in the floor plan
 * @param tolerance Distance tolerance for matching walls to room edges (default 50)
 * @returns Array of RoomWall objects sorted by direction (north, east, south, west)
 */
export function findWallsForRoom(
  room: FloorMapShape,
  allShapes: FloorMapShape[],
  tolerance: number = 50
): RoomWall[] {
  if (room.type !== 'room') return [];

  const roomCoords = room.coordinates as PolygonCoordinates;
  if (!roomCoords.points || roomCoords.points.length < 3) return [];

  const roomCenter = calculatePolygonCenter(roomCoords.points);

  // Get all wall shapes (not the room itself)
  const walls = allShapes.filter(s =>
    (s.type === 'wall' || s.type === 'line') &&
    s.id !== room.id &&
    s.planId === room.planId
  );

  const roomWalls: RoomWall[] = [];

  for (const wall of walls) {
    const wallCoords = wall.coordinates as LineCoordinates;

    // Check if this wall aligns with a room edge
    const edgeIndex = isWallOnRoomEdge(wallCoords, roomCoords.points, tolerance);
    if (edgeIndex === -1) continue;

    // Calculate wall properties
    const centerX = (wallCoords.x1 + wallCoords.x2) / 2;
    const centerY = (wallCoords.y1 + wallCoords.y2) / 2;
    const dx = wallCoords.x2 - wallCoords.x1;
    const dy = wallCoords.y2 - wallCoords.y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const direction = getWallDirection({ x: centerX, y: centerY }, roomCenter, angle);

    roomWalls.push({
      wall,
      direction,
      center: { x: centerX, y: centerY },
      angle,
      length,
    });
  }

  // Sort by direction: north, east, south, west
  const directionOrder: Record<WallDirection, number> = {
    north: 0,
    east: 1,
    south: 2,
    west: 3,
  };

  return roomWalls.sort((a, b) => directionOrder[a.direction] - directionOrder[b.direction]);
}

/**
 * Get a display label for a wall direction
 */
export function getDirectionLabel(direction: WallDirection, t?: (key: string) => string): string {
  if (t) {
    const key = `directions.${direction}`;
    return t(key);
  }

  const labels: Record<WallDirection, string> = {
    north: 'North',
    south: 'South',
    east: 'East',
    west: 'West',
  };
  return labels[direction];
}

/**
 * Get an emoji/icon for a wall direction
 */
export function getDirectionIcon(direction: WallDirection): string {
  const icons: Record<WallDirection, string> = {
    north: '\u2191', // ↑
    south: '\u2193', // ↓
    east: '\u2192',  // →
    west: '\u2190',  // ←
  };
  return icons[direction];
}

/**
 * Generate actual wall shapes from a room's polygon edges.
 * These walls can be added to the store and behave like normal walls.
 *
 * @param room The room shape to generate walls from
 * @param generateId Function to generate unique IDs (e.g., uuidv4)
 * @param options Optional configuration for wall properties
 * @returns Array of wall shapes ready to be added to the store
 */
export function generateWallsFromRoom(
  room: FloorMapShape,
  generateId: () => string,
  options?: {
    heightMM?: number;
    thicknessMM?: number;
    planId?: string;
  }
): FloorMapShape[] {
  if (room.type !== 'room') return [];

  const roomCoords = room.coordinates as PolygonCoordinates;
  if (!roomCoords.points || roomCoords.points.length < 3) return [];

  const walls: FloorMapShape[] = [];
  const heightMM = options?.heightMM ?? 2400;
  const thicknessMM = options?.thicknessMM ?? 150;
  const planId = options?.planId ?? room.planId;

  for (let i = 0; i < roomCoords.points.length; i++) {
    const p1 = roomCoords.points[i];
    const p2 = roomCoords.points[(i + 1) % roomCoords.points.length];

    const wall: FloorMapShape = {
      id: generateId(),
      type: 'wall',
      coordinates: {
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
      } as LineCoordinates,
      heightMM,
      thicknessMM,
      planId,
    };

    walls.push(wall);
  }

  return walls;
}

/**
 * Check if two wall segments are essentially the same wall (overlap on the same line)
 * Used for deduplication when generating walls from multiple adjacent rooms
 */
function wallsOverlap(
  wall1: { x1: number; y1: number; x2: number; y2: number },
  wall2: { x1: number; y1: number; x2: number; y2: number },
  tolerance: number = 5
): boolean {
  // Calculate direction vectors
  const dx1 = wall1.x2 - wall1.x1;
  const dy1 = wall1.y2 - wall1.y1;
  const dx2 = wall2.x2 - wall2.x1;
  const dy2 = wall2.y2 - wall2.y1;

  const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

  if (len1 === 0 || len2 === 0) return false;

  // Normalize direction vectors
  const nx1 = dx1 / len1;
  const ny1 = dy1 / len1;
  const nx2 = dx2 / len2;
  const ny2 = dy2 / len2;

  // Check if walls are parallel (same or opposite direction)
  const dot = nx1 * nx2 + ny1 * ny2;
  if (Math.abs(Math.abs(dot) - 1) > 0.01) {
    // Not parallel
    return false;
  }

  // Check if wall2 endpoints are close to wall1's line
  // Distance from point to line segment
  const distToLine = (px: number, py: number, lx1: number, ly1: number, lx2: number, ly2: number): number => {
    const ldx = lx2 - lx1;
    const ldy = ly2 - ly1;
    const len = Math.sqrt(ldx * ldx + ldy * ldy);
    if (len === 0) return Math.sqrt((px - lx1) ** 2 + (py - ly1) ** 2);

    // Cross product gives perpendicular distance
    const cross = Math.abs((px - lx1) * ldy - (py - ly1) * ldx) / len;
    return cross;
  };

  // Check if both endpoints of wall2 are close to wall1's infinite line
  const d1 = distToLine(wall2.x1, wall2.y1, wall1.x1, wall1.y1, wall1.x2, wall1.y2);
  const d2 = distToLine(wall2.x2, wall2.y2, wall1.x1, wall1.y1, wall1.x2, wall1.y2);

  if (d1 > tolerance || d2 > tolerance) {
    // wall2 is not on the same line as wall1
    return false;
  }

  // Now check if the segments overlap
  // Project all points onto the line direction
  const project = (px: number, py: number): number => {
    return (px - wall1.x1) * nx1 + (py - wall1.y1) * ny1;
  };

  const t1a = project(wall1.x1, wall1.y1);
  const t1b = project(wall1.x2, wall1.y2);
  const t2a = project(wall2.x1, wall2.y1);
  const t2b = project(wall2.x2, wall2.y2);

  const min1 = Math.min(t1a, t1b);
  const max1 = Math.max(t1a, t1b);
  const min2 = Math.min(t2a, t2b);
  const max2 = Math.max(t2a, t2b);

  // Calculate the actual overlap amount
  const overlapStart = Math.max(min1, min2);
  const overlapEnd = Math.min(max1, max2);
  const overlapAmount = overlapEnd - overlapStart;

  // Walls must overlap by a significant amount (more than just touching at a point)
  // Use a minimum overlap threshold to distinguish between:
  // - Walls that share a corner (overlapAmount ≈ 0) -> NOT duplicates
  // - Walls that truly overlap (overlapAmount > threshold) -> duplicates
  const minOverlapRequired = 1; // At least 1 unit of actual overlap required

  return overlapAmount > minOverlapRequired;
}

/**
 * Generate walls from multiple rooms with automatic deduplication.
 * When rooms share edges (like adjacent rooms), only one wall is created
 * instead of overlapping duplicates.
 *
 * @param rooms Array of room shapes to generate walls from
 * @param generateId Function to generate unique IDs (e.g., uuidv4)
 * @param options Optional configuration for wall properties
 * @param existingWalls Optional array of existing walls to also deduplicate against
 * @returns Array of deduplicated wall shapes ready to be added to the store
 */
export function generateWallsFromRooms(
  rooms: FloorMapShape[],
  generateId: () => string,
  options?: {
    heightMM?: number;
    thicknessMM?: number;
    planId?: string;
  },
  existingWalls?: FloorMapShape[]
): FloorMapShape[] {
  const heightMM = options?.heightMM ?? 2400;
  const thicknessMM = options?.thicknessMM ?? 150;
  const planId = options?.planId;

  // Collect all potential wall segments from all rooms
  const allWallCandidates: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  for (const room of rooms) {
    if (room.type !== 'room') continue;

    const roomCoords = room.coordinates as PolygonCoordinates;
    if (!roomCoords.points || roomCoords.points.length < 3) continue;

    for (let i = 0; i < roomCoords.points.length; i++) {
      const p1 = roomCoords.points[i];
      const p2 = roomCoords.points[(i + 1) % roomCoords.points.length];

      allWallCandidates.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
      });
    }
  }

  // Also include existing walls for deduplication check
  const existingWallCoords: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  if (existingWalls) {
    for (const wall of existingWalls) {
      if (wall.type === 'wall' || wall.type === 'line') {
        const coords = wall.coordinates as LineCoordinates;
        existingWallCoords.push({
          x1: coords.x1,
          y1: coords.y1,
          x2: coords.x2,
          y2: coords.y2,
        });
      }
    }
  }

  // Deduplicate: keep only walls that don't overlap with already-added walls
  const uniqueWallCoords: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  for (const candidate of allWallCandidates) {
    let isDuplicate = false;

    // Check against already accepted unique walls
    for (const existing of uniqueWallCoords) {
      if (wallsOverlap(candidate, existing)) {
        isDuplicate = true;
        break;
      }
    }

    // Check against pre-existing walls on canvas
    if (!isDuplicate) {
      for (const existing of existingWallCoords) {
        if (wallsOverlap(candidate, existing)) {
          isDuplicate = true;
          break;
        }
      }
    }

    if (!isDuplicate) {
      uniqueWallCoords.push(candidate);
    }
  }

  // Create wall shapes from unique coordinates
  const walls: FloorMapShape[] = uniqueWallCoords.map(coords => ({
    id: generateId(),
    type: 'wall' as const,
    coordinates: {
      x1: coords.x1,
      y1: coords.y1,
      x2: coords.x2,
      y2: coords.y2,
    } as LineCoordinates,
    heightMM,
    thicknessMM,
    planId,
  }));

  return walls;
}

/**
 * Create room edges as virtual walls if no walls are found
 * This allows elevation view even when walls haven't been drawn
 */
export function createVirtualWallsFromRoom(room: FloorMapShape): RoomWall[] {
  if (room.type !== 'room') return [];

  const roomCoords = room.coordinates as PolygonCoordinates;
  if (!roomCoords.points || roomCoords.points.length < 3) return [];

  const roomCenter = calculatePolygonCenter(roomCoords.points);
  const virtualWalls: RoomWall[] = [];

  for (let i = 0; i < roomCoords.points.length; i++) {
    const p1 = roomCoords.points[i];
    const p2 = roomCoords.points[(i + 1) % roomCoords.points.length];

    const centerX = (p1.x + p2.x) / 2;
    const centerY = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const direction = getWallDirection({ x: centerX, y: centerY }, roomCenter, angle);

    // Create a virtual wall shape
    const virtualWall: FloorMapShape = {
      id: `virtual-wall-${room.id}-${i}`,
      type: 'wall',
      coordinates: {
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
      },
      heightMM: 2400, // Default wall height
      thicknessMM: 150, // Default wall thickness
      planId: room.planId,
    };

    virtualWalls.push({
      wall: virtualWall,
      direction,
      center: { x: centerX, y: centerY },
      angle,
      length,
    });
  }

  // Sort by direction
  const directionOrder: Record<WallDirection, number> = {
    north: 0,
    east: 1,
    south: 2,
    west: 3,
  };

  return virtualWalls.sort((a, b) => directionOrder[a.direction] - directionOrder[b.direction]);
}
