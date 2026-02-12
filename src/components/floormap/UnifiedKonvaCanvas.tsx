import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text as KonvaText, Group, Transformer, Path } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { useFloorMapStore } from './store';
import { FloorMapShape, ScalePreset, GridPreset } from './types';
import { v4 as uuidv4 } from 'uuid';
import { RoomDetailDialog } from './RoomDetailDialog';
import { RoomElevationView } from './RoomElevationView';
import { WallElevationView } from './WallElevationView';
import { NameRoomDialog } from './NameRoomDialog';
import { PropertyPanel } from './PropertyPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { saveShapesForPlan, loadShapesForPlan } from './utils/plans';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minimap } from './Minimap';
import { getSymbolComponent, ArchSymbolType, SYMBOL_METADATA } from './SymbolLibrary';
import { getObjectById } from './ObjectRenderer';
import { ObjectShape, ObjectDefinition } from './objectLibraryDefinitions';
import { getTemplateById, placeTemplateShapes, calculateBounds, DEFAULT_TEMPLATES } from './templateDefinitions';
import { getUnifiedObjectById, UnifiedObjectDefinition } from './objectLibrary';
import { useTranslation } from 'react-i18next';

// Canvas module imports
import { MIN_ZOOM, MAX_ZOOM, getAdminDefaults } from './canvas/constants';
import { throttle, createUnifiedDragHandlers, calculateFitToContent } from './canvas/utils';
import { generateWallsFromRoom, generateWallsFromRooms } from './utils/roomWalls';
import { findNearestWallForPoint, getWallGeometry, wallRelativeToWorld } from './canvas/utils/wallCoordinates';
import { findNearestWall, projectOntoWall, splitWall } from './utils/wallSnap';
import { snapObjectToWall } from './canvas/utils/viewSync';
import { mapLibraryCategoryToWallCategory, shouldAttachToWall, getDefaultsForCategory } from './canvas/utils/wallObjectDefaults';

// Shape components (extracted for better maintainability)
import {
  WallShape,
  WallGroupOutline,
  WallSnapIndicator,
  RoomShape,
  RectangleShape,
  CircleShape,
  TextShape,
  FreehandShape,
  LibrarySymbolShape,
  ObjectLibraryShape,
  BezierShape,
  WindowLineShape,
  DoorLineShape,
  SlidingDoorLineShape,
  ImageShape,
  TemplateGroupShape,
} from './shapes';
import { ToolContextMenu } from './ToolContextMenu';
import { Tool } from './types';
import { HoverInfoTooltip } from './HoverInfoTooltip';
import { InlineCommentPopover } from '@/components/comments/InlineCommentPopover';
import { MessageCircle } from 'lucide-react';

// Canvas dimensions are now dynamic - read from projectSettings
// Default: 50m × 50m grid + 10m margin = 70m total (configurable in Canvas Settings)

// Dynamic default based on admin settings
const getDefaultWallThickness = () => {
  const { wallThicknessMM } = getAdminDefaults();
  return wallThicknessMM / 10; // Convert mm to pixels at scale
};

