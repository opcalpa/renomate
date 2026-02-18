/**
 * Wall Tool Handler
 *
 * Handles wall drawing with:
 * - Click-to-click wall creation
 * - Wall chaining (continuous drawing)
 * - Snap to grid
 * - Snap to existing wall endpoints
 */

import { KonvaEventObject } from 'konva/lib/Node';
import { v4 as uuidv4 } from 'uuid';
import { ToolHandler, ToolContext, ToolResult, Point } from './types';
import { FloorMapShape } from '../types';
import { getAdminDefaults } from '../canvas/constants';
import { findNearestWallEndpoint } from '../canvas/utils/shapeConnections';

interface WallToolState {
  lastEndPoint: Point | null;
}

// Module-level state for wall chaining
let wallState: WallToolState = {
  lastEndPoint: null,
};

/**
 * Find nearest wall endpoint for snapping.
 */
function findSnapPoint(
  pos: Point,
  walls: FloorMapShape[],
  snapDistance: number
): Point | null {
  const endpoint = findNearestWallEndpoint(pos, walls, snapDistance);
  return endpoint;
}

/**
 * Create a wall shape.
 */
function createWallShape(
  start: Point,
  end: Point,
  planId: string,
  thicknessMM: number,
  heightMM: number
): FloorMapShape {
  return {
    id: uuidv4(),
    planId,
    type: 'wall',
    coordinates: {
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
    },
    strokeColor: '#2d3748',
    thicknessMM,
    heightMM,
  };
}

export const WallTool: ToolHandler = {
  tool: 'wall',
  cursor: 'crosshair',

  onMouseDown(
    ctx: ToolContext,
    pos: Point,
    evt: KonvaEventObject<MouseEvent>
  ): ToolResult {
    const { projectSettings, scaleSettings, currentPlanId, shapes } = ctx;

    if (!currentPlanId) {
      return { handled: true, toast: { type: 'error', message: 'Inget plan valt' } };
    }

    // Apply grid snap if enabled
    let snappedPos = pos;
    if (projectSettings.snapEnabled) {
      const snapSize = ctx.getSnapSize();
      snappedPos = {
        x: ctx.snapToGrid(pos.x, snapSize),
        y: ctx.snapToGrid(pos.y, snapSize),
      };
    }

    // Snap to existing wall endpoints (within 20 pixels)
    const walls = shapes.filter(s => s.type === 'wall' && s.planId === currentPlanId);
    const nearestEndpoint = findSnapPoint(snappedPos, walls, 20);
    if (nearestEndpoint) {
      snappedPos = nearestEndpoint;
    }

    // If we're chaining from a previous wall, use that endpoint
    if (wallState.lastEndPoint) {
      // Start from the last endpoint
      return {
        handled: true,
        setIsDrawing: true,
        setCurrentDrawingPoints: [wallState.lastEndPoint, snappedPos],
      };
    }

    // Fresh start - just set the start point
    return {
      handled: true,
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

    const { projectSettings, shapes, currentPlanId } = ctx;

    // Apply grid snap if enabled
    let snappedPos = pos;
    if (projectSettings.snapEnabled) {
      const snapSize = ctx.getSnapSize();
      snappedPos = {
        x: ctx.snapToGrid(pos.x, snapSize),
        y: ctx.snapToGrid(pos.y, snapSize),
      };
    }

    // Snap to existing wall endpoints
    const walls = shapes.filter(s => s.type === 'wall' && s.planId === currentPlanId);
    const nearestEndpoint = findSnapPoint(snappedPos, walls, 20);
    if (nearestEndpoint) {
      snappedPos = nearestEndpoint;
    }

    // Constrain to axis if shift held (horizontal/vertical only)
    if (evt.evt.shiftKey && ctx.currentDrawingPoints.length > 0) {
      const start = ctx.currentDrawingPoints[0];
      const dx = Math.abs(snappedPos.x - start.x);
      const dy = Math.abs(snappedPos.y - start.y);

      if (dx > dy) {
        snappedPos.y = start.y; // Horizontal
      } else {
        snappedPos.x = start.x; // Vertical
      }
    }

    // Update the preview line
    return {
      setCurrentDrawingPoints: [ctx.currentDrawingPoints[0], snappedPos],
    };
  },

  onMouseUp(
    ctx: ToolContext,
    pos: Point,
    evt: KonvaEventObject<MouseEvent>
  ): ToolResult {
    if (!ctx.isDrawing || ctx.currentDrawingPoints.length < 2) {
      return {
        setIsDrawing: false,
        setCurrentDrawingPoints: [],
      };
    }

    const { projectSettings, currentPlanId, shapes, scaleSettings } = ctx;

    if (!currentPlanId) {
      return {
        handled: true,
        setIsDrawing: false,
        setCurrentDrawingPoints: [],
      };
    }

    const start = ctx.currentDrawingPoints[0];
    let end = ctx.currentDrawingPoints[1];

    // Apply final grid snap
    if (projectSettings.snapEnabled) {
      const snapSize = ctx.getSnapSize();
      end = {
        x: ctx.snapToGrid(end.x, snapSize),
        y: ctx.snapToGrid(end.y, snapSize),
      };
    }

    // Snap to existing wall endpoints
    const walls = shapes.filter(s => s.type === 'wall' && s.planId === currentPlanId);
    const nearestEndpoint = findSnapPoint(end, walls, 20);
    if (nearestEndpoint) {
      end = nearestEndpoint;
    }

    // Calculate wall length
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthPx = Math.sqrt(dx * dx + dy * dy);
    const lengthMm = lengthPx / scaleSettings.pixelsPerMm;

    // Minimum wall length (100mm)
    if (lengthMm < 100) {
      wallState.lastEndPoint = null;
      return {
        handled: true,
        setIsDrawing: false,
        setCurrentDrawingPoints: [],
        setLastWallEndPoint: null,
        toast: { type: 'info', message: 'Väggen för kort (min 100mm)' },
      };
    }

    // Get wall settings
    const adminDefaults = getAdminDefaults();
    const customThickness = (window as { __wallThickness?: number }).__wallThickness;
    const wallThickness = customThickness || projectSettings.wallThicknessMM || adminDefaults.wallThicknessMM;

    // Clear custom thickness
    if (customThickness) {
      delete (window as { __wallThickness?: number }).__wallThickness;
      delete (window as { __wallType?: string }).__wallType;
    }

    // Create the wall
    const newWall = createWallShape(start, end, currentPlanId, wallThickness, adminDefaults.wallHeightMM);

    // Store end point for wall chaining
    wallState.lastEndPoint = end;

    return {
      handled: true,
      shapesToAdd: [newWall],
      setIsDrawing: false,
      setCurrentDrawingPoints: [],
      setLastWallEndPoint: end,
      toast: { type: 'success', message: `Vägg skapad: ${Math.round(lengthMm)}mm` },
    };
  },
};

/**
 * Reset wall chaining state.
 * Call this when switching tools or pressing Escape.
 */
export function resetWallToolState(): void {
  wallState.lastEndPoint = null;
}
