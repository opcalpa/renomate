/**
 * Shape Connection Helpers
 *
 * Utilities for finding connected shapes (walls, rooms, etc.)
 * and nearest endpoints for magnetic snapping.
 * Used for auto-grouping and wall-to-wall connections.
 */

import { FloorMapShape } from '../../types';

/**
 * Get connection points for any shape type.
 * Returns all points that can connect to other shapes.
 */
const getConnectionPoints = (shape: FloorMapShape): { x: number; y: number }[] => {
  const coords = shape.coordinates as any;
  const points: { x: number; y: number }[] = [];

  if (shape.type === 'wall' || shape.type === 'line') {
    // Line endpoints
    points.push({ x: coords.x1, y: coords.y1 });
    points.push({ x: coords.x2, y: coords.y2 });
  } else if (shape.type === 'rectangle') {
    // Rectangle corners
    points.push({ x: coords.left, y: coords.top });
    points.push({ x: coords.left + coords.width, y: coords.top });
    points.push({ x: coords.left, y: coords.top + coords.height });
    points.push({ x: coords.left + coords.width, y: coords.top + coords.height });
  } else if (shape.type === 'circle') {
    // Circle center (can connect to other shapes at center)
    points.push({ x: coords.cx, y: coords.cy });
  } else if (shape.type === 'room' || shape.type === 'polygon' || shape.type === 'freehand') {
    // All polygon vertices
    if (coords.points && Array.isArray(coords.points)) {
      coords.points.forEach((p: any) => {
        points.push({ x: p.x, y: p.y });
      });
    }
  } else if (shape.type === 'text') {
    // Text position
    points.push({ x: coords.x, y: coords.y });
  } else if (shape.type === 'symbol' || shape.type === 'object') {
    // Symbol/object position
    points.push({ x: coords.x || 0, y: coords.y || 0 });
  } else if (shape.type === 'bezier') {
    // Bezier start, control, end points
    points.push({ x: coords.start.x, y: coords.start.y });
    points.push({ x: coords.control.x, y: coords.control.y });
    points.push({ x: coords.end.x, y: coords.end.y });
  } else if (shape.type === 'image') {
    // Image corners
    points.push({ x: coords.x, y: coords.y });
    points.push({ x: coords.x + (coords.width || 0), y: coords.y });
    points.push({ x: coords.x, y: coords.y + (coords.height || 0) });
    points.push({ x: coords.x + (coords.width || 0), y: coords.y + (coords.height || 0) });
  }

  return points;
};

/**
 * Find all shapes connected to a starting shape (auto-grouping).
 * Uses generous tolerance to catch shapes that visually connect at grid points/nodes.
 *
 * @param startShapeId - ID of the starting shape
 * @param allShapes - All shapes to search through
 * @param zoomLevel - Current zoom level (affects tolerance)
 * @returns Array of connected shape IDs including the start shape
 */
export const findConnectedShapes = (
  startShapeId: string,
  allShapes: FloorMapShape[],
  zoomLevel: number = 1
): string[] => {
  // GENEROUS tolerance - catches shapes connected at grid points
  // Using 150mm (15cm) as base - typical grid snap precision
  const baseTolerance = 150;
  const tolerance = baseTolerance / Math.max(0.3, zoomLevel); // Even more generous at low zoom

  const visited = new Set<string>();
  const connectedIds: string[] = [];

  const startShape = allShapes.find(s => s.id === startShapeId);
  if (!startShape) {
    return [startShapeId];
  }

  const toVisit = [startShapeId];

  while (toVisit.length > 0) {
    const currentId = toVisit.pop()!;
    if (visited.has(currentId)) continue;

    visited.add(currentId);
    connectedIds.push(currentId);

    const currentShape = allShapes.find(s => s.id === currentId);
    if (!currentShape) continue;

    const currentEndpoints = getConnectionPoints(currentShape);

    // Find all shapes that share a connection point with current shape
    for (const shape of allShapes) {
      if (visited.has(shape.id)) continue;

      const endpoints = getConnectionPoints(shape);

      // Check if any endpoint of this shape matches any endpoint of current shape
      let isConnected = false;
      for (const ep1 of currentEndpoints) {
        for (const ep2 of endpoints) {
          const dist = Math.sqrt(Math.pow(ep1.x - ep2.x, 2) + Math.pow(ep1.y - ep2.y, 2));
          if (dist <= tolerance) {
            toVisit.push(shape.id);
            isConnected = true;
            break;
          }
        }
        if (isConnected) break;
      }
    }
  }

  return connectedIds;
};

