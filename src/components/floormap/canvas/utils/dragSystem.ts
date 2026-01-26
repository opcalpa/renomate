/**
 * Simple Drag System
 *
 * Principle: Let Konva handle dragging, only intervene at the end.
 * - During drag: Konva moves the node naturally
 * - On drag end: Read delta, apply snap, update store
 * - Multi-select: Apply same delta to all selected shapes
 */

import Konva from 'konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { useFloorMapStore } from '../../store';
import { FloorMapShape } from '../../types';

/**
 * Apply delta to shape coordinates based on shape type
 */
function applyDelta(
  shape: FloorMapShape,
  deltaX: number,
  deltaY: number
): Partial<FloorMapShape> {
  const coords = shape.coordinates as Record<string, unknown>;

  switch (shape.type) {
    case 'wall':
    case 'line':
      return {
        coordinates: {
          x1: (coords.x1 as number) + deltaX,
          y1: (coords.y1 as number) + deltaY,
          x2: (coords.x2 as number) + deltaX,
          y2: (coords.y2 as number) + deltaY,
        }
      };

    case 'rectangle':
    case 'door':
    case 'opening':
      return {
        coordinates: {
          ...coords,
          left: (coords.left as number) + deltaX,
          top: (coords.top as number) + deltaY,
        }
      };

    case 'circle':
      return {
        coordinates: {
          ...coords,
          cx: (coords.cx as number) + deltaX,
          cy: (coords.cy as number) + deltaY,
        }
      };

    case 'room':
    case 'polygon':
    case 'freehand':
      const points = coords.points as Array<{ x: number; y: number }>;
      return {
        coordinates: {
          points: points.map(p => ({
            x: p.x + deltaX,
            y: p.y + deltaY,
          }))
        }
      };

    case 'text':
      return {
        coordinates: {
          ...coords,
          x: (coords.x as number) + deltaX,
          y: (coords.y as number) + deltaY,
        }
      };

    case 'symbol':
      return {
        coordinates: {
          ...coords,
          x: ((coords.x as number) || 0) + deltaX,
          y: ((coords.y as number) || 0) + deltaY,
        }
      };

    default:
      return {};
  }
}

/**
 * Creates simple drag handlers for a shape
 * Works with both single shapes and multi-select
 */
export function createDragHandlers(shapeId: string) {
  return {
    onDragStart: (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      // Nothing else needed - Konva handles the visual drag
    },

    onDragMove: (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;

      // For multi-select: move other selected shapes visually
      const state = useFloorMapStore.getState();
      const selectedIds = state.selectedShapeIds;

      if (selectedIds.length > 1 && selectedIds.includes(shapeId)) {
        const delta = { x: e.target.x(), y: e.target.y() };

        // Move all other selected shape groups
        const stage = e.target.getStage();
        if (stage) {
          selectedIds.forEach(id => {
            if (id !== shapeId) {
              const node = stage.findOne(`#shape-${id}`);
              if (node) {
                node.position(delta);
              }
            }
          });
        }
      }
    },

    onDragEnd: (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;

      const state = useFloorMapStore.getState();
      const { shapes, selectedShapeIds, projectSettings, updateShapes } = state;
      const { snapEnabled, gridInterval } = projectSettings;

      // Get the delta this shape moved
      let deltaX = e.target.x();
      let deltaY = e.target.y();

      // Apply grid snap to the delta
      if (snapEnabled && gridInterval > 0) {
        // Grid interval is in mm, coordinates are in canvas pixels
        // At 1:100 scale (pixelsPerMm = 0.1), 100mm grid = 10 pixels
        const snapSize = gridInterval * state.scaleSettings.pixelsPerMm;
        deltaX = Math.round(deltaX / snapSize) * snapSize;
        deltaY = Math.round(deltaY / snapSize) * snapSize;
      }

      // Determine which shapes to update
      const shapesToUpdate = selectedShapeIds.includes(shapeId) && selectedShapeIds.length > 1
        ? selectedShapeIds
        : [shapeId];

      // Build updates for all affected shapes
      const updates: Array<{ id: string; updates: Partial<FloorMapShape> }> = [];

      shapesToUpdate.forEach(id => {
        const shape = shapes.find(s => s.id === id);
        if (shape) {
          const shapeUpdates = applyDelta(shape, deltaX, deltaY);
          if (shapeUpdates.coordinates) {
            updates.push({ id, updates: shapeUpdates });
          }
        }
      });

      // Apply all updates at once (single undo entry)
      if (updates.length > 0) {
        updateShapes(updates);
      }

      // Reset all moved nodes to position 0
      const stage = e.target.getStage();
      if (stage) {
        shapesToUpdate.forEach(id => {
          const node = stage.findOne(`#shape-${id}`);
          if (node) {
            node.position({ x: 0, y: 0 });
          }
        });
      }

      // Also reset the dragged node (in case it wasn't found above)
      e.target.position({ x: 0, y: 0 });
    }
  };
}

// Legacy export for compatibility
export const createUnifiedDragHandlers = createDragHandlers;
export const clearDragState = () => {}; // No-op, no state to clear
export const isDragging = () => false; // Not tracked anymore
