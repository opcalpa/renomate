/**
 * Wall Snap Utilities
 *
 * Geometry functions for snapping door/window openings onto walls.
 * When an opening is dropped near a wall, it snaps onto the wall
 * and the wall is split into two segments around the opening.
 */

import { FloorMapShape } from '../types';

interface LineCoords {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function getLineCoords(shape: FloorMapShape): LineCoords {
  const c = shape.coordinates as Record<string, unknown>;
  return {
    x1: c.x1 as number,
    y1: c.y1 as number,
    x2: c.x2 as number,
    y2: c.y2 as number,
  };
}

function midpoint(c: LineCoords): { x: number; y: number } {
  return { x: (c.x1 + c.x2) / 2, y: (c.y1 + c.y2) / 2 };
}

function length(c: LineCoords): number {
  const dx = c.x2 - c.x1;
  const dy = c.y2 - c.y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Perpendicular distance from point to line segment.
 * Returns distance and the parameter t (0-1) of the closest point on segment.
 */
function pointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { distance: number; t: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const d = Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    return { distance: d, t: 0 };
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const distance = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  return { distance, t };
}

/**
 * Find the nearest wall to an opening's midpoint within a threshold.
 * Returns the wall shape and projection parameter, or null.
 */
export function findNearestWall(
  openingCoords: LineCoords,
  walls: FloorMapShape[],
  threshold: number
): { wall: FloorMapShape; t: number } | null {
  const mid = midpoint(openingCoords);
  let best: { wall: FloorMapShape; t: number; distance: number } | null = null;

  for (const wall of walls) {
    const wc = getLineCoords(wall);
    const { distance, t } = pointToSegment(mid.x, mid.y, wc.x1, wc.y1, wc.x2, wc.y2);
    if (distance <= threshold && (!best || distance < best.distance)) {
      best = { wall, t, distance };
    }
  }

  return best ? { wall: best.wall, t: best.t } : null;
}

/**
 * Project an opening onto a wall, centering it at the projection point.
 * Returns new coordinates for the opening aligned on the wall.
 */
export function projectOntoWall(
  openingCoords: LineCoords,
  wallCoords: LineCoords
): LineCoords {
  const openingLen = length(openingCoords);
  const halfLen = openingLen / 2;

  const mid = midpoint(openingCoords);
  const wdx = wallCoords.x2 - wallCoords.x1;
  const wdy = wallCoords.y2 - wallCoords.y1;
  const wallLen = Math.sqrt(wdx * wdx + wdy * wdy);
  if (wallLen === 0) return openingCoords;

  // Unit direction along wall
  const ux = wdx / wallLen;
  const uy = wdy / wallLen;

  // Project midpoint onto wall line
  const t = ((mid.x - wallCoords.x1) * ux + (mid.y - wallCoords.y1) * uy) / wallLen;
  const clampedT = Math.max(0, Math.min(1, t));
  const projX = wallCoords.x1 + clampedT * wdx;
  const projY = wallCoords.y1 + clampedT * wdy;

  return {
    x1: projX - halfLen * ux,
    y1: projY - halfLen * uy,
    x2: projX + halfLen * ux,
    y2: projY + halfLen * uy,
  };
}

const MIN_SEGMENT_LENGTH = 5; // mm

/**
 * Split a wall into two segments around an opening.
 * Returns 0-2 segments (segments shorter than MIN_SEGMENT_LENGTH are omitted).
 */
export function splitWall(
  wallCoords: LineCoords,
  openingCoords: LineCoords
): LineCoords[] {
  const segments: LineCoords[] = [];

  // Segment 1: wall start → opening start
  const seg1: LineCoords = {
    x1: wallCoords.x1,
    y1: wallCoords.y1,
    x2: openingCoords.x1,
    y2: openingCoords.y1,
  };
  if (length(seg1) >= MIN_SEGMENT_LENGTH) {
    segments.push(seg1);
  }

  // Segment 2: opening end → wall end
  const seg2: LineCoords = {
    x1: openingCoords.x2,
    y1: openingCoords.y2,
    x2: wallCoords.x2,
    y2: wallCoords.y2,
  };
  if (length(seg2) >= MIN_SEGMENT_LENGTH) {
    segments.push(seg2);
  }

  return segments;
}

const OPENING_TYPES = new Set(['door_line', 'window_line', 'sliding_door_line']);

export function isOpeningType(type: string): boolean {
  return OPENING_TYPES.has(type);
}

/**
 * Check if two walls are collinear (same direction within tolerance)
 */
function areCollinear(wall1: LineCoords, wall2: LineCoords, angleTolerance = 0.01): boolean {
  const dx1 = wall1.x2 - wall1.x1;
  const dy1 = wall1.y2 - wall1.y1;
  const dx2 = wall2.x2 - wall2.x1;
  const dy2 = wall2.y2 - wall2.y1;

  const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

  if (len1 < 1 || len2 < 1) return false;

  // Normalize directions
  const ux1 = dx1 / len1;
  const uy1 = dy1 / len1;
  const ux2 = dx2 / len2;
  const uy2 = dy2 / len2;

  // Check if directions are parallel (dot product close to 1 or -1)
  const dot = ux1 * ux2 + uy1 * uy2;
  return Math.abs(Math.abs(dot) - 1) < angleTolerance;
}

/**
 * Check if a point lies on a line segment (extended by tolerance)
 */
function pointOnLineExtended(
  px: number,
  py: number,
  lineCoords: LineCoords,
  tolerance: number
): boolean {
  const { distance } = pointToSegment(px, py, lineCoords.x1, lineCoords.y1, lineCoords.x2, lineCoords.y2);
  return distance <= tolerance;
}

/**
 * Distance between two points
 */
function pointDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Find two wall segments that can be merged around an opening position.
 * Returns the two wall IDs and the merged coordinates, or null if no merge possible.
 */
export function findMergeableWalls(
  openingCoords: LineCoords,
  walls: FloorMapShape[],
  tolerance = 20
): { wall1Id: string; wall2Id: string; mergedCoords: LineCoords } | null {
  // Look for two walls that:
  // 1. Are collinear
  // 2. Have endpoints close to the opening's endpoints
  // 3. Together would form a continuous wall spanning the opening

  const wallShapes = walls.filter(w => w.type === 'wall');

  for (let i = 0; i < wallShapes.length; i++) {
    for (let j = i + 1; j < wallShapes.length; j++) {
      const wall1 = wallShapes[i];
      const wall2 = wallShapes[j];
      const coords1 = getLineCoords(wall1);
      const coords2 = getLineCoords(wall2);

      if (!areCollinear(coords1, coords2)) continue;

      // Check if walls connect near the opening endpoints
      // Possible configurations:
      // wall1.end -> opening.start ... opening.end -> wall2.start
      // wall1.start -> opening.start ... opening.end -> wall2.end
      // etc.

      const openingStart = { x: openingCoords.x1, y: openingCoords.y1 };
      const openingEnd = { x: openingCoords.x2, y: openingCoords.y2 };

      // Check if wall1.end is near opening.start AND wall2.start is near opening.end
      if (
        pointDistance(coords1.x2, coords1.y2, openingStart.x, openingStart.y) <= tolerance &&
        pointDistance(coords2.x1, coords2.y1, openingEnd.x, openingEnd.y) <= tolerance
      ) {
        return {
          wall1Id: wall1.id,
          wall2Id: wall2.id,
          mergedCoords: { x1: coords1.x1, y1: coords1.y1, x2: coords2.x2, y2: coords2.y2 }
        };
      }

      // Check if wall1.end is near opening.end AND wall2.start is near opening.start
      if (
        pointDistance(coords1.x2, coords1.y2, openingEnd.x, openingEnd.y) <= tolerance &&
        pointDistance(coords2.x1, coords2.y1, openingStart.x, openingStart.y) <= tolerance
      ) {
        return {
          wall1Id: wall1.id,
          wall2Id: wall2.id,
          mergedCoords: { x1: coords2.x1, y1: coords2.y1, x2: coords1.x1, y2: coords1.y1 }
        };
      }

      // Check if wall2.end is near opening.start AND wall1.start is near opening.end
      if (
        pointDistance(coords2.x2, coords2.y2, openingStart.x, openingStart.y) <= tolerance &&
        pointDistance(coords1.x1, coords1.y1, openingEnd.x, openingEnd.y) <= tolerance
      ) {
        return {
          wall1Id: wall1.id,
          wall2Id: wall2.id,
          mergedCoords: { x1: coords2.x1, y1: coords2.y1, x2: coords1.x2, y2: coords1.y2 }
        };
      }

      // Check if wall2.end is near opening.end AND wall1.start is near opening.start
      if (
        pointDistance(coords2.x2, coords2.y2, openingEnd.x, openingEnd.y) <= tolerance &&
        pointDistance(coords1.x1, coords1.y1, openingStart.x, openingStart.y) <= tolerance
      ) {
        return {
          wall1Id: wall1.id,
          wall2Id: wall2.id,
          mergedCoords: { x1: coords1.x1, y1: coords1.y1, x2: coords2.x2, y2: coords2.y2 }
        };
      }
    }
  }

  return null;
}

/**
 * Find a gap between two collinear walls where a door could fit.
 * Returns snap info if found: the virtual wall spanning both walls, and the gap position.
 */
export function findWallGap(
  openingCoords: LineCoords,
  walls: FloorMapShape[],
  tolerance = 50
): { wall1: FloorMapShape; wall2: FloorMapShape; gapCoords: LineCoords } | null {
  const wallShapes = walls.filter(w => w.type === 'wall');
  const openingLen = length(openingCoords);
  const openingMid = midpoint(openingCoords);

  for (let i = 0; i < wallShapes.length; i++) {
    for (let j = i + 1; j < wallShapes.length; j++) {
      const wall1 = wallShapes[i];
      const wall2 = wallShapes[j];
      const coords1 = getLineCoords(wall1);
      const coords2 = getLineCoords(wall2);

      if (!areCollinear(coords1, coords2)) continue;

      // Check for gap between walls
      // Possible configurations: wall1.end --- gap --- wall2.start (or reversed)
      const gaps = [
        { start: { x: coords1.x2, y: coords1.y2 }, end: { x: coords2.x1, y: coords2.y1 } },
        { start: { x: coords2.x2, y: coords2.y2 }, end: { x: coords1.x1, y: coords1.y1 } },
      ];

      for (const gap of gaps) {
        const gapLen = pointDistance(gap.start.x, gap.start.y, gap.end.x, gap.end.y);

        // Gap should be similar to opening length (within tolerance)
        if (Math.abs(gapLen - openingLen) > tolerance) continue;

        // Check if opening midpoint is near the gap midpoint
        const gapMid = { x: (gap.start.x + gap.end.x) / 2, y: (gap.start.y + gap.end.y) / 2 };
        const midDist = pointDistance(openingMid.x, openingMid.y, gapMid.x, gapMid.y);

        if (midDist <= tolerance) {
          return {
            wall1,
            wall2,
            gapCoords: { x1: gap.start.x, y1: gap.start.y, x2: gap.end.x, y2: gap.end.y }
          };
        }
      }
    }
  }

  return null;
}
