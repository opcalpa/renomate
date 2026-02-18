/**
 * Room Tool Handler
 *
 * Handles room creation via drag-to-draw rectangle.
 * Creates a room polygon from the bounding box.
 */

import { KonvaEventObject } from 'konva/lib/Node';
import { ToolHandler, ToolContext, ToolResult, Point } from './types';

// Callback to open room naming dialog - set by component
let openRoomDialogCallback: ((points: Point[]) => void) | null = null;

export function setRoomDialogCallback(callback: (points: Point[]) => void): void {
  openRoomDialogCallback = callback;
}

export const RoomTool: ToolHandler = {
  tool: 'room',
  cursor: 'crosshair',

  onMouseDown(
    ctx: ToolContext,
    pos: Point,
    evt: KonvaEventObject<MouseEvent>
  ): ToolResult {
    // Apply grid snap if enabled
    let snappedPos = pos;
    if (ctx.projectSettings.snapEnabled) {
      const snapSize = ctx.getSnapSize();
      snappedPos = {
        x: ctx.snapToGrid(pos.x, snapSize),
        y: ctx.snapToGrid(pos.y, snapSize),
      };
    }

    // Start drawing (using box selection visual)
    return {
      handled: true,
      setIsBoxSelecting: true,
      setSelectionBox: { start: snappedPos, end: snappedPos },
      setIsDrawing: true,
      setCurrentDrawingPoints: [snappedPos],
    };
  },

  onMouseMove(
    ctx: ToolContext,
    pos: Point,
    evt: KonvaEventObject<MouseEvent>
  ): ToolResult {
    if (!ctx.isDrawing || ctx.currentDrawingPoints.length === 0) {
      return {};
    }

    // Apply grid snap
    let snappedPos = pos;
    if (ctx.projectSettings.snapEnabled) {
      const snapSize = ctx.getSnapSize();
      snappedPos = {
        x: ctx.snapToGrid(pos.x, snapSize),
        y: ctx.snapToGrid(pos.y, snapSize),
      };
    }

    const start = ctx.currentDrawingPoints[0];

    return {
      setSelectionBox: { start, end: snappedPos },
    };
  },

  onMouseUp(
    ctx: ToolContext,
    pos: Point,
    evt: KonvaEventObject<MouseEvent>
  ): ToolResult {
    if (!ctx.isDrawing || ctx.currentDrawingPoints.length === 0) {
      return {
        setIsBoxSelecting: false,
        setSelectionBox: null,
      };
    }

    const start = ctx.currentDrawingPoints[0];

    // Apply grid snap
    let snappedPos = pos;
    if (ctx.projectSettings.snapEnabled) {
      const snapSize = ctx.getSnapSize();
      snappedPos = {
        x: ctx.snapToGrid(pos.x, snapSize),
        y: ctx.snapToGrid(pos.y, snapSize),
      };
    }

    // Calculate room bounds
    const minX = Math.min(start.x, snappedPos.x);
    const maxX = Math.max(start.x, snappedPos.x);
    const minY = Math.min(start.y, snappedPos.y);
    const maxY = Math.max(start.y, snappedPos.y);

    const width = maxX - minX;
    const height = maxY - minY;

    // Minimum room size (500mm x 500mm)
    const minSizePx = 500 * ctx.scaleSettings.pixelsPerMm;
    if (width < minSizePx || height < minSizePx) {
      return {
        handled: true,
        setIsBoxSelecting: false,
        setSelectionBox: null,
        setIsDrawing: false,
        setCurrentDrawingPoints: [],
        toast: { type: 'info', message: 'Rummet för litet (min 500x500mm)' },
      };
    }

    // Create room polygon points (clockwise from top-left)
    const roomPoints: Point[] = [
      { x: minX, y: minY }, // Top-left
      { x: maxX, y: minY }, // Top-right
      { x: maxX, y: maxY }, // Bottom-right
      { x: minX, y: maxY }, // Bottom-left
    ];

    // Open room naming dialog
    if (openRoomDialogCallback) {
      openRoomDialogCallback(roomPoints);
    }

    return {
      handled: true,
      setIsBoxSelecting: false,
      setSelectionBox: null,
      setIsDrawing: false,
      setCurrentDrawingPoints: [],
    };
  },
};
