/**
 * Unified Multi-Select Drag System
 *
 * Provides shared drag handlers for all shape types in the canvas.
 * Handles: multi-select sync, coordinate updates with proper mm conversion.
 *
 * KEY FIX: All shapes in a group move by the SAME mm delta, preserving
 * relative positions. Grid snapping is only applied to the anchor shape
 * for visual feedback, but all shapes move by the raw delta.
 */

import Konva from 'konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { useFloorMapStore } from '../../store';
import { FloorMapShape, LineCoordinates, RectangleCoordinates, CircleCoordinates, PolygonCoordinates, SymbolCoordinates, TextCoordinates } from '../../types';

/**
 * Shared state for drag operations - persists across component renders
 */
interface DragState {
  isDragging: boolean;
  anchorShapeId: string | null;
  // Store original mm coordinates for all selected shapes
  originalCoordinates: Map<string, FloorMapShape['coordinates']>;
  // Track the pixel position where drag started (for delta calculation)
  dragStartPixelX: number;
  dragStartPixelY: number;
}

const dragState: DragState = {
  isDragging: false,
  anchorShapeId: null,
  originalCoordinates: new Map(),
  dragStartPixelX: 0,
  dragStartPixelY: 0,
};

/**
 * Get the center/anchor point of a shape's coordinates (in mm)
 */
function getShapeCenter(shape: FloorMapShape): { x: number; y: number } {
  const coords = shape.coordinates;

  if (shape.type === 'wall' || shape.type === 'line') {
    const c = coords as LineCoordinates;
    return { x: (c.x1 + c.x2) / 2, y: (c.y1 + c.y2) / 2 };
  } else if (shape.type === 'rectangle' || shape.type === 'door' || shape.type === 'opening') {
    const c = coords as RectangleCoordinates;
    return { x: c.left + c.width / 2, y: c.top + c.height / 2 };
  } else if (shape.type === 'circle') {
    const c = coords as CircleCoordinates;
    return { x: c.cx, y: c.cy };
  } else if (shape.type === 'room' || shape.type === 'polygon' || shape.type === 'freehand') {
    const c = coords as PolygonCoordinates;
    if (c.points && c.points.length > 0) {
      const sumX = c.points.reduce((sum, p) => sum + p.x, 0);
      const sumY = c.points.reduce((sum, p) => sum + p.y, 0);
      return { x: sumX / c.points.length, y: sumY / c.points.length };
    }
    return { x: 0, y: 0 };
  } else if (shape.type === 'symbol') {
    const c = coords as SymbolCoordinates;
    return { x: c.x + (c.width || 0) / 2, y: c.y + (c.height || 0) / 2 };
  } else if (shape.type === 'text') {
    const c = coords as TextCoordinates;
    return { x: c.x, y: c.y };
  }

  return { x: 0, y: 0 };
}

/**
 * Apply mm delta to shape coordinates and return new coordinates
 */
function applyDeltaToCoordinates(
  shape: FloorMapShape,
  originalCoords: FloorMapShape['coordinates'],
  deltaXmm: number,
  deltaYmm: number
): Partial<FloorMapShape> {
  if (shape.type === 'wall' || shape.type === 'line') {
    const c = originalCoords as LineCoordinates;
    return {
      coordinates: {
        x1: c.x1 + deltaXmm,
        y1: c.y1 + deltaYmm,
        x2: c.x2 + deltaXmm,
        y2: c.y2 + deltaYmm,
      }
    };
  } else if (shape.type === 'rectangle' || shape.type === 'door' || shape.type === 'opening') {
    const c = originalCoords as RectangleCoordinates;
    return {
      coordinates: {
        ...c,
        left: c.left + deltaXmm,
        top: c.top + deltaYmm,
      }
    };
  } else if (shape.type === 'circle') {
    const c = originalCoords as CircleCoordinates;
    return {
      coordinates: {
        ...c,
        cx: c.cx + deltaXmm,
        cy: c.cy + deltaYmm,
      }
    };
  } else if (shape.type === 'room' || shape.type === 'polygon' || shape.type === 'freehand') {
    const c = originalCoords as PolygonCoordinates;
    return {
      coordinates: {
        points: c.points.map(p => ({
          x: p.x + deltaXmm,
          y: p.y + deltaYmm,
        }))
      }
    };
  } else if (shape.type === 'symbol') {
    const c = originalCoords as SymbolCoordinates;
    return {
      coordinates: {
        ...c,
        x: c.x + deltaXmm,
        y: c.y + deltaYmm,
      }
    };
  } else if (shape.type === 'text') {
    const c = originalCoords as TextCoordinates;
    return {
      coordinates: {
        ...c,
        x: c.x + deltaXmm,
        y: c.y + deltaYmm,
      }
    };
  }

  return {};
}