/**
 * Find nearest wall endpoint for magnetic snap.
 * Used when drawing walls to snap to existing wall endpoints.
 *
 * @param point - Current mouse/touch position
 * @param allShapes - All shapes to search through
 * @param excludeShapeId - Shape to exclude (e.g., the wall being drawn)
 * @param zoomLevel - Current zoom level (affects snap radius)
 * @returns Nearest endpoint or null if none within range
 */
export const findNearestWallEndpoint = (
  point: { x: number; y: number },
  allShapes: FloorMapShape[],
  excludeShapeId?: string,
  zoomLevel: number = 1
): { x: number; y: number } | null => {
  // Magnetic snap radius - generous to make it easy to connect
  const snapRadius = 80 / Math.max(0.5, zoomLevel);

  let nearestPoint: { x: number; y: number } | null = null;
  let nearestDist = snapRadius;

  for (const shape of allShapes) {
    if (shape.id === excludeShapeId) continue;
    if (shape.type !== 'wall' && shape.type !== 'line') continue;

    const coords = shape.coordinates as any;
    const endpoints = [
      { x: coords.x1, y: coords.y1 },
      { x: coords.x2, y: coords.y2 }
    ];

    for (const ep of endpoints) {
      const dist = Math.sqrt(Math.pow(point.x - ep.x, 2) + Math.pow(point.y - ep.y, 2));
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPoint = ep;
      }
    }
  }

  return nearestPoint;
};

/**
 * Check if two walls are connected (share an endpoint).
 */
export const areWallsConnected = (wall1: FloorMapShape, wall2: FloorMapShape): boolean => {
  if ((wall1.type !== 'wall' && wall1.type !== 'line') || (wall2.type !== 'wall' && wall2.type !== 'line')) {
    return false;
  }

  const coords1 = wall1.coordinates as any;
  const coords2 = wall2.coordinates as any;

  // Get endpoints directly (no rounding - use raw coordinates)
  const w1Start = { x: coords1.x1, y: coords1.y1 };
  const w1End = { x: coords1.x2, y: coords1.y2 };
  const w2Start = { x: coords2.x1, y: coords2.y1 };
  const w2End = { x: coords2.x2, y: coords2.y2 };

  const distance = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
    Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

  const d1 = distance(w1Start, w2Start);
  const d2 = distance(w1Start, w2End);
  const d3 = distance(w1End, w2Start);
  const d4 = distance(w1End, w2End);

  const minDist = Math.min(d1, d2, d3, d4);

  // Large tolerance: 50 canvas units (~50cm at 1:100 scale)
  // This should catch walls that visually appear connected
  const tolerance = 50;

  return minDist < tolerance;
};

/**
 * Find all walls connected to a given wall (flood-fill/BFS).
 *
 * @param startWallId - ID of the starting wall
 * @param allShapes - All shapes to search through
 * @returns Array of connected wall IDs including the start wall
 */
export const getConnectedWalls = (startWallId: string, allShapes: FloorMapShape[]): string[] => {
  const walls = allShapes.filter(s => s.type === 'wall' || s.type === 'line');
  const startWall = walls.find(w => w.id === startWallId);

  if (!startWall) return [startWallId];

  const connectedIds = new Set<string>([startWallId]);
  const queue = [startWall];

  while (queue.length > 0) {
    const currentWall = queue.shift()!;

    // Find all walls connected to current wall
    for (const wall of walls) {
      if (!connectedIds.has(wall.id) && areWallsConnected(currentWall, wall)) {
        connectedIds.add(wall.id);
        queue.push(wall);
      }
    }
  }

  return Array.from(connectedIds);
};
