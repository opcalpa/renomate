/**
 * Text Tool Handler
 *
 * Handles text placement on the canvas.
 * Opens a dialog for text input on click.
 */

import { KonvaEventObject } from 'konva/lib/Node';
import { ToolHandler, ToolContext, ToolResult, Point } from './types';
import { FloorMapShape } from '../types';

// Callback to open text dialog - set by component
let openTextDialogCallback: ((pos: Point) => void) | null = null;

export function setTextDialogCallback(callback: (pos: Point) => void): void {
  openTextDialogCallback = callback;
}

export const TextTool: ToolHandler = {
  tool: 'text',
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

    // Open text dialog at this position
    if (openTextDialogCallback) {
      openTextDialogCallback(snappedPos);
    }

    return {
      handled: true,
    };
  },

  onShapeClick(
    ctx: ToolContext,
    shapeId: string,
    shape: FloorMapShape,
    evt: KonvaEventObject<MouseEvent>
  ): ToolResult {
    // If clicking on a text shape, edit it
    if (shape.type === 'text') {
      // The component will handle opening the edit dialog
      return {
        handled: true,
        setSelectedShapeId: shapeId,
        setSelectedShapeIds: [shapeId],
      };
    }

    return { handled: false };
  },
};
