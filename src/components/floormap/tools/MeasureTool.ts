/**
 * Measure Tool Handler
 *
 * Handles the ruler/measurement tool for measuring distances on the canvas.
 */

import { KonvaEventObject } from 'konva/lib/Node';
import { ToolHandler, ToolContext, ToolResult, Point } from './types';

export const MeasureTool: ToolHandler = {
  tool: 'measure',
  cursor: 'crosshair',

  onMouseDown(
    ctx: ToolContext,
    pos: Point,
    evt: KonvaEventObject<MouseEvent>
  ): ToolResult {
    evt.cancelBubble = true;
    return {
      handled: true,
      setIsMeasuring: true,
      setMeasureStart: pos,
      setMeasureEnd: pos,
    };
  },

  onMouseMove(
    ctx: ToolContext,
    pos: Point,
    evt: KonvaEventObject<MouseEvent>
  ): ToolResult {
    // Only update if we're measuring (handled by component state)
    return {
      setMeasureEnd: pos,
    };
  },

  onMouseUp(
    ctx: ToolContext,
    pos: Point,
    evt: KonvaEventObject<MouseEvent>
  ): ToolResult {
    // Measurement stays visible until tool changes
    // (handled by component - activeTool useEffect clears measurement)
    return {
      handled: true,
    };
  },

  onShapeClick(
    ctx: ToolContext,
    shapeId: string,
    shape,
    evt: KonvaEventObject<MouseEvent>
  ): ToolResult {
    // Measure tool ignores shape clicks - let click pass through
    return { handled: false };
  },
};
