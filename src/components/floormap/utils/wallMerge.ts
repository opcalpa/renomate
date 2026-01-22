import { FloorMapShape, LineCoordinates } from "../types";

const ANGLE_TOLERANCE = 5; // degrees
const ENDPOINT_TOLERANCE = 1; // pixels

interface Point {
  x: number;
  y: number;
}

/**
 * Calculate angle of a line in degrees
 */
function calculateAngle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
}

/**
 * Check if two points are the same (within tolerance)
 */
function pointsMatch(p1: Point, p2: Point): boolean {
  return Math.abs(p1.x - p2.x) < ENDPOINT_TOLERANCE && 
         Math.abs(p1.y - p2.y) < ENDPOINT_TOLERANCE;
}

/**
 * Check if two angles are the same (within tolerance)
 */
function anglesMatch(angle1: number, angle2: number): boolean {
  // Normalize angles to -180 to 180
  const normalize = (a: number) => {
    while (a > 180) a -= 360;
    while (a < -180) a += 360;
    return a;
  };
  
  const diff = Math.abs(normalize(angle1) - normalize(angle2));
  return diff < ANGLE_TOLERANCE || Math.abs(diff - 180) < ANGLE_TOLERANCE;
}

/**
 * Find walls that can be merged with the given wall
 */
export function findMergeableWalls(
  newWall: FloorMapShape,
  allWalls: FloorMapShape[]
): FloorMapShape[] {
  if (newWall.type !== 'wall' && newWall.type !== 'line') return [];
  
  const newCoords = newWall.coordinates as LineCoordinates;
  const newAngle = calculateAngle(newCoords.x1, newCoords.y1, newCoords.x2, newCoords.y2);
  const newStart = { x: newCoords.x1, y: newCoords.y1 };
  const newEnd = { x: newCoords.x2, y: newCoords.y2 };
  
  const mergeable: FloorMapShape[] = [];
  
  for (const wall of allWalls) {
    if (wall.id === newWall.id) continue;
    if (wall.type !== 'wall' && wall.type !== 'line') continue;
    if (wall.planId !== newWall.planId) continue;
    
    const coords = wall.coordinates as LineCoordinates;
    const angle = calculateAngle(coords.x1, coords.y1, coords.x2, coords.y2);
    const start = { x: coords.x1, y: coords.y1 };
    const end = { x: coords.x2, y: coords.y2 };
    
    // Check if walls share an endpoint and have matching angles
    const sharesEndpoint = 
      pointsMatch(newStart, start) || pointsMatch(newStart, end) ||
      pointsMatch(newEnd, start) || pointsMatch(newEnd, end);
    
    if (sharesEndpoint && anglesMatch(newAngle, angle)) {
      mergeable.push(wall);
    }
  }
  
  return mergeable;
}

/**
 * Merge multiple walls into a single wall
 */
export function mergeWalls(walls: FloorMapShape[]): FloorMapShape | null {
  if (walls.length === 0) return null;
  if (walls.length === 1) return walls[0];
  
  // Collect all endpoints
  const points: Point[] = [];
  walls.forEach(wall => {
    const coords = wall.coordinates as LineCoordinates;
    points.push({ x: coords.x1, y: coords.y1 });
    points.push({ x: coords.x2, y: coords.y2 });
  });
  
  // Find the two endpoints that are furthest apart (these are the ends of the merged wall)
  let maxDistance = 0;
  let endpoint1: Point | null = null;
  let endpoint2: Point | null = null;
  
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const distance = Math.sqrt(
        Math.pow(points[i].x - points[j].x, 2) + 
        Math.pow(points[i].y - points[j].y, 2)
      );
      if (distance > maxDistance) {
        maxDistance = distance;
        endpoint1 = points[i];
        endpoint2 = points[j];
      }
    }
  }
  
  if (!endpoint1 || !endpoint2) return null;
  
  // Create merged wall using properties from first wall
  const baseWall = walls[0];
  const mergedWall: FloorMapShape = {
    ...baseWall,
    id: baseWall.id, // Keep original ID
    coordinates: {
      x1: endpoint1.x,
      y1: endpoint1.y,
      x2: endpoint2.x,
      y2: endpoint2.y,
    } as LineCoordinates,
  };
  
  return mergedWall;
}

/**
 * Auto-merge walls when a new wall is created
 * Returns: { mergedWall, wallsToRemove } or null if no merge needed
 */
export function autoMergeWalls(
  newWall: FloorMapShape,
  existingWalls: FloorMapShape[]
): { mergedWall: FloorMapShape; wallsToRemove: string[] } | null {
  const mergeableWalls = findMergeableWalls(newWall, existingWalls);
  
  if (mergeableWalls.length === 0) return null;
  
  // Include the new wall in the merge
  const allWallsToMerge = [newWall, ...mergeableWalls];
  const mergedWall = mergeWalls(allWallsToMerge);
  
  if (!mergedWall) return null;
  
  // Return IDs of walls to remove (all except the base wall)
  const wallsToRemove = mergeableWalls.map(w => w.id);
  
  return {
    mergedWall,
    wallsToRemove,
  };
}
