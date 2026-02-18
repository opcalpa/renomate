/**
 * Shape Clipboard Utilities
 *
 * Utilities for copy/paste/duplicate operations on shapes.
 * Handles coordinate offset for different shape types.
 */

import { v4 as uuidv4 } from 'uuid';
import { FloorMapShape } from '../types';

/** Default offset in pixels for paste/duplicate operations */
export const PASTE_OFFSET = 20;

/**
 * Apply offset to shape coordinates based on shape type.
 * Returns new coordinates with the offset applied.
 */
export function applyShapeOffset(
  shape: FloorMapShape,
  offset: number = PASTE_OFFSET
): FloorMapShape['coordinates'] {
  const coords = shape.coordinates as any;

  switch (shape.type) {
    case 'wall':
    case 'line':
    case 'window_line':
    case 'door_line':
    case 'sliding_door_line':
    case 'opening_line':
      return {
        ...coords,
        x1: coords.x1 + offset,
        y1: coords.y1 + offset,
        x2: coords.x2 + offset,
        y2: coords.y2 + offset,
      };

    case 'room':
    case 'freehand':
    case 'polygon':
      return {
        points: coords.points.map((p: { x: number; y: number }) => ({
          x: p.x + offset,
          y: p.y + offset,
        })),
      };

    case 'rectangle':
    case 'door':
    case 'opening':
      return {
        ...coords,
        left: (coords.left || coords.x || 0) + offset,
        top: (coords.top || coords.y || 0) + offset,
      };

    case 'circle':
      return {
        ...coords,
        cx: (coords.cx || coords.x || 0) + offset,
        cy: (coords.cy || coords.y || 0) + offset,
      };

    case 'text':
      return {
        ...coords,
        x: coords.x + offset,
        y: coords.y + offset,
      };

    case 'bezier':
      return {
        start: { x: coords.start.x + offset, y: coords.start.y + offset },
        control: { x: coords.control.x + offset, y: coords.control.y + offset },
        end: { x: coords.end.x + offset, y: coords.end.y + offset },
      };

    case 'image':
      return {
        ...coords,
        x: coords.x + offset,
        y: coords.y + offset,
      };

    default:
      // For unknown types, try common coordinate patterns
      if ('x' in coords && 'y' in coords) {
        return {
          ...coords,
          x: coords.x + offset,
          y: coords.y + offset,
        };
      }
      return coords;
  }
}

/**
 * Clone a shape with a new ID and optional offset.
 */
export function cloneShape(
  shape: FloorMapShape,
  targetPlanId: string,
  offset: number = PASTE_OFFSET
): FloorMapShape {
  return {
    ...shape,
    id: uuidv4(),
    planId: targetPlanId,
    coordinates: applyShapeOffset(shape, offset),
  };
}

/**
 * Clone multiple shapes with new IDs and optional offset.
 */
export function cloneShapes(
  shapes: FloorMapShape[],
  targetPlanId: string,
  offset: number = PASTE_OFFSET
): FloorMapShape[] {
  return shapes.map(shape => cloneShape(shape, targetPlanId, offset));
}

/**
 * Prepare shapes for clipboard (returns deep copies).
 */
export function copyShapesToClipboard(shapes: FloorMapShape[]): FloorMapShape[] {
  return shapes.map(shape => ({
    ...shape,
    coordinates: JSON.parse(JSON.stringify(shape.coordinates)),
    style: shape.style ? { ...shape.style } : undefined,
    metadata: shape.metadata ? { ...shape.metadata } : undefined,
  }));
}