/**
 * Creates unified drag handlers for multi-select (ALL shapes use these)
 * Handles: multi-select sync, coordinate updates with proper mm conversion
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

      const state = useFloorMapStore.getState();
      const selectedIds = state.selectedShapeIds;
      const allShapes = state.shapes;

      // Initialize drag state
      dragState.isDragging = true;
      dragState.anchorShapeId = shapeId;
      dragState.dragStartPixelX = e.target.x();
      dragState.dragStartPixelY = e.target.y();
      dragState.originalCoordinates.clear();

      // Store original mm coordinates for all selected shapes
      const shapesToDrag = selectedIds.includes(shapeId) ? selectedIds : [shapeId];
      shapesToDrag.forEach(id => {
        const shape = allShapes.find(s => s.id === id);
        if (shape) {
          // Deep clone the coordinates
          dragState.originalCoordinates.set(id, JSON.parse(JSON.stringify(shape.coordinates)));
        }
      });

      // Reset all Konva node positions to 0 (we'll move them based on coordinates)
      shapesToDrag.forEach(id => {
        const node = shapeRefsMap.get(id);
        if (node?.parent) {
          node.parent.position({ x: 0, y: 0 });
        }
      });
    },

    onDragMove: (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;

      if (!dragState.isDragging) return;

      const state = useFloorMapStore.getState();
      const selectedIds = state.selectedShapeIds;
      const scaleSettings = state.scaleSettings;
      const viewState = state.viewState;
      const snapEnabled = state.projectSettings.snapEnabled;
      const gridInterval = state.projectSettings.gridInterval;

      // Get current pixel position of dragged node
      const currentPixelX = e.target.x();
      const currentPixelY = e.target.y();

      // Calculate pixel delta from drag start
      const deltaPixelX = currentPixelX - dragState.dragStartPixelX;
      const deltaPixelY = currentPixelY - dragState.dragStartPixelY;

      // Convert pixel delta to mm delta
      // Formula: mm = pixels / (pixelsPerMm * zoom)
      const pixelToMm = 1 / (scaleSettings.pixelsPerMm * viewState.zoom);
      let deltaXmm = deltaPixelX * pixelToMm;
      let deltaYmm = deltaPixelY * pixelToMm;

      // Apply grid snapping to the delta (snap the movement, not individual positions)
      if (snapEnabled && gridInterval > 0) {
        deltaXmm = Math.round(deltaXmm / gridInterval) * gridInterval;
        deltaYmm = Math.round(deltaYmm / gridInterval) * gridInterval;
      }

      // Convert snapped mm delta back to pixels for visual feedback
      const snappedDeltaPixelX = deltaXmm / pixelToMm;
      const snappedDeltaPixelY = deltaYmm / pixelToMm;

      // Move all selected shapes by updating their Konva node positions
      const shapesToMove = selectedIds.includes(shapeId) ? selectedIds : [shapeId];
      shapesToMove.forEach(id => {
        const node = shapeRefsMap.get(id);
        if (node?.parent) {
          // All shapes move by the same snapped pixel delta
          node.parent.position({
            x: snappedDeltaPixelX,
            y: snappedDeltaPixelY,
          });
        }
      });

      // Keep the dragged node at the snapped position
      e.target.position({
        x: dragState.dragStartPixelX + snappedDeltaPixelX,
        y: dragState.dragStartPixelY + snappedDeltaPixelY,
      });
    },

    onDragEnd: (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;

      if (!dragState.isDragging) return;

      const state = useFloorMapStore.getState();
      const selectedIds = state.selectedShapeIds;
      const allShapes = state.shapes;
      const scaleSettings = state.scaleSettings;
      const viewState = state.viewState;
      const snapEnabled = state.projectSettings.snapEnabled;
      const gridInterval = state.projectSettings.gridInterval;
      const updateShapes = state.updateShapes;

      // Get final pixel position
      const finalPixelX = e.target.x();
      const finalPixelY = e.target.y();

      // Calculate final pixel delta
      const deltaPixelX = finalPixelX - dragState.dragStartPixelX;
      const deltaPixelY = finalPixelY - dragState.dragStartPixelY;

      // Convert to mm
      const pixelToMm = 1 / (scaleSettings.pixelsPerMm * viewState.zoom);
      let deltaXmm = deltaPixelX * pixelToMm;
      let deltaYmm = deltaPixelY * pixelToMm;

      // Apply grid snapping
      if (snapEnabled && gridInterval > 0) {
        deltaXmm = Math.round(deltaXmm / gridInterval) * gridInterval;
        deltaYmm = Math.round(deltaYmm / gridInterval) * gridInterval;
      }

      // Prepare batch updates for all moved shapes
      const updates: Array<{ id: string; updates: Partial<FloorMapShape> }> = [];
      const shapesToUpdate = selectedIds.includes(shapeId) ? selectedIds : [shapeId];

      shapesToUpdate.forEach(id => {
        const shape = allShapes.find(s => s.id === id);
        const originalCoords = dragState.originalCoordinates.get(id);

        if (shape && originalCoords) {
          const shapeUpdate = applyDeltaToCoordinates(shape, originalCoords, deltaXmm, deltaYmm);
          if (shapeUpdate.coordinates) {
            updates.push({ id, updates: shapeUpdate });
          }
        }
      });

      // Apply all updates in a single batch (single history entry)
      if (updates.length > 0) {
        updateShapes(updates);
      }

      // Reset all Konva node positions to 0 for next drag
      shapesToUpdate.forEach(id => {
        const node = shapeRefsMap.get(id);
        if (node?.parent) {
          node.parent.position({ x: 0, y: 0 });
        }
      });

      // Also reset the dragged node
      e.target.position({ x: 0, y: 0 });

      // Clear drag state
      clearDragState();
    }
  };
};

/**
 * Clear all drag state - call when canceling drag or starting fresh
 */
export const clearDragState = () => {
  dragState.isDragging = false;
  dragState.anchorShapeId = null;
  dragState.originalCoordinates.clear();
  dragState.dragStartPixelX = 0;
  dragState.dragStartPixelY = 0;
};

/**
 * Check if a drag operation is currently in progress
 */
export const isDragging = () => dragState.isDragging;
