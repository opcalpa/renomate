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
