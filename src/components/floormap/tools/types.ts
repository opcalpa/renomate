/**
 * Tool System Types
 *
 * Defines the interfaces for the tool strategy pattern.
 * Each tool implements handlers for mouse/keyboard events.
 */

import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { FloorMapShape, Tool } from '../types';

/**
 * Point in canvas coordinates (after zoom/pan transform)
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Context provided to tool handlers.
 * Contains all the state and actions a tool might need.
 */
export interface ToolContext {
  // References
  stageRef: React.RefObject<Konva.Stage>;

  // Current state (read-only snapshots)
  currentPlanId: string | null;
  shapes: FloorMapShape[];
  currentShapes: FloorMapShape[];
  selectedShapeId: string | null;
  selectedShapeIds: string[];
  isDrawing: boolean;
  currentDrawingPoints: Point[];
  viewState: { zoom: number; panX: number; panY: number };

  // Settings
  scaleSettings: { pixelsPerMm: number };
  projectSettings: {
    snapEnabled: boolean;
    gridInterval: number;
    wallThicknessMM?: number;
    showDimensions: boolean;
    unit: 'mm' | 'cm' | 'm';
  };
  gridSettings: { snap: boolean };

  // Actions
  addShape: (shape: FloorMapShape) => void;
  updateShape: (id: string, updates: Partial<FloorMapShape>) => void;
  deleteShape: (id: string) => void;
  deleteShapes: (ids: string[]) => void;
  setSelectedShapeId: (id: string | null) => void;
  setSelectedShapeIds: (ids: string[]) => void;
  setIsDrawing: (drawing: boolean) => void;
  setCurrentDrawingPoints: (points: Point[]) => void;
  addDrawingPoint: (point: Point) => void;
  setActiveTool: (tool: Tool) => void;

  // Utility functions
  snapToGrid: (value: number, gridSize: number) => number;
  getSnapSize: () => number;
}

/**
 * Result of a tool action.
 * Tools return what state changes should be applied.
 */
export interface ToolResult {
  // Prevent default stage handling
  handled?: boolean;

  // State changes to apply
  setIsDrawing?: boolean;
  setCurrentDrawingPoints?: Point[];
  addDrawingPoint?: Point;
  setSelectedShapeId?: string | null;
  setSelectedShapeIds?: string[];
  shapesToAdd?: FloorMapShape[];
  shapesToUpdate?: Array<{ id: string; updates: Partial<FloorMapShape> }>;
  shapesToDelete?: string[];

  // UI state changes
  setIsMeasuring?: boolean;
  setMeasureStart?: Point | null;
  setMeasureEnd?: Point | null;
  setIsBoxSelecting?: boolean;
  setSelectionBox?: { start: Point; end: Point } | null;
  setLastWallEndPoint?: Point | null;
  setGhostPreview?: { x: number; y: number; rotation: number; nearWall: boolean } | null;

  // Messages
  toast?: { type: 'success' | 'info' | 'error'; message: string };
}

/**
 * Tool handler interface.
 * Each tool implements the events it cares about.
 */
export interface ToolHandler {
  /** Tool identifier */
  tool: Tool;

  /** Handle mouse down on empty canvas */
  onMouseDown?(
    ctx: ToolContext,
    pos: Point,
    evt: KonvaEventObject<MouseEvent>
  ): ToolResult;

  /** Handle mouse move */
  onMouseMove?(
    ctx: ToolContext,
    pos: Point,
    evt: KonvaEventObject<MouseEvent>
  ): ToolResult;

  /** Handle mouse up */
  onMouseUp?(
    ctx: ToolContext,
    pos: Point,
    evt: KonvaEventObject<MouseEvent>
  ): ToolResult;

  /** Handle click on a shape */
  onShapeClick?(
    ctx: ToolContext,
    shapeId: string,
    shape: FloorMapShape,
    evt: KonvaEventObject<MouseEvent>
  ): ToolResult;

  /** Cursor style for this tool */
  cursor?: string;
}

/**
 * Tool registry type
 */
export type ToolRegistry = Map<Tool, ToolHandler>;
