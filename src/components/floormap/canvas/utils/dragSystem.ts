/**
 * Unified Multi-Select Drag System
 *
 * Provides shared drag handlers for all shape types in the canvas.
 * Handles: snap-to-grid, multi-select sync, coordinate updates.
 */

import Konva from 'konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { useFloorMapStore } from '../../store';

/**
 * Shared refs for drag state - used across all shape instances
 * Must be at module level to be shared properly
 */
const sharedDragStartPositions: { [key: string]: { x: number; y: number } } = {};

/**
 * Creates unified drag handlers for multi-select (ALL shapes use these)
 * Handles: snap-to-grid, multi-select sync, coordinate updates
 *
 * @param shapeId - ID of the shape being dragged
 * @param shapeRefsMap - Map of all shape refs (passed from parent)
 * @returns Object with onDragStart, onDragMove, onDragEnd handlers
 */
export const createUnifiedDragHandlers = (
  shapeId: string,
  shapeRefsMap: Map<string, Konva.Node>
) => {
  return {
    onDragStart: (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;

      const selectedIds = useFloorMapStore.getState().selectedShapeIds;

      // Store starting positions for all selected shapes
      if (selectedIds.length > 1 && selectedIds.includes(shapeId)) {
        // Clear previous positions
        Object.keys(sharedDragStartPositions).forEach(key => {
          delete sharedDragStartPositions[key];
        });

        selectedIds.forEach(id => {
          const node = shapeRefsMap.get(id);
          if (node?.parent) {
            sharedDragStartPositions[id] = node.parent.position();
          }
        });
      }
    },

    onDragMove: (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;

      const node = e.target;
      const selectedIds = useFloorMapStore.getState().selectedShapeIds;
      const snapEnabled = useFloorMapStore.getState().projectSettings.snapEnabled;
      const gridInterval = useFloorMapStore.getState().projectSettings.gridInterval;
      const scaleSettings = useFloorMapStore.getState().scaleSettings;

      // Calculate snap size
      const snapSize = gridInterval * scaleSettings.pixelsPerMm;

      // Get current position
      let currentX = node.x();
      let currentY = node.y();

      // SNAP TO GRID (real-time)
      if (snapEnabled && snapSize) {
        currentX = Math.round(currentX / snapSize) * snapSize;
        currentY = Math.round(currentY / snapSize) * snapSize;
        node.position({ x: currentX, y: currentY });
      }

      // MULTI-SELECT: Sync movement with all selected shapes
      if (selectedIds.length > 1 && selectedIds.includes(shapeId)) {
        const startPos = sharedDragStartPositions[shapeId];
        if (startPos) {
          const deltaX = currentX - startPos.x;
          const deltaY = currentY - startPos.y;

          // Move all OTHER selected shapes by the same delta
          selectedIds.forEach(id => {
            if (id !== shapeId) {
              const otherNode = shapeRefsMap.get(id);
              if (otherNode?.parent) {
                const otherStart = sharedDragStartPositions[id] || { x: 0, y: 0 };
                otherNode.parent.position({
                  x: otherStart.x + deltaX,
                  y: otherStart.y + deltaY,
                });
              }
            }
          });
        }
      }
    },

    onDragEnd: (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;

      const node = e.target;
      const selectedIds = useFloorMapStore.getState().selectedShapeIds;
      const snapEnabled = useFloorMapStore.getState().projectSettings.snapEnabled;
      const gridInterval = useFloorMapStore.getState().projectSettings.gridInterval;
      const scaleSettings = useFloorMapStore.getState().scaleSettings;

      const snapSize = gridInterval * scaleSettings.pixelsPerMm;

      // Get current position
      let currentX = node.x();
      let currentY = node.y();

      // Apply final snap to grid
      if (snapEnabled && snapSize) {
        currentX = Math.round(currentX / snapSize) * snapSize;
        currentY = Math.round(currentY / snapSize) * snapSize;
        node.position({ x: currentX, y: currentY });
      }

      // MULTI-SELECT: Update ALL selected shapes
      if (selectedIds.length > 1 && selectedIds.includes(shapeId)) {
        const allShapes = useFloorMapStore.getState().shapes;
        const updateShapeFn = useFloorMapStore.getState().updateShape;

        // Calculate delta from start position
        const startPos = sharedDragStartPositions[shapeId];
        if (!startPos) {
          // Clear and return if no start position
          Object.keys(sharedDragStartPositions).forEach(key => {
            delete sharedDragStartPositions[key];
          });
          return;
        }

        const deltaX = currentX - startPos.x;
        const deltaY = currentY - startPos.y;

        // Update ALL selected shapes with the SAME delta
        selectedIds.forEach(id => {
          const shape = allShapes.find(s => s.id === id);
          if (!shape) return;

          const coords = shape.coordinates as any;

          // Update coordinates based on shape type
          if (shape.type === 'wall' && coords.x1 !== undefined) {
            updateShapeFn(id, {
              coordinates: {
                x1: coords.x1 + deltaX,
                y1: coords.y1 + deltaY,
                x2: coords.x2 + deltaX,
                y2: coords.y2 + deltaY,
              }
            });
          } else if ((shape.type === 'room' || shape.type === 'polygon' || shape.type === 'freehand') && coords.points) {
            updateShapeFn(id, {
              coordinates: {
                points: coords.points.map((p: any) => ({
                  x: p.x + deltaX,
                  y: p.y + deltaY,
                }))
              }
            });
          } else if (shape.type === 'rectangle' && coords.left !== undefined) {
            updateShapeFn(id, {
              coordinates: {
                ...coords,
                left: coords.left + deltaX,
                top: coords.top + deltaY,
              }
            });
          } else if (shape.type === 'circle' && coords.cx !== undefined) {
            updateShapeFn(id, {
              coordinates: {
                ...coords,
                cx: coords.cx + deltaX,
                cy: coords.cy + deltaY,
              }
            });
          } else if (shape.type === 'text' && coords.x !== undefined) {
            updateShapeFn(id, {
              coordinates: {
                ...coords,
                x: coords.x + deltaX,
                y: coords.y + deltaY,
              }
            });
          } else if (shape.type === 'symbol' && coords.x !== undefined) {
            updateShapeFn(id, {
              coordinates: {
                ...coords,
                x: coords.x + deltaX,
                y: coords.y + deltaY,
              }
            });
          }
        });

        // Reset ALL shape positions to 0,0 (important for next drag)
        selectedIds.forEach(id => {
          const shapeNode = shapeRefsMap.get(id);
          if (shapeNode?.parent) {
            shapeNode.parent.position({ x: 0, y: 0 });
          }
        });

        // Clear drag tracking
        Object.keys(sharedDragStartPositions).forEach(key => {
          delete sharedDragStartPositions[key];
        });
      }

      // SINGLE SHAPE: Will be handled by shape-specific onTransform callback
    }
  };
};

/**
 * Clear all drag state - call when starting fresh
 */
export const clearDragState = () => {
  Object.keys(sharedDragStartPositions).forEach(key => {
    delete sharedDragStartPositions[key];
  });
};
