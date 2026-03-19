/**
 * connectorUtils - shared helpers for the connector arrow feature
 *
 * All coordinates are in Konva "world" pixel space (unzoomed canvas coords).
 */

import {
  FloorMapShape,
  AnchorSide,
  TextCoordinates,
  RectangleCoordinates,
  CircleCoordinates,
  ImageCoordinates,
} from '../types';

/** Shape types that show connector anchor handles on hover */
export const CONNECTABLE_TYPES = [
  'sticky_note',
  'text',
  'image',
  'rectangle',
  'circle',
] as const;

export function isConnectableShape(shape: FloorMapShape): boolean {
  return (CONNECTABLE_TYPES as readonly string[]).includes(shape.type);
}

interface ShapeBounds {
  cx: number;
  cy: number;
  hw: number; // half-width
  hh: number; // half-height
}

function getShapeBounds(shape: FloorMapShape): ShapeBounds | null {
  const c = shape.coordinates;

  if (shape.type === 'sticky_note' || shape.type === 'text') {
    const tc = c as TextCoordinates;
    const w = tc.width ?? 200;
    const h = tc.height ?? 150;
    return { cx: tc.x + w / 2, cy: tc.y + h / 2, hw: w / 2, hh: h / 2 };
  }

  if (shape.type === 'rectangle') {
    const rc = c as RectangleCoordinates;
    return {
      cx: rc.left + rc.width / 2,
      cy: rc.top + rc.height / 2,
      hw: rc.width / 2,
      hh: rc.height / 2,
    };
  }

  if (shape.type === 'image') {
    const ic = c as ImageCoordinates;
    return {
      cx: ic.x + ic.width / 2,
      cy: ic.y + ic.height / 2,
      hw: ic.width / 2,
      hh: ic.height / 2,
    };
  }

  if (shape.type === 'circle') {
    const cc = c as CircleCoordinates;
    return { cx: cc.cx, cy: cc.cy, hw: cc.radius, hh: cc.radius };
  }

  return null;
}

/** Returns the world-pixel position of a given anchor side on a shape */
export function getAnchorPoint(
  shape: FloorMapShape,
  anchor: AnchorSide,
): { x: number; y: number } | null {
  const b = getShapeBounds(shape);
  if (!b) return null;
  switch (anchor) {
    case 'n': return { x: b.cx,        y: b.cy - b.hh };
    case 's': return { x: b.cx,        y: b.cy + b.hh };
    case 'e': return { x: b.cx + b.hw, y: b.cy        };
    case 'w': return { x: b.cx - b.hw, y: b.cy        };
  }
}

/**
 * Given a world-pixel cursor position, finds the closest anchor point on any
 * connectable shape within `thresholdPx`. Returns null if none found.
 */
export function findNearestConnectableAnchor(
  shapes: FloorMapShape[],
  worldX: number,
  worldY: number,
  excludeId?: string,
  thresholdPx = 60,
): { shape: FloorMapShape; anchor: AnchorSide; point: { x: number; y: number } } | null {
  const sides: AnchorSide[] = ['n', 'e', 's', 'w'];
  let best: {
    shape: FloorMapShape;
    anchor: AnchorSide;
    point: { x: number; y: number };
    dist: number;
  } | null = null;

  for (const shape of shapes) {
    if (shape.id === excludeId) continue;
    if (!isConnectableShape(shape)) continue;

    for (const anchor of sides) {
      const pt = getAnchorPoint(shape, anchor);
      if (!pt) continue;
      const dx = pt.x - worldX;
      const dy = pt.y - worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < thresholdPx && (!best || dist < best.dist)) {
        best = { shape, anchor, point: pt, dist };
      }
    }
  }

  return best ? { shape: best.shape, anchor: best.anchor, point: best.point } : null;
}
