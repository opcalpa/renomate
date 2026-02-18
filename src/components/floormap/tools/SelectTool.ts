/**
 * Select Tool Handler
 *
 * Handles selection, multi-selection, and box selection.
 */

import { KonvaEventObject } from 'konva/lib/Node';
import { ToolHandler, ToolContext, ToolResult, Point } from './types';
import { FloorMapShape } from '../types';

export const SelectTool: ToolHandler = {
  tool: 'select',
  cursor: 'default',

  onMouseDown(
    ctx: ToolContext,
    pos: Point,
    evt: KonvaEventObject<MouseEvent>
  ): ToolResult {
    // Start box selection on empty canvas
    const isShiftHeld = evt.evt.shiftKey;

    return {
      handled: true,
      setIsBoxSelecting: true,
      setSelectionBox: { start: pos, end: pos },
      // If shift not held, clear previous selection when starting new box
      ...(isShiftHeld ? {} : { setSelectedShapeIds: [] }),
    };
  },

  onMouseMove(
    ctx: ToolContext,
    pos: Point,
    evt: KonvaEventObject<MouseEvent>
  ): ToolResult {
    // Update box selection end point
    // Note: actual box update is throttled in component
    return {
      setSelectionBox: {
        start: ctx.currentDrawingPoints[0] || pos, // Use stored start
        end: pos,
      },
    };
  },

  onMouseUp(
    ctx: ToolContext,
    pos: Point,
    evt: KonvaEventObject<MouseEvent>
  ): ToolResult {
    // This will be handled by the component's box selection logic
    // which calculates which shapes are inside the box
    return {
      handled: true,
      setIsBoxSelecting: false,
    };
  },

  onShapeClick(
    ctx: ToolContext,
    shapeId: string,
    shape: FloorMapShape,
    evt: KonvaEventObject<MouseEvent>
  ): ToolResult {
    const isShiftHeld = evt.evt.shiftKey;
    const isMetaHeld = evt.evt.metaKey || evt.evt.ctrlKey;

    // Shift/Cmd+click: Toggle in multi-selection
    if (isShiftHeld || isMetaHeld) {
      const isAlreadySelected = ctx.selectedShapeIds.includes(shapeId);

      if (isAlreadySelected) {
        // Remove from selection
        return {
          handled: true,
          setSelectedShapeIds: ctx.selectedShapeIds.filter(id => id !== shapeId),
        };
      } else {
        // Add to selection
        return {
          handled: true,
          setSelectedShapeIds: [...ctx.selectedShapeIds, shapeId],
        };
      }
    }

    // Single click: Select only this shape
    return {
      handled: true,
      setSelectedShapeId: shapeId,
      setSelectedShapeIds: [shapeId],
    };
  },
};