// Helper to format dimension in mm/cm/m
const formatDim = (value: number): string => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}m`;
  } else if (value >= 10) {
    return `${(value / 10).toFixed(1)}cm`;
  }
  return `${Math.round(value)}mm`;
};

// Helper function to find connected shapes (auto-grouping)
// Uses generous tolerance to catch shapes that visually connect at grid points/nodes
const findConnectedWalls = (startWallId: string, allShapes: FloorMapShape[], zoomLevel: number = 1): string[] => {
  // GENEROUS tolerance - catches shapes connected at grid points
  // Using 150mm (15cm) as base - typical grid snap precision
  const baseTolerance = 150; // Increased from 50 to catch grid-snapped connections
  const tolerance = baseTolerance / Math.max(0.3, zoomLevel); // Even more generous at low zoom
  
  const visited = new Set<string>();
  const connectedIds: string[] = [];
  
  const startShape = allShapes.find(s => s.id === startWallId);
  if (!startShape) {
    return [startWallId];
  }
  
  // Helper to get connection points for any shape type
  const getConnectionPoints = (shape: FloorMapShape): { x: number; y: number }[] => {
    const coords = shape.coordinates as any;
    const points: { x: number; y: number }[] = [];
    
    if (shape.type === 'wall' || shape.type === 'line') {
      // Line endpoints
      points.push({ x: coords.x1, y: coords.y1 });
      points.push({ x: coords.x2, y: coords.y2 });
    } else if (shape.type === 'rectangle') {
      // Rectangle corners
      points.push({ x: coords.left, y: coords.top });
      points.push({ x: coords.left + coords.width, y: coords.top });
      points.push({ x: coords.left, y: coords.top + coords.height });
      points.push({ x: coords.left + coords.width, y: coords.top + coords.height });
    } else if (shape.type === 'circle') {
      // Circle center (can connect to other shapes at center)
      points.push({ x: coords.cx, y: coords.cy });
    } else if (shape.type === 'room' || shape.type === 'polygon' || shape.type === 'freehand') {
      // All polygon vertices
      if (coords.points && Array.isArray(coords.points)) {
        coords.points.forEach((p: any) => {
          points.push({ x: p.x, y: p.y });
        });
      }
    } else if (shape.type === 'text') {
      // Text position
      points.push({ x: coords.x, y: coords.y });
    } else if (shape.type === 'symbol' || shape.type === 'object') {
      // Symbol/object position
      points.push({ x: coords.x || 0, y: coords.y || 0 });
    } else if (shape.type === 'bezier') {
      // Bezier start, control, end points
      points.push({ x: coords.start.x, y: coords.start.y });
      points.push({ x: coords.control.x, y: coords.control.y });
      points.push({ x: coords.end.x, y: coords.end.y });
    } else if (shape.type === 'image') {
      // Image corners
      points.push({ x: coords.x, y: coords.y });
      points.push({ x: coords.x + (coords.width || 0), y: coords.y });
      points.push({ x: coords.x, y: coords.y + (coords.height || 0) });
      points.push({ x: coords.x + (coords.width || 0), y: coords.y + (coords.height || 0) });
    }

    return points;
  };
  
  const toVisit = [startWallId];
  
  while (toVisit.length > 0) {
    const currentId = toVisit.pop()!;
    if (visited.has(currentId)) continue;
    
    visited.add(currentId);
    connectedIds.push(currentId);
    
    const currentShape = allShapes.find(s => s.id === currentId);
    if (!currentShape) continue;
    
    const currentEndpoints = getConnectionPoints(currentShape);
    
    // Find all shapes that share a connection point with current shape
    for (const shape of allShapes) {
      if (visited.has(shape.id)) continue;
      
      const endpoints = getConnectionPoints(shape);
      
      // Check if any endpoint of this shape matches any endpoint of current shape
      let isConnected = false;
      for (const ep1 of currentEndpoints) {
        for (const ep2 of endpoints) {
          const dist = Math.sqrt(Math.pow(ep1.x - ep2.x, 2) + Math.pow(ep1.y - ep2.y, 2));
          if (dist <= tolerance) {
            toVisit.push(shape.id);
            isConnected = true;
            break;
          }
        }
        if (isConnected) break;
      }
    }
  }
  
  return connectedIds;
};

// Helper function to find nearest wall endpoint for magnetic snap
const findNearestWallEndpoint = (
  point: { x: number; y: number },
  allShapes: FloorMapShape[],
  excludeShapeId?: string,
  zoomLevel: number = 1
): { x: number; y: number } | null => {
  // Magnetic snap radius - generous to make it easy to connect
  const snapRadius = 80 / Math.max(0.5, zoomLevel);
  
  let nearestPoint: { x: number; y: number } | null = null;
  let nearestDist = snapRadius;
  
  for (const shape of allShapes) {
    if (shape.id === excludeShapeId) continue;
    if (shape.type !== 'wall' && shape.type !== 'line') continue;
    
    const coords = shape.coordinates as any;
    const endpoints = [
      { x: coords.x1, y: coords.y1 },
      { x: coords.x2, y: coords.y2 }
    ];
    
    for (const ep of endpoints) {
      const dist = Math.sqrt(Math.pow(point.x - ep.x, 2) + Math.pow(point.y - ep.y, 2));
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPoint = ep;
      }
    }
  }
  
  return nearestPoint;
};

// ============================================================================
// SCALE CONVERSION HELPERS (from old canvas)
// ============================================================================

const getPixelsPerMm = (pixelsPerMm: number) => pixelsPerMm;
const getPixelsPerCm = (pixelsPerMm: number) => pixelsPerMm * 10;
const getPixelsPerMeter = (pixelsPerMm: number) => pixelsPerMm * 1000;

// Simplified grid levels for practical floor plan work
// Range: 5m (overview) → 10cm (detailed work) - NO sub-10cm grids
const getGridLevels = (pixelsPerMm: number) => {
  const pixelsPerMeter = getPixelsPerMeter(pixelsPerMm);
  const pixelsPerCm = getPixelsPerCm(pixelsPerMm);

  // IMPORTANT: Grid levels that appear together must be exact multiples
  // 5m/1m=5 ✓, 1m/50cm=2 ✓, 50cm/10cm=5 ✓
  return {
    // Major grids - building/apartment overview
    METER_5: { size: pixelsPerMeter * 5, color: "#606060", lineWidth: 2, label: "5m", opacity: 0.9 },
    METER_1: { size: pixelsPerMeter, color: "#808080", lineWidth: 1.5, label: "1m", opacity: 0.7 },

    // Working grids - standard architectural precision
    CM_50: { size: pixelsPerCm * 50, color: "#a0a0a0", lineWidth: 1, label: "50cm", opacity: 0.5 },
    CM_10: { size: pixelsPerCm * 10, color: "#c8c8c8", lineWidth: 0.6, label: "10cm", opacity: 0.35 },
  };
};

// Simplified zoom-based grid system for practical floor plan work
// All paired levels are exact multiples to prevent misaligned lines:
// 5m/1m=5, 1m/50cm=2, 50cm/10cm=5
const getActiveGridLevels = (zoomLevel: number, pixelsPerMm: number) => {
  const GRID_LEVELS = getGridLevels(pixelsPerMm);
  const levels = [];

  // Level 1: Extreme zoom out - building overview (5m only)
  if (zoomLevel < 0.5) {
    levels.push(GRID_LEVELS.METER_5);
  }
  // Level 2: Zoomed out - floor plan overview (5m + 1m, ratio 5:1)
  else if (zoomLevel < 1.0) {
    levels.push(GRID_LEVELS.METER_5, GRID_LEVELS.METER_1);
  }
  // Level 3: Standard working view - room layout (1m + 50cm, ratio 2:1)
  else if (zoomLevel < 2.0) {
    levels.push(GRID_LEVELS.METER_1, GRID_LEVELS.CM_50);
  }
  // Level 4+: Detailed view - precise work (50cm + 10cm, ratio 5:1)
  else {
    levels.push(GRID_LEVELS.CM_50, GRID_LEVELS.CM_10);
  }

  return levels;
};

// Snap size using USER SETTINGS - respects projectSettings.gridInterval
// Only overrides if zoom is too low for the user's chosen grid (prevents frustrating micro-movements)
const getSnapSize = (zoomLevel: number, pixelsPerMm: number, forWalls: boolean = false, userGridInterval?: number): number => {
  const pixelsPerCm = pixelsPerMm * 10;

  // Get minimum practical snap size based on zoom level
  // (prevents snapping in 1cm increments when zoomed out to see entire floor)
  let minSnapMm: number;
  if (zoomLevel < 0.5) {
    minSnapMm = 1000; // At extreme zoom out, don't snap finer than 1m
  } else if (zoomLevel < 1.0) {
    minSnapMm = 500;  // At overview, don't snap finer than 50cm
  } else if (zoomLevel < 2.0) {
    minSnapMm = 250;  // At normal view, don't snap finer than 25cm
  } else {
    minSnapMm = 50;   // At detail view, allow snap as fine as 5cm
  }

  // Use user's setting, but enforce minimum based on zoom
  const effectiveSnapMm = userGridInterval
    ? Math.max(userGridInterval, minSnapMm)
    : minSnapMm;

  // Convert mm to pixels
  return effectiveSnapMm * pixelsPerMm;
};

// Get practical scale representation for architectural work
// Optimized for the simplified zoom range (0.3x - 5x)
const getScaleRepresentation = (zoom: number, pixelsPerMm: number): string => {
  // Calculate actual scale based on zoom and pixelsPerMm
  // Standard screen DPI is ~96, so 1 screen mm ≈ 3.78 pixels
  const screenPixelsPerMm = 3.78;
  const actualScale = (pixelsPerMm * zoom) / screenPixelsPerMm;
  
  // Convert to standard architectural scales (simplified for practical range)
  if (actualScale >= 0.35) return "1:20"; // Maximum detail (zoom 5x)
  else if (actualScale >= 0.18) return "1:50"; // Detail work (zoom 2-3x)
  else if (actualScale >= 0.09) return "1:100"; // Standard view (zoom 1x)
  else if (actualScale >= 0.045) return "1:200"; // Overview (zoom 0.5x)
  else return "1:400"; // Maximum overview (zoom 0.3x)
};

// Helper function to snap point to grid
const snapToGrid = (point: { x: number; y: number }, snapSize: number, enabled: boolean): { x: number; y: number } => {
  if (!enabled) return point;
  return {
    x: Math.round(point.x / snapSize) * snapSize,
    y: Math.round(point.y / snapSize) * snapSize,
  };
};

// Helper function to snap delta (movement) to grid - for dragging objects
const snapDelta = (delta: { x: number; y: number }, snapSize: number, enabled: boolean): { x: number; y: number } => {
  if (!enabled) return delta;
  return {
    x: Math.round(delta / snapSize) * snapSize,
    y: Math.round(delta / snapSize) * snapSize,
  };
};

// Helper function to check if two walls are connected (share an endpoint)
const areWallsConnected = (wall1: FloorMapShape, wall2: FloorMapShape): boolean => {
  if ((wall1.type !== 'wall' && wall1.type !== 'line') || (wall2.type !== 'wall' && wall2.type !== 'line')) {
    return false;
  }

  const coords1 = wall1.coordinates as any;
  const coords2 = wall2.coordinates as any;

  // Get endpoints directly (no rounding - use raw coordinates)
  const w1Start = { x: coords1.x1, y: coords1.y1 };
  const w1End = { x: coords1.x2, y: coords1.y2 };
  const w2Start = { x: coords2.x1, y: coords2.y1 };
  const w2End = { x: coords2.x2, y: coords2.y2 };

  const distance = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
    Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

  const d1 = distance(w1Start, w2Start);
  const d2 = distance(w1Start, w2End);
  const d3 = distance(w1End, w2Start);
  const d4 = distance(w1End, w2End);

  const minDist = Math.min(d1, d2, d3, d4);

  // Large tolerance: 50 canvas units (~50cm at 1:100 scale)
  // This should catch walls that visually appear connected
  const tolerance = 50;

  return minDist < tolerance;
};

// Helper function to find all walls connected to a given wall (flood-fill/BFS)
const getConnectedWalls = (startWallId: string, allShapes: FloorMapShape[]): string[] => {
  const walls = allShapes.filter(s => s.type === 'wall' || s.type === 'line');
  const startWall = walls.find(w => w.id === startWallId);

  if (!startWall) return [startWallId];

  const connectedIds = new Set<string>([startWallId]);
  const queue = [startWall];

  while (queue.length > 0) {
    const currentWall = queue.shift()!;

    // Find all walls connected to current wall
    for (const wall of walls) {
      if (!connectedIds.has(wall.id) && areWallsConnected(currentWall, wall)) {
        connectedIds.add(wall.id);
        queue.push(wall);
      }
    }
  }

  return Array.from(connectedIds);
};


// Shape components are now in ./shapes/ directory
// See: WallShape, RoomShape, RectangleShape, CircleShape, TextShape, FreehandShape,
//      LibrarySymbolShape, ObjectLibraryShape

// ============================================================================
// MULTI-LEVEL GRID COMPONENT (from old canvas)
// ============================================================================

interface GridProps {
  viewState: { zoom: number; panX: number; panY: number };
  scaleSettings: { pixelsPerMm: number };
  projectSettings: { 
    gridVisible?: boolean;
    canvasWidthMeters: number;
    canvasHeightMeters: number;
  };
}

const Grid: React.FC<GridProps> = ({ viewState, scaleSettings, projectSettings }) => {
  // Don't render if grid is hidden
  if (projectSettings.gridVisible === false) {
    return null;
  }

  const { zoom, panX, panY } = viewState;
  const { pixelsPerMm } = scaleSettings;
  const { canvasWidthMeters, canvasHeightMeters } = projectSettings;
  
  const activeGrids = getActiveGridLevels(zoom, pixelsPerMm);
  const lines: JSX.Element[] = [];
  
  // Calculate viewport dimensions (visible area on screen)
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Transform viewport to world coordinates (account for pan and zoom)
  // World coords = (screen coords - pan) / zoom
  const worldLeft = (-panX) / zoom;
  const worldTop = (-panY) / zoom;
  const worldRight = (viewportWidth - panX) / zoom;
  const worldBottom = (viewportHeight - panY) / zoom;
  
  // Extend grid beyond viewport for smooth panning
  const padding = Math.max(viewportWidth, viewportHeight) / zoom;
  const extendedLeft = worldLeft - padding;
  const extendedTop = worldTop - padding;
  const extendedRight = worldRight + padding;
  const extendedBottom = worldBottom + padding;
  
  // Draw gridlines across ENTIRE visible area + padding
  // IMPORTANT: Use integer-based loop to avoid floating-point accumulation errors
  activeGrids.forEach((gridLevel, levelIndex) => {
    const gridSize = gridLevel.size;

    // Calculate grid line indices (integers) to avoid floating-point errors
    const startXIndex = Math.floor(extendedLeft / gridSize);
    const endXIndex = Math.ceil(extendedRight / gridSize);
    const startYIndex = Math.floor(extendedTop / gridSize);
    const endYIndex = Math.ceil(extendedBottom / gridSize);

    // Vertical lines - use integer index and multiply to get position
    // Round to avoid sub-pixel rendering artifacts at high zoom
    for (let i = startXIndex; i <= endXIndex; i++) {
      const x = Math.round(i * gridSize * 100) / 100; // Round to 2 decimals for precision
      lines.push(
        <Line
          key={`${levelIndex}-v-${i}`}
          points={[x, extendedTop, x, extendedBottom]}
          stroke={gridLevel.color}
          strokeWidth={Math.max(0.5, gridLevel.lineWidth / zoom)}
          opacity={gridLevel.opacity}
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    }

    // Horizontal lines - use integer index and multiply to get position
    // Round to avoid sub-pixel rendering artifacts at high zoom
    for (let j = startYIndex; j <= endYIndex; j++) {
      const y = Math.round(j * gridSize * 100) / 100; // Round to 2 decimals for precision
      lines.push(
        <Line
          key={`${levelIndex}-h-${j}`}
          points={[extendedLeft, y, extendedRight, y]}
          stroke={gridLevel.color}
          strokeWidth={Math.max(0.5, gridLevel.lineWidth / zoom)}
          opacity={gridLevel.opacity}
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    }
  });
  
  // Canvas working area starting at (0,0) - no margins
  const canvasWidthPx = canvasWidthMeters * 1000 * pixelsPerMm;
  const canvasHeightPx = canvasHeightMeters * 1000 * pixelsPerMm;

  return (
    <>
      {/* White background for canvas working area */}
      <Rect
        x={0}
        y={0}
        width={canvasWidthPx}
        height={canvasHeightPx}
        fill="#ffffff"
        listening={false}
      />

      {/* Gridlines - extend infinitely across visible viewport */}
      {lines}

      {/* Canvas boundary - subtle border */}
      <Rect
        x={0}
        y={0}
        width={canvasWidthPx}
        height={canvasHeightPx}
        stroke="#e5e7eb"
        strokeWidth={1 / zoom}
        listening={false}
      />
    </>
  );
};

// ============================================================================
// MAIN CANVAS COMPONENT
// ============================================================================

interface UnifiedKonvaCanvasProps {
  onRoomCreated?: () => void;
  isReadOnly?: boolean;
  highlightedRoomIds?: string[];
}

export const UnifiedKonvaCanvas: React.FC<UnifiedKonvaCanvasProps> = ({ onRoomCreated, isReadOnly, highlightedRoomIds }) => {
  const { t } = useTranslation();
  const stageRef = useRef<Konva.Stage>(null);
  const shapeRefs = useRef<Map<string, Konva.Node>>(new Map());
  
  // Unified drag system now at module level (top of file)
  // Accessible to all shape components
  
  // Track real-time transform states for multi-select transformations
  const [transformStates, setTransformStates] = useState<Record<string, {
    scaleX: number;
    scaleY: number;
    rotation: number;
    x: number;
    y: number;
  }>>({});
  
  // Navigation state
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  
  // Touch/pinch zoom state
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [lastTouchCenter, setLastTouchCenter] = useState<{ x: number; y: number } | null>(null);
  const touchPanStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  
  // Double-click handling state (simplified like old canvas)
  // Use refs for synchronous access in rapid click sequences
  const lastClickTimeRef = useRef(0);
  const lastClickedShapeIdRef = useRef<string | null>(null);
  const [isGroupMode, setIsGroupMode] = useState(true); // Start in group mode
  
  // Wall chaining state (for continuous wall drawing like old canvas)
  const [lastWallEndPoint, setLastWallEndPoint] = useState<{ x: number; y: number } | null>(null);
  
  // Drag selection state (box select)
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const [isExtendingSelection, setIsExtendingSelection] = useState(false); // Shift+drag to add to selection
  
  // PERFORMANCE OPTIMIZATION: Throttled state updater for selection box
  // Limits updates to ~30fps instead of 60-120fps, reducing re-renders by 50-70%
  const throttledSetSelectionBox = useMemo(
    () => throttle((box: { start: { x: number; y: number }; end: { x: number; y: number } } | null) => {
      setSelectionBox(box);
    }, 33), // 33ms = ~30fps (smooth enough for visual feedback, much better performance)
    []
  );
  
  // Room detail dialog state
  const [selectedRoomForDetail, setSelectedRoomForDetail] = useState<string | null>(null);
  const [isRoomDetailOpen, setIsRoomDetailOpen] = useState(false);
  const [roomData, setRoomData] = useState<any>(null);

  // Room elevation view state (room-centric with 4 cardinal directions)
  const [roomElevationShape, setRoomElevationShape] = useState<FloorMapShape | null>(null);
  const [elevationInitialWallId, setElevationInitialWallId] = useState<string | undefined>(undefined);

  // Hover info tooltip state
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);
  const [hoverMousePosition, setHoverMousePosition] = useState<{ x: number; y: number } | null>(null);

  // Wall elevation view state (shows combined collinear walls)
  const [wallElevationId, setWallElevationId] = useState<string | null>(null);

  // Property panel state (for all object types)
  const [showPropertyPanel, setShowPropertyPanel] = useState(false);
  const [propertyPanelShape, setPropertyPanelShape] = useState<FloorMapShape | null>(null);
  
  // Pending room creation (before naming)
  const [pendingRoom, setPendingRoom] = useState<{ points: { x: number; y: number }[] } | null>(null);
  const [isNameRoomDialogOpen, setIsNameRoomDialogOpen] = useState(false);
  const [selectedShapeForNaming, setSelectedShapeForNaming] = useState<string | null>(null);
  
  // Clipboard for copy/paste
  const [clipboard, setClipboard] = useState<FloorMapShape[]>([]);
  
  // Wall unit selection mode (for nested interaction)
  const [selectedWallUnit, setSelectedWallUnit] = useState<string[] | null>(null); // IDs of connected walls
  const [wallSelectionMode, setWallSelectionMode] = useState<'unit' | 'segment'>('unit');

  // Template group individual shape selection (double-click to select single shape in group)
  const [selectedGroupIndividualId, setSelectedGroupIndividualId] = useState<string | null>(null);

  // Text input dialog state
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [pendingTextPosition, setPendingTextPosition] = useState<{ x: number; y: number; width?: number; height?: number } | null>(null);
  const [textIsBold, setTextIsBold] = useState(false);
  const [textIsItalic, setTextIsItalic] = useState(false);
  const [textFontSize, setTextFontSize] = useState(16);
  const [textRotation, setTextRotation] = useState<0 | 90 | 180 | 270>(0);
  const [textHasBackground, setTextHasBackground] = useState(false);
  const [editingTextShapeId, setEditingTextShapeId] = useState<string | null>(null); // Track which text is being edited

  // Context menu state (right-click)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [recentTools, setRecentTools] = useState<Tool[]>(['wall', 'room', 'select']);

  // Comments state for floor plan objects
  const [activeComment, setActiveComment] = useState<{ objectId: string; position: { x: number; y: number } } | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [resolvedStatus, setResolvedStatus] = useState<Record<string, boolean>>({});

  // Measurement tool state
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number; y: number } | null>(null);

  // CAD-style numeric input state (type exact length during wall drawing)
  const [numericInput, setNumericInput] = useState<string>('');
  const [showNumericInput, setShowNumericInput] = useState(false);
  const currentMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Note: initializedViewForPlanId is now stored in Zustand store (not a ref)
  // This allows it to survive component unmounts when switching between floor/elevation views

  // Ghost preview state for stamp placement mode (library objects/symbols)
  // Shows a preview following the cursor with auto-rotation towards nearest wall
  const [ghostPreview, setGhostPreview] = useState<{
    x: number;
    y: number;
    rotation: number; // Degrees, auto-calculated from nearest wall
    nearWall: boolean; // True if snapped to a wall
  } | null>(null);

  // Handle context menu (right-click)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenuPos(null);
  }, []);

  // Cleanup throttled function on unmount
  useEffect(() => {
    return () => {
      throttledSetSelectionBox.cancel();
    };
  }, [throttledSetSelectionBox]);

  // Fetch room data when room is selected for detail
  useEffect(() => {
    if (selectedRoomForDetail && isRoomDetailOpen) {
      const fetchRoomData = async () => {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', selectedRoomForDetail)
          .single();

        if (error) {
          console.error('Failed to fetch room data:', error);
          toast.error('Kunde inte ladda rumsdata');
          setIsRoomDetailOpen(false);
          setSelectedRoomForDetail(null);
          return;
        }

        if (data) {
          setRoomData(data);
        }
      };
      fetchRoomData();
    }
  }, [selectedRoomForDetail, isRoomDetailOpen]);
  
  // PERFORMANCE: Optimized Zustand selectors - only subscribe to what we need
  // This prevents unnecessary re-renders when unrelated store values change
  const shapes = useFloorMapStore((state) => state.shapes);
  const currentPlanId = useFloorMapStore((state) => state.currentPlanId);
  const currentProjectId = useFloorMapStore((state) => state.currentProjectId);
  const viewState = useFloorMapStore((state) => state.viewState);
  const gridSettings = useFloorMapStore((state) => state.gridSettings);
  const scaleSettings = useFloorMapStore((state) => state.scaleSettings);
  const projectSettings = useFloorMapStore((state) => state.projectSettings);
  const activeTool = useFloorMapStore((state) => state.activeTool);
  const selectedShapeId = useFloorMapStore((state) => state.selectedShapeId);
  const selectedShapeIds = useFloorMapStore((state) => state.selectedShapeIds);
  const isDrawing = useFloorMapStore((state) => state.isDrawing);
  const currentDrawingPoints = useFloorMapStore((state) => state.currentDrawingPoints);
  const pendingLibrarySymbol = useFloorMapStore((state) => state.pendingLibrarySymbol);
  const pendingObjectId = useFloorMapStore((state) => state.pendingObjectId);
  const pendingTemplateId = useFloorMapStore((state) => state.pendingTemplateId);
  const pendingRoomPlacement = useFloorMapStore((state) => state.pendingRoomPlacement);
  const initializedViewForPlanId = useFloorMapStore((state) => state.initializedViewForPlanId);
  const wallSnapPreview = useFloorMapStore((state) => state.wallSnapPreview);

  // Actions (don't cause re-renders)
  const setViewState = useFloorMapStore((state) => state.setViewState);
  const setCurrentPlanId = useFloorMapStore((state) => state.setCurrentPlanId);
  const setSelectedShapeId = useFloorMapStore((state) => state.setSelectedShapeId);
  const setSelectedShapeIds = useFloorMapStore((state) => state.setSelectedShapeIds);
  const setShapes = useFloorMapStore((state) => state.setShapes);
  const updateShape = useFloorMapStore((state) => state.updateShape);
  const updateShapes = useFloorMapStore((state) => state.updateShapes);
  const addShape = useFloorMapStore((state) => state.addShape);
  const deleteShape = useFloorMapStore((state) => state.deleteShape);
  const deleteShapes = useFloorMapStore((state) => state.deleteShapes);
  const setIsDrawing = useFloorMapStore((state) => state.setIsDrawing);
  const setCurrentDrawingPoints = useFloorMapStore((state) => state.setCurrentDrawingPoints);
  const addDrawingPoint = useFloorMapStore((state) => state.addDrawingPoint);
  const undo = useFloorMapStore((state) => state.undo);
  const redo = useFloorMapStore((state) => state.redo);
  const canUndo = useFloorMapStore((state) => state.canUndo);
  const canRedo = useFloorMapStore((state) => state.canRedo);
  const setScalePreset = useFloorMapStore((state) => state.setScalePreset);
  const setGridPreset = useFloorMapStore((state) => state.setGridPreset);
  const setPendingLibrarySymbol = useFloorMapStore((state) => state.setPendingLibrarySymbol);
  const setPendingObjectId = useFloorMapStore((state) => state.setPendingObjectId);
  const setPendingTemplateId = useFloorMapStore((state) => state.setPendingTemplateId);
  const setPendingRoomPlacement = useFloorMapStore((state) => state.setPendingRoomPlacement);
  const setActiveTool = useFloorMapStore((state) => state.setActiveTool);
  const setInitializedViewForPlanId = useFloorMapStore((state) => state.setInitializedViewForPlanId);
  const bringForward = useFloorMapStore((state) => state.bringForward);
  const sendBackward = useFloorMapStore((state) => state.sendBackward);
  const bringToFront = useFloorMapStore((state) => state.bringToFront);
  const sendToBack = useFloorMapStore((state) => state.sendToBack);

  // Set cursor style based on active tool
  useEffect(() => {
    const container = stageRef.current?.container();
    if (!container) return;

    const drawingTools = ['wall', 'door_line', 'window_line', 'sliding_door_line', 'line', 'freehand', 'rectangle', 'circle', 'text', 'room', 'bezier', 'measure'];

    if (drawingTools.includes(activeTool)) {
      container.style.cursor = 'crosshair';
    } else if (activeTool === 'pan') {
      container.style.cursor = 'grab';
    } else {
      container.style.cursor = 'default';
    }

    return () => {
      if (container) container.style.cursor = 'default';
    };
  }, [activeTool]);

  // Handle opening comments popover for a shape
  const handleOpenComments = useCallback((objectId?: string, screenX?: number, screenY?: number) => {
    // Use provided objectId or fall back to first selected shape
    const targetId = objectId || (selectedShapeIds.length > 0 ? selectedShapeIds[0] : null);
    if (!targetId) return;

    // Use provided position or context menu position or default
    const x = screenX ?? contextMenuPos?.x ?? 200;
    const y = screenY ?? contextMenuPos?.y ?? 200;
    setActiveComment({ objectId: targetId, position: { x, y } });
    setContextMenuPos(null);
  }, [selectedShapeIds, contextMenuPos]);

  // Handle closing comments popover
  const handleCloseComments = useCallback(() => {
    setActiveComment(null);
  }, []);

  // Handle comment count change from popover
  const handleCommentCountChange = useCallback((objectId: string, count: number) => {
    setCommentCounts(prev => ({ ...prev, [objectId]: count }));
  }, []);

  // Handle resolved state change from popover
  const handleResolvedChange = useCallback((objectId: string, isResolved: boolean) => {
    setResolvedStatus(prev => ({ ...prev, [objectId]: isResolved }));
  }, []);

  // Clear measurement when tool changes
  useEffect(() => {
    if (activeTool !== 'measure') {
      setMeasureStart(null);
      setMeasureEnd(null);
    }
    // Clear CAD numeric input when tool changes
    setNumericInput('');
    setShowNumericInput(false);
  }, [activeTool]);

  // Track tool changes to update recent tools (for context menu)
  useEffect(() => {
    if (activeTool && activeTool !== 'select') {
      setRecentTools(prev => {
        const filtered = prev.filter(t => t !== activeTool);
        return [activeTool, ...filtered].slice(0, 5);
      });
    }
  }, [activeTool]);

  // Calculate canvas dimensions from settings (in pixels)
  // SIMPLIFIED: Canvas = Working area (no margin)
  const CANVAS_WIDTH = useMemo(() => {
    return projectSettings.canvasWidthMeters * 1000 * scaleSettings.pixelsPerMm;
  }, [projectSettings.canvasWidthMeters, scaleSettings.pixelsPerMm]);
  
  const CANVAS_HEIGHT = useMemo(() => {
    return projectSettings.canvasHeightMeters * 1000 * scaleSettings.pixelsPerMm;
  }, [projectSettings.canvasHeightMeters, scaleSettings.pixelsPerMm]);
  
  // Filter shapes for current plan (excluding elevation-only shapes)
  const currentShapes = useMemo(
    () => shapes.filter(shape =>
      shape.planId === currentPlanId &&
      shape.shapeViewMode !== 'elevation' // Exclude elevation-only shapes from floor plan view
    ),
    [shapes, currentPlanId]
  );

  // Stable reference to shape IDs for fetching comments
  const shapeIdsKey = useMemo(() => currentShapes.map(s => s.id).join(','), [currentShapes]);

  // Fetch comment counts and resolved status for all shapes on canvas
  useEffect(() => {
    const fetchCommentData = async () => {
      const shapeIds = shapeIdsKey.split(',').filter(Boolean);
      if (shapeIds.length === 0) return;

      try {
        // Try fetching with is_resolved (new schema)
        let result = await supabase
          .from('comments')
          .select('drawing_object_id, is_resolved')
          .in('drawing_object_id', shapeIds);

        // Fallback if is_resolved column doesn't exist
        if (result.error?.code === '42703') {
          result = await supabase
            .from('comments')
            .select('drawing_object_id')
            .in('drawing_object_id', shapeIds);
        }

        if (result.error) {
          console.error('Error fetching comment data:', result.error);
          return;
        }

        const counts: Record<string, number> = {};
        const resolved: Record<string, boolean> = {};

        result.data?.forEach((row: { drawing_object_id: string | null; is_resolved?: boolean }) => {
          if (row.drawing_object_id) {
            counts[row.drawing_object_id] = (counts[row.drawing_object_id] || 0) + 1;
            if (row.is_resolved) {
              resolved[row.drawing_object_id] = true;
            }
          }
        });

        setCommentCounts(counts);
        setResolvedStatus(resolved);
      } catch (err) {
        console.error('Error fetching comment data:', err);
      }
    };

    fetchCommentData();
  }, [shapeIdsKey]);

  // Separate shapes into template groups and individual shapes
  const { templateGroups, individualShapes } = useMemo(() => {
    const groups: Map<string, { shapes: FloorMapShape[]; leader: FloorMapShape }> = new Map();
    const individual: FloorMapShape[] = [];

    for (const shape of currentShapes) {
      if (shape.groupId) {
        // This shape belongs to a template group
        const existing = groups.get(shape.groupId);
        if (existing) {
          existing.shapes.push(shape);
          // Update leader if this shape is the group leader
          if (shape.isGroupLeader) {
            existing.leader = shape;
          }
        } else {
          groups.set(shape.groupId, {
            shapes: [shape],
            leader: shape.isGroupLeader ? shape : shape, // Fallback to first shape
          });
        }
      } else {
        // Individual shape (not part of a group)
        individual.push(shape);
      }
    }

    return {
      templateGroups: Array.from(groups.entries()).map(([groupId, data]) => ({
        groupId,
        shapes: data.shapes,
        leader: data.leader,
      })),
      individualShapes: individual,
    };
  }, [currentShapes]);

  // Calculate bounding box for multi-selection visual indicator
  const multiSelectionBounds = useMemo(() => {
    if (selectedShapeIds.length < 2) return null;

    const selectedShapes = currentShapes.filter(s => selectedShapeIds.includes(s.id));
    if (selectedShapes.length < 2) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    selectedShapes.forEach(shape => {
      const coords = shape.coordinates as any;

      if (shape.type === 'wall' || shape.type === 'line') {
        minX = Math.min(minX, coords.x1, coords.x2);
        maxX = Math.max(maxX, coords.x1, coords.x2);
        minY = Math.min(minY, coords.y1, coords.y2);
        maxY = Math.max(maxY, coords.y1, coords.y2);
      } else if (shape.type === 'rectangle' || shape.type === 'door' || shape.type === 'opening') {
        minX = Math.min(minX, coords.left);
        maxX = Math.max(maxX, coords.left + (coords.width || 0));
        minY = Math.min(minY, coords.top);
        maxY = Math.max(maxY, coords.top + (coords.height || 0));
      } else if (shape.type === 'circle') {
        minX = Math.min(minX, coords.cx - coords.radius);
        maxX = Math.max(maxX, coords.cx + coords.radius);
        minY = Math.min(minY, coords.cy - coords.radius);
        maxY = Math.max(maxY, coords.cy + coords.radius);
      } else if (shape.type === 'room' || shape.type === 'polygon' || shape.type === 'freehand') {
        if (coords.points) {
          coords.points.forEach((p: { x: number; y: number }) => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
          });
        }
      } else if (shape.type === 'symbol' || shape.type === 'text') {
        minX = Math.min(minX, coords.x);
        maxX = Math.max(maxX, coords.x + (coords.width || 100));
        minY = Math.min(minY, coords.y);
        maxY = Math.max(maxY, coords.y + (coords.height || 100));
      } else if (shape.type === 'image') {
        minX = Math.min(minX, coords.x);
        maxX = Math.max(maxX, coords.x + (coords.width || 0));
        minY = Math.min(minY, coords.y);
        maxY = Math.max(maxY, coords.y + (coords.height || 0));
      }
    });

    if (minX === Infinity) return null;

    // Add padding (100mm = 10cm)
    const padding = 100;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
      count: selectedShapes.length,
    };
  }, [currentShapes, selectedShapeIds]);

  // Handle text dialog submit (create or edit)
  const handleTextSubmit = useCallback(() => {
    if (textInputValue.trim()) {
      if (editingTextShapeId) {
        // Edit existing text shape
        updateShape(editingTextShapeId, {
          text: textInputValue,
          textStyle: {
            isBold: textIsBold,
            isItalic: textIsItalic,
          },
          fontSize: textFontSize,
          textRotation: textRotation,
          hasBackground: textHasBackground,
        });
        toast.success('Text uppdaterad');
      } else if (pendingTextPosition && currentPlanId) {
        // Create new text shape
        const newShape: FloorMapShape = {
          id: uuidv4(),
          planId: currentPlanId,
          type: 'text',
          coordinates: {
            x: pendingTextPosition.x,
            y: pendingTextPosition.y,
            width: pendingTextPosition.width,
            height: pendingTextPosition.height,
          },
          text: textInputValue,
          textStyle: {
            isBold: textIsBold,
            isItalic: textIsItalic,
          },
          fontSize: textFontSize,
          textRotation: textRotation,
          hasBackground: textHasBackground,
        };
        addShape(newShape);
        toast.success('Text tillagd');
      }
    }
    // Reset all text dialog states
    setIsTextDialogOpen(false);
    setTextInputValue('');
    setPendingTextPosition(null);
    setTextIsBold(false);
    setTextIsItalic(false);
    setTextFontSize(16);
    setTextRotation(0);
    setTextHasBackground(false);
    setEditingTextShapeId(null);
  }, [textInputValue, pendingTextPosition, currentPlanId, addShape, updateShape, editingTextShapeId, textIsBold, textIsItalic, textFontSize, textRotation, textHasBackground]);

  // Handle double-click to edit existing text
  const handleTextEdit = useCallback((shape: FloorMapShape) => {
    if (shape.type !== 'text') return;

    // Populate dialog with existing values
    setTextInputValue(shape.text || '');
    setTextIsBold(shape.textStyle?.isBold || false);
    setTextIsItalic(shape.textStyle?.isItalic || false);
    setTextFontSize(shape.fontSize || 16);
    setTextRotation((shape.textRotation || 0) as 0 | 90 | 180 | 270);
    setTextHasBackground(shape.hasBackground || false);
    setEditingTextShapeId(shape.id);
    setIsTextDialogOpen(true);
  }, []);
  
  // Manual save function (exposed to toolbar)
  const handleManualSave = useCallback(async () => {
    if (!currentPlanId) {
      toast.error('Ingen plan vald');
      return false;
    }
    
    // Manual save
    const success = await saveShapesForPlan(currentPlanId, shapes);
    if (success) {
      toast.success('Ritning sparad!');
    } else {
      toast.error('Kunde inte spara ritningen');
    }
    return success;
  }, [currentPlanId, shapes]);
  
  // Expose functions to window for toolbar
  useEffect(() => {
    (window as any).__canvasSave = handleManualSave;
    (window as any).__canvasUndo = undo;
    (window as any).__canvasRedo = redo;
    (window as any).__canvasCanUndo = canUndo();
    (window as any).__canvasCanRedo = canRedo();
    
    return () => {
      delete (window as any).__canvasSave;
      delete (window as any).__canvasUndo;
      delete (window as any).__canvasRedo;
      delete (window as any).__canvasCanUndo;
      delete (window as any).__canvasCanRedo;
    };
  }, [handleManualSave, undo, redo, canUndo, canRedo]);
  
  // Update undo/redo state in window and dispatch event (for toolbar state)
  useEffect(() => {
    const canUndoVal = canUndo();
    const canRedoVal = canRedo();
    (window as any).__canvasCanUndo = canUndoVal;
    (window as any).__canvasCanRedo = canRedoVal;
    // Dispatch event for FloorMapEditor to listen to (replaces polling)
    window.dispatchEvent(new CustomEvent('canvasUndoRedoStateChange', {
      detail: { canUndo: canUndoVal, canRedo: canRedoVal }
    }));
  }, [canUndo, canRedo, shapes]);
  
  // Load shapes when plan changes, then apply initial view
  // Note: This effect should only reset view on FIRST load of a plan, not when re-rendering
  useEffect(() => {
    if (!currentPlanId) {
      // No plan selected, clear shapes
      setShapes([]);
      setInitializedViewForPlanId(null);
      return;
    }

    // Capture whether we've already initialized at the START of the effect
    // This prevents race conditions with async operations
    // Note: Using store value instead of ref so it survives component unmount
    const wasAlreadyInitialized = initializedViewForPlanId === currentPlanId;

    const loadShapes = async () => {
      const loadedShapes = await loadShapesForPlan(currentPlanId);

      // Load room names from rooms table for room shapes
      let finalShapes = loadedShapes;
      const roomShapes = loadedShapes.filter(s => s.type === 'room' && s.roomId);
      if (roomShapes.length > 0 && currentProjectId) {
        try {
          const roomIds = roomShapes.map(s => s.roomId).filter(Boolean);
          const { data: rooms, error } = await supabase
            .from('rooms')
            .select('id, name, color')
            .in('id', roomIds);

          if (!error && rooms) {
            // Map room names and colors to shapes
            finalShapes = loadedShapes.map(shape => {
              if (shape.type === 'room' && shape.roomId) {
                const room = rooms.find(r => r.id === shape.roomId);
                if (room) {
                  // Helper to get darker color for stroke
                  const getDarkerColor = (rgbaColor: string): string => {
                    const match = rgbaColor?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                    if (match) {
                      const r = Math.floor(parseInt(match[1]) * 0.7);
                      const g = Math.floor(parseInt(match[2]) * 0.7);
                      const b = Math.floor(parseInt(match[3]) * 0.7);
                      return `rgba(${r}, ${g}, ${b}, 0.8)`;
                    }
                    return rgbaColor || 'rgba(41, 91, 172, 0.8)';
                  };

                  return {
                    ...shape,
                    name: room.name,
                    color: room.color || shape.color || 'rgba(59, 130, 246, 0.2)',
                    strokeColor: getDarkerColor(room.color || shape.color || 'rgba(59, 130, 246, 0.2)')
                  };
                }
              }
              return shape;
            });
          }
        } catch (error) {
          console.error('Error loading room data:', error);
        }
      }

      setShapes(finalShapes);

      // Check if AI import has centering instructions (always apply these, even if initialized)
      const aiCenterView = (window as any).__aiImportCenterView;
      if (aiCenterView) {
        setInitializedViewForPlanId(currentPlanId);
        setTimeout(() => {
          setViewState({
            zoom: aiCenterView.zoom,
            panX: aiCenterView.panX,
            panY: aiCenterView.panY,
          });
          delete (window as any).__aiImportCenterView;
          toast.success('Canvas centrerad på AI-importerade objekt');
        }, 800);
        return;
      }

      // Only apply initial view on first load for this plan
      // This prevents view reset when returning from elevation view, room detail, etc.
      // Use the captured flag from the START of the effect to avoid race conditions
      if (wasAlreadyInitialized) {
        // Already initialized for this plan - keep current view, don't reset
        return;
      }

      // Mark as initialized BEFORE setting view to prevent race conditions
      setInitializedViewForPlanId(currentPlanId);

      // Apply initial view: saved starting view → auto-fit → default center
      const plans = useFloorMapStore.getState().plans;
      const currentPlan = plans.find(p => p.id === currentPlanId);
      const savedView = currentPlan?.viewSettings?.startingView;

      if (savedView) {
        setViewState({ panX: savedView.panX, panY: savedView.panY, zoom: savedView.zoom });
      } else {
        const fitView = calculateFitToContent(
          finalShapes,
          window.innerWidth,
          window.innerHeight - 70
        );
        if (fitView) {
          setViewState(fitView);
        } else {
          setViewState({ panX: 0, panY: 0, zoom: 1 });
        }
      }
    };

    loadShapes();
  }, [currentPlanId, currentProjectId, setShapes, initializedViewForPlanId, setInitializedViewForPlanId]);
  
  // Auto-save shapes to database when they change
  useEffect(() => {
    if (!currentPlanId) {
      // Auto-save skipped: No plan selected
      return;
    }
    
    // Debounce the save to avoid excessive database writes
    const saveTimer = setTimeout(async () => {
      // Auto-saving
      await saveShapesForPlan(currentPlanId, shapes);
    }, 2000); // Wait 2 seconds after last change before saving
    
    return () => clearTimeout(saveTimer);
  }, [shapes, currentPlanId]);
  
  // Save room to database and get roomId
  const saveRoomToDB = useCallback(async (roomShape: FloorMapShape) => {
    if (!currentProjectId) return null;
    
    try {
      const coords = roomShape.coordinates as any;
      const points = coords.points || [];
      
      // Calculate area (simple polygon area)
      let area = 0;
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
      }
      area = Math.abs(area / 2);
      const areaSqM = area / (getPixelsPerMeter(scaleSettings.pixelsPerMm) ** 2);
      
      // Calculate perimeter
      let perimeter = 0;
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        const dx = points[j].x - points[i].x;
        const dy = points[j].y - points[i].y;
        perimeter += Math.sqrt(dx * dx + dy * dy);
      }
      
      const { data, error } = await supabase
        .from("rooms")
        .insert({
          project_id: currentProjectId,
          name: roomShape.name || `Rum ${new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`,
          description: null,
          dimensions: {
            area_sqm: areaSqM,
            perimeter_mm: perimeter,
          },
          floor_plan_position: {
            points: points,
          },
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update the shape with the database room ID
      updateShape(roomShape.id, { roomId: data.id, name: data.name });
      
      toast.success("Rum sparat!");
      
      // Notify parent component to refresh room list
      if (onRoomCreated) {
        onRoomCreated();
      }
      
      return data.id;
    } catch (error: any) {
      console.error("Error saving room:", error);
      toast.error("Kunde inte spara rum");
      return null;
    }
  }, [currentProjectId, scaleSettings.pixelsPerMm, updateShape]);
  
  // Reset wall chaining when tool changes
  useEffect(() => {
    if (activeTool !== 'wall') {
      setLastWallEndPoint(null);
    }
  }, [activeTool]);
  
  // Refs to avoid stale closures in keyboard handlers
  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  const canUndoRef = useRef(canUndo);
  const canRedoRef = useRef(canRedo);
  const addShapeRef = useRef(addShape);
  const updateShapeRef = useRef(updateShape);
  const deleteShapeRef = useRef(deleteShape);
  const deleteShapesRef = useRef(deleteShapes);
  const setSelectedShapeIdRef = useRef(setSelectedShapeId);
  const setSelectedShapeIdsRef = useRef(setSelectedShapeIds);
  const selectedShapeIdRef = useRef(selectedShapeId);
  const selectedShapeIdsRef = useRef(selectedShapeIds);
  const currentShapesRef = useRef(currentShapes);
  const clipboardRef = useRef(clipboard);
  const currentPlanIdRef = useRef(currentPlanId);
  const setActiveToolRef = useRef(setActiveTool);
  // CAD numeric input refs (for keyboard handler access)
  const isDrawingRef = useRef(isDrawing);
  const currentDrawingPointsRef = useRef(currentDrawingPoints);
  const activeToolRef = useRef(activeTool);
  const numericInputRef = useRef(numericInput);
  const confirmWallWithLengthRef = useRef<((lengthMM: number) => void) | null>(null);
  
  // Update refs whenever values change
  useEffect(() => {
    undoRef.current = undo;
    redoRef.current = redo;
    canUndoRef.current = canUndo;
    canRedoRef.current = canRedo;
    addShapeRef.current = addShape;
    updateShapeRef.current = updateShape;
    deleteShapeRef.current = deleteShape;
    deleteShapesRef.current = deleteShapes;
    setSelectedShapeIdRef.current = setSelectedShapeId;
    setSelectedShapeIdsRef.current = setSelectedShapeIds;
    selectedShapeIdRef.current = selectedShapeId;
    selectedShapeIdsRef.current = selectedShapeIds;
    currentShapesRef.current = currentShapes;
    clipboardRef.current = clipboard;
    currentPlanIdRef.current = currentPlanId;
    setActiveToolRef.current = setActiveTool;
    // CAD numeric input refs
    isDrawingRef.current = isDrawing;
    currentDrawingPointsRef.current = currentDrawingPoints;
    activeToolRef.current = activeTool;
    numericInputRef.current = numericInput;
  }, [undo, redo, canUndo, canRedo, addShape, updateShape, deleteShape, deleteShapes, setSelectedShapeId, setSelectedShapeIds, selectedShapeId, selectedShapeIds, currentShapes, clipboard, currentPlanId, setActiveTool, isDrawing, currentDrawingPoints, activeTool, numericInput]);
  
  // Keyboard handlers for spacebar panning, delete, undo/redo
  useEffect(() => {
    // Detect OS for proper modifier key
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    // Keyboard handler registered
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if typing in input
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
      
      // Use Cmd on Mac, Ctrl on Windows - simplified logic
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      
      // Only check modifier + key combinations (not just modifiers alone)
      if (modKey && e.key !== 'Meta' && e.key !== 'Control' && e.key !== 'Shift' && e.key !== 'Alt') {
        // Keyboard shortcut detected
      }
      
      if (e.code === 'Space' && !e.repeat && !isTyping) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
      
      // Shift key - enable rotation snapping (45° increments)
      if (e.key === 'Shift' && !e.repeat && !isTyping) {
        setIsShiftPressed(true);
      }

      // CAD-style numeric input during wall drawing
      // Allows typing exact length in mm and pressing Enter to create wall
      // Uses refs to get current values (keyboard handler has [] deps)
      const isWallDrawingActive = isDrawingRef.current && activeToolRef.current === 'wall' && currentDrawingPointsRef.current.length > 0;

      if (isWallDrawingActive && !isTyping) {
        // Digit keys (0-9) - add to numeric input
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          setNumericInput(prev => prev + e.key);
          setShowNumericInput(true);
          return;
        }

        // Backspace - remove last digit from numeric input (not delete shape)
        if (e.key === 'Backspace' && numericInputRef.current.length > 0) {
          e.preventDefault();
          setNumericInput(prev => prev.slice(0, -1));
          if (numericInputRef.current.length === 1) {
            setShowNumericInput(false);
          }
          return;
        }

        // Enter - confirm wall with typed length
        if (e.key === 'Enter' && numericInputRef.current.length > 0) {
          e.preventDefault();
          if (confirmWallWithLengthRef.current) {
            confirmWallWithLengthRef.current(parseFloat(numericInputRef.current));
          }
          return;
        }
      }

      // Escape key - cancel operation and return to select tool
      if (e.key === 'Escape' && !isTyping) {
        e.preventDefault();

        // Clear CAD numeric input
        setNumericInput('');
        setShowNumericInput(false);

        // Cancel any active drawing operations
        setLastWallEndPoint(null);
        setIsDrawing(false);
        setCurrentDrawingPoints([]);

        // Clear ghost preview and pending library objects
        setGhostPreview(null);
        const { setPendingObjectId, setPendingLibrarySymbol } = useFloorMapStore.getState();
        setPendingObjectId(null);
        setPendingLibrarySymbol(null);

        // Return to select tool (basic pointer functionality)
        setActiveToolRef.current('select');

        toast.info('Återgick till markör-verktyget');
      }

      // Delete key (disabled in read-only mode)
      // Note: When drawing wall with numeric input, Backspace is handled above
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping && !isReadOnly && !isWallDrawingActive) {
        e.preventDefault();
        if (selectedShapeIdsRef.current.length > 0) {
          deleteShapesRef.current(selectedShapeIdsRef.current);
        } else if (selectedShapeIdRef.current) {
          deleteShapeRef.current(selectedShapeIdRef.current);
        }
      }
      
      // Undo: Cmd+Z (Mac) or Ctrl+Z (Windows) - without shift
      const isZKey = e.key.toLowerCase() === 'z' || e.code === 'KeyZ';
      
      if (isZKey && !isTyping) {
        // Z-key pressed
      }
      
      if (modKey && isZKey && !e.shiftKey && !isTyping) {
        e.preventDefault();
        if (canUndoRef.current()) {
          undoRef.current();
          toast.success('Ångrad');
        } else {
          toast.info('Inget att ångra');
        }
      }
      
      // Redo: Cmd+Shift+Z (Mac) or Ctrl+Y (Windows)
      if (!isTyping && modKey) {
        const isYKey = e.key.toLowerCase() === 'y' || e.code === 'KeyY';
        const isRedoKey = (isMac && e.shiftKey && isZKey) || (!isMac && isYKey);
        
        // Redo key detection handled below
        
        if (isRedoKey) {
          e.preventDefault();
          if (canRedoRef.current()) {
            redoRef.current();
            toast.success('Gjort om');
          } else {
            toast.info('Inget att göra om');
          }
        }
      }
      
      // Select All: Cmd+A (Mac) or Ctrl+A (Windows)
      if (modKey && e.key.toLowerCase() === 'a' && !isTyping) {
        e.preventDefault();
        const allIds = currentShapesRef.current.map(s => s.id);
        // setSelectedShapeIds already sets selectedShapeId to first item
        setSelectedShapeIdsRef.current(allIds);
        if (allIds.length > 0) {
          toast.success(`${allIds.length} objekt markerade`);
        }
      }
      
      // Copy: Cmd+C (Mac) or Ctrl+C (Windows)
      if (modKey && e.key.toLowerCase() === 'c' && !isTyping) {
        e.preventDefault();
        if (selectedShapeIdsRef.current.length > 0 || selectedShapeIdRef.current) {
          const shapesToCopy = selectedShapeIdsRef.current.length > 0 
            ? currentShapesRef.current.filter(s => selectedShapeIdsRef.current.includes(s.id))
            : selectedShapeIdRef.current 
              ? currentShapesRef.current.filter(s => s.id === selectedShapeIdRef.current)
              : [];
          
          if (shapesToCopy.length > 0) {
            setClipboard(shapesToCopy);
            toast.success(`${shapesToCopy.length} objekt kopierade`);
          }
        }
      }
      
      // Paste: Cmd+V (Mac) or Ctrl+V (Windows)
      if (modKey && e.key.toLowerCase() === 'v' && !isTyping) {
        e.preventDefault();
        if (clipboardRef.current.length > 0 && currentPlanIdRef.current) {
          // Paste with offset
          const PASTE_OFFSET = 20; // pixels
          const newShapes: FloorMapShape[] = clipboardRef.current.map(shape => {
            const newId = uuidv4();
            const newShape = { ...shape, id: newId, planId: currentPlanIdRef.current! };
            
            // Apply offset based on shape type
            if (shape.type === 'wall' || shape.type === 'line') {
              const coords = shape.coordinates as any;
              newShape.coordinates = {
                ...coords,
                x1: coords.x1 + PASTE_OFFSET,
                y1: coords.y1 + PASTE_OFFSET,
                x2: coords.x2 + PASTE_OFFSET,
                y2: coords.y2 + PASTE_OFFSET,
              };
            } else if (shape.type === 'room' || shape.type === 'freehand' || shape.type === 'polygon') {
              const coords = shape.coordinates as any;
              newShape.coordinates = {
                points: coords.points.map((p: {x: number, y: number}) => ({
                  x: p.x + PASTE_OFFSET,
                  y: p.y + PASTE_OFFSET
                }))
              };
            } else if (shape.type === 'rectangle' || shape.type === 'door' || shape.type === 'opening') {
              const coords = shape.coordinates as any;
              newShape.coordinates = {
                ...coords,
                left: (coords.left || coords.x || 0) + PASTE_OFFSET,
                top: (coords.top || coords.y || 0) + PASTE_OFFSET,
              };
            } else if (shape.type === 'circle') {
              const coords = shape.coordinates as any;
              newShape.coordinates = {
                ...coords,
                cx: (coords.cx || coords.x || 0) + PASTE_OFFSET,
                cy: (coords.cy || coords.y || 0) + PASTE_OFFSET,
              };
            } else if (shape.type === 'text') {
              const coords = shape.coordinates as any;
              newShape.coordinates = {
                ...coords,
                x: coords.x + PASTE_OFFSET,
                y: coords.y + PASTE_OFFSET,
              };
            } else if (shape.type === 'bezier') {
              const coords = shape.coordinates as any;
              newShape.coordinates = {
                start: { x: coords.start.x + PASTE_OFFSET, y: coords.start.y + PASTE_OFFSET },
                control: { x: coords.control.x + PASTE_OFFSET, y: coords.control.y + PASTE_OFFSET },
                end: { x: coords.end.x + PASTE_OFFSET, y: coords.end.y + PASTE_OFFSET },
              };
            } else if (shape.type === 'image') {
              const coords = shape.coordinates as any;
              newShape.coordinates = {
                ...coords,
                x: coords.x + PASTE_OFFSET,
                y: coords.y + PASTE_OFFSET,
              };
            }

            return newShape;
          });

          // Add all new shapes
          newShapes.forEach(shape => addShapeRef.current(shape));
          
          // Select the pasted shapes
          setSelectedShapeIdsRef.current(newShapes.map(s => s.id));
          toast.success(`${newShapes.length} objekt inklistrade`);
        }
      }
      
      // Duplicate: Cmd+D (Mac) or Ctrl+D (Windows)
      if (modKey && e.key.toLowerCase() === 'd' && !isTyping) {
        e.preventDefault();
        if ((selectedShapeIdsRef.current.length > 0 || selectedShapeIdRef.current) && currentPlanIdRef.current) {
          const shapesToDuplicate = selectedShapeIdsRef.current.length > 0 
            ? currentShapesRef.current.filter(s => selectedShapeIdsRef.current.includes(s.id))
            : selectedShapeIdRef.current 
              ? currentShapesRef.current.filter(s => s.id === selectedShapeIdRef.current)
              : [];
          
          if (shapesToDuplicate.length > 0) {
            const DUPLICATE_OFFSET = 20;
            const newShapes: FloorMapShape[] = shapesToDuplicate.map(shape => {
              const newId = uuidv4();
              const newShape = { ...shape, id: newId, planId: currentPlanIdRef.current! };
              
              // Apply offset (same logic as paste)
              if (shape.type === 'wall' || shape.type === 'line') {
                const coords = shape.coordinates as any;
                newShape.coordinates = {
                  ...coords,
                  x1: coords.x1 + DUPLICATE_OFFSET,
                  y1: coords.y1 + DUPLICATE_OFFSET,
                  x2: coords.x2 + DUPLICATE_OFFSET,
                  y2: coords.y2 + DUPLICATE_OFFSET,
                };
              } else if (shape.type === 'room' || shape.type === 'freehand' || shape.type === 'polygon') {
                const coords = shape.coordinates as any;
                newShape.coordinates = {
                  points: coords.points.map((p: {x: number, y: number}) => ({
                    x: p.x + DUPLICATE_OFFSET,
                    y: p.y + DUPLICATE_OFFSET
                  }))
                };
              } else if (shape.type === 'rectangle' || shape.type === 'door' || shape.type === 'opening') {
                const coords = shape.coordinates as any;
                newShape.coordinates = {
                  ...coords,
                  left: (coords.left || coords.x || 0) + DUPLICATE_OFFSET,
                  top: (coords.top || coords.y || 0) + DUPLICATE_OFFSET,
                };
              } else if (shape.type === 'circle') {
                const coords = shape.coordinates as any;
                newShape.coordinates = {
                  ...coords,
                  cx: (coords.cx || coords.x || 0) + DUPLICATE_OFFSET,
                  cy: (coords.cy || coords.y || 0) + DUPLICATE_OFFSET,
                };
              } else if (shape.type === 'text') {
                const coords = shape.coordinates as any;
                newShape.coordinates = {
                  ...coords,
                  x: coords.x + DUPLICATE_OFFSET,
                  y: coords.y + DUPLICATE_OFFSET,
                };
              } else if (shape.type === 'bezier') {
                const coords = shape.coordinates as any;
                newShape.coordinates = {
                  start: { x: coords.start.x + DUPLICATE_OFFSET, y: coords.start.y + DUPLICATE_OFFSET },
                  control: { x: coords.control.x + DUPLICATE_OFFSET, y: coords.control.y + DUPLICATE_OFFSET },
                  end: { x: coords.end.x + DUPLICATE_OFFSET, y: coords.end.y + DUPLICATE_OFFSET },
                };
              } else if (shape.type === 'image') {
                const coords = shape.coordinates as any;
                newShape.coordinates = {
                  ...coords,
                  x: coords.x + DUPLICATE_OFFSET,
                  y: coords.y + DUPLICATE_OFFSET,
                };
              }

              return newShape;
            });

            // Add all duplicated shapes
            newShapes.forEach(shape => addShapeRef.current(shape));
            
            // Select the duplicated shapes
            setSelectedShapeIdsRef.current(newShapes.map(s => s.id));
            toast.success(`${newShapes.length} objekt duplicerade`);
          }
        }
      }
      
      // Save: Cmd+S (Mac) or Ctrl+S (Windows)
      if (modKey && e.key.toLowerCase() === 's' && !isTyping) {
        e.preventDefault();
        // Save shortcut triggered
        if ((window as any).__canvasSave) {
          (window as any).__canvasSave();
        }
      }

      // ===== TOOL SHORTCUTS (single keys without modifiers) =====
      if (!modKey && !e.shiftKey && !isTyping) {
        const key = e.key.toLowerCase();

        // V - Select tool
        if (key === 'v') {
          e.preventDefault();
          setActiveToolRef.current('select');
        }
        // P - Freehand/Pen tool
        else if (key === 'p') {
          e.preventDefault();
          setActiveToolRef.current('freehand');
        }
        // C - Circle tool
        else if (key === 'c') {
          e.preventDefault();
          setActiveToolRef.current('circle');
        }
        // R - Rectangle tool
        else if (key === 'r') {
          e.preventDefault();
          setActiveToolRef.current('rectangle');
        }
        // B - Bezier curve tool
        else if (key === 'b') {
          e.preventDefault();
          setActiveToolRef.current('bezier');
        }
        // W - Wall tool
        else if (key === 'w') {
          e.preventDefault();
          setActiveToolRef.current('wall');
        }
        // T - Text tool
        else if (key === 't') {
          e.preventDefault();
          setActiveToolRef.current('text');
        }
        // E - Eraser tool
        else if (key === 'e') {
          e.preventDefault();
          setActiveToolRef.current('eraser');
        }
        // M - Measure/Ruler tool
        else if (key === 'm') {
          e.preventDefault();
          setActiveToolRef.current('measure');
        }
        // ] - Bring Forward
        else if (key === ']') {
          e.preventDefault();
          const store = useFloorMapStore.getState();
          if (store.selectedShapeIds.length > 0) {
            store.selectedShapeIds.forEach(id => store.bringForward(id));
            toast.success('Flyttat framåt');
          }
        }
        // [ - Send Backward
        else if (key === '[') {
          e.preventDefault();
          const store = useFloorMapStore.getState();
          if (store.selectedShapeIds.length > 0) {
            store.selectedShapeIds.forEach(id => store.sendBackward(id));
            toast.success('Flyttat bakåt');
          }
        }
      }

      // Cmd/Ctrl + ] - Bring to Front
      if (modKey && e.key === ']' && !isTyping) {
        e.preventDefault();
        const store = useFloorMapStore.getState();
        if (store.selectedShapeIds.length > 0) {
          store.selectedShapeIds.forEach(id => store.bringToFront(id));
          toast.success('Flyttat längst fram');
        }
      }

      // Cmd/Ctrl + [ - Send to Back
      if (modKey && e.key === '[' && !isTyping) {
        e.preventDefault();
        const store = useFloorMapStore.getState();
        if (store.selectedShapeIds.length > 0) {
          store.selectedShapeIds.forEach(id => store.sendToBack(id));
          toast.success('Flyttat längst bak');
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []); // Empty deps - all values via refs
  
  // Handle shape click - SIMPLIFIED double-click detection (like old canvas)
  const handleShapeClick = useCallback(async (shapeId: string, shapeType: string, evt?: KonvaEventObject<MouseEvent>) => {
    // Get fresh activeTool to avoid stale closures
    const { activeTool: currentTool } = useFloorMapStore.getState();

    // MEASURE TOOL - don't select shapes, let stage handler start measuring
    if (currentTool === 'measure') {
      // Don't cancel bubble - let the click pass through to stage for measuring
      return;
    }

    // ERASER TOOL - delete shape immediately (before any other logic)
    if (activeTool === 'eraser') {
      deleteShape(shapeId);
      toast.success('Objekt raderat');
      return; // Stop here, don't select or open panels
    }

    // OBJECT PLACEMENT MODE - don't select shapes, let stage handler place the object
    const { pendingObjectId, pendingLibrarySymbol } = useFloorMapStore.getState();
    if (pendingObjectId || pendingLibrarySymbol) {
      return; // Skip selection during placement mode
    }

    // SCISSORS TOOL - split wall/line at click point
    if (activeTool === 'scissors') {
      const shape = currentShapes.find(s => s.id === shapeId);
      if (!shape || (shape.type !== 'wall' && shape.type !== 'line')) {
        toast.error('Välj en vägg att klippa');
        return;
      }
      
      const stage = stageRef.current;
      if (!stage) return;
      
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      
      // Transform to world coordinates
      const clickPoint = {
        x: (pointer.x - viewState.panX) / viewState.zoom,
        y: (pointer.y - viewState.panY) / viewState.zoom,
      };
      
      const coords = shape.coordinates as any;
      
      // Calculate closest point on line to click
      const dx = coords.x2 - coords.x1;
      const dy = coords.y2 - coords.y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length < 10) {
        toast.error('Väggen är för kort för att klippas');
        return;
      }
      
      // Project click point onto line
      const t = Math.max(0.1, Math.min(0.9, 
        ((clickPoint.x - coords.x1) * dx + (clickPoint.y - coords.y1) * dy) / (length * length)
      ));
      
      let splitX = coords.x1 + dx * t;
      let splitY = coords.y1 + dy * t;
      
      // SNAP SPLIT POINT TO GRID (use user's grid interval setting)
      const currentSnapSize = getSnapSize(viewState.zoom, scaleSettings.pixelsPerMm, true, projectSettings.gridInterval);
      // Use projectSettings for snap control
      if (projectSettings.snapEnabled) {
        const snappedPoint = snapToGrid({ x: splitX, y: splitY }, currentSnapSize, true);
        splitX = snappedPoint.x;
        splitY = snappedPoint.y;
        
        // Verify split point is not too close to endpoints after snapping
        const distToStart = Math.sqrt(Math.pow(splitX - coords.x1, 2) + Math.pow(splitY - coords.y1, 2));
        const distToEnd = Math.sqrt(Math.pow(splitX - coords.x2, 2) + Math.pow(splitY - coords.y2, 2));
        const minDist = currentSnapSize; // At least one grid unit from each end
        
        if (distToStart < minDist || distToEnd < minDist) {
          toast.error('Klipp-punkten är för nära väggens ändar efter snap till grid');
          return;
        }
      }
      
      // Create two new walls
      const wall1: FloorMapShape = {
        ...shape,
        id: uuidv4(),
        coordinates: {
          x1: coords.x1,
          y1: coords.y1,
          x2: splitX,
          y2: splitY,
        }
      };
      
      const wall2: FloorMapShape = {
        ...shape,
        id: uuidv4(),
        coordinates: {
          x1: splitX,
          y1: splitY,
          x2: coords.x2,
          y2: coords.y2,
        }
      };
      
      // Delete original and add two new
      deleteShape(shapeId);
      addShape(wall1);
      addShape(wall2);
      
      toast.success('Vägg klippt i två delar');
      return;
    }
    
    // GLUE TOOL - merge two connected walls
    if (activeTool === 'glue') {
      const shape = currentShapes.find(s => s.id === shapeId);
      if (!shape || (shape.type !== 'wall' && shape.type !== 'line')) {
        toast.error('Välj en vägg att limma');
        return;
      }
      
      const coords1 = shape.coordinates as any;
      const tolerance = 10; // pixels
      
      // Find walls connected to this one
      const connectedWalls = currentShapes.filter(s => {
        if (s.id === shape.id || (s.type !== 'wall' && s.type !== 'line')) return false;
        
        const coords2 = s.coordinates as any;
        
        // Check if walls are aligned (same direction)
        const dx1 = coords1.x2 - coords1.x1;
        const dy1 = coords1.y2 - coords1.y1;
        const dx2 = coords2.x2 - coords2.x1;
        const dy2 = coords2.y2 - coords2.y1;
        
        const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        
        if (len1 === 0 || len2 === 0) return false;
        
        // Normalized vectors
        const ndx1 = dx1 / len1;
        const ndy1 = dy1 / len1;
        const ndx2 = dx2 / len2;
        const ndy2 = dy2 / len2;
        
        // Check if parallel (dot product close to 1 or -1)
        const dot = Math.abs(ndx1 * ndx2 + ndy1 * ndy2);
        if (dot < 0.95) return false; // Not aligned
        
        // Check if connected at endpoints
        const dist = (p1: {x: number, y: number}, p2: {x: number, y: number}) => 
          Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        
        return (
          dist({x: coords1.x2, y: coords1.y2}, {x: coords2.x1, y: coords2.y1}) < tolerance ||
          dist({x: coords1.x1, y: coords1.y1}, {x: coords2.x2, y: coords2.y2}) < tolerance
        );
      });
      
      if (connectedWalls.length === 0) {
        toast.error('Ingen vägg att limma ihop med (väggar måste vara parallella och anslutna)');
        return;
      }
      
      // Merge with first connected wall
      const wall2 = connectedWalls[0];
      const coords2 = wall2.coordinates as any;
      
      // Determine merged wall endpoints
      let newX1, newY1, newX2, newY2;
      
      const dist = (p1: {x: number, y: number}, p2: {x: number, y: number}) => 
        Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      
      if (dist({x: coords1.x2, y: coords1.y2}, {x: coords2.x1, y: coords2.y1}) < tolerance) {
        // wall1.end connects to wall2.start
        newX1 = coords1.x1;
        newY1 = coords1.y1;
        newX2 = coords2.x2;
        newY2 = coords2.y2;
      } else {
        // wall1.start connects to wall2.end
        newX1 = coords2.x1;
        newY1 = coords2.y1;
        newX2 = coords1.x2;
        newY2 = coords1.y2;
      }
      
      // Create merged wall
      const mergedWall: FloorMapShape = {
        ...shape,
        id: uuidv4(),
        coordinates: {
          x1: newX1,
          y1: newY1,
          x2: newX2,
          y2: newY2,
        }
      };
      
      // Delete both original walls and add merged
      deleteShape(shape.id);
      deleteShape(wall2.id);
      addShape(mergedWall);
      
      toast.success('Väggar limmade ihop');
      return;
    }
    
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    const currentlySelected = useFloorMapStore.getState().selectedShapeIds;

    // Double-click detection:
    // - For walls: count as double-click if clicking any wall in the selected group
    // - For other shapes: must be the same shape
    const isWallType = shapeType === 'wall' || shapeType === 'line';
    const isDoubleClickOnSameShape = timeSinceLastClick < 500 && lastClickedShapeIdRef.current === shapeId;
    const isDoubleClickOnSelectedWall = isWallType && timeSinceLastClick < 500 && currentlySelected.includes(shapeId);
    const isDoubleClick = isDoubleClickOnSameShape || isDoubleClickOnSelectedWall;

    if (isDoubleClick) {
      // DOUBLE-CLICK → Different behavior based on shape type

      const shape = currentShapes.find(s => s.id === shapeId);
      if (!shape) {
        lastClickTimeRef.current = 0;
        lastClickedShapeIdRef.current = null;
        return;
      }

      // Wall-specific 3-step logic: group → individual → property panel
      if (isWallType) {
        if (currentlySelected.length === 1 && currentlySelected[0] === shapeId) {
          // Step 3: Already individually selected → open PropertyPanel
          setSelectedShapeId(shapeId);
          setPropertyPanelShape(shape);
          setShowPropertyPanel(true);
          toast.success('Vägg markerad - Öppnar egenskapspanel');
          lastClickTimeRef.current = 0;
          lastClickedShapeIdRef.current = null;
        } else {
          // Step 2: Drill-in from group → select only this wall
          setSelectedShapeId(shapeId);
          setSelectedShapeIds([shapeId]);
          toast.success('Enskild vägg markerad');
          // Keep lastClick tracking alive for next double-click
          lastClickTimeRef.current = now;
          lastClickedShapeIdRef.current = shapeId;
        }
        return;
      }

      // Non-wall shapes: open detail panel directly
      setSelectedShapeId(shapeId);
      setSelectedShapeIds([shapeId]);

      if (shapeType === 'room' && shape.roomId) {
        setShowPropertyPanel(false);
        setPropertyPanelShape(null);
        setSelectedRoomForDetail(shape.roomId);
        setIsRoomDetailOpen(true);
        toast.success(t('floormap.openingRoomDetails', 'Opening room details'));
      } else {
        setPropertyPanelShape(shape);
        setShowPropertyPanel(true);
        toast.success(t('floormap.openingPropertyPanel', 'Opening property panel'));
      }

      lastClickTimeRef.current = 0;
      lastClickedShapeIdRef.current = null;
    } else {
      // SINGLE CLICK - Miro-style selection with modifier support

      // Check for modifier keys to enable multi-select
      const isMultiSelect = evt && (evt.evt.ctrlKey || evt.evt.metaKey || evt.evt.shiftKey);

      if (isMultiSelect) {
        // MODIFIER + CLICK: Toggle selection (add/remove from current selection)
        // For walls: include all connected walls in the toggle operation
        const idsToToggle = (shapeType === 'wall' || shapeType === 'line')
          ? getConnectedWalls(shapeId, currentShapes)
          : [shapeId];

        if (currentlySelected.includes(shapeId)) {
          // Remove from selection (remove all connected walls if it's a wall)
          const newIds = currentlySelected.filter(id => !idsToToggle.includes(id));
          setSelectedShapeIds(newIds);
          toast.success(`${idsToToggle.length > 1 ? idsToToggle.length + ' anslutna väggar borttagna' : 'Objekt borttaget'} från markering`);
        } else {
          // Add to selection (add all connected walls if it's a wall)
          const newIds = [...new Set([...currentlySelected, ...idsToToggle])];
          setSelectedShapeIds(newIds);
          toast.success(`${newIds.length} objekt markerade`);
        }
      } else {
        // REGULAR CLICK: Replace selection
        // Check if shape belongs to a group (template object)
        const clickedShape = currentShapes.find(s => s.id === shapeId);
        const groupId = clickedShape?.groupId;

        if (groupId) {
          // GROUPED SHAPE: Select all shapes in the group
          const groupShapeIds = currentShapes
            .filter(s => s.groupId === groupId)
            .map(s => s.id);
          setSelectedShapeIds(groupShapeIds);
          const groupLeader = currentShapes.find(s => s.groupId === groupId && s.isGroupLeader);
          const groupName = groupLeader?.templateInfo?.templateName || 'Grupp';
          toast.success(`${groupName} markerat (${groupShapeIds.length} former)`);
        } else if (shapeType === 'wall' || shapeType === 'line') {
          // For walls: check if this wall is already individually selected
          const isAlreadyIndividuallySelected = currentlySelected.length === 1 && currentlySelected[0] === shapeId;

          if (isAlreadyIndividuallySelected) {
            // Keep individual selection - don't re-select connected walls
            // This allows double-click to work for opening property panel
          } else {
            // Auto-select all connected walls (sharing endpoints)
            const connectedWallIds = getConnectedWalls(shapeId, currentShapes);
            setSelectedShapeIds(connectedWallIds);
            if (connectedWallIds.length > 1) {
              toast.success(`${connectedWallIds.length} anslutna väggar markerade`);
            } else {
              toast.success(`Enskild vägg markerad`);
            }
          }
        } else {
          // Non-wall shapes: select just the one clicked
          setSelectedShapeIds([shapeId]);
          const shapeWord = shapeType === 'room' ? 'rum' : 'objekt';
          toast.success(`Enskilt ${shapeWord} markerat`);
        }
      }

      setSelectedWallUnit(null);
      setWallSelectionMode('unit');

      lastClickTimeRef.current = now;
      lastClickedShapeIdRef.current = shapeId;
    }
  }, [activeTool, deleteShape, addShape, viewState, gridSettings, scaleSettings, currentShapes, saveRoomToDB, setSelectedShapeId, setSelectedShapeIds, selectedShapeIds, setSelectedRoomForDetail, setIsRoomDetailOpen, setPropertyPanelShape, setShowPropertyPanel]);
  
  // Helper function to constrain pan within canvas bounds
  const constrainPan = useCallback((panX: number, panY: number, zoom: number): { panX: number; panY: number } => {
    const canvasWidthPx = projectSettings.canvasWidthMeters * 1000 * scaleSettings.pixelsPerMm;
    const canvasHeightPx = projectSettings.canvasHeightMeters * 1000 * scaleSettings.pixelsPerMm;
    
    const stageWidth = window.innerWidth;
    const stageHeight = window.innerHeight;
    
    const scaledCanvasWidth = canvasWidthPx * zoom;
    const scaledCanvasHeight = canvasHeightPx * zoom;
    
    // Calculate bounds - canvas edges should not come inside viewport
    const minPanX = stageWidth - scaledCanvasWidth;
    const maxPanX = 0;
    const minPanY = stageHeight - scaledCanvasHeight;
    const maxPanY = 0;
    
    // If canvas is smaller than viewport, center it
    const constrainedPanX = scaledCanvasWidth < stageWidth 
      ? (stageWidth - scaledCanvasWidth) / 2 
      : Math.max(minPanX, Math.min(maxPanX, panX));
    
    const constrainedPanY = scaledCanvasHeight < stageHeight 
      ? (stageHeight - scaledCanvasHeight) / 2 
      : Math.max(minPanY, Math.min(maxPanY, panY));
    
    return { panX: constrainedPanX, panY: constrainedPanY };
  }, [projectSettings.canvasWidthMeters, projectSettings.canvasHeightMeters, scaleSettings.pixelsPerMm]);
  
  // Apply constraints to initial viewport once constrainPan is ready
  useEffect(() => {
    if (viewState.zoom === 1 && viewState.panX === 0 && viewState.panY === 0) {
      const constrained = constrainPan(0, 0, 1);
      if (constrained.panX !== 0 || constrained.panY !== 0) {
        setViewState({ ...constrained, zoom: 1 });
      }
    }
  }, [constrainPan, viewState, setViewState]);
  
  // Handle mouse wheel - zoom with Ctrl/Cmd, pan with two-finger scroll
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault(); // Prevent default scroll behavior
    
    const stage = stageRef.current;
    if (!stage) return;
    
    // Zoom with Ctrl/Cmd + scroll
    if (e.evt.ctrlKey || e.evt.metaKey) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      
      const zoomFactor = e.evt.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewState.zoom * zoomFactor));
      
      const mousePointTo = {
        x: (pointer.x - viewState.panX) / viewState.zoom,
        y: (pointer.y - viewState.panY) / viewState.zoom,
      };
      
      const unconstrained = {
        panX: pointer.x - mousePointTo.x * newZoom,
        panY: pointer.y - mousePointTo.y * newZoom,
      };
      
      // Constrain pan to canvas bounds
      const constrained = constrainPan(unconstrained.panX, unconstrained.panY, newZoom);
      
      setViewState({
        zoom: newZoom,
        ...constrained,
      });
    } else {
      // Two-finger scroll (panning) - smooth and responsive in all directions
      const scrollSpeed = 1.2;
      
      const unconstrained = {
        panX: viewState.panX - e.evt.deltaX * scrollSpeed,
        panY: viewState.panY - e.evt.deltaY * scrollSpeed,
      };
      
      // Constrain pan to canvas bounds
      const constrained = constrainPan(unconstrained.panX, unconstrained.panY, viewState.zoom);
      
      setViewState({
        ...constrained,
      });
    }
  }, [viewState, setViewState, constrainPan]);
  
  // Helper function to calculate distance between two touch points
  const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  // Helper function to get center point between two touches
  const getTouchCenter = (touch1: Touch, touch2: Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };
  
  // Handle touch start (for pinch zoom and single-finger pan)
  const handleTouchStart = useCallback((e: KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;

    // Two-finger touch = prepare for pinch zoom
    if (touches.length === 2) {
      e.evt.preventDefault(); // Prevent browser zoom
      touchPanStartRef.current = null; // Cancel single-finger pan

      const distance = getTouchDistance(touches[0], touches[1]);
      const center = getTouchCenter(touches[0], touches[1]);

      setLastTouchDistance(distance);
      setLastTouchCenter(center);
    }

    // Single-finger touch on empty canvas = pan
    if (touches.length === 1) {
      const target = e.target;
      const isEmptyCanvas = target === target.getStage();
      const { activeTool } = useFloorMapStore.getState();

      if (isEmptyCanvas && activeTool === 'select') {
        const { panX, panY } = useFloorMapStore.getState().viewState;
        touchPanStartRef.current = {
          x: touches[0].clientX,
          y: touches[0].clientY,
          panX,
          panY,
        };
      }
    }
  }, []);
  
  // Handle touch move (pinch zoom and single-finger pan)
  const handleTouchMove = useCallback((e: KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    const stage = stageRef.current;
    if (!stage) return;

    // Single-finger pan
    if (touches.length === 1 && touchPanStartRef.current) {
      e.evt.preventDefault();
      const dx = touches[0].clientX - touchPanStartRef.current.x;
      const dy = touches[0].clientY - touchPanStartRef.current.y;
      const newPanX = touchPanStartRef.current.panX + dx;
      const newPanY = touchPanStartRef.current.panY + dy;
      const constrained = constrainPan(newPanX, newPanY, viewState.zoom);
      setViewState(constrained);
      return;
    }

    // Two-finger pinch zoom
    if (touches.length === 2 && lastTouchDistance && lastTouchCenter) {
      e.evt.preventDefault(); // Prevent browser zoom
      
      const currentDistance = getTouchDistance(touches[0], touches[1]);
      const currentCenter = getTouchCenter(touches[0], touches[1]);
      
      // Calculate zoom change based on distance change
      const scale = currentDistance / lastTouchDistance;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewState.zoom * scale));
      
      // Zoom towards the pinch center point
      const mousePointTo = {
        x: (lastTouchCenter.x - viewState.panX) / viewState.zoom,
        y: (lastTouchCenter.y - viewState.panY) / viewState.zoom,
      };
      
      const unconstrained = {
        panX: lastTouchCenter.x - mousePointTo.x * newZoom,
        panY: lastTouchCenter.y - mousePointTo.y * newZoom,
      };
      
      // Constrain pan to canvas bounds
      const constrained = constrainPan(unconstrained.panX, unconstrained.panY, newZoom);
      
      setViewState({
        zoom: newZoom,
        ...constrained,
      });
      
      // Update for next frame
      setLastTouchDistance(currentDistance);
      setLastTouchCenter(currentCenter);
    }
  }, [viewState, lastTouchDistance, lastTouchCenter, setViewState, constrainPan]);
  
  // Handle touch end (cleanup)
  const handleTouchEnd = useCallback((e: KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;

    // Reset single-finger pan
    if (touches.length === 0) {
      touchPanStartRef.current = null;
    }

    // Reset pinch zoom state when fingers are lifted
    if (touches.length < 2) {
      setLastTouchDistance(null);
      setLastTouchCenter(null);
    }
  }, []);
  
  // Handle mouse down
  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Get fresh state to avoid stale closures
    const { activeTool: currentTool, viewState: currentViewState } = useFloorMapStore.getState();

    // Transform to canvas coordinates
    let pos = {
      x: (pointer.x - currentViewState.panX) / currentViewState.zoom,
      y: (pointer.y - currentViewState.panY) / currentViewState.zoom,
    };

    // MEASURE TOOL - Always handle first, regardless of what's under cursor
    if (currentTool === 'measure') {
      e.cancelBubble = true;
      setIsMeasuring(true);
      setMeasureStart(pos);
      setMeasureEnd(pos);
      return;
    }

    // CRITICAL: If clicking on a shape, let the shape handle it - don't interfere
    const target = e.target;
    const isShape = target !== target.getStage() && (target as any).attrs?.shapeId;
    if (isShape) {
      // Shape will handle its own events - don't interfere
      return;
    }

    // Check for template creation from toolbar
    const templateType = (window as any).__createTemplate;
    if (templateType && currentPlanId) {
      const pixelsPerMeter = getPixelsPerMeter(scaleSettings.pixelsPerMm);
      const adminDefaults = getAdminDefaults();
      
      if (templateType === 'square2x2') {
        // Create 2x2 meter square with WALLS
        const size = 2 * pixelsPerMeter; // 2 meters in pixels
        const halfSize = size / 2;
        
        // Create 4 walls forming a square centered at click position
        const walls = [
          // Top wall
          {
            id: uuidv4(),
            planId: currentPlanId,
            type: 'wall' as const,
            coordinates: {
              x1: pos.x - halfSize,
              y1: pos.y - halfSize,
              x2: pos.x + halfSize,
              y2: pos.y - halfSize,
            },
            strokeColor: '#2d3748',
            thicknessMM: adminDefaults.wallThicknessMM,
            heightMM: adminDefaults.wallHeightMM,
          },
          // Right wall
          {
            id: uuidv4(),
            planId: currentPlanId,
            type: 'wall' as const,
            coordinates: {
              x1: pos.x + halfSize,
              y1: pos.y - halfSize,
              x2: pos.x + halfSize,
              y2: pos.y + halfSize,
            },
            strokeColor: '#2d3748',
            thicknessMM: adminDefaults.wallThicknessMM,
            heightMM: adminDefaults.wallHeightMM,
          },
          // Bottom wall
          {
            id: uuidv4(),
            planId: currentPlanId,
            type: 'wall' as const,
            coordinates: {
              x1: pos.x + halfSize,
              y1: pos.y + halfSize,
              x2: pos.x - halfSize,
              y2: pos.y + halfSize,
            },
            strokeColor: '#2d3748',
            thicknessMM: adminDefaults.wallThicknessMM,
            heightMM: adminDefaults.wallHeightMM,
          },
          // Left wall
          {
            id: uuidv4(),
            planId: currentPlanId,
            type: 'wall' as const,
            coordinates: {
              x1: pos.x - halfSize,
              y1: pos.y + halfSize,
              x2: pos.x - halfSize,
              y2: pos.y - halfSize,
            },
            strokeColor: '#2d3748',
            thicknessMM: adminDefaults.wallThicknessMM,
            heightMM: adminDefaults.wallHeightMM,
          },
        ];

        walls.forEach(wall => addShape(wall));
        toast.success('Fyrkant 2x2m skapad (4 väggar)');
      } else if (templateType === 'circle2m') {
        // Create circle with WALLS (8-sided approximation)
        const radius = 1 * pixelsPerMeter; // 1 meter radius = 2m diameter
        const segments = 8; // 8 walls for smooth circle
        
        const walls = [];
        for (let i = 0; i < segments; i++) {
          const angle1 = (i / segments) * Math.PI * 2;
          const angle2 = ((i + 1) / segments) * Math.PI * 2;
          
          const x1 = pos.x + Math.cos(angle1) * radius;
          const y1 = pos.y + Math.sin(angle1) * radius;
          const x2 = pos.x + Math.cos(angle2) * radius;
          const y2 = pos.y + Math.sin(angle2) * radius;
          
          walls.push({
            id: uuidv4(),
            planId: currentPlanId,
            type: 'wall' as const,
            coordinates: { x1, y1, x2, y2 },
            strokeColor: '#2d3748',
            thicknessMM: adminDefaults.wallThicknessMM,
            heightMM: adminDefaults.wallHeightMM,
          });
        }
        
        walls.forEach(wall => addShape(wall));
        toast.success('Cirkel ⌀2m skapad (8 väggar)');
      } else if (templateType === 'triangle') {
        // Create equilateral triangle with WALLS
        const sideLength = 2 * pixelsPerMeter;
        const height = (Math.sqrt(3) / 2) * sideLength;
        
        // Triangle points centered at click position
        const p1 = { x: pos.x, y: pos.y - height / 2 }; // Top
        const p2 = { x: pos.x - sideLength / 2, y: pos.y + height / 2 }; // Bottom left
        const p3 = { x: pos.x + sideLength / 2, y: pos.y + height / 2 }; // Bottom right
        
        const walls = [
          // Top to bottom-left
          {
            id: uuidv4(),
            planId: currentPlanId,
            type: 'wall' as const,
            coordinates: {
              x1: p1.x,
              y1: p1.y,
              x2: p2.x,
              y2: p2.y,
            },
            strokeColor: '#2d3748',
            thicknessMM: adminDefaults.wallThicknessMM,
            heightMM: adminDefaults.wallHeightMM,
          },
          // Bottom-left to bottom-right
          {
            id: uuidv4(),
            planId: currentPlanId,
            type: 'wall' as const,
            coordinates: {
              x1: p2.x,
              y1: p2.y,
              x2: p3.x,
              y2: p3.y,
            },
            strokeColor: '#2d3748',
            thicknessMM: adminDefaults.wallThicknessMM,
            heightMM: adminDefaults.wallHeightMM,
          },
          // Bottom-right to top
          {
            id: uuidv4(),
            planId: currentPlanId,
            type: 'wall' as const,
            coordinates: {
              x1: p3.x,
              y1: p3.y,
              x2: p1.x,
              y2: p1.y,
            },
            strokeColor: '#2d3748',
            thicknessMM: adminDefaults.wallThicknessMM,
            heightMM: adminDefaults.wallHeightMM,
          },
        ];
        
        walls.forEach(wall => addShape(wall));
        toast.success('Triangel skapad (3 väggar)');
      }
      
      // Clear template flag
      delete (window as any).__createTemplate;
      return;
    }

    // Check for template editor open request
    if ((window as any).__openTemplateEditor && currentProjectId) {
      delete (window as any).__openTemplateEditor;
      
      // Get template plan ID and switch to it
      getTemplatePlanId(currentProjectId).then(templatePlanId => {
        if (templatePlanId) {
          setCurrentPlanId(templatePlanId);
          toast.success('📐 Template-editor öppnad - Redigera dina objekt här!', {
            description: 'Byt tillbaka till din ritning när du är klar',
            duration: 5000,
          });
        } else {
          toast.error('Kunde inte öppna template-editor');
        }
      }).catch(() => {
        toast.error('Kunde inte öppna template-editor');
      });
      return;
    }

    // Check for door object creation from toolbar
    const doorObjectType = (window as any).__createDoorObject;
    const useTemplateSystem = (window as any).__useTemplateSystem;
    
    if (doorObjectType && currentPlanId && currentProjectId) {
      const pixelsPerMeter = getPixelsPerMeter(scaleSettings.pixelsPerMm);
      
      // Handle window (väggöppning) - this activates opening tool
      if (doorObjectType === 'window') {
        // Opening tool is already activated, no need to create object here
        delete (window as any).__createDoorObject;
        delete (window as any).__useTemplateSystem;
        return;
      }
      
      // SIMPLIFIED SYSTEM - Direct object creation with hardcoded geometry
      // No templates needed - objects are directly created as freehand shapes
      
      // Helper to create architectural objects
      const createArchObject = (
        type: string,
        points: { x: number; y: number }[],
        name: string
      ): FloorMapShape => ({
        id: uuidv4(),
        type: 'freehand',
        planId: currentPlanId,
        coordinates: { points },
        strokeColor: '#000000',
        color: '#000000',
        strokeWidth: 2,
        name,
      });
      
      let newShape: FloorMapShape | null = null;
      const scale = 100; // 100 pixels = 1 meter at 1:100
      
      // LINJER - Simple architectural lines
      if (doorObjectType === 'inner_wall') {
        newShape = createArchObject('inner_wall', [
          { x: pos.x - 50, y: pos.y },
          { x: pos.x + 50, y: pos.y }
        ], 'Innervägg');
      } else if (doorObjectType === 'outer_wall') {
        // Double line for outer wall
        addShape(createArchObject('outer_wall_1', [
          { x: pos.x - 50, y: pos.y - 3 },
          { x: pos.x + 50, y: pos.y - 3 }
        ], 'Yttervägg'));
        newShape = createArchObject('outer_wall_2', [
          { x: pos.x - 50, y: pos.y + 3 },
          { x: pos.x + 50, y: pos.y + 3 }
        ], 'Yttervägg');
      } else if (doorObjectType === 'arch_window') {
        newShape = createArchObject('window', [
          { x: pos.x - 40, y: pos.y - 10 },
          { x: pos.x + 40, y: pos.y - 10 },
          { x: pos.x + 40, y: pos.y + 10 },
          { x: pos.x - 40, y: pos.y + 10 },
          { x: pos.x - 40, y: pos.y - 10 }
        ], 'Fönster');
      } else if (doorObjectType === 'door_outward') {
        // Door with swing arc
        const arcPoints = [];
        for (let i = 0; i <= 20; i++) {
          const angle = (i / 20) * (Math.PI / 2);
          arcPoints.push({
            x: pos.x + Math.cos(angle) * 60,
            y: pos.y - Math.sin(angle) * 60
          });
        }
        newShape = createArchObject('door', arcPoints, 'Dörr');
      } else if (doorObjectType === 'sliding_door') {
        newShape = createArchObject('sliding_door', [
          { x: pos.x - 30, y: pos.y - 40 },
          { x: pos.x + 30, y: pos.y - 40 },
          { x: pos.x + 30, y: pos.y + 40 },
          { x: pos.x - 30, y: pos.y + 40 },
          { x: pos.x - 30, y: pos.y - 40 }
        ], 'Skjutdörr');
      } else if (doorObjectType === 'wall_opening') {
        newShape = createArchObject('opening', [
          { x: pos.x - 50, y: pos.y },
          { x: pos.x + 50, y: pos.y }
        ], 'Öppning');
      } else if (doorObjectType === 'half_stairs') {
        newShape = createArchObject('half_stairs', [
          { x: pos.x, y: pos.y },
          { x: pos.x, y: pos.y - 25 },
          { x: pos.x + 25, y: pos.y - 25 },
          { x: pos.x + 25, y: pos.y - 50 },
          { x: pos.x + 50, y: pos.y - 50 },
          { x: pos.x + 50, y: pos.y },
          { x: pos.x, y: pos.y }
        ], 'Halvtrappa');
      }
      
      // OBJEKT - Architectural objects
      else if (doorObjectType === 'spiral_stairs') {
        const points = [];
        for (let i = 0; i <= 32; i++) {
          const angle = (i / 32) * Math.PI * 2;
          points.push({
            x: pos.x + Math.cos(angle) * 50,
            y: pos.y + Math.sin(angle) * 50
          });
        }
        newShape = createArchObject('spiral_stairs', points, 'Spiraltrappa');
      } else if (doorObjectType === 'straight_stairs') {
        newShape = createArchObject('straight_stairs', [
          { x: pos.x - 40, y: pos.y - 60 },
          { x: pos.x + 40, y: pos.y - 60 },
          { x: pos.x + 40, y: pos.y + 60 },
          { x: pos.x - 40, y: pos.y + 60 },
          { x: pos.x - 40, y: pos.y - 60 }
        ], 'Trappa');
      } else if (doorObjectType === 'arch_bathtub') {
        newShape = createArchObject('bathtub', [
          { x: pos.x - 30, y: pos.y - 70 },
          { x: pos.x - 30, y: pos.y + 50 },
          { x: pos.x - 20, y: pos.y + 60 },
          { x: pos.x + 20, y: pos.y + 60 },
          { x: pos.x + 30, y: pos.y + 50 },
          { x: pos.x + 30, y: pos.y - 70 },
          { x: pos.x - 30, y: pos.y - 70 }
        ], 'Badkar');
      } else if (doorObjectType === 'arch_toilet') {
        const points = [];
        for (let i = 0; i <= 24; i++) {
          const angle = (i / 24) * Math.PI * 2;
          points.push({
            x: pos.x + Math.cos(angle) * 20,
            y: pos.y + Math.sin(angle) * 25
          });
        }
        newShape = createArchObject('toilet', points, 'Toalett');
      } else if (doorObjectType === 'arch_sink') {
        newShape = createArchObject('sink', [
          { x: pos.x - 25, y: pos.y - 20 },
          { x: pos.x + 25, y: pos.y - 20 },
          { x: pos.x + 25, y: pos.y + 20 },
          { x: pos.x - 25, y: pos.y + 20 },
          { x: pos.x - 25, y: pos.y - 20 }
        ], 'Handfat');
      } else if (doorObjectType === 'arch_stove') {
        newShape = createArchObject('stove', [
          { x: pos.x - 30, y: pos.y - 30 },
          { x: pos.x + 30, y: pos.y - 30 },
          { x: pos.x + 30, y: pos.y + 30 },
          { x: pos.x - 30, y: pos.y + 30 },
          { x: pos.x - 30, y: pos.y - 30 }
        ], 'Spis');
      } else if (doorObjectType === 'arch_outlet') {
        const points = [];
        for (let i = 0; i <= 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          points.push({
            x: pos.x + Math.cos(angle) * 12,
            y: pos.y + Math.sin(angle) * 12
          });
        }
        newShape = createArchObject('outlet', points, 'Eluttag');
      } else if (doorObjectType === 'arch_switch') {
        newShape = createArchObject('switch', [
          { x: pos.x - 10, y: pos.y - 10 },
          { x: pos.x + 10, y: pos.y - 10 },
          { x: pos.x + 10, y: pos.y + 10 },
          { x: pos.x - 10, y: pos.y + 10 },
          { x: pos.x - 10, y: pos.y - 10 }
        ], 'Lampknapp');
      } else if (doorObjectType === 'arch_mirror') {
        newShape = createArchObject('mirror', [
          { x: pos.x - 30, y: pos.y - 40 },
          { x: pos.x + 30, y: pos.y - 40 },
          { x: pos.x + 30, y: pos.y + 40 },
          { x: pos.x - 30, y: pos.y + 40 },
          { x: pos.x - 30, y: pos.y - 40 }
        ], 'Spegel');
      }
      
      // Add the shape
      if (newShape) {
        addShape(newShape);
        toast.success(`✨ ${newShape.name} placerad`);
      }
      
      delete (window as any).__createDoorObject;
      delete (window as any).__useTemplateSystem;
      return;
    }
    
    // ============================================================================
    // LIBRARY SYMBOL PLACEMENT - NEW Professional Architectural Objects
    // ============================================================================
    if (pendingLibrarySymbol && currentPlanId) {
      const symbolMetadata = SYMBOL_METADATA.find(s => s.type === pendingLibrarySymbol);

      if (symbolMetadata) {
        // Use ghost preview rotation (auto-calculated from nearest wall) or default to 0
        const placementRotation = ghostPreview?.rotation ?? 0;

        // Create a freehand shape that will render the library symbol
        // We store the symbol type in metadata so it can be rendered correctly
        const newShape: FloorMapShape = {
          id: uuidv4(),
          type: 'freehand',
          planId: currentPlanId,
          coordinates: {
            points: [
              // Placeholder points - the actual rendering is done by the symbol component
              { x: pos.x, y: pos.y },
              { x: pos.x + 1, y: pos.y + 1 }, // Minimal bounding box
            ]
          },
          strokeColor: '#000000',
          color: 'transparent',
          strokeWidth: 2,
          name: symbolMetadata.name,
          metadata: {
            isLibrarySymbol: true,
            symbolType: pendingLibrarySymbol,
            placementX: pos.x,
            placementY: pos.y,
            scale: 1, // Default scale - user can transform after placement
            rotation: placementRotation, // Auto-rotated towards nearest wall
          }
        };

        addShape(newShape);
        toast.success(`✨ ${symbolMetadata.name} placed`);

        // Clear the pending symbol and ghost preview
        setPendingLibrarySymbol(null);
        setGhostPreview(null);
      }

      return;
    }
    
    // ============================================================================
    // OBJECT LIBRARY PLACEMENT - JSON-based Architectural Objects
    // ============================================================================
    if (pendingObjectId && currentPlanId) {
      // First check for unified objects (new SVG-based library)
      const unifiedDef = getUnifiedObjectById(pendingObjectId);

      if (unifiedDef) {
        // Use ghost preview rotation (auto-calculated from nearest wall) or default to 0
        const placementRotation = ghostPreview?.rotation ?? 0;

        // Get default elevation values from unified object definition
        const defaultElevation = unifiedDef.wallBehavior.defaultElevationMM;

        // Calculate z-index for the new object (place on top of rooms)
        const maxZIndex = Math.max(
          ...shapes
            .filter(s => s.planId === currentPlanId && s.type !== 'room')
            .map(s => s.zIndex ?? 0),
          99
        );
        const newZIndex = maxZIndex + 1;

        // Create a shape that will render the unified object
        const newShape: FloorMapShape = {
          id: uuidv4(),
          type: 'freehand',
          planId: currentPlanId,
          coordinates: {
            points: [
              { x: pos.x, y: pos.y },
              { x: pos.x + 1, y: pos.y + 1 },
            ]
          },
          strokeColor: '#374151',
          color: 'transparent',
          strokeWidth: 2,
          name: unifiedDef.name,
          objectCategory: unifiedDef.category,
          zIndex: newZIndex,
          metadata: {
            isUnifiedObject: true,
            unifiedObjectId: pendingObjectId,
            placementX: pos.x,
            placementY: pos.y,
            scale: 1,
            rotation: placementRotation,
            elevationHeight: unifiedDef.dimensions.height,
            elevationBottom: defaultElevation,
            depth: unifiedDef.dimensions.depth,
          }
        };

        // If object should attach to walls
        if (unifiedDef.wallBehavior.attachesToWall) {
          const walls = shapes.filter(
            s => s.planId === currentPlanId &&
                 (s.type === 'wall' || s.type === 'line') &&
                 s.shapeViewMode !== 'elevation'
          );

          if (walls.length > 0) {
            const tempShape: FloorMapShape = {
              ...newShape,
              coordinates: {
                x: pos.x,
                y: pos.y,
                width: unifiedDef.dimensions.width * scaleSettings.pixelsPerMm,
                height: unifiedDef.dimensions.depth * scaleSettings.pixelsPerMm,
              }
            };

            const wallSnap = snapObjectToWall(tempShape, walls, 500);

            if (wallSnap) {
              newShape.wallRelative = {
                ...wallSnap.wallRelative!,
                height: unifiedDef.dimensions.height,
                elevationBottom: defaultElevation,
                depth: unifiedDef.dimensions.depth,
              };
              newShape.rotation = wallSnap.rotation;
              if (wallSnap.coordinates && 'x' in wallSnap.coordinates) {
                const snappedCoords = wallSnap.coordinates as { x: number; y: number };
                newShape.metadata!.placementX = snappedCoords.x;
                newShape.metadata!.placementY = snappedCoords.y;
              }
            }
          }
        }

        addShape(newShape);
        toast.success(`${unifiedDef.name} placed${newShape.wallRelative ? ' (wall attached)' : ''}`);

        setPendingObjectId(null);
        setGhostPreview(null);
        return;
      }

      // Fall back to legacy object library
      const objectDef = getObjectById(pendingObjectId);

      if (objectDef) {
        // Use ghost preview rotation (auto-calculated from nearest wall) or default to 0
        const placementRotation = ghostPreview?.rotation ?? 0;

        // Determine if this object should attach to walls
        const shouldSnap = shouldAttachToWall(
          objectDef.category,
          objectDef.wallMountable,
          objectDef.freestanding
        );

        // Get object category for elevation positioning
        const objectCategory = mapLibraryCategoryToWallCategory(
          objectDef.category,
          objectDef.objectCategory
        );

        // Get default elevation values for this category
        const categoryDefaults = getDefaultsForCategory(objectCategory);

        // Calculate z-index for the new object (place on top of rooms)
        // Rooms typically have zIndex around -100 to 0, so objects start at 100+
        const maxZIndex = Math.max(
          ...shapes
            .filter(s => s.planId === currentPlanId && s.type !== 'room')
            .map(s => s.zIndex ?? 0),
          99 // Minimum base for objects
        );
        const newZIndex = maxZIndex + 1;

        // Create a freehand shape that will render the object library object
        // We store the object ID in metadata so it can be rendered with ObjectRenderer
        const newShape: FloorMapShape = {
          id: uuidv4(),
          type: 'freehand',
          planId: currentPlanId,
          coordinates: {
            points: [
              // Placeholder points - the actual rendering is done by ObjectRenderer
              { x: pos.x, y: pos.y },
              { x: pos.x + 1, y: pos.y + 1 }, // Minimal bounding box
            ]
          },
          strokeColor: '#000000',
          color: 'transparent',
          strokeWidth: 2,
          name: objectDef.name,
          objectCategory: objectCategory,
          zIndex: newZIndex, // Objects always render above rooms
          metadata: {
            isObjectLibrary: true,
            objectId: pendingObjectId,
            placementX: pos.x,
            placementY: pos.y,
            scale: 1, // Default scale - user can transform after placement
            rotation: placementRotation, // Auto-rotated towards nearest wall
            // Store 3D properties from object definition for elevation view
            elevationHeight: objectDef.elevationHeight ?? objectDef.defaultHeight,
            elevationBottom: objectDef.elevationBottom ?? categoryDefaults.elevationBottom,
            depth: objectDef.depth ?? objectDef.defaultHeight,
          }
        };

        // If object should attach to walls, try to snap to nearest wall
        if (shouldSnap) {
          const walls = shapes.filter(
            s => s.planId === currentPlanId &&
                 (s.type === 'wall' || s.type === 'line') &&
                 s.shapeViewMode !== 'elevation'
          );

          if (walls.length > 0) {
            // Create a temporary shape with SymbolCoordinates for snapObjectToWall
            const tempShape: FloorMapShape = {
              ...newShape,
              coordinates: {
                x: pos.x,
                y: pos.y,
                width: objectDef.defaultWidth * scaleSettings.pixelsPerMm,
                height: objectDef.defaultHeight * scaleSettings.pixelsPerMm,
              }
            };

            const wallSnap = snapObjectToWall(tempShape, walls, 500); // 500mm threshold

            if (wallSnap) {
              // Apply wall-relative positioning
              newShape.wallRelative = {
                ...wallSnap.wallRelative!,
                // Override with object-specific elevation data
                height: objectDef.elevationHeight ?? objectDef.defaultHeight,
                elevationBottom: objectDef.elevationBottom ?? categoryDefaults.elevationBottom,
                depth: objectDef.depth ?? objectDef.defaultHeight,
              };
              newShape.rotation = wallSnap.rotation;
              // Update placement position to snapped position
              if (wallSnap.coordinates && 'x' in wallSnap.coordinates) {
                const snappedCoords = wallSnap.coordinates as { x: number; y: number };
                newShape.metadata!.placementX = snappedCoords.x;
                newShape.metadata!.placementY = snappedCoords.y;
              }
            }
          }
        }

        addShape(newShape);
        toast.success(`${objectDef.name} placed${newShape.wallRelative ? ' (wall attached)' : ''}`);

        // Clear the pending object and ghost preview
        setPendingObjectId(null);
        setGhostPreview(null);
      }

      return;
    }

    // ============================================================================
    // ROOM PLACEMENT - Place existing room from rooms list onto canvas
    // ============================================================================
    if (pendingRoomPlacement && currentPlanId) {
      const roomId = pendingRoomPlacement.roomId;
      const roomName = pendingRoomPlacement.roomName;
      const roomColor = pendingRoomPlacement.color || 'rgba(59, 130, 246, 0.2)';

      // Create a rectangular room shape at click position
      // Default size: 3m x 4m (3000mm x 4000mm)
      const defaultWidth = 3000 * scaleSettings.pixelsPerMm;
      const defaultHeight = 4000 * scaleSettings.pixelsPerMm;

      // Center the room on the click position
      const startX = pos.x - defaultWidth / 2;
      const startY = pos.y - defaultHeight / 2;

      const roomPoints = [
        { x: startX, y: startY },
        { x: startX + defaultWidth, y: startY },
        { x: startX + defaultWidth, y: startY + defaultHeight },
        { x: startX, y: startY + defaultHeight },
      ];

      const newRoomShape: FloorMapShape = {
        id: uuidv4(),
        planId: currentPlanId,
        type: 'room',
        roomId: roomId, // Link to database room
        coordinates: {
          points: roomPoints,
        },
        color: roomColor,
        strokeColor: 'rgba(41, 91, 172, 0.8)',
        name: roomName,
        zIndex: -100, // Rooms render below objects/furniture
      };

      addShape(newRoomShape);

      // Update the room in the database with floor_plan_position
      const updateRoomPosition = async () => {
        try {
          const { error } = await supabase
            .from('rooms')
            .update({
              floor_plan_position: {
                points: roomPoints.map(p => ({
                  x: p.x / scaleSettings.pixelsPerMm, // Store in mm
                  y: p.y / scaleSettings.pixelsPerMm,
                })),
              },
            })
            .eq('id', roomId);

          if (error) {
            console.error('Error updating room position:', error);
          }
        } catch (err) {
          console.error('Error updating room position:', err);
        }
      };

      updateRoomPosition();

      toast.success(`🏠 "${roomName}" placerat på ritningen`);

      // Clear the pending room placement
      setPendingRoomPlacement(null);

      // Select the new room
      setSelectedShapeIds([newRoomShape.id]);

      return;
    }

    // ============================================================================
    // TEMPLATE PLACEMENT - Place saved template (group of shapes)
    // ============================================================================
    if (pendingTemplateId && currentPlanId) {
      const clickX = Math.round(pos.x);
      const clickY = Math.round(pos.y);
      
      // Template placement
      
      // Check if this is a default template (ID starts with "default-")
      const isDefaultTemplate = pendingTemplateId.startsWith('default-');
      
      if (isDefaultTemplate) {
        // Extract index from ID (e.g., "default-0" -> 0)
        const templateIndex = parseInt(pendingTemplateId.replace('default-', ''));
        const defaultTemplate = DEFAULT_TEMPLATES[templateIndex];
        
        if (!defaultTemplate) {
          toast.error('Standard-mall hittades inte');
          setPendingTemplateId(null);
          return;
        }
        
        // Convert to full template object
        const template = {
          ...defaultTemplate,
          id: pendingTemplateId,
          user_id: 'system',
          created_at: new Date().toISOString(),
        };
        // Default template loaded
        
        // Calculate bounds BEFORE placement
        const beforeBounds = calculateBounds(template.shapes);
        
        // Place all shapes from template at clicked position
        const placedShapes = placeTemplateShapes(template, pos, currentPlanId);
        
        // Calculate bounds AFTER placement
        const afterBounds = calculateBounds(placedShapes);
        
        // Shape placed
        
        if (placedShapes.length > 0) {
          // Add all shapes to canvas (they become regular editable shapes)
          placedShapes.forEach(shape => {
            addShape(shape);
          });

          toast.success(
            `✨ Mall "${template.name}" placerad (${placedShapes.length} ${
              placedShapes.length === 1 ? 'objekt' : 'objekt'
            })`
          );
        } else {
          toast.error('Kunde inte placera mall - inga objekt hittades');
        }
        
        // Clear the pending template
        setPendingTemplateId(null);
      } else if (pendingTemplateId && !isDefaultTemplate) {
        // Only query database for custom templates (not default ones)
        getTemplateById(pendingTemplateId).then(template => {
          if (template && template.shapes) {
            
            // Calculate bounds BEFORE placement
            const beforeBounds = calculateBounds(template.shapes);
            
            // Place all shapes from template at clicked position
            const placedShapes = placeTemplateShapes(template, pos, currentPlanId);
            
            // Calculate bounds AFTER placement
            const afterBounds = calculateBounds(placedShapes);

            if (placedShapes.length > 0) {
              // Add all shapes to canvas (they become regular editable shapes)
              placedShapes.forEach(shape => {
                addShape(shape);
              });

              toast.success(
                `✨ Mall "${template.name}" placerad (${placedShapes.length} ${
                  placedShapes.length === 1 ? 'objekt' : 'objekt'
                })`
              );
            } else {
              toast.error('Kunde inte placera mall - inga objekt hittades');
            }
          } else {
            toast.error('Mall hittades inte');
          }
          
          // Clear the pending template so user can continue working
          setPendingTemplateId(null);
        }).catch(error => {
          console.error('Error placing template:', error);
          toast.error('Ett fel uppstod vid placering av mall');
          setPendingTemplateId(null);
        });
      } else {
        // Invalid template ID (shouldn't happen)
        toast.error('Ogiltig mall-ID');
        setPendingTemplateId(null);
      }
      
      return;
    }
    
    // Snap to grid if enabled - uses user's grid interval setting
    // Freehand tool is NEVER snapped - always free drawing
    // Line-based tools (wall, window, door, sliding door) use wall snapping
    const forWalls = activeTool === 'wall' || activeTool === 'window_line' || activeTool === 'door_line' || activeTool === 'sliding_door_line';
    const shouldSnap = activeTool !== 'freehand' && projectSettings.snapEnabled;
    const currentSnapSize = getSnapSize(viewState.zoom, scaleSettings.pixelsPerMm, forWalls, projectSettings.gridInterval);
    pos = snapToGrid(pos, currentSnapSize, shouldSnap);
    
    // Pan mode (spacebar or middle mouse)
    if (e.evt.button === 1 || isSpacePressed) {
      e.evt.preventDefault();
      setIsPanning(true);
      setPanStart({ x: pointer.x - viewState.panX, y: pointer.y - viewState.panY });
      return;
    }
    
    // BOX SELECTION - Drag to select multiple objects (like Figma/Canva/Photoshop)
    // Check if clicked on empty canvas (not on any shape)
    const clickedOnEmpty = e.target === stage || e.target.getType() === 'Stage';
    
    if (clickedOnEmpty && activeTool === 'select' && !e.evt.ctrlKey && !e.evt.metaKey) {
      // Start box selection (Shift = add to existing selection)
      setIsBoxSelecting(true);
      setIsExtendingSelection(e.evt.shiftKey);
      setSelectionBox({ start: pos, end: pos });
      return;
    }
    
    // ROOM TOOL - Drag to create rectangular room (fast & simple)
    if (activeTool === 'room' && !isDrawing && !isBoxSelecting) {
      // Start room creation by dragging (like box selection but creates a room)
      setIsBoxSelecting(true); // Reuse box selection state for room dragging
      setSelectionBox({ start: pos, end: pos });
      return;
    }
    
    // WALL TOOL - Click to add wall segments
    if (activeTool === 'wall' && !isDrawing) {
      setIsDrawing(true);
      addDrawingPoint(pos);
      return;
    }

    // LINE-BASED OPENING TOOLS - Click to start, click again to end (like walls)
    if ((activeTool === 'window_line' || activeTool === 'door_line' || activeTool === 'sliding_door_line') && !isDrawing) {
      setIsDrawing(true);
      addDrawingPoint(pos);
      return;
    }

    // FREEHAND TOOL - Click to add freehand points
    if (activeTool === 'freehand' && !isDrawing) {
      setIsDrawing(true);
      addDrawingPoint(pos);
      return;
    }

    // CIRCLE TOOL - Drag to create circle (like room tool)
    if (activeTool === 'circle' && !isDrawing && !isBoxSelecting) {
      setIsBoxSelecting(true);
      setSelectionBox({ start: pos, end: pos });
      return;
    }

    // RECTANGLE TOOL - Drag to create rectangle (like room tool)
    if (activeTool === 'rectangle' && !isDrawing && !isBoxSelecting) {
      setIsBoxSelecting(true);
      setSelectionBox({ start: pos, end: pos });
      return;
    }

    // BEZIER TOOL - Drag to create curve (like circle/rectangle)
    if (activeTool === 'bezier' && !isDrawing && !isBoxSelecting) {
      setIsBoxSelecting(true);
      setSelectionBox({ start: pos, end: pos });
      return;
    }

    // TEXT TOOL - Click to open text dialog, then drag to create text box
    if (activeTool === 'text' && !isDrawing && !isBoxSelecting) {
      setIsBoxSelecting(true);
      setSelectionBox({ start: pos, end: pos });
      return;
    }
  }, [
    isPanning,
    panStart,
    isBoxSelecting,
    selectionBox,
    isDrawing,
    currentDrawingPoints,
    viewState,
    activeTool,
    gridSettings.snap,
    scaleSettings.pixelsPerMm,
    currentPlanId,
    currentProjectId,
    pendingLibrarySymbol,
    setViewState,
    setCurrentPlanId,
    addDrawingPoint,
    setCurrentDrawingPoints,
    throttledSetSelectionBox,
    setIsDrawing,
    setIsPanning,
    setPanStart,
    setIsBoxSelecting,
    setSelectionBox,
    setIsExtendingSelection,
    setSelectedShapeIds,
    addShape,
    setPendingLibrarySymbol,
    projectSettings.snapEnabled,
  ]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Get fresh viewState to avoid stale closures
    const { viewState: currentViewState } = useFloorMapStore.getState();

    // Calculate position
    const pos = {
      x: (pointer.x - currentViewState.panX) / currentViewState.zoom,
      y: (pointer.y - currentViewState.panY) / currentViewState.zoom,
    };

    // Handle measure tool movement
    if (isMeasuring) {
      setMeasureEnd(pos);
      return;
    }

    // Snap to grid if enabled - uses user's grid interval setting
    // Freehand tool is NEVER snapped - always free drawing
    // Line-based tools (wall, window, door, sliding door) use wall snapping
    const forWalls = activeTool === 'wall' || activeTool === 'window_line' || activeTool === 'door_line' || activeTool === 'sliding_door_line';
    const shouldSnap = activeTool !== 'freehand' && projectSettings.snapEnabled;
    const currentSnapSize = getSnapSize(viewState.zoom, scaleSettings.pixelsPerMm, forWalls, projectSettings.gridInterval);
    const snappedPos = snapToGrid(pos, currentSnapSize, shouldSnap);

    // Update cursor (FIXED - was breaking during panning)
    if (isPanning && panStart) {
      // Update pan position
      const unconstrained = {
        panX: pointer.x - panStart.x,
        panY: pointer.y - panStart.y,
      };

      // Constrain pan to canvas bounds
      const constrained = constrainPan(unconstrained.panX, unconstrained.panY, viewState.zoom);

      setViewState(constrained);
      return;
    }

    // Box selection (marquee)
    if (isBoxSelecting && selectionBox) {
      throttledSetSelectionBox({ start: selectionBox.start, end: snappedPos });
      return;
    }

    // Drawing mode - add points (for wall, freehand, and line-based openings)
    if (isDrawing && (activeTool === 'wall' || activeTool === 'freehand' || activeTool === 'window_line' || activeTool === 'door_line' || activeTool === 'sliding_door_line')) {
      // Freehand uses raw pos (no snap), walls and line tools use snapped pos
      const drawPos = activeTool === 'freehand' ? pos : snappedPos;
      addDrawingPoint(drawPos);
      // Track current mouse position for CAD numeric input overlay
      currentMousePosRef.current = snappedPos;
      return;
    }

    // Ghost preview for stamp placement mode (library objects/symbols)
    // When user has selected an object from library, show preview at cursor
    const { pendingObjectId, pendingLibrarySymbol } = useFloorMapStore.getState();
    if (pendingObjectId || pendingLibrarySymbol) {
      // Get all walls to detect nearest one
      const walls = shapes.filter(s => s.type === 'wall');

      // Find nearest wall within 300mm (snapping distance)
      const WALL_SNAP_DISTANCE = 300; // mm
      const nearestWall = findNearestWallForPoint(snappedPos.x, snappedPos.y, walls, WALL_SNAP_DISTANCE);

      let rotation = 0;
      let nearWall = false;

      if (nearestWall) {
        // Calculate rotation to face the wall
        // Wall angle is the direction the wall runs, we want to face perpendicular to it
        const wallGeom = getWallGeometry(nearestWall.wall);
        if (wallGeom) {
          // Wall angle in degrees + 90 to face the wall (perpendicular)
          // The object should "face into" the room, away from the wall
          const wallAngleDeg = (wallGeom.angle * 180) / Math.PI;

          // Determine which side of the wall we're on using the normal vector
          const toPointX = snappedPos.x - wallGeom.x1;
          const toPointY = snappedPos.y - wallGeom.y1;
          const dotNormal = toPointX * wallGeom.normalX + toPointY * wallGeom.normalY;

          // If on the "normal" side, rotate to face that direction; otherwise rotate 180°
          if (dotNormal >= 0) {
            rotation = wallAngleDeg + 90;
          } else {
            rotation = wallAngleDeg - 90;
          }

          // Normalize rotation to 0-360
          rotation = ((rotation % 360) + 360) % 360;
          nearWall = true;
        }
      }

      setGhostPreview({
        x: snappedPos.x,
        y: snappedPos.y,
        rotation,
        nearWall,
      });
      return;
    } else {
      // Clear ghost preview if no pending object
      if (ghostPreview) {
        setGhostPreview(null);
      }
    }

    // Hover detection for info tooltip (only when not actively doing something)
    // Only show tooltip when using select tool and not drawing/panning/box-selecting
    if (activeTool === 'select' && !isPanning && !isDrawing && !isBoxSelecting) {
      const target = e.target;
      const shapeId = (target as any).attrs?.shapeId;
      if (shapeId && shapeId !== hoveredShapeId) {
        setHoveredShapeId(shapeId);
        setHoverMousePosition({ x: e.evt.clientX, y: e.evt.clientY });
      } else if (!shapeId && hoveredShapeId) {
        setHoveredShapeId(null);
        setHoverMousePosition(null);
      } else if (shapeId) {
        // Update position for same shape
        setHoverMousePosition({ x: e.evt.clientX, y: e.evt.clientY });
      }
    } else if (hoveredShapeId) {
      // Clear hover when doing other actions
      setHoveredShapeId(null);
      setHoverMousePosition(null);
    }
  }, [isPanning, panStart, isBoxSelecting, selectionBox, isDrawing, currentDrawingPoints, viewState, activeTool, gridSettings.snap, scaleSettings.pixelsPerMm, setViewState, addDrawingPoint, setCurrentDrawingPoints, throttledSetSelectionBox, projectSettings.snapEnabled, constrainPan, shapes, ghostPreview, hoveredShapeId]);
  
  // Handle mouse up
  const handleMouseUp = useCallback((e: KonvaEventObject<MouseEvent>) => {
    // Finish measuring - keep measurement visible until tool changes
    if (isMeasuring) {
      setIsMeasuring(false);
      // Don't clear measureStart/measureEnd - measurement stays visible
      return;
    }

    // Stop panning
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }
    
    // Stop box selection OR room creation
    if (isBoxSelecting) {
      setIsBoxSelecting(false);
      
      // ROOM TOOL - Create rectangular room from drag box
      if (activeTool === 'room' && selectionBox) {
        const minX = Math.min(selectionBox.start.x, selectionBox.end.x);
        const maxX = Math.max(selectionBox.start.x, selectionBox.end.x);
        const minY = Math.min(selectionBox.start.y, selectionBox.end.y);
        const maxY = Math.max(selectionBox.start.y, selectionBox.end.y);
        
        // Only create room if box is big enough (minimum 100mm x 100mm)
        const width = maxX - minX;
        const height = maxY - minY;
        const minSize = 100 * scaleSettings.pixelsPerMm; // 100mm minimum
        
        if (width >= minSize && height >= minSize) {
          // Create 4 corner points for rectangular room
          const roomPoints = [
            { x: minX, y: minY }, // Top-left
            { x: maxX, y: minY }, // Top-right
            { x: maxX, y: maxY }, // Bottom-right
            { x: minX, y: maxY }, // Bottom-left
          ];
          
          const roomId = uuidv4();
          const newRoom: FloorMapShape = {
            id: roomId,
            planId: currentPlanId,
            type: 'room',
            coordinates: {
              points: roomPoints,
            },
            color: 'rgba(59, 130, 246, 0.2)',
            strokeColor: 'rgba(41, 91, 172, 0.8)',
            zIndex: -100, // Rooms render below objects/furniture
          };
          
          addShape(newRoom);
          
          // Open name dialog after creating room
          setTimeout(() => {
            setSelectedShapeForNaming(roomId);
            setIsNameRoomDialogOpen(true);
          }, 100);
          
          toast.success('Rum skapat - ge det ett namn!');
        } else {
          toast.error('Rummet är för litet - dra en större yta');
        }
        
        setSelectionBox(null);
        return;
      }

      // CIRCLE TOOL - Create circle from drag box
      if (activeTool === 'circle' && selectionBox && currentPlanId) {
        const centerX = (selectionBox.start.x + selectionBox.end.x) / 2;
        const centerY = (selectionBox.start.y + selectionBox.end.y) / 2;
        const width = Math.abs(selectionBox.end.x - selectionBox.start.x);
        const height = Math.abs(selectionBox.end.y - selectionBox.start.y);
        const radius = Math.max(width, height) / 2;

        // Minimum radius (50mm)
        const minRadius = 50 * scaleSettings.pixelsPerMm;

        if (radius >= minRadius) {
          const newCircle: FloorMapShape = {
            id: uuidv4(),
            planId: currentPlanId,
            type: 'circle',
            coordinates: {
              cx: centerX,
              cy: centerY,
              radius,
            },
            color: 'rgba(147, 197, 253, 0.3)',
            strokeColor: '#3b82f6',
            strokeWidth: 2,
          };
          addShape(newCircle);
          toast.success('Cirkel skapad');
        } else {
          toast.error('Cirkeln är för liten - dra en större yta');
        }

        setSelectionBox(null);
        return;
      }

      // RECTANGLE TOOL - Create rectangle from drag box
      if (activeTool === 'rectangle' && selectionBox && currentPlanId) {
        const minX = Math.min(selectionBox.start.x, selectionBox.end.x);
        const maxX = Math.max(selectionBox.start.x, selectionBox.end.x);
        const minY = Math.min(selectionBox.start.y, selectionBox.end.y);
        const maxY = Math.max(selectionBox.start.y, selectionBox.end.y);

        const width = maxX - minX;
        const height = maxY - minY;
        const minSize = 50 * scaleSettings.pixelsPerMm; // 50mm minimum

        if (width >= minSize && height >= minSize) {
          const newRect: FloorMapShape = {
            id: uuidv4(),
            planId: currentPlanId,
            type: 'rectangle',
            coordinates: {
              left: minX,
              top: minY,
              width,
              height,
            },
            color: 'rgba(167, 243, 208, 0.3)',
            strokeColor: '#10b981',
            strokeWidth: 2,
          };
          addShape(newRect);
          toast.success('Rektangel skapad');
        } else {
          toast.error('Rektangeln är för liten - dra en större yta');
        }

        setSelectionBox(null);
        return;
      }

      // BEZIER TOOL - Create curve from drag box (control point auto-calculated)
      if (activeTool === 'bezier' && selectionBox && currentPlanId) {
        const start = selectionBox.start;
        const end = selectionBox.end;

        // Calculate distance
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = 50 * scaleSettings.pixelsPerMm; // 50mm minimum

        if (distance >= minDistance) {
          // Calculate control point: perpendicular offset from midpoint
          // This creates a nice arc shape
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;

          // Perpendicular vector (rotate 90 degrees)
          const perpX = -dy;
          const perpY = dx;

          // Normalize and scale (30% of distance for nice curve)
          const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);
          const curveAmount = distance * 0.3;
          const controlX = midX + (perpX / perpLength) * curveAmount;
          const controlY = midY + (perpY / perpLength) * curveAmount;

          const newBezier: FloorMapShape = {
            id: uuidv4(),
            planId: currentPlanId,
            type: 'bezier',
            coordinates: {
              start: { x: start.x, y: start.y },
              control: { x: controlX, y: controlY },
              end: { x: end.x, y: end.y },
            },
            strokeColor: '#8b5cf6',
            strokeWidth: 2,
          };
          addShape(newBezier);
          toast.success('Kurva skapad - dra kontrollpunkten för att justera');
        } else {
          toast.error('Kurvan är för kort - dra längre');
        }

        setSelectionBox(null);
        return;
      }

      // TEXT TOOL - Open text dialog with position for text box
      if (activeTool === 'text' && selectionBox && currentPlanId) {
        const minX = Math.min(selectionBox.start.x, selectionBox.end.x);
        const maxX = Math.max(selectionBox.start.x, selectionBox.end.x);
        const minY = Math.min(selectionBox.start.y, selectionBox.end.y);
        const maxY = Math.max(selectionBox.start.y, selectionBox.end.y);

        const width = maxX - minX;
        const height = maxY - minY;
        const minSize = 50; // 50 pixels minimum for text box

        // If dragged a box, use that size; otherwise default box size (in pixels)
        // Default: 200x50 pixels which is a reasonable text box size
        const boxWidth = width >= minSize ? width : 200;
        const boxHeight = height >= minSize ? height : 50;

        // Set pending position and open dialog
        setPendingTextPosition({
          x: minX,
          y: minY,
          width: boxWidth,
          height: boxHeight,
        });
        setIsTextDialogOpen(true);
        setSelectionBox(null);
        return;
      }

      // SELECT TOOL - Select all shapes that INTERSECT with the box (not just fully contained)
      if (activeTool === 'select' && selectionBox) {
        const boxMinX = Math.min(selectionBox.start.x, selectionBox.end.x);
        const boxMaxX = Math.max(selectionBox.start.x, selectionBox.end.x);
        const boxMinY = Math.min(selectionBox.start.y, selectionBox.end.y);
        const boxMaxY = Math.max(selectionBox.start.y, selectionBox.end.y);
        
        const selectedIds = currentShapes
          .filter(shape => {
            const coords = shape.coordinates as any;
            
            // WALL / LINE - check if line intersects with box
            if (shape.type === 'wall' || shape.type === 'line') {
              const wallMinX = Math.min(coords.x1, coords.x2);
              const wallMaxX = Math.max(coords.x1, coords.x2);
              const wallMinY = Math.min(coords.y1, coords.y2);
              const wallMaxY = Math.max(coords.y1, coords.y2);
              
              // Check if wall bounding box intersects with selection box
              return !(wallMaxX < boxMinX || wallMinX > boxMaxX || 
                       wallMaxY < boxMinY || wallMinY > boxMaxY);
            }
            
            // ROOM - check if any vertex is inside box
            if (shape.type === 'room' && coords.points) {
              return coords.points.some((p: { x: number; y: number }) => 
                p.x >= boxMinX && p.x <= boxMaxX &&
                p.y >= boxMinY && p.y <= boxMaxY
              );
            }
            
            // RECTANGLE - check if rect intersects with box
            if (shape.type === 'rectangle' && coords.left !== undefined) {
              const rectMinX = coords.left;
              const rectMaxX = coords.left + coords.width;
              const rectMinY = coords.top;
              const rectMaxY = coords.top + coords.height;
              
              return !(rectMaxX < boxMinX || rectMinX > boxMaxX || 
                       rectMaxY < boxMinY || rectMinY > boxMaxY);
            }
            
            // CIRCLE - check if circle center is in box or circle intersects box
            if (shape.type === 'circle' && coords.cx !== undefined) {
              const inBox = coords.cx >= boxMinX && coords.cx <= boxMaxX &&
                           coords.cy >= boxMinY && coords.cy <= boxMaxY;
              
              // Also check if any part of circle intersects box edges
              const intersectsEdge = 
                (coords.cx + coords.radius >= boxMinX && coords.cx - coords.radius <= boxMaxX &&
                 coords.cy + coords.radius >= boxMinY && coords.cy - coords.radius <= boxMaxY);
              
              return inBox || intersectsEdge;
            }
            
            // TEXT - check if text position is in box
            if (shape.type === 'text' && coords.x !== undefined) {
              return coords.x >= boxMinX && coords.x <= boxMaxX &&
                     coords.y >= boxMinY && coords.y <= boxMaxY;
            }
            
            // FREEHAND / POLYGON - check if any point is in box
            if ((shape.type === 'freehand' || shape.type === 'polygon') && coords.points) {
              return coords.points.some((p: { x: number; y: number }) =>
                p.x >= boxMinX && p.x <= boxMaxX &&
                p.y >= boxMinY && p.y <= boxMaxY
              );
            }

            // BEZIER - check if any of the 3 points is in box
            if (shape.type === 'bezier') {
              const points = [coords.start, coords.control, coords.end];
              return points.some((p: { x: number; y: number }) =>
                p.x >= boxMinX && p.x <= boxMaxX &&
                p.y >= boxMinY && p.y <= boxMaxY
              );
            }

            // IMAGE - check if image rect intersects with box
            if (shape.type === 'image' && coords.x !== undefined) {
              const imgMinX = coords.x;
              const imgMaxX = coords.x + (coords.width || 0);
              const imgMinY = coords.y;
              const imgMaxY = coords.y + (coords.height || 0);
              return imgMinX <= boxMaxX && imgMaxX >= boxMinX &&
                     imgMinY <= boxMaxY && imgMaxY >= boxMinY;
            }

            return false;
          })
          .map(shape => shape.id);
        
        // If Shift was held, add to existing selection instead of replacing
        if (isExtendingSelection) {
          const existingIds = selectedShapeIds;
          const combinedIds = [...new Set([...existingIds, ...selectedIds])];
          setSelectedShapeIds(combinedIds);
          if (selectedIds.length > 0) {
            toast.success(`${selectedIds.length} objekt tillagda (totalt ${combinedIds.length})`);
          }
        } else {
          setSelectedShapeIds(selectedIds);
          if (selectedIds.length > 0) {
            toast.success(`${selectedIds.length} objekt markerade`);
          }
        }
      }
      setSelectionBox(null);
      setIsExtendingSelection(false);
      return;
    }
    
    // Complete drawing
    if (isDrawing && currentDrawingPoints.length >= 2 && currentPlanId) {
      let start = currentDrawingPoints[0];
      let end = currentDrawingPoints[currentDrawingPoints.length - 1];
      
      let newShape: FloorMapShape | null = null;
      
      if (activeTool === 'wall') {
        // Check for custom wall thickness from toolbar (e.g., outer wall)
        const customThickness = (window as any).__wallThickness;
        const wallThickness = customThickness || projectSettings.wallThicknessMM || 200;
        const wallDefaults = getAdminDefaults();

        // Clear custom thickness after use
        if (customThickness) {
          delete (window as any).__wallThickness;
          delete (window as any).__wallType;
        }

        // Create wall
        newShape = {
          id: uuidv4(),
          planId: currentPlanId,
          type: 'wall',
          coordinates: {
            x1: start.x,
            y1: start.y,
            x2: end.x,
            y2: end.y,
          },
          strokeColor: '#2d3748',
          thicknessMM: wallThickness,
          heightMM: wallDefaults.wallHeightMM,
        };
      } else if (activeTool === 'freehand') {
        // Create freehand
        newShape = {
          id: uuidv4(),
          planId: currentPlanId,
          type: 'freehand',
          coordinates: {
            points: currentDrawingPoints,
          },
          strokeColor: '#000000',
          strokeWidth: 2,
        };
      } else if (activeTool === 'window_line') {
        // Calculate length and apply default if too small (single click)
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const defaultWindowWidthMM = 1000; // 1000mm standard window
        const defaultWindowWidthPx = defaultWindowWidthMM * scaleSettings.pixelsPerMm;
        const minLength = 50; // Minimum to consider as "dragged"

        let finalEnd = end;
        if (length < minLength) {
          // Single click - use default horizontal window (converted to pixels)
          finalEnd = { x: start.x + defaultWindowWidthPx, y: start.y };
        }

        newShape = {
          id: uuidv4(),
          planId: currentPlanId,
          type: 'window_line',
          coordinates: {
            x1: start.x,
            y1: start.y,
            x2: finalEnd.x,
            y2: finalEnd.y,
          },
          strokeColor: '#3b82f6', // Blue for windows
          thicknessMM: 100, // Window frame thickness
        };
        toast.success('Fönster skapat');
      } else if (activeTool === 'door_line') {
        // Calculate length and apply default if too small (single click)
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const defaultDoorWidthMM = 900; // 900mm standard door
        const defaultDoorWidthPx = defaultDoorWidthMM * scaleSettings.pixelsPerMm;
        const minLength = 50;

        let finalEnd = end;
        if (length < minLength) {
          // Single click - use default horizontal door (converted to pixels)
          finalEnd = { x: start.x + defaultDoorWidthPx, y: start.y };
        }

        newShape = {
          id: uuidv4(),
          planId: currentPlanId,
          type: 'door_line',
          coordinates: {
            x1: start.x,
            y1: start.y,
            x2: finalEnd.x,
            y2: finalEnd.y,
          },
          strokeColor: '#8b5cf6', // Purple for doors
          thicknessMM: 50, // Door frame thickness
          openingDirection: 'right', // Default to right opening
        };
        toast.success('Dörr skapad (dubbelklicka för att byta öppningsriktning)');
      } else if (activeTool === 'sliding_door_line') {
        // Calculate length and apply default if too small (single click)
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const defaultSlidingDoorWidthMM = 1800; // 1800mm standard sliding door
        const defaultSlidingDoorWidthPx = defaultSlidingDoorWidthMM * scaleSettings.pixelsPerMm;
        const minLength = 50;

        let finalEnd = end;
        if (length < minLength) {
          // Single click - use default horizontal sliding door (converted to pixels)
          finalEnd = { x: start.x + defaultSlidingDoorWidthPx, y: start.y };
        }

        newShape = {
          id: uuidv4(),
          planId: currentPlanId,
          type: 'sliding_door_line',
          coordinates: {
            x1: start.x,
            y1: start.y,
            x2: finalEnd.x,
            y2: finalEnd.y,
          },
          strokeColor: '#10b981', // Green for sliding doors
          thicknessMM: 50, // Frame thickness
        };
        toast.success('Skjutdörr skapad');
      }

      if (newShape) {
        addShape(newShape);

        // Auto-snap openings (doors, windows) to walls and break the wall
        const openingTypes = ['door_line', 'window_line', 'sliding_door_line'];
        if (openingTypes.includes(newShape.type)) {
          const openingCoords = newShape.coordinates as { x1: number; y1: number; x2: number; y2: number };
          const walls = shapes.filter(
            s => s.planId === currentPlanId &&
                 s.type === 'wall' &&
                 s.id !== newShape.id
          );

          // Find nearest wall within 50 pixels
          const nearest = findNearestWall(openingCoords, walls, 50);

          if (nearest) {
            const wallCoords = nearest.wall.coordinates as { x1: number; y1: number; x2: number; y2: number };
            const snappedCoords = projectOntoWall(openingCoords, wallCoords);
            const wallSegments = splitWall(wallCoords, snappedCoords);

            // Use store action to snap opening and split wall
            const state = useFloorMapStore.getState();
            state.applyWallSnap(
              newShape.id,
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
            toast.success('Öppning placerad på vägg');
          }
        }
      }

      // Clear CAD numeric input after drawing completes
      setNumericInput('');
      setShowNumericInput(false);

      setIsDrawing(false);
      setCurrentDrawingPoints([]);
      return;
    }
  }, [isPanning, isBoxSelecting, selectionBox, isDrawing, isExtendingSelection, selectedShapeIds, currentDrawingPoints, currentPlanId, activeTool, currentShapes, viewState, gridSettings.snap, scaleSettings.pixelsPerMm, addShape, setIsDrawing, setCurrentDrawingPoints, setSelectedShapeIds, setSelectedShapeId, setIsPanning, setPanStart, setIsBoxSelecting, setSelectionBox, updateShape, projectSettings, shapes]);

  // CAD-style: Confirm wall with exact length (typed in mm)
  const confirmWallWithLength = useCallback((lengthMM: number) => {
    if (currentDrawingPoints.length === 0 || !currentPlanId) return;

    const start = currentDrawingPoints[0];
    const mousePos = currentMousePosRef.current;

    // Calculate direction vector from start to current mouse
    const dx = mousePos.x - start.x;
    const dy = mousePos.y - start.y;
    const currentLength = Math.sqrt(dx * dx + dy * dy);

    if (currentLength === 0) {
      toast.error('Flytta musen för att ange riktning');
      return;
    }

    // Normalize direction and scale to desired length in pixels
    const targetLengthPixels = lengthMM * scaleSettings.pixelsPerMm;
    const scale = targetLengthPixels / currentLength;

    const end = {
      x: start.x + dx * scale,
      y: start.y + dy * scale,
    };

    // Get wall settings
    const customThickness = (window as any).__wallThickness;
    const wallThickness = customThickness || projectSettings.wallThicknessMM || 200;
    const wallDefaults = getAdminDefaults();

    // Clear custom thickness after use
    if (customThickness) {
      delete (window as any).__wallThickness;
      delete (window as any).__wallType;
    }

    // Create wall with exact length
    const newShape: FloorMapShape = {
      id: uuidv4(),
      planId: currentPlanId,
      type: 'wall',
      coordinates: {
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
      },
      strokeColor: '#2d3748',
      thicknessMM: wallThickness,
      heightMM: wallDefaults.wallHeightMM,
    };

    addShape(newShape);
    toast.success(`Vägg skapad: ${lengthMM} mm`);

    // Reset state
    setNumericInput('');
    setShowNumericInput(false);
    setIsDrawing(false);
    setCurrentDrawingPoints([]);
  }, [currentDrawingPoints, currentPlanId, scaleSettings.pixelsPerMm, projectSettings.wallThicknessMM, addShape, setIsDrawing, setCurrentDrawingPoints]);

  // Update confirmWallWithLength ref for keyboard handler access
  useEffect(() => {
    confirmWallWithLengthRef.current = confirmWallWithLength;
  }, [confirmWallWithLength]);

  // Handle stage click - ONLY for empty space, NOT for shapes
  const handleStageClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    // CRITICAL: Only handle clicks on empty stage, not on shapes
    // Shapes handle their own clicks via onClick handlers
    const clickedOnEmpty = e.target === e.target.getStage();

    if (!clickedOnEmpty) {
      // Clicked on a shape - let the shape's onClick handler deal with it
      // Don't interfere here
      return;
    }

    // Only handle clicks on empty space
    // Select tool - clear selection when clicking empty space
    if (activeTool === 'select') {
      setSelectedShapeIds([]);
      setSelectedShapeId(null);
      setSelectedGroupIndividualId(null); // Clear individual group selection
    }
  }, [activeTool, setSelectedShapeIds, setSelectedShapeId]);
  
  // Handle shape transformation
  const handleShapeTransform = useCallback((shapeId: string, updates: Partial<FloorMapShape>) => {
    updateShape(shapeId, updates);
  }, [updateShape]);

  // Handle template group transformation (move, rotate, scale)
  const handleGroupTransform = useCallback((updates: Array<{ id: string; updates: Partial<FloorMapShape> }>) => {
    if (updates.length === 0) return;
    updateShapes(updates);
  }, [updateShapes]);

  // Handle template group selection
  const handleGroupSelect = useCallback((groupId: string, evt?: KonvaEventObject<MouseEvent>) => {
    if (evt) {
      evt.cancelBubble = true;
    }
    // Clear any individual shape selection within group
    setSelectedGroupIndividualId(null);

    // Select all shapes in the group
    const groupShapeIds = currentShapes
      .filter(s => s.groupId === groupId)
      .map(s => s.id);
    setSelectedShapeIds(groupShapeIds);

    // Find the group leader to show in PropertyPanel
    const groupLeader = currentShapes.find(s => s.groupId === groupId && s.isGroupLeader);
    const groupName = groupLeader?.templateInfo?.templateName || 'Mall';

    // Show PropertyPanel with group leader
    if (groupLeader) {
      setPropertyPanelShape(groupLeader);
      setShowPropertyPanel(true);
    }

    toast.success(`${groupName} markerad`);
  }, [currentShapes, setSelectedShapeIds, setPropertyPanelShape, setShowPropertyPanel]);

  // Handle individual shape selection within a template group (double-click)
  const handleGroupIndividualSelect = useCallback((shapeId: string, evt?: KonvaEventObject<MouseEvent>) => {
    if (evt) {
      evt.cancelBubble = true;
    }
    setSelectedGroupIndividualId(shapeId);

    // Find the shape to show info
    const shape = currentShapes.find(s => s.id === shapeId);
    if (shape) {
      setPropertyPanelShape(shape);
      setShowPropertyPanel(true);
      toast.success('Enskild form markerad');
    }
  }, [currentShapes, setPropertyPanelShape, setShowPropertyPanel]);

  // Handle opening property panel for individual shape (second double-click)
  const handleGroupOpenPropertyPanel = useCallback((shape: FloorMapShape) => {
    setPropertyPanelShape(shape);
    setShowPropertyPanel(true);
  }, [setPropertyPanelShape, setShowPropertyPanel]);

  // Handle batch length change for walls (Shift+drag endpoint)
  // Applies the same length to all other selected walls while preserving their angles
  const handleBatchWallLengthChange = useCallback((sourceShapeId: string, newLengthMM: number) => {
    const currentShapes = useFloorMapStore.getState().shapes;
    const currentSelectedIds = useFloorMapStore.getState().selectedShapeIds;

    // Line-based shape types that can be batch-synced
    const lineTypes = ['wall', 'line', 'window_line', 'door_line', 'sliding_door_line'];

    // Get all selected wall/line shapes except the source (which was already updated)
    const otherSelectedWalls = currentShapes.filter(
      s => currentSelectedIds.includes(s.id) &&
           s.id !== sourceShapeId &&
           lineTypes.includes(s.type)
    );

    if (otherSelectedWalls.length === 0) return;

    const newLengthPixels = newLengthMM * scaleSettings.pixelsPerMm;

    // Build batch updates
    const updates: Array<{ id: string; updates: Partial<FloorMapShape> }> = [];

    for (const wall of otherSelectedWalls) {
      const wallCoords = wall.coordinates as { x1: number; y1: number; x2: number; y2: number };
      const dx = wallCoords.x2 - wallCoords.x1;
      const dy = wallCoords.y2 - wallCoords.y1;

      // Calculate current angle (preserve it)
      const angle = Math.atan2(dy, dx);

      // Calculate new endpoint based on same angle but new length
      const newX2 = wallCoords.x1 + Math.cos(angle) * newLengthPixels;
      const newY2 = wallCoords.y1 + Math.sin(angle) * newLengthPixels;

      updates.push({
        id: wall.id,
        updates: {
          coordinates: {
            x1: wallCoords.x1,
            y1: wallCoords.y1,
            x2: newX2,
            y2: newY2,
          }
        }
      });
    }

    if (updates.length > 0) {
      updateShapes(updates);
      toast.success(`${updates.length + 1} objekt synkade till samma längd (Shift+drag)`);
    }
  }, [scaleSettings.pixelsPerMm, updateShapes]);

  // Transformer removed - shapes handle their own drag and selection
  // Multi-select is handled by unified drag system

  // Main render
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        touchAction: 'none', // Prevent browser zoom/pan on touch
      }}
      onContextMenu={handleContextMenu}
    >
      {/* Text Input Dialog */}
      <Dialog open={isTextDialogOpen} onOpenChange={(open) => {
        setIsTextDialogOpen(open);
        if (!open) {
          // Reset all states when dialog closes
          setTextInputValue('');
          setPendingTextPosition(null);
          setTextIsBold(false);
          setTextIsItalic(false);
          setTextFontSize(16);
          setTextRotation(0);
          setTextHasBackground(false);
          setEditingTextShapeId(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTextShapeId ? 'Redigera text' : 'Lägg till text'}</DialogTitle>
            <DialogDescription>
              {editingTextShapeId
                ? 'Ändra textinnehåll och stil.'
                : 'Skriv text och välj stil för att placera på ritningen.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Text content */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Text</label>
              <Input
                value={textInputValue}
                onChange={(e) => setTextInputValue(e.target.value)}
                placeholder="Skriv din text här..."
                autoFocus
              />
            </div>

            {/* Font size */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Storlek</label>
              <div className="flex gap-2">
                {[
                  { label: 'S', value: 12 },
                  { label: 'M', value: 16 },
                  { label: 'L', value: 24 },
                  { label: 'XL', value: 36 },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setTextFontSize(preset.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      textFontSize === preset.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Style options */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Stil</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTextIsBold(!textIsBold)}
                  className={`px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${
                    textIsBold
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => setTextIsItalic(!textIsItalic)}
                  className={`px-3 py-1.5 rounded-md text-sm italic transition-colors ${
                    textIsItalic
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => setTextHasBackground(!textHasBackground)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    textHasBackground
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  title="Bakgrund"
                >
                  ▢
                </button>
              </div>
            </div>

            {/* Rotation */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rotation</label>
              <div className="flex gap-2">
                {([0, 90, 180, 270] as const).map((angle) => (
                  <button
                    key={angle}
                    type="button"
                    onClick={() => setTextRotation(angle)}
                    className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                      textRotation === angle
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {angle}°
                  </button>
                ))}
              </div>
            </div>

            {/* Submit button */}
            <button
              type="button"
              onClick={handleTextSubmit}
              disabled={!textInputValue.trim()}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingTextShapeId ? 'Spara' : 'Lägg till'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Name Room Dialog */}
      <NameRoomDialog
        open={isNameRoomDialogOpen}
        onOpenChange={setIsNameRoomDialogOpen}
        onConfirm={async (name) => {
          if (selectedShapeForNaming) {
            const shape = currentShapes.find(s => s.id === selectedShapeForNaming);
            if (shape && shape.type === 'room') {
              // Update local shape with name first
              updateShape(selectedShapeForNaming, { name });
              // Save room to database and get roomId
              const roomId = await saveRoomToDB({ ...shape, name });
              if (roomId) {
                toast.success(`Rum "${name}" sparat!`);
              }
            }
          }
          setIsNameRoomDialogOpen(false);
          setSelectedShapeForNaming(null);
        }}
        onCancel={() => {
          setIsNameRoomDialogOpen(false);
          setSelectedShapeForNaming(null);
        }}
      />
      
      {/* Room Detail Dialog */}
      {currentProjectId && (
        <RoomDetailDialog
          open={isRoomDetailOpen}
          onOpenChange={setIsRoomDetailOpen}
          room={roomData}
          projectId={currentProjectId}
          onRoomUpdated={() => {
            setRoomData(null);
            setSelectedRoomForDetail(null);
          }}
          onViewElevation={() => {
            // Find the room shape by roomId
            const roomShape = currentShapes.find(s => s.roomId === selectedRoomForDetail);
            if (roomShape) {
              // Clear any previous wall selection - start at first wall (wall #1)
              setElevationInitialWallId(undefined);
              setRoomElevationShape(roomShape);
            }
          }}
        />
      )}

      {/* Room Elevation View */}
      {roomElevationShape && currentProjectId && (
        <RoomElevationView
          room={roomElevationShape}
          projectId={currentProjectId}
          initialWallId={elevationInitialWallId}
          onClose={() => {
            setRoomElevationShape(null);
            setElevationInitialWallId(undefined);
          }}
        />
      )}

      {/* Wall Elevation View - shows combined collinear walls */}
      {wallElevationId && currentProjectId && (
        <WallElevationView
          wallId={wallElevationId}
          projectId={currentProjectId}
          onClose={() => setWallElevationId(null)}
        />
      )}

      {/* Property Panel */}
      {/* PropertyPanel - for all shapes EXCEPT rooms (rooms use RoomDetailDialog) */}
      {showPropertyPanel && propertyPanelShape && currentProjectId && propertyPanelShape.type !== 'room' && (
        (() => {
          // Calculate wall index for display
          const isWall = propertyPanelShape.type === 'wall' || propertyPanelShape.type === 'line';
          const walls = isWall ? currentShapes.filter(s => s.type === 'wall' || s.type === 'line') : [];
          const wallIndex = isWall ? walls.findIndex(w => w.id === propertyPanelShape.id) + 1 : undefined;
          const totalWalls = isWall ? walls.length : undefined;

          return (
          <PropertyPanel
            shape={propertyPanelShape}
            projectId={currentProjectId}
            pixelsPerMm={scaleSettings.pixelsPerMm}
            selectedShapeIds={selectedShapeIds}
            allShapes={currentShapes}
            wallIndex={wallIndex}
            totalWalls={totalWalls}
            onClose={() => {
              setShowPropertyPanel(false);
              setPropertyPanelShape(null);
            }}
            onUpdateShape={(shapeId, updates) => {
              updateShape(shapeId, updates);
              setPropertyPanelShape({ ...propertyPanelShape, ...updates });
            }}
            onUpdateShapes={(updates) => {
              updateShapes(updates);
              // Update the property panel shape if it was included in the batch
              const currentShapeUpdate = updates.find(u => u.id === propertyPanelShape.id);
              if (currentShapeUpdate) {
                setPropertyPanelShape({ ...propertyPanelShape, ...currentShapeUpdate.updates });
              }
            }}
          />
          );
        })()
      )}

      {/* Floating Wall Elevation Button - Shows when a wall is selected */}
      {(() => {
        // Check if a wall is selected (single selection)
        const selectedWall = selectedShapeIds.length === 1
          ? currentShapes.find(s => s.id === selectedShapeIds[0] && (s.type === 'wall' || s.type === 'line'))
          : null;

        if (!selectedWall) return null;

        // Calculate button position near the wall's midpoint
        const wallCoords = selectedWall.coordinates as { x1: number; y1: number; x2: number; y2: number };
        if (!wallCoords.x1) return null;

        const wallMidX = (wallCoords.x1 + wallCoords.x2) / 2;
        const wallMidY = (wallCoords.y1 + wallCoords.y2) / 2;

        // Convert to screen coordinates
        const screenX = wallMidX * scaleSettings.pixelsPerMm * viewState.zoom + viewState.panX;
        const screenY = wallMidY * scaleSettings.pixelsPerMm * viewState.zoom + viewState.panY;

        // Only show if on screen
        if (screenX < 0 || screenX > window.innerWidth || screenY < 0 || screenY > window.innerHeight) {
          return null;
        }

        return (
          <button
            onClick={() => {
              // Open combined wall elevation view for this wall
              // This shows all collinear (same-line) wall segments plus openings
              setWallElevationId(selectedWall.id);
            }}
            className="fixed z-50 flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all hover:scale-105"
            style={{
              left: `${Math.min(Math.max(screenX - 60, 60), window.innerWidth - 180)}px`,
              top: `${Math.min(Math.max(screenY - 50, 60), window.innerHeight - 60)}px`,
            }}
            title="Visa väggvy (Elevation)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <span className="text-sm font-medium">Väggvy</span>
          </button>
        );
      })()}

      {/* Konva Stage */}
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleStageClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        scaleX={viewState.zoom}
        scaleY={viewState.zoom}
        x={viewState.panX}
        y={viewState.panY}
        draggable={false}
      >
        <Layer>
          {/* Grid */}
          <Grid
            viewState={viewState}
            scaleSettings={scaleSettings}
            projectSettings={projectSettings}
          />
          
          {/* Drawing preview - for walls and freehand */}
          {isDrawing && currentDrawingPoints.length > 0 && (
            <Line
              points={currentDrawingPoints.flatMap(p => [p.x, p.y])}
              stroke="#3b82f6"
              strokeWidth={2 / viewState.zoom}
              dash={[10 / viewState.zoom, 5 / viewState.zoom]}
              listening={false}
            />
          )}

          {/* Ghost preview for stamp placement mode (library objects/symbols) */}
          {ghostPreview && (pendingLibrarySymbol || pendingObjectId) && (() => {
            // Render actual symbol/object as ghost with reduced opacity
            if (pendingLibrarySymbol) {
              const SymbolComponent = getSymbolComponent(pendingLibrarySymbol as ArchSymbolType);
              if (SymbolComponent) {
                const symbolMeta = SYMBOL_METADATA.find(s => s.type === pendingLibrarySymbol);
                const defaultSize = symbolMeta?.defaultSize || 600;
                const symbolScale = (defaultSize / 1000) * scaleSettings.pixelsPerMm;
                return (
                  <Group
                    x={ghostPreview.x}
                    y={ghostPreview.y}
                    rotation={ghostPreview.rotation}
                    opacity={0.6}
                    listening={false}
                  >
                    <SymbolComponent
                      width={100 * symbolScale}
                      height={100 * symbolScale}
                      strokeWidth={1.5 / viewState.zoom}
                      stroke={ghostPreview.nearWall ? '#10b981' : '#3b82f6'}
                      fill="transparent"
                    />
                    {/* Snap indicator when near wall */}
                    {ghostPreview.nearWall && (
                      <Circle
                        x={0}
                        y={0}
                        radius={8 / viewState.zoom}
                        fill="#10b981"
                        opacity={0.8}
                      />
                    )}
                  </Group>
                );
              }
            }
            if (pendingObjectId) {
              // First check for unified object (new SVG-based library)
              const unifiedDef = getUnifiedObjectById(pendingObjectId);
              if (unifiedDef) {
                const objectScale = scaleSettings.pixelsPerMm;
                const width = unifiedDef.dimensions.width * objectScale;
                const height = unifiedDef.dimensions.depth * objectScale;
                const symbol = unifiedDef.floorPlanSymbol;
                const [, , vbWidth, vbHeight] = symbol.viewBox.split(' ').map(Number);
                const scaleX = width / vbWidth;
                const scaleY = height / vbHeight;

                return (
                  <Group
                    x={ghostPreview.x}
                    y={ghostPreview.y}
                    rotation={ghostPreview.rotation}
                    opacity={0.6}
                    listening={false}
                  >
                    {/* Selection box */}
                    <Rect
                      x={-width / 2}
                      y={-height / 2}
                      width={width}
                      height={height}
                      stroke={ghostPreview.nearWall ? '#10b981' : '#3b82f6'}
                      strokeWidth={2 / viewState.zoom}
                      dash={[6 / viewState.zoom, 3 / viewState.zoom]}
                      fill={ghostPreview.nearWall ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)'}
                    />
                    {/* SVG Symbol */}
                    <Group x={-width / 2} y={-height / 2}>
                      {symbol.paths.map((path, index) => (
                        <Path
                          key={index}
                          data={path.d}
                          fill={path.fill || 'none'}
                          stroke={ghostPreview.nearWall ? '#10b981' : (path.stroke || '#3b82f6')}
                          strokeWidth={(path.strokeWidth || 2) * Math.min(scaleX, scaleY)}
                          scaleX={scaleX}
                          scaleY={scaleY}
                        />
                      ))}
                    </Group>
                    {/* Object name label */}
                    <KonvaText
                      x={-width / 2}
                      y={-height / 2 - 20 / viewState.zoom}
                      text={unifiedDef.name}
                      fontSize={12 / viewState.zoom}
                      fill={ghostPreview.nearWall ? '#10b981' : '#3b82f6'}
                    />
                    {/* Snap indicator when near wall */}
                    {ghostPreview.nearWall && (
                      <Circle
                        x={0}
                        y={0}
                        radius={8 / viewState.zoom}
                        fill="#10b981"
                        opacity={0.8}
                      />
                    )}
                  </Group>
                );
              }

              // Fall back to legacy object library
              const objectDef = getObjectById(pendingObjectId);
              if (objectDef) {
                const objectScale = scaleSettings.pixelsPerMm;
                // Render a placeholder rectangle for the object ghost
                // Use defaultWidth/defaultHeight (the correct property names)
                const width = (objectDef.defaultWidth || 600) * objectScale;
                const height = (objectDef.defaultHeight || 600) * objectScale;
                return (
                  <Group
                    x={ghostPreview.x}
                    y={ghostPreview.y}
                    rotation={ghostPreview.rotation}
                    opacity={0.6}
                    listening={false}
                  >
                    <Rect
                      x={-width / 2}
                      y={-height / 2}
                      width={width}
                      height={height}
                      stroke={ghostPreview.nearWall ? '#10b981' : '#3b82f6'}
                      strokeWidth={2 / viewState.zoom}
                      dash={[6 / viewState.zoom, 3 / viewState.zoom]}
                      fill={ghostPreview.nearWall ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)'}
                    />
                    {/* Object name label */}
                    <KonvaText
                      x={-width / 2}
                      y={-height / 2 - 20 / viewState.zoom}
                      text={objectDef.name}
                      fontSize={12 / viewState.zoom}
                      fill={ghostPreview.nearWall ? '#10b981' : '#3b82f6'}
                    />
                    {/* Snap indicator when near wall */}
                    {ghostPreview.nearWall && (
                      <Circle
                        x={0}
                        y={0}
                        radius={8 / viewState.zoom}
                        fill="#10b981"
                        opacity={0.8}
                      />
                    )}
                  </Group>
                );
              }
            }
            return null;
          })()}

          {/* Box selection/room preview - blue dashed rectangle */}
          {isBoxSelecting && selectionBox && activeTool !== 'bezier' && activeTool !== 'circle' && (
            <Rect
              x={Math.min(selectionBox.start.x, selectionBox.end.x)}
              y={Math.min(selectionBox.start.y, selectionBox.end.y)}
              width={Math.abs(selectionBox.end.x - selectionBox.start.x)}
              height={Math.abs(selectionBox.end.y - selectionBox.start.y)}
              stroke={activeTool === 'room' || activeTool === 'rectangle' ? '#10b981' : '#3b82f6'}
              fill={activeTool === 'room' ? 'rgba(16, 185, 129, 0.1)' : activeTool === 'rectangle' ? 'rgba(16, 185, 129, 0.1)' : undefined}
              strokeWidth={2 / viewState.zoom}
              dash={[4 / viewState.zoom, 2 / viewState.zoom]}
              listening={false}
            />
          )}

          {/* Circle preview */}
          {isBoxSelecting && selectionBox && activeTool === 'circle' && (
            <Circle
              x={(selectionBox.start.x + selectionBox.end.x) / 2}
              y={(selectionBox.start.y + selectionBox.end.y) / 2}
              radius={Math.max(
                Math.abs(selectionBox.end.x - selectionBox.start.x),
                Math.abs(selectionBox.end.y - selectionBox.start.y)
              ) / 2}
              stroke="#3b82f6"
              fill="rgba(147, 197, 253, 0.2)"
              strokeWidth={2 / viewState.zoom}
              dash={[4 / viewState.zoom, 2 / viewState.zoom]}
              listening={false}
            />
          )}

          {/* Bezier curve preview */}
          {isBoxSelecting && selectionBox && activeTool === 'bezier' && (() => {
            const start = selectionBox.start;
            const end = selectionBox.end;
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 10) return null;

            // Calculate control point preview
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            const perpX = -dy;
            const perpY = dx;
            const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);
            const curveAmount = distance * 0.3;
            const controlX = midX + (perpX / perpLength) * curveAmount;
            const controlY = midY + (perpY / perpLength) * curveAmount;

            const pathData = `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;

            return (
              <Group listening={false}>
                <Path
                  data={pathData}
                  stroke="#8b5cf6"
                  strokeWidth={2 / viewState.zoom}
                  dash={[4 / viewState.zoom, 2 / viewState.zoom]}
                  fill="transparent"
                />
                {/* Show control point indicator */}
                <Circle
                  x={controlX}
                  y={controlY}
                  radius={4 / viewState.zoom}
                  fill="#8b5cf6"
                  opacity={0.5}
                />
                {/* Start point */}
                <Circle
                  x={start.x}
                  y={start.y}
                  radius={3 / viewState.zoom}
                  fill="white"
                  stroke="#8b5cf6"
                  strokeWidth={1 / viewState.zoom}
                />
                {/* End point */}
                <Circle
                  x={end.x}
                  y={end.y}
                  radius={3 / viewState.zoom}
                  fill="white"
                  stroke="#8b5cf6"
                  strokeWidth={1 / viewState.zoom}
                />
              </Group>
            );
          })()}

          {/* Measurement line - for ruler/measure tool */}
          {measureStart && measureEnd && (() => {
            // Use world coordinates directly - Stage already handles zoom/pan transform
            const x1 = measureStart.x;
            const y1 = measureStart.y;
            const x2 = measureEnd.x;
            const y2 = measureEnd.y;

            const dx = x2 - x1;
            const dy = y2 - y1;
            // Convert pixel distance to mm using pixelsPerMm
            const distancePixels = Math.sqrt(dx * dx + dy * dy);
            const distanceMm = distancePixels / scaleSettings.pixelsPerMm;

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            // Only show if there's a meaningful distance
            if (distancePixels < 5) return null;

            // Scale-independent sizes (divide by zoom to keep constant screen size)
            const strokeWidth = 2 / viewState.zoom;
            const markerSize = 6 / viewState.zoom;
            const circleRadius = 4 / viewState.zoom;
            const labelWidth = 90 / viewState.zoom;
            const labelHeight = 24 / viewState.zoom;
            const fontSize = 14 / viewState.zoom;
            const dashSize = [8 / viewState.zoom, 4 / viewState.zoom];

            return (
              <Group listening={false}>
                {/* Main measurement line */}
                <Line
                  points={[x1, y1, x2, y2]}
                  stroke="#ef4444"
                  strokeWidth={strokeWidth}
                  dash={dashSize}
                />
                {/* Start point */}
                <Circle x={x1} y={y1} radius={circleRadius} fill="#ef4444" />
                {/* End point */}
                <Circle x={x2} y={y2} radius={circleRadius} fill="#ef4444" />
                {/* X markers at endpoints */}
                <Line
                  points={[x1 - markerSize, y1 - markerSize, x1 + markerSize, y1 + markerSize]}
                  stroke="#ef4444"
                  strokeWidth={strokeWidth}
                />
                <Line
                  points={[x1 - markerSize, y1 + markerSize, x1 + markerSize, y1 - markerSize]}
                  stroke="#ef4444"
                  strokeWidth={strokeWidth}
                />
                <Line
                  points={[x2 - markerSize, y2 - markerSize, x2 + markerSize, y2 + markerSize]}
                  stroke="#ef4444"
                  strokeWidth={strokeWidth}
                />
                <Line
                  points={[x2 - markerSize, y2 + markerSize, x2 + markerSize, y2 - markerSize]}
                  stroke="#ef4444"
                  strokeWidth={strokeWidth}
                />
                {/* Distance label with background */}
                <Rect
                  x={midX - labelWidth / 2}
                  y={midY - labelHeight - 4 / viewState.zoom}
                  width={labelWidth}
                  height={labelHeight}
                  fill="white"
                  stroke="#ef4444"
                  strokeWidth={strokeWidth / 2}
                  cornerRadius={4 / viewState.zoom}
                />
                <KonvaText
                  x={midX - labelWidth / 2}
                  y={midY - labelHeight}
                  width={labelWidth}
                  text={formatDim(distanceMm)}
                  fontSize={fontSize}
                  fill="#ef4444"
                  align="center"
                  fontStyle="bold"
                />
                {/* Angle indicator */}
                <KonvaText
                  x={midX - 25 / viewState.zoom}
                  y={midY + 4 / viewState.zoom}
                  text={`${(Math.atan2(dy, dx) * 180 / Math.PI).toFixed(1)}°`}
                  fontSize={10 / viewState.zoom}
                  fill="#9ca3af"
                />
              </Group>
            );
          })()}

          {/* Multi-selection bounding box - visual indicator for group selection */}
          {multiSelectionBounds && !isBoxSelecting && (
            <Group listening={false}>
              <Rect
                x={multiSelectionBounds.x}
                y={multiSelectionBounds.y}
                width={multiSelectionBounds.width}
                height={multiSelectionBounds.height}
                stroke="#3b82f6"
                strokeWidth={2 / viewState.zoom}
                dash={[8 / viewState.zoom, 4 / viewState.zoom]}
                fill="rgba(59, 130, 246, 0.03)"
                cornerRadius={4 / viewState.zoom}
              />
              {/* Selection count badge */}
              <Group
                x={multiSelectionBounds.x + multiSelectionBounds.width - 30 / viewState.zoom}
                y={multiSelectionBounds.y - 12 / viewState.zoom}
              >
                <Rect
                  width={30 / viewState.zoom}
                  height={20 / viewState.zoom}
                  fill="#3b82f6"
                  cornerRadius={4 / viewState.zoom}
                />
                <KonvaText
                  text={String(multiSelectionBounds.count)}
                  fontSize={12 / viewState.zoom}
                  fill="white"
                  width={30 / viewState.zoom}
                  height={20 / viewState.zoom}
                  align="center"
                  verticalAlign="middle"
                />
              </Group>
            </Group>
          )}

          {/* Template Groups - rendered as unified transformable units */}
          <Group listening={!isReadOnly && activeTool !== 'measure'}>
            {templateGroups.map(({ groupId, shapes: groupShapes, leader }) => {
              const isGroupSelected = groupShapes.some(s => selectedShapeIds.includes(s.id));
              // Check if any shape in this group is individually selected
              const individualId = groupShapes.find(s => s.id === selectedGroupIndividualId)?.id || null;
              return (
                <TemplateGroupShape
                  key={`group-${groupId}`}
                  shapes={groupShapes}
                  groupLeader={leader}
                  isSelected={!isReadOnly && isGroupSelected}
                  selectedIndividualId={individualId}
                  onSelect={() => handleGroupSelect(groupId)}
                  onSelectIndividual={handleGroupIndividualSelect}
                  onOpenPropertyPanel={handleGroupOpenPropertyPanel}
                  onTransformGroup={handleGroupTransform}
                  pixelsPerMm={scaleSettings.pixelsPerMm}
                  gridSnapSize={projectSettings.snapEnabled ? projectSettings.gridInterval * scaleSettings.pixelsPerMm : 0}
                  snapEnabled={projectSettings.snapEnabled}
                  showDimensions={projectSettings.showDimensions}
                />
              );
            })}
          </Group>

          {/* Room shapes - rendered first (bottom layer), always listening for read-only click-through, disabled in measure mode */}
          <Group listening={activeTool !== 'measure'}>
          {(() => {
            const sortedShapes = [...individualShapes].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
            return sortedShapes.filter(s => s.type === 'room').map((shape) => {
              const isSelected = isReadOnly ? false : selectedShapeIds.includes(shape.id);
              const openRoomDetail = () => {
                if (shape.roomId) {
                  setShowPropertyPanel(false);
                  setPropertyPanelShape(null);
                  setSelectedRoomForDetail(shape.roomId);
                  setIsRoomDetailOpen(true);
                  toast.success(t('floormap.openingRoomDetails', 'Opening room details'));
                } else {
                  toast.info(t('floormap.roomMustBeSavedFirst', 'Room must be named and saved first.'));
                }
              };
              const handleSelect = isReadOnly
                ? (() => { openRoomDetail(); })
                : (evt?: KonvaEventObject<MouseEvent>) => handleShapeClick(shape.id, shape.type, evt);
              const handleTransform = isReadOnly ? (() => {}) : (updates: Partial<FloorMapShape>) => handleShapeTransform(shape.id, updates);
              const handleRoomDoubleClick = openRoomDetail;
              const roomIsHighlighted = !!(highlightedRoomIds && shape.roomId && highlightedRoomIds.includes(shape.roomId));
              return (
                <RoomShape
                  key={shape.id}
                  shape={shape}
                  isSelected={isSelected}
                  onSelect={handleSelect}
                  onDoubleClick={handleRoomDoubleClick}
                  onTransform={handleTransform}
                  shapeRefsMap={shapeRefs.current}
                  viewState={viewState}
                  scaleSettings={scaleSettings}
                  projectSettings={projectSettings}
                  snapSize={100 * scaleSettings.pixelsPerMm}
                  isReadOnly={isReadOnly}
                  isHighlighted={roomIsHighlighted}
                />
              );
            });
          })()}
          </Group>

          {/* Non-room individual shapes - sorted by zIndex, disabled in read-only and measure mode */}
          <Group listening={!isReadOnly && activeTool !== 'measure'}>
          {/* Unified wall outlines - renders merged L-shapes FIRST (underneath shapes) */}
          <WallGroupOutline
            walls={currentShapes.filter(s => s.type === 'wall' || s.type === 'line')}
            selectedIds={selectedShapeIds}
            zoom={viewState.zoom}
          />
          {/* Wall snap indicator - visual feedback during drag */}
          {wallSnapPreview && (
            <WallSnapIndicator
              wallId={wallSnapPreview.wallId}
              snapPoint={wallSnapPreview.snapPoint}
              snapRotation={wallSnapPreview.snapRotation}
              walls={currentShapes.filter(s => s.type === 'wall' || s.type === 'line')}
              zoom={viewState.zoom}
            />
          )}
          {(() => {
            // Pre-calculate wall indices for display
            const sortedShapes = [...individualShapes].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
            const nonRoomShapes = sortedShapes.filter(s => s.type !== 'room');
            const walls = nonRoomShapes.filter(s => s.type === 'wall' || s.type === 'line');
            const wallIndexMap = new Map<string, number>();
            walls.forEach((wall, idx) => wallIndexMap.set(wall.id, idx + 1));
            const totalWalls = walls.length;

            return nonRoomShapes.map((shape) => {
            const isSelected = isReadOnly ? false : selectedShapeIds.includes(shape.id);
            const handleSelect = isReadOnly ? undefined : (evt?: KonvaEventObject<MouseEvent>) => handleShapeClick(shape.id, shape.type, evt);
            const handleTransform = isReadOnly ? (() => {}) : (updates: Partial<FloorMapShape>) => handleShapeTransform(shape.id, updates);

            if (shape.type === 'freehand' || shape.type === 'polygon') {
              if (shape.metadata?.isLibrarySymbol) {
                return (<LibrarySymbolShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} />);
              }
              // Render unified objects (new SVG-based library)
              if (shape.metadata?.isUnifiedObject && shape.metadata?.unifiedObjectId) {
                const unifiedDef = getUnifiedObjectById(shape.metadata.unifiedObjectId as string);
                if (unifiedDef) {
                  const scale = (shape.metadata.scale as number) || 1;
                  let posX = (shape.metadata.placementX as number) || 0;
                  let posY = (shape.metadata.placementY as number) || 0;
                  let rotation = shape.rotation || 0;

                  // If object has wallRelative data, calculate position from wall
                  if (shape.wallRelative?.wallId) {
                    const wall = shapes.find(s => s.id === shape.wallRelative?.wallId);
                    if (wall) {
                      // Wall coordinates are in pixels, wallRelative distances are in mm
                      // We need to:
                      // 1. Get wall geometry (in pixels)
                      // 2. Calculate position along wall using mm distances converted to pixels
                      const wallCoords = wall.coordinates as { x1: number; y1: number; x2: number; y2: number };
                      if (wallCoords && typeof wallCoords.x1 === 'number') {
                        const dx = wallCoords.x2 - wallCoords.x1;
                        const dy = wallCoords.y2 - wallCoords.y1;
                        const wallLengthPx = Math.sqrt(dx * dx + dy * dy);
                        const angle = Math.atan2(dy, dx);

                        // Unit vectors
                        const unitX = dx / wallLengthPx;
                        const unitY = dy / wallLengthPx;
                        const normalX = -unitY;
                        const normalY = unitX;

                        // Convert mm distances to pixels
                        const distAlongPx = (shape.wallRelative.distanceFromWallStart + shape.wallRelative.width / 2) * scaleSettings.pixelsPerMm;
                        const perpOffsetPx = (shape.wallRelative.perpendicularOffset + shape.wallRelative.depth / 2) * scaleSettings.pixelsPerMm;

                        // Calculate position
                        posX = wallCoords.x1 + distAlongPx * unitX + perpOffsetPx * normalX;
                        posY = wallCoords.y1 + distAlongPx * unitY + perpOffsetPx * normalY;
                        rotation = (angle * 180) / Math.PI;
                      }
                    }
                  }

                  const symbol = unifiedDef.floorPlanSymbol;
                  const width = unifiedDef.dimensions.width * scaleSettings.pixelsPerMm * scale;
                  const height = unifiedDef.dimensions.depth * scaleSettings.pixelsPerMm * scale;
                  const [, , vbWidth, vbHeight] = symbol.viewBox.split(' ').map(Number);
                  const scaleX = width / vbWidth;
                  const scaleY = height / vbHeight;
                  const canSelect = activeTool === 'select';

                  // Track if object is wall-attached (for visual indicator)
                  const isWallAttached = Boolean(shape.wallRelative?.wallId);

                  // Comment count for this object
                  const objectCommentCount = commentCounts[shape.id] || 0;
                  const hasComments = objectCommentCount > 0;
                  const isCommentResolved = resolvedStatus[shape.id] || false;

                  return (
                    <Group
                      key={shape.id}
                      id={shape.id}
                      name={shape.id}
                      x={posX}
                      y={posY}
                      rotation={rotation}
                      draggable={canSelect}
                      listening={canSelect}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleSelect(e);
                      }}
                      onTap={(e) => {
                        e.cancelBubble = true;
                        handleSelect(e);
                      }}
                      onDragStart={(e) => {
                        e.cancelBubble = true;
                      }}
                      onDragEnd={(e) => {
                        e.cancelBubble = true;
                        // Get new position from drag
                        const newX = e.target.x();
                        const newY = e.target.y();

                        // Find nearest wall within threshold (300mm = 30cm)
                        const WALL_SNAP_THRESHOLD_MM = 300;
                        const thresholdPx = WALL_SNAP_THRESHOLD_MM * scaleSettings.pixelsPerMm;
                        const walls = shapes.filter(s => s.type === 'wall' || s.type === 'line');

                        let nearestWall: FloorMapShape | null = null;
                        let nearestDist = thresholdPx;
                        let nearestT = 0;

                        for (const wall of walls) {
                          const wc = wall.coordinates as { x1: number; y1: number; x2: number; y2: number };
                          if (!wc || typeof wc.x1 !== 'number') continue;

                          // Calculate distance from point to wall segment
                          const dx = wc.x2 - wc.x1;
                          const dy = wc.y2 - wc.y1;
                          const wallLenSq = dx * dx + dy * dy;
                          if (wallLenSq === 0) continue;

                          // Project point onto wall line
                          let t = ((newX - wc.x1) * dx + (newY - wc.y1) * dy) / wallLenSq;
                          t = Math.max(0, Math.min(1, t)); // Clamp to wall segment

                          const projX = wc.x1 + t * dx;
                          const projY = wc.y1 + t * dy;
                          const dist = Math.sqrt((newX - projX) ** 2 + (newY - projY) ** 2);

                          if (dist < nearestDist) {
                            nearestDist = dist;
                            nearestWall = wall;
                            nearestT = t;
                          }
                        }

                        if (nearestWall) {
                          // Snap to wall - calculate wall-relative position
                          const wc = nearestWall.coordinates as { x1: number; y1: number; x2: number; y2: number };
                          const dx = wc.x2 - wc.x1;
                          const dy = wc.y2 - wc.y1;
                          const wallLengthPx = Math.sqrt(dx * dx + dy * dy);
                          const wallLengthMM = wallLengthPx / scaleSettings.pixelsPerMm;

                          // Distance along wall in mm
                          const distAlongMM = nearestT * wallLengthMM - (unifiedDef.dimensions.width / 2);

                          // Perpendicular offset in mm (how far from wall center)
                          const perpDistPx = nearestDist;
                          const perpDistMM = perpDistPx / scaleSettings.pixelsPerMm - (unifiedDef.dimensions.depth / 2);

                          // Preserve elevation or use default
                          const elevationBottom = shape.wallRelative?.elevationBottom ??
                            unifiedDef.wallBehavior.defaultElevationMM;

                          updateShape(shape.id, {
                            wallRelative: {
                              wallId: nearestWall.id,
                              distanceFromWallStart: Math.max(0, distAlongMM),
                              perpendicularOffset: Math.max(0, perpDistMM),
                              elevationBottom,
                              width: unifiedDef.dimensions.width,
                              height: unifiedDef.dimensions.height,
                              depth: unifiedDef.dimensions.depth,
                            },
                            metadata: {
                              ...shape.metadata,
                              placementX: newX,
                              placementY: newY,
                            },
                          });
                        } else {
                          // No wall nearby - make freestanding (remove wallRelative)
                          updateShape(shape.id, {
                            wallRelative: undefined,
                            metadata: {
                              ...shape.metadata,
                              placementX: newX,
                              placementY: newY,
                            },
                          });
                        }

                        // Reset node position (store update will re-render)
                        e.target.position({ x: posX, y: posY });
                      }}
                      onDblClick={(e) => {
                        e.cancelBubble = true;
                        // Open property panel on double-click
                        setPropertyPanelShape(shape);
                        setShowPropertyPanel(true);
                      }}
                      onContextMenu={(e) => {
                        e.evt.preventDefault();
                        e.cancelBubble = true;
                        // Open comment popover on right-click
                        const stage = e.target.getStage();
                        if (stage) {
                          const containerRect = stage.container().getBoundingClientRect();
                          const pointer = stage.getPointerPosition();
                          if (pointer) {
                            setActiveComment({
                              objectId: shape.id,
                              position: {
                                x: containerRect.left + pointer.x,
                                y: containerRect.top + pointer.y,
                              },
                            });
                          }
                        }
                      }}
                      onMouseEnter={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'pointer';
                        setHoveredShapeId(shape.id);
                        setHoverMousePosition({ x: e.evt.clientX, y: e.evt.clientY });
                      }}
                      onMouseLeave={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = activeTool === 'select' ? 'default' : 'crosshair';
                        setHoveredShapeId(null);
                        setHoverMousePosition(null);
                      }}
                      onMouseMove={(e) => {
                        if (hoveredShapeId === shape.id) {
                          setHoverMousePosition({ x: e.evt.clientX, y: e.evt.clientY });
                        }
                      }}
                      ref={(node) => {
                        if (node) shapeRefs.current.set(shape.id, node);
                      }}
                    >
                      {/* Hit area with shapeId for hover detection */}
                      <Rect
                        x={-width / 2 - 4 / viewState.zoom}
                        y={-height / 2 - 4 / viewState.zoom}
                        width={width + 8 / viewState.zoom}
                        height={height + 8 / viewState.zoom}
                        fill="transparent"
                        shapeId={shape.id}
                      />
                      {/* Selection highlight */}
                      {isSelected && (
                        <Rect
                          x={-width / 2 - 4 / viewState.zoom}
                          y={-height / 2 - 4 / viewState.zoom}
                          width={width + 8 / viewState.zoom}
                          height={height + 8 / viewState.zoom}
                          fill="rgba(59, 130, 246, 0.1)"
                          stroke="#3b82f6"
                          strokeWidth={2 / viewState.zoom}
                          dash={[4 / viewState.zoom, 4 / viewState.zoom]}
                          listening={false}
                        />
                      )}
                      {/* Wall attachment indicator */}
                      {isWallAttached && (
                        <Line
                          points={[0, -height/2 - 2/viewState.zoom, 0, height/2 + 2/viewState.zoom]}
                          stroke={isSelected ? '#3b82f6' : '#9ca3af'}
                          strokeWidth={3 / viewState.zoom}
                          lineCap="round"
                          listening={false}
                        />
                      )}
                      {/* SVG Symbol */}
                      <Group x={-width / 2} y={-height / 2}>
                        {symbol.paths.map((path, index) => (
                          <Path
                            key={index}
                            data={path.d}
                            fill={path.fill || 'none'}
                            stroke={isSelected ? '#3b82f6' : (path.stroke || '#374151')}
                            strokeWidth={(path.strokeWidth || 2) * Math.min(scaleX, scaleY)}
                            scaleX={scaleX}
                            scaleY={scaleY}
                            listening={false}
                            perfectDrawEnabled={false}
                          />
                        ))}
                      </Group>
                    </Group>
                  );
                }
              }
              if (shape.metadata?.isObjectLibrary) {
                return (<ObjectLibraryShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} />);
              }
              return (<FreehandShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} />);
            }

            if (shape.type === 'wall' || shape.type === 'line') {
              const handleBatchLength = (newLengthMM: number) => handleBatchWallLengthChange(shape.id, newLengthMM);
              const wallIndex = wallIndexMap.get(shape.id);
              return (<WallShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} viewState={viewState} scaleSettings={scaleSettings} projectSettings={projectSettings} onBatchLengthChange={handleBatchLength} wallIndex={wallIndex} totalWalls={totalWalls} />);
            }
            
            if (shape.type === 'rectangle') {
              return (<RectangleShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} />);
            }
            
            if (shape.type === 'circle') {
              return (<CircleShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} />);
            }
            
            if (shape.type === 'text') {
              return (<TextShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} onEdit={handleTextEdit} />);
            }

            if (shape.type === 'bezier') {
              return (<BezierShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} viewState={viewState} scaleSettings={scaleSettings} projectSettings={projectSettings} />);
            }

            // Line-based opening shapes (window, door, sliding door)
            if (shape.type === 'window_line') {
              const handleBatchLength = (newLengthMM: number) => handleBatchWallLengthChange(shape.id, newLengthMM);
              return (<WindowLineShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} viewState={viewState} scaleSettings={scaleSettings} projectSettings={projectSettings} onBatchLengthChange={handleBatchLength} />);
            }

            if (shape.type === 'door_line') {
              const handleBatchLength = (newLengthMM: number) => handleBatchWallLengthChange(shape.id, newLengthMM);
              return (<DoorLineShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} viewState={viewState} scaleSettings={scaleSettings} projectSettings={projectSettings} onBatchLengthChange={handleBatchLength} />);
            }

            if (shape.type === 'sliding_door_line') {
              const handleBatchLength = (newLengthMM: number) => handleBatchWallLengthChange(shape.id, newLengthMM);
              return (<SlidingDoorLineShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} viewState={viewState} scaleSettings={scaleSettings} projectSettings={projectSettings} onBatchLengthChange={handleBatchLength} />);
            }

            // Background image shapes
            if (shape.type === 'image') {
              return (<ImageShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} />);
            }

            return null;
          });
          })()}
          </Group>


          {/* Transformer removed - shapes handle their own selection visual (blue stroke) */}
          {/* Multi-select dragging handled by unified drag system */}

          {/* Comment indicators - blue badges on shapes with comments */}
          <Group>
            {currentShapes.map((shape) => {
              const count = commentCounts[shape.id];
              if (!count || count === 0) return null;
              if (!shape.coordinates) return null;

              const isResolved = resolvedStatus[shape.id];

              // Calculate position based on shape type
              let indicatorX: number | null = null;
              let indicatorY: number | null = null;

              try {
                if (shape.type === 'room') {
                  const coords = shape.coordinates as { points?: { x: number; y: number }[] };
                  if (coords.points && coords.points.length > 0) {
                    const xs = coords.points.map(p => p.x);
                    const ys = coords.points.map(p => p.y);
                    indicatorX = Math.max(...xs);
                    indicatorY = Math.min(...ys);
                  }
                } else if (shape.type === 'wall' || shape.type === 'line') {
                  const coords = shape.coordinates as { x1?: number; y1?: number; x2?: number; y2?: number };
                  if (coords.x1 != null && coords.x2 != null && coords.y1 != null && coords.y2 != null) {
                    indicatorX = Math.max(coords.x1, coords.x2);
                    indicatorY = Math.min(coords.y1, coords.y2);
                  }
                } else if (shape.type === 'rectangle') {
                  const coords = shape.coordinates as { left?: number; x?: number; top?: number; y?: number; width?: number };
                  const x = coords.left ?? coords.x ?? 0;
                  const y = coords.top ?? coords.y ?? 0;
                  const width = coords.width ?? 100;
                  indicatorX = x + width;
                  indicatorY = y;
                } else if (shape.type === 'circle') {
                  const coords = shape.coordinates as { cx?: number; x?: number; cy?: number; y?: number; radius?: number };
                  const cx = coords.cx ?? coords.x ?? 0;
                  const cy = coords.cy ?? coords.y ?? 0;
                  const r = coords.radius ?? 50;
                  indicatorX = cx + r * 0.7;
                  indicatorY = cy - r * 0.7;
                } else if (shape.type === 'text') {
                  const coords = shape.coordinates as { x?: number; y?: number };
                  indicatorX = (coords.x ?? 0) + 50;
                  indicatorY = (coords.y ?? 0) - 10;
                } else if (shape.type === 'freehand' || shape.type === 'polygon') {
                  // Handle unified objects (SVG-based library objects with wallRelative)
                  if (shape.metadata?.isUnifiedObject && shape.metadata?.unifiedObjectId) {
                    const unifiedDef = getUnifiedObjectById(shape.metadata.unifiedObjectId as string);
                    const scale = (shape.metadata.scale as number) || 1;
                    let posX = (shape.metadata.placementX as number) || 0;
                    let posY = (shape.metadata.placementY as number) || 0;

                    // If object has wallRelative data, calculate position from wall
                    if (shape.wallRelative?.wallId) {
                      const wall = shapes.find(s => s.id === shape.wallRelative?.wallId);
                      if (wall) {
                        const wallCoords = wall.coordinates as { x1: number; y1: number; x2: number; y2: number };
                        if (wallCoords && typeof wallCoords.x1 === 'number') {
                          const dx = wallCoords.x2 - wallCoords.x1;
                          const dy = wallCoords.y2 - wallCoords.y1;
                          const wallLengthPx = Math.sqrt(dx * dx + dy * dy);
                          const unitX = dx / wallLengthPx;
                          const unitY = dy / wallLengthPx;
                          const normalX = -unitY;
                          const normalY = unitX;
                          const distAlongPx = (shape.wallRelative.distanceFromWallStart + shape.wallRelative.width / 2) * scaleSettings.pixelsPerMm;
                          const perpOffsetPx = (shape.wallRelative.perpendicularOffset + shape.wallRelative.depth / 2) * scaleSettings.pixelsPerMm;
                          posX = wallCoords.x1 + distAlongPx * unitX + perpOffsetPx * normalX;
                          posY = wallCoords.y1 + distAlongPx * unitY + perpOffsetPx * normalY;
                        }
                      }
                    }

                    // Position badge at top-right of the object
                    const width = unifiedDef ? unifiedDef.dimensions.width * scaleSettings.pixelsPerMm * scale : 40;
                    indicatorX = posX + width / 2;
                    indicatorY = posY - width / 2;
                  } else {
                    // Standard freehand/polygon with points
                    const coords = shape.coordinates as { points?: { x: number; y: number }[] };
                    if (coords.points && coords.points.length > 0) {
                      const xs = coords.points.map(p => p.x);
                      const ys = coords.points.map(p => p.y);
                      indicatorX = Math.max(...xs);
                      indicatorY = Math.min(...ys);
                    }
                  }
                }
              } catch {
                return null; // Skip if calculation fails
              }

              // Skip if position couldn't be calculated
              if (indicatorX == null || indicatorY == null || !isFinite(indicatorX) || !isFinite(indicatorY)) {
                return null;
              }

              const badgeSize = 18 / viewState.zoom;
              const fontSize = 10 / viewState.zoom;

              return (
                <Group
                  key={`comment-${shape.id}`}
                  x={indicatorX}
                  y={indicatorY - badgeSize / 2}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    const stage = e.target.getStage();
                    if (stage) {
                      const containerRect = stage.container().getBoundingClientRect();
                      const pointer = stage.getPointerPosition();
                      if (pointer) {
                        handleOpenComments(shape.id, containerRect.left + pointer.x, containerRect.top + pointer.y);
                      }
                    }
                  }}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'pointer';
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                  }}
                >
                  <Rect
                    x={0}
                    y={0}
                    width={badgeSize}
                    height={badgeSize}
                    fill={isResolved ? '#22c55e' : '#3b82f6'}
                    cornerRadius={badgeSize / 2}
                    shadowColor="#000"
                    shadowBlur={3 / viewState.zoom}
                    shadowOpacity={0.3}
                  />
                  <KonvaText
                    x={isResolved ? badgeSize * 0.2 : (count > 9 ? badgeSize * 0.15 : badgeSize * 0.35)}
                    y={isResolved ? badgeSize * 0.15 : badgeSize * 0.2}
                    text={isResolved ? '✓' : (count > 9 ? '9+' : String(count))}
                    fontSize={isResolved ? fontSize * 1.1 : fontSize}
                    fontStyle="bold"
                    fill="white"
                  />
                </Group>
              );
            })}
          </Group>
        </Layer>
      </Stage>

      {/* CAD-style numeric input overlay - shows typed length during wall drawing */}
      {showNumericInput && isDrawing && currentDrawingPoints.length > 0 && (
        <div
          style={{
            position: 'fixed',
            left: currentMousePosRef.current.x * viewState.zoom + viewState.panX + 20,
            top: currentMousePosRef.current.y * viewState.zoom + viewState.panY - 30,
            background: '#1e293b',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span style={{ color: '#60a5fa' }}>{numericInput || '0'}</span>
          <span style={{ color: '#94a3b8', fontSize: '12px' }}>mm</span>
          <span style={{ color: '#475569', fontSize: '11px', marginLeft: '8px' }}>Enter ↵</span>
        </div>
      )}

      {/* Minimap - Floating overview in bottom-right */}
      <Minimap
        shapes={currentShapes}
        canvasWidth={CANVAS_WIDTH}
        canvasHeight={CANVAS_HEIGHT}
        viewState={viewState}
        onViewportClick={(canvasX, canvasY) => {
          // Center viewport on clicked position
          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;
          
          const unconstrained = {
            panX: centerX - canvasX * viewState.zoom,
            panY: centerY - canvasY * viewState.zoom,
          };
          
          // Constrain pan to canvas bounds
          const constrained = constrainPan(unconstrained.panX, unconstrained.panY, viewState.zoom);
          
          setViewState({
            ...constrained,
          });
        }}
        gridWidth={CANVAS_WIDTH}
        gridHeight={CANVAS_HEIGHT}
        marginOffset={0}
      />

      {/* Context Menu (right-click) */}
      {contextMenuPos && (
        <ToolContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          recentTools={recentTools}
          onSelectTool={(tool) => {
            setActiveTool(tool);
            closeContextMenu();
          }}
          onClose={closeContextMenu}
          onOpenAIImport={() => {
            window.dispatchEvent(new CustomEvent('openAIImport'));
          }}
          onOpenImageImport={() => {
            window.dispatchEvent(new CustomEvent('openImageImport'));
          }}
          onOpenPinterestImport={() => {
            window.dispatchEvent(new CustomEvent('openPinterestImport'));
          }}
          onOpenTemplates={() => {
            window.dispatchEvent(new CustomEvent('openTemplateGallery'));
          }}
          // Selection-related props
          hasSelection={selectedShapeIds.length > 0}
          selectionCount={selectedShapeIds.length}
          selectionType={selectedShapeIds.length > 0 ? currentShapes.find(s => s.id === selectedShapeIds[0])?.type : undefined}
          hasRoomInSelection={selectedShapeIds.some(id => currentShapes.find(s => s.id === id)?.type === 'room')}
          hasWallInSelection={selectedShapeIds.some(id => {
            const shape = currentShapes.find(s => s.id === id);
            return shape?.type === 'wall' || shape?.type === 'line';
          })}
          onAddComment={selectedShapeIds.length === 1 ? () => handleOpenComments() : undefined}
          commentCount={selectedShapeIds.length === 1 ? commentCounts[selectedShapeIds[0]] : undefined}
          isCommentResolved={selectedShapeIds.length === 1 ? resolvedStatus[selectedShapeIds[0]] : undefined}
          onShowProperties={() => {
            // Find the selected shape(s) and open property panel
            if (selectedShapeIds.length > 0) {
              const firstSelectedShape = currentShapes.find(s => s.id === selectedShapeIds[0]);
              if (firstSelectedShape) {
                // For rooms with roomId, open room detail dialog
                if (firstSelectedShape.type === 'room' && firstSelectedShape.roomId) {
                  setShowPropertyPanel(false);
                  setPropertyPanelShape(null);
                  setSelectedRoomForDetail(firstSelectedShape.roomId);
                  setIsRoomDetailOpen(true);
                } else {
                  // For other shapes, open property panel
                  setSelectedShapeId(firstSelectedShape.id);
                  setPropertyPanelShape(firstSelectedShape);
                  setShowPropertyPanel(true);
                }
              }
            }
          }}
          onDeleteSelection={() => {
            if (selectedShapeIds.length > 0) {
              deleteShapes(selectedShapeIds);
              setSelectedShapeIds([]);
              toast.success(`${selectedShapeIds.length > 1 ? selectedShapeIds.length + ' objekt' : 'Objekt'} borttaget`);
            }
          }}
          onBringForward={() => {
            if (selectedShapeIds.length > 0) {
              selectedShapeIds.forEach(id => bringForward(id));
            }
          }}
          onSendBackward={() => {
            if (selectedShapeIds.length > 0) {
              selectedShapeIds.forEach(id => sendBackward(id));
            }
          }}
          onBringToFront={() => {
            if (selectedShapeIds.length > 0) {
              selectedShapeIds.forEach(id => bringToFront(id));
            }
          }}
          onSendToBack={() => {
            if (selectedShapeIds.length > 0) {
              selectedShapeIds.forEach(id => sendToBack(id));
            }
          }}
          onCreateWallsFromRoom={() => {
            // Find all selected rooms
            const selectedRooms = selectedShapeIds
              .map(id => currentShapes.find(s => s.id === id))
              .filter((s): s is FloorMapShape => s?.type === 'room');

            if (selectedRooms.length > 0) {
              const { wallThicknessMM, wallHeightMM } = getAdminDefaults();

              // Get existing walls to avoid duplicates
              const existingWalls = currentShapes.filter(s => s.type === 'wall' || s.type === 'line');

              // Generate walls with automatic deduplication
              // This prevents duplicate walls where rooms share edges
              const walls = generateWallsFromRooms(selectedRooms, uuidv4, {
                heightMM: wallHeightMM,
                thicknessMM: wallThicknessMM,
                planId: currentPlanId || undefined,
              }, existingWalls);

              walls.forEach(wall => addShape(wall));

              if (walls.length > 0) {
                const roomText = selectedRooms.length === 1 ? 'rummet' : `${selectedRooms.length} rum`;
                const dedupNote = selectedRooms.length > 1 ? ' (utan dubbletter)' : '';
                toast.success(`${walls.length} väggar skapade runt ${roomText}${dedupNote}`);
              }
            }
          }}
          onViewElevation={() => {
            // Find selected room or wall
            if (selectedShapeIds.length > 0) {
              const firstSelected = currentShapes.find(s => s.id === selectedShapeIds[0]);
              if (!firstSelected) return;

              // If a room is selected, show room-centric elevation view
              if (firstSelected.type === 'room') {
                setElevationInitialWallId(undefined); // No specific wall
                setRoomElevationShape(firstSelected);
                return;
              }

              // If a wall is selected, show wall-centric elevation view
              // This shows the entire "logical wall" - all collinear segments plus openings
              if (firstSelected.type === 'wall' || firstSelected.type === 'line') {
                setWallElevationId(firstSelected.id);
              }
            }
          }}
        />
      )}

      {/* Hover info tooltip - shows dimensions on hover (BIM/CAD standard) */}
      <HoverInfoTooltip
        shape={hoveredShapeId ? currentShapes.find(s => s.id === hoveredShapeId) || null : null}
        mousePosition={hoverMousePosition}
        unit={projectSettings.unit}
      />

      {/* Inline Comments Popover */}
      {activeComment && (
        <InlineCommentPopover
          objectId={activeComment.objectId}
          projectId={currentProjectId}
          position={activeComment.position}
          onClose={handleCloseComments}
          onCommentCountChange={(count) => handleCommentCountChange(activeComment.objectId, count)}
          onResolvedChange={(isResolved) => handleResolvedChange(activeComment.objectId, isResolved)}
          isResolved={resolvedStatus[activeComment.objectId] || false}
        />
      )}
    </div>
  );
};

export default UnifiedKonvaCanvas;
