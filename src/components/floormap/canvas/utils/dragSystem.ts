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
import { findNearestWall, projectOntoWall, splitWall, isOpeningType } from '../../utils/wallSnap';

/**
 * Apply delta to shape coordinates based on shape type
 */
function applyDelta(
  shape: FloorMapShape,
  deltaX: number,
  deltaY: number
): Partial<FloorMapShape> {
  const coords = shape.coordinates as Record<string, unknown>;

  // Handle library symbols (freehand with metadata.isLibrarySymbol)
  // These use metadata.placementX/Y instead of coordinates
  if (shape.metadata?.isLibrarySymbol) {
    return {
      metadata: {
        ...shape.metadata,
        placementX: (shape.metadata.placementX || 0) + deltaX,
        placementY: (shape.metadata.placementY || 0) + deltaY,
      }
    };
  }

  switch (shape.type) {
    case 'wall':
    case 'line':
    case 'door_line':
    case 'window_line':
    case 'sliding_door_line':
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

    case 'image':
      return {
        coordinates: {
          ...coords,
          x: (coords.x as number) + deltaX,
          y: (coords.y as number) + deltaY,
        }
      };

    case 'bezier':
      const start = coords.start as { x: number; y: number };
      const control = coords.control as { x: number; y: number };
      const end = coords.end as { x: number; y: number };
      return {
        coordinates: {
          start: { x: start.x + deltaX, y: start.y + deltaY },
          control: { x: control.x + deltaX, y: control.y + deltaY },
          end: { x: end.x + deltaX, y: end.y + deltaY },
        }
      };

    default:
      return {};
  }
}

// Module-level read-only flag to prevent drag in view-only mode
let _isReadOnly = false;
export function setDragSystemReadOnly(readOnly: boolean) {
  _isReadOnly = readOnly;
}

/**
 * Creates simple drag handlers for a shape
 * Works with both single shapes and multi-select
 */
export function createDragHandlers(shapeId: string) {
  return {
    draggable: !_isReadOnly,
    onDragStart: (e: KonvaEventObject<DragEvent>) => {
      if (_isReadOnly) { e.cancelBubble = true; return; }
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

      // Check for wall snap: single opening shape dragged near a wall
      const draggedShape = shapes.find(s => s.id === shapeId);
      if (
        shapesToUpdate.length === 1 &&
        draggedShape &&
        isOpeningType(draggedShape.type)
      ) {
        const coords = draggedShape.coordinates as { x1: number; y1: number; x2: number; y2: number };
        const newCoords = {
          x1: coords.x1 + deltaX,
          y1: coords.y1 + deltaY,
          x2: coords.x2 + deltaX,
          y2: coords.y2 + deltaY,
        };

        // Snap threshold: 50 canvas pixels
        const SNAP_THRESHOLD = 50;
        const walls = shapes.filter(s => s.type === 'wall' && s.id !== shapeId);
        const nearest = findNearestWall(newCoords, walls, SNAP_THRESHOLD);

        if (nearest) {
          const wallCoords = nearest.wall.coordinates as { x1: number; y1: number; x2: number; y2: number };
          const snappedCoords = projectOntoWall(newCoords, wallCoords);
          const wallSegments = splitWall(wallCoords, snappedCoords);

          state.applyWallSnap(
            shapeId,
            { coordinates: snappedCoords, attachedToWall: nearest.wall.id, positionOnWall: nearest.t },
            nearest.wall.id,
            wallSegments.map(seg => ({
              color: nearest.wall.color,
              strokeColor: nearest.wall.strokeColor,
              strokeWidth: nearest.wall.strokeWidth,
              heightMM: nearest.wall.heightMM,
              thicknessMM: nearest.wall.thicknessMM,
              coordinates: seg,
            }))
          );

          // Reset nodes and return early
          const stage = e.target.getStage();
          if (stage) {
            shapesToUpdate.forEach(id => {
              const node = stage.findOne(`#shape-${id}`);
              if (node) node.position({ x: 0, y: 0 });
            });
          }
          e.target.position({ x: 0, y: 0 });
          return;
        }

        // No wall nearby — if previously attached, detach
        if (draggedShape.attachedToWall) {
          const shapeUpdates = applyDelta(draggedShape, deltaX, deltaY);
          updateShapes([{
            id: shapeId,
            updates: { ...shapeUpdates, attachedToWall: undefined, positionOnWall: undefined },
          }]);

          const stage = e.target.getStage();
          if (stage) {
            shapesToUpdate.forEach(id => {
              const node = stage.findOne(`#shape-${id}`);
              if (node) node.position({ x: 0, y: 0 });
            });
          }
          e.target.position({ x: 0, y: 0 });
          return;
        }
      }

      // Build updates for all affected shapes
      const updates: Array<{ id: string; updates: Partial<FloorMapShape> }> = [];

      shapesToUpdate.forEach(id => {
        const shape = shapes.find(s => s.id === id);
        if (shape) {
          const shapeUpdates = applyDelta(shape, deltaX, deltaY);
          if (shapeUpdates.coordinates || shapeUpdates.metadata) {
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
