/**
 * ElevationCanvas - Side view of walls for the floor planner
 *
 * Shows walls from a side perspective with:
 * - Wall height visualization
 * - Door/window openings
 * - Custom elevation shapes (rectangles, circles, etc.)
 * - Drawing toolbar for elevation-specific objects
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Stage, Layer, Rect, Line, Text as KonvaText, Group, Circle, Transformer } from 'react-konva';
import Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';
import { useFloorMapStore } from './store';
import { FloorMapShape } from './types';
import { wallRelativeToElevation, getCombinedWallElevationData, CombinedWallElevationData } from './canvas/utils/wallCoordinates';
import { inferCategoryFromSymbolType } from './canvas/utils/wallObjectDefaults';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Layers, Save, Eye, Compass, X, Home } from 'lucide-react';
import { findWallsForRoom, WallDirection, RoomWall, getDirectionLabel } from './utils/roomWalls';
import { getAdminDefaults } from './canvas/constants';
import { ElevationToolbar } from './ElevationToolbar';
import { ElevationShapeDialog } from './ElevationShapeDialog';
import { ElevationInfoPopover } from './ElevationInfoPopover';
import { saveShapesForPlan } from './utils/plans';
import { ElevationSymbolDefinition } from './ElevationSymbolLibrary';
import { ElevationSmartData } from './ElevationSmartData';
import { toast } from 'sonner';

// Helper to format dimension
const formatDim = (value: number): string => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}m`;
  } else if (value >= 10) {
    return `${(value / 10).toFixed(1)}cm`;
  }
  return `${Math.round(value)}mm`;
};

// Helper to get fill color based on symbol category
const getSymbolColor = (category: string): string => {
  const colors: Record<string, string> = {
    openings: '#e0f2fe',    // Light blue for windows/doors
    electrical: '#fef3c7',  // Light yellow for electrical
    lighting: '#fef9c3',    // Lighter yellow for lighting
    kitchen: '#f5f5f4',     // Light stone for kitchen
    trim: '#ffffff',        // White for trim
    hvac: '#f0fdf4',        // Light green for HVAC
    furniture: '#fdf4ff',   // Light purple for furniture
  };
  return colors[category] || '#f3f4f6';
};

// Helper to get stroke color based on symbol category
const getSymbolStrokeColor = (category: string): string => {
  const colors: Record<string, string> = {
    openings: '#0284c7',    // Blue
    electrical: '#ca8a04',  // Yellow/amber
    lighting: '#eab308',    // Yellow
    kitchen: '#78716c',     // Stone
    trim: '#a1a1aa',        // Gray
    hvac: '#16a34a',        // Green
    furniture: '#a855f7',   // Purple
  };
  return colors[category] || '#374151';
};

interface ElevationCanvasProps {
  projectId: string;
  /** Optional: Room to view elevation for (room-based mode) */
  room?: FloorMapShape;
  /** Optional: Initial direction when opening in room-based mode */
  initialDirection?: 'north' | 'east' | 'south' | 'west';
  /** Callback when view is closed */
  onClose?: () => void;
}

// Find openings (doors/windows) on a wall
const findOpeningsOnWall = (wall: FloorMapShape, allShapes: FloorMapShape[]): FloorMapShape[] => {
  const wallCoords = wall.coordinates as { x1: number; y1: number; x2: number; y2: number };

  return allShapes.filter(shape => {
    if (!['door_line', 'window_line', 'sliding_door_line'].includes(shape.type)) return false;

    const openingCoords = shape.coordinates as { x1: number; y1: number; x2: number; y2: number };

    const wallDx = wallCoords.x2 - wallCoords.x1;
    const wallDy = wallCoords.y2 - wallCoords.y1;
    const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);

    const openingMidX = (openingCoords.x1 + openingCoords.x2) / 2;
    const openingMidY = (openingCoords.y1 + openingCoords.y2) / 2;

    const t = Math.max(0, Math.min(1,
      ((openingMidX - wallCoords.x1) * wallDx + (openingMidY - wallCoords.y1) * wallDy) / (wallLength * wallLength)
    ));

    const closestX = wallCoords.x1 + t * wallDx;
    const closestY = wallCoords.y1 + t * wallDy;

    const distance = Math.sqrt(
      Math.pow(openingMidX - closestX, 2) + Math.pow(openingMidY - closestY, 2)
    );

    return distance < 50;
  });
};

// Find openings within a room's boundary (for room-based elevation view)
const findOpeningsInRoom = (
  room: FloorMapShape,
  allShapes: FloorMapShape[]
): FloorMapShape[] => {
  const roomCoords = room.coordinates as { points?: { x: number; y: number }[] };
  if (!roomCoords.points || roomCoords.points.length < 3) return [];

  // Helper to check if a point is inside the room polygon
  const isPointInRoom = (x: number, y: number): boolean => {
    const polygon = roomCoords.points!;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  return allShapes.filter(shape => {
    if (!['door_line', 'window_line', 'sliding_door_line'].includes(shape.type)) return false;
    if (shape.planId !== room.planId) return false;

    const coords = shape.coordinates as { x1: number; y1: number; x2: number; y2: number };
    const midX = (coords.x1 + coords.x2) / 2;
    const midY = (coords.y1 + coords.y2) / 2;

    // Check if the opening's midpoint is on or very close to the room's boundary
    // We use a tolerance since openings sit on the wall, not inside the room
    const tolerance = 100; // 100 pixels tolerance

    // Check if midpoint is inside expanded room boundary or on an edge
    for (let i = 0; i < roomCoords.points!.length; i++) {
      const p1 = roomCoords.points![i];
      const p2 = roomCoords.points![(i + 1) % roomCoords.points!.length];

      const edgeDx = p2.x - p1.x;
      const edgeDy = p2.y - p1.y;
      const edgeLength = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);

      if (edgeLength === 0) continue;

      // Project opening midpoint onto edge
      const t = Math.max(0, Math.min(1,
        ((midX - p1.x) * edgeDx + (midY - p1.y) * edgeDy) / (edgeLength * edgeLength)
      ));

      const closestX = p1.x + t * edgeDx;
      const closestY = p1.y + t * edgeDy;

      const distance = Math.sqrt(
        Math.pow(midX - closestX, 2) + Math.pow(midY - closestY, 2)
      );

      if (distance < tolerance) {
        return true; // Opening is on this room's boundary
      }
    }

    return false;
  });
};

// Calculate wall length in mm
const getWallLength = (wall: FloorMapShape, pixelsPerMm: number): number => {
  const coords = wall.coordinates as { x1: number; y1: number; x2: number; y2: number };
  const dx = coords.x2 - coords.x1;
  const dy = coords.y2 - coords.y1;
  return Math.sqrt(dx * dx + dy * dy) / pixelsPerMm;
};

// Get opening position along wall (0-1)
const getOpeningPositionOnWall = (opening: FloorMapShape, wall: FloorMapShape): number => {
  const wallCoords = wall.coordinates as { x1: number; y1: number; x2: number; y2: number };
  const openingCoords = opening.coordinates as { x1: number; y1: number; x2: number; y2: number };

  const wallDx = wallCoords.x2 - wallCoords.x1;
  const wallDy = wallCoords.y2 - wallCoords.y1;
  const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);

  const openingMidX = (openingCoords.x1 + openingCoords.x2) / 2;
  const openingMidY = (openingCoords.y1 + openingCoords.y2) / 2;

  const t = ((openingMidX - wallCoords.x1) * wallDx + (openingMidY - wallCoords.y1) * wallDy) / (wallLength * wallLength);

  return Math.max(0, Math.min(1, t));
};

// Get opening width in mm
const getOpeningWidth = (opening: FloorMapShape, pixelsPerMm: number): number => {
  const coords = opening.coordinates as { x1: number; y1: number; x2: number; y2: number };
  const dx = coords.x2 - coords.x1;
  const dy = coords.y2 - coords.y1;
  return Math.sqrt(dx * dx + dy * dy) / pixelsPerMm;
};

export const ElevationCanvas: React.FC<ElevationCanvasProps> = ({
  projectId,
  room: initialRoom,
  initialDirection = 'north',
  onClose
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Refs to store current wall geometry for use in callbacks
  const wallGeometryRef = useRef<{
    wallX: number;
    wallY: number;
    effectiveScale: number;
    wallLengthMM: number;
    wallHeightMM: number;
  } | null>(null);

  const {
    shapes,
    currentPlanId,
    scaleSettings,
    activeTool,
    setActiveTool,
    addShape,
    updateShape,
    deleteShapes,
    selectedShapeIds,
    setSelectedShapeIds,
    saveToHistory,
    syncShapeFromElevation,
    updateShapeWallRelative,
  } = useFloorMapStore();

  const { pixelsPerMm } = scaleSettings;
  const adminDefaults = getAdminDefaults();

  // State
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Room-based mode state
  const [currentRoom, setCurrentRoom] = useState<FloorMapShape | null>(initialRoom || null);
  const [currentDirection, setCurrentDirection] = useState<WallDirection>(initialDirection);

  // Room perspective selector - which room to view the wall from (legacy, kept for compatibility)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Get walls for the current room organized by direction
  const roomWalls = useMemo(() => {
    if (!currentRoom) return [];
    return findWallsForRoom(currentRoom, shapes);
  }, [currentRoom, shapes]);

  // Get the wall(s) for the current direction
  const wallsForDirection = useMemo(() => {
    return roomWalls.filter(rw => rw.direction === currentDirection);
  }, [roomWalls, currentDirection]);

  // In room-based mode, auto-select the first wall for the current direction
  useEffect(() => {
    if (currentRoom && wallsForDirection.length > 0 && !selectedWallId) {
      setSelectedWallId(wallsForDirection[0].wall.id);
    }
  }, [currentRoom, wallsForDirection, selectedWallId]);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

  // History for undo/redo
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Shape details dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedShapeForDialog, setSelectedShapeForDialog] = useState<FloorMapShape | null>(null);

  // Info popover state (for single-click quick info)
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverShape, setPopoverShape] = useState<FloorMapShape | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [popoverIsWall, setPopoverIsWall] = useState(false);

  // Wall dialog state (for editing wall materials)
  const [wallDialogOpen, setWallDialogOpen] = useState(false);

  // Measure tool state
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number; y: number } | null>(null);

  // Real-time transform tracking for dimension display during resize
  const [transformingShape, setTransformingShape] = useState<{
    id: string;
    width?: number;
    height?: number;
    radius?: number;
  } | null>(null);

  // Smart data panel state
  const [smartDataOpen, setSmartDataOpen] = useState(false);

  // Get all walls from current plan (floor view shapes)
  const walls = shapes.filter(
    s => s.planId === currentPlanId && (s.type === 'wall' || s.type === 'line') && s.shapeViewMode !== 'elevation'
  );

  // Get selected wall
  const selectedWall = walls.find(w => w.id === selectedWallId) || walls[0];
  const selectedWallIndex = selectedWall ? walls.indexOf(selectedWall) : 0;

  // Get elevation-specific shapes filtered by selected wall
  // Shows shapes that belong to this wall, or shapes without parentWallId (legacy) if this is the first wall
  const elevationShapes = shapes.filter(s => {
    if (s.planId !== currentPlanId || s.shapeViewMode !== 'elevation') return false;
    // If shape has parentWallId, only show on that wall
    if (s.parentWallId) return s.parentWallId === selectedWall?.id;
    // Legacy shapes without parentWallId: show on first wall only
    return selectedWallIndex === 0;
  });

  // Get wall-relative objects (from floorplan) that are attached to this wall
  // These are synced bidirectionally between floorplan and elevation views
  const wallRelativeObjects = shapes.filter(s => {
    if (s.planId !== currentPlanId) return false;
    if (s.shapeViewMode === 'elevation') return false; // Already in elevationShapes
    // Must have wallRelative data attached to the current wall
    return s.wallRelative?.wallId === selectedWall?.id;
  });

  // Handle container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Select wall based on floor plan selection, or first wall if none selected
  useEffect(() => {
    if (walls.length === 0) return;

    // Check if there's a wall selected in the floor plan view
    const selectedWallFromPlan = selectedShapeIds.length === 1
      ? walls.find(w => w.id === selectedShapeIds[0])
      : null;

    if (selectedWallFromPlan) {
      // Use the wall selected in floor plan
      setSelectedWallId(selectedWallFromPlan.id);
    } else if (!selectedWallId || !walls.find(w => w.id === selectedWallId)) {
      // Fall back to first wall if no valid selection
      setSelectedWallId(walls[0].id);
    }
  }, [walls, selectedWallId, selectedShapeIds]);

  // Update transformer when selection changes
  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const stage = stageRef.current;
      const selectedNodes = selectedShapeIds
        .map(id => stage.findOne(`#elevation-shape-${id}`))
        .filter(Boolean) as Konva.Node[];

      transformerRef.current.nodes(selectedNodes);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedShapeIds]);

  // Navigation
  const goToPreviousWall = useCallback(() => {
    if (walls.length === 0) return;
    const newIndex = (selectedWallIndex - 1 + walls.length) % walls.length;
    setSelectedWallId(walls[newIndex].id);
    setPanX(0);
    setPanY(0);
  }, [walls, selectedWallIndex]);

  const goToNextWall = useCallback(() => {
    if (walls.length === 0) return;
    const newIndex = (selectedWallIndex + 1) % walls.length;
    setSelectedWallId(walls[newIndex].id);
    setPanX(0);
    setPanY(0);
  }, [walls, selectedWallIndex]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, 0.3));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, []);

  // Handle wheel for pan and zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    if (e.evt.ctrlKey || e.evt.metaKey) {
      const scaleBy = 1.1;
      const newZoom = e.evt.deltaY < 0 ? zoom * scaleBy : zoom / scaleBy;
      setZoom(Math.max(0.3, Math.min(3, newZoom)));
    } else {
      setPanX(prev => prev - e.evt.deltaX);
      setPanY(prev => prev - e.evt.deltaY);
    }
  }, [zoom]);

  // Get pointer position relative to stage (in screen coordinates)
  const getPointerPosition = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return pos;
  }, []);

  // Convert screen position to wall-relative mm coordinates
  const screenToWallMm = useCallback((screenX: number, screenY: number, wallXPos: number, wallYPos: number, scale: number) => {
    // Convert screen position to mm offset from wall top-left
    const relativeX = (screenX - wallXPos) / scale;
    const relativeY = (screenY - wallYPos) / scale;
    return { x: relativeX, y: relativeY };
  }, []);

  // Convert wall-relative mm coordinates to screen position
  const wallMmToScreen = useCallback((mmX: number, mmY: number, wallXPos: number, wallYPos: number, scale: number) => {
    const screenX = wallXPos + mmX * scale;
    const screenY = wallYPos + mmY * scale;
    return { x: screenX, y: screenY };
  }, []);

  // Handle mouse down for drawing
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Check if clicking on stage background
    if (e.target === e.target.getStage()) {
      setSelectedShapeIds([]);
      setPopoverOpen(false);
    }

    const pos = getPointerPosition();
    if (!pos) return;

    // Handle measure tool
    if (activeTool === 'measure') {
      setIsMeasuring(true);
      setMeasureStart(pos);
      setMeasureEnd(pos);
      return;
    }

    // Only start drawing with drawing tools
    if (!['rectangle', 'circle', 'wall', 'freehand'].includes(activeTool)) return;

    setIsDrawing(true);
    setDrawStart(pos);
    setDrawCurrent(pos);
  }, [activeTool, getPointerPosition, setSelectedShapeIds]);

  // Handle mouse move for drawing and measuring
  const handleMouseMove = useCallback(() => {
    const pos = getPointerPosition();
    if (!pos) return;

    // Update measure tool
    if (isMeasuring) {
      setMeasureEnd(pos);
      return;
    }

    if (!isDrawing) return;
    setDrawCurrent(pos);
  }, [isDrawing, isMeasuring, getPointerPosition]);

  // Handle mouse up to finish drawing or measuring
  const handleMouseUp = useCallback(() => {
    // Finish measuring - keep the measurement visible
    if (isMeasuring) {
      setIsMeasuring(false);
      // Don't clear measureStart/measureEnd - keep showing the measurement
      return;
    }

    if (!isDrawing || !drawStart || !drawCurrent) {
      setIsDrawing(false);
      return;
    }

    const dx = drawCurrent.x - drawStart.x;
    const dy = drawCurrent.y - drawStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Minimum size check
    if (distance < 10) {
      setIsDrawing(false);
      setDrawStart(null);
      setDrawCurrent(null);
      return;
    }

    // Get current wall geometry
    const geom = wallGeometryRef.current;
    if (!geom) {
      setIsDrawing(false);
      setDrawStart(null);
      setDrawCurrent(null);
      return;
    }

    saveToHistory();

    // Convert screen coordinates to wall-relative mm coordinates
    const startMm = screenToWallMm(drawStart.x, drawStart.y, geom.wallX, geom.wallY, geom.effectiveScale);
    const endMm = screenToWallMm(drawCurrent.x, drawCurrent.y, geom.wallX, geom.wallY, geom.effectiveScale);

    // Create shape based on active tool - coordinates are now in mm relative to wall
    let newShape: FloorMapShape | null = null;

    if (activeTool === 'rectangle') {
      const x = Math.min(startMm.x, endMm.x);
      const y = Math.min(startMm.y, endMm.y);
      const width = Math.abs(endMm.x - startMm.x);
      const height = Math.abs(endMm.y - startMm.y);

      newShape = {
        id: uuidv4(),
        type: 'rectangle',
        planId: currentPlanId || undefined,
        shapeViewMode: 'elevation',
        parentWallId: selectedWall?.id,
        coordinates: { x, y, width, height },
        color: '#93c5fd',
        strokeColor: '#3b82f6',
        strokeWidth: 2,
      };
    } else if (activeTool === 'circle') {
      const centerX = (startMm.x + endMm.x) / 2;
      const centerY = (startMm.y + endMm.y) / 2;
      const radiusMm = Math.sqrt(Math.pow(endMm.x - startMm.x, 2) + Math.pow(endMm.y - startMm.y, 2)) / 2;

      newShape = {
        id: uuidv4(),
        type: 'circle',
        planId: currentPlanId || undefined,
        shapeViewMode: 'elevation',
        parentWallId: selectedWall?.id,
        coordinates: { x: centerX, y: centerY, radius: radiusMm },
        color: '#fcd34d',
        strokeColor: '#f59e0b',
        strokeWidth: 2,
      };
    } else if (activeTool === 'wall') {
      newShape = {
        id: uuidv4(),
        type: 'line',
        planId: currentPlanId || undefined,
        shapeViewMode: 'elevation',
        parentWallId: selectedWall?.id,
        coordinates: {
          x1: startMm.x,
          y1: startMm.y,
          x2: endMm.x,
          y2: endMm.y,
        },
        strokeColor: '#6b7280',
        strokeWidth: 3,
      };
    }

    if (newShape) {
      addShape(newShape);
      setSelectedShapeIds([newShape.id]);
      toast.success(t('elevation.shapeCreated'));
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
    setActiveTool('select');
  }, [isDrawing, drawStart, drawCurrent, activeTool, currentPlanId, addShape, saveToHistory, setSelectedShapeIds, setActiveTool]);

  // Handle shape selection and show info popover
  const handleShapeClick = useCallback((shapeId: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;

    if (e.evt.shiftKey) {
      // Multi-select with shift
      if (selectedShapeIds.includes(shapeId)) {
        setSelectedShapeIds(selectedShapeIds.filter(id => id !== shapeId));
      } else {
        setSelectedShapeIds([...selectedShapeIds, shapeId]);
      }
    } else {
      setSelectedShapeIds([shapeId]);

      // Show info popover for elevation shapes
      const clickedShape = elevationShapes.find(s => s.id === shapeId);
      if (clickedShape && activeTool === 'select') {
        const stage = stageRef.current;
        if (stage) {
          const pos = stage.getPointerPosition();
          if (pos) {
            setPopoverShape(clickedShape);
            setPopoverPosition({ x: pos.x + 10, y: pos.y + 10 });
            setPopoverIsWall(false);
            setPopoverOpen(true);
          }
        }
      }
    }
  }, [selectedShapeIds, setSelectedShapeIds, elevationShapes, activeTool]);

  // Handle wall click to show info popover
  const handleWallClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool !== 'select' || !selectedWall) return;

    e.cancelBubble = true;
    setSelectedShapeIds([]);

    const stage = stageRef.current;
    if (stage) {
      const pos = stage.getPointerPosition();
      if (pos) {
        setPopoverShape(selectedWall);
        setPopoverPosition({ x: pos.x + 10, y: pos.y + 10 });
        setPopoverIsWall(true);
        setPopoverOpen(true);
      }
    }
  }, [activeTool, selectedWall, setSelectedShapeIds]);

  // Handle wall double-click to open edit dialog
  const handleWallDoubleClick = useCallback(() => {
    if (selectedWall) {
      setSelectedShapeForDialog(selectedWall);
      setDialogOpen(true);
      setPopoverOpen(false);
    }
  }, [selectedWall]);

  // Handle double-click to open shape details
  const handleShapeDoubleClick = useCallback((shape: FloorMapShape, e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    setSelectedShapeForDialog(shape);
    setDialogOpen(true);
  }, []);

  // Handle shape update from dialog
  const handleShapeUpdate = useCallback((updates: Partial<FloorMapShape>) => {
    if (selectedShapeForDialog) {
      saveToHistory();
      updateShape(selectedShapeForDialog.id, updates);
      // Update the dialog shape reference
      setSelectedShapeForDialog({ ...selectedShapeForDialog, ...updates });
    }
  }, [selectedShapeForDialog, saveToHistory, updateShape]);

  // Handle shape delete from dialog
  const handleShapeDeleteFromDialog = useCallback(() => {
    if (selectedShapeForDialog) {
      saveToHistory();
      deleteShapes([selectedShapeForDialog.id]);
      setSelectedShapeIds([]);
      setSelectedShapeForDialog(null);
      toast.success(t('elevation.shapeDeleted'));
    }
  }, [selectedShapeForDialog, deleteShapes, saveToHistory, setSelectedShapeIds]);

  // Handle real-time transform for dimension updates
  const handleTransform = useCallback((shape: FloorMapShape, node: Konva.Node) => {
    if (shape.type === 'rectangle') {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const coords = shape.coordinates as { x: number; y: number; width: number; height: number };
      setTransformingShape({
        id: shape.id,
        width: coords.width * scaleX,
        height: coords.height * scaleY,
      });
    } else if (shape.type === 'circle') {
      const scale = Math.max(node.scaleX(), node.scaleY());
      const coords = shape.coordinates as { x: number; y: number; radius: number };
      setTransformingShape({
        id: shape.id,
        radius: coords.radius * scale,
      });
    }
  }, []);

  // Handle shape transform end
  const handleTransformEnd = useCallback((shape: FloorMapShape, node: Konva.Node) => {
    saveToHistory();
    setTransformingShape(null);

    const geom = wallGeometryRef.current;
    if (!geom) return;

    if (shape.type === 'rectangle') {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);

      const coords = shape.coordinates as { x: number; y: number; width: number; height: number };
      // Convert screen position back to wall-relative mm coordinates
      const wallMm = screenToWallMm(node.x(), node.y(), geom.wallX, geom.wallY, geom.effectiveScale);
      // Dimensions stay in mm (scale factor cancels out)
      const newWidth = coords.width * scaleX;
      const newHeight = coords.height * scaleY;

      updateShape(shape.id, {
        coordinates: {
          x: wallMm.x,
          y: wallMm.y,
          width: newWidth,
          height: newHeight,
        },
        rotation: node.rotation(),
      });
    } else if (shape.type === 'circle') {
      const scale = Math.max(node.scaleX(), node.scaleY());
      node.scaleX(1);
      node.scaleY(1);

      const coords = shape.coordinates as { x: number; y: number; radius: number };
      // Convert screen position back to wall-relative mm coordinates
      const wallMm = screenToWallMm(node.x(), node.y(), geom.wallX, geom.wallY, geom.effectiveScale);

      updateShape(shape.id, {
        coordinates: {
          x: wallMm.x,
          y: wallMm.y,
          radius: coords.radius * scale,
        },
      });
    }
  }, [saveToHistory, updateShape, screenToWallMm]);

  // Handle drag end
  const handleDragEnd = useCallback((shape: FloorMapShape, node: Konva.Node) => {
    saveToHistory();

    const geom = wallGeometryRef.current;
    if (!geom) return;

    if (shape.type === 'rectangle' || shape.type === 'circle') {
      const coords = shape.coordinates as { x: number; y: number; width?: number; height?: number; radius?: number };
      // Convert screen position back to wall-relative mm coordinates
      const wallMm = screenToWallMm(node.x(), node.y(), geom.wallX, geom.wallY, geom.effectiveScale);
      updateShape(shape.id, {
        coordinates: {
          ...coords,
          x: wallMm.x,
          y: wallMm.y,
        },
      });
    } else if (shape.type === 'line') {
      const coords = shape.coordinates as { x1: number; y1: number; x2: number; y2: number };
      // For lines, the node position is an offset from the original line position (in screen pixels)
      // Convert the delta to mm
      const dxMm = node.x() / geom.effectiveScale;
      const dyMm = node.y() / geom.effectiveScale;
      node.x(0);
      node.y(0);
      updateShape(shape.id, {
        coordinates: {
          x1: coords.x1 + dxMm,
          y1: coords.y1 + dyMm,
          x2: coords.x2 + dxMm,
          y2: coords.y2 + dyMm,
        },
      });
    }
  }, [saveToHistory, updateShape, screenToWallMm]);

  // Delete selected shapes
  const handleDelete = useCallback(() => {
    if (selectedShapeIds.length === 0) return;
    saveToHistory();
    deleteShapes(selectedShapeIds);
    setSelectedShapeIds([]);
    toast.success(`${selectedShapeIds.length} form(er) borttagen`);
  }, [selectedShapeIds, deleteShapes, saveToHistory, setSelectedShapeIds]);

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    useFloorMapStore.getState().undo();
  }, []);

  const handleRedo = useCallback(() => {
    useFloorMapStore.getState().redo();
  }, []);

  // Update undo/redo state
  useEffect(() => {
    const store = useFloorMapStore.getState();
    setCanUndo(store.canUndo());
    setCanRedo(store.canRedo());
  }, [shapes]);

  // Auto-save when shapes change (including elevation shapes and wall properties)
  useEffect(() => {
    if (!currentPlanId) return;

    // Debounce the save to avoid excessive database writes
    const saveTimer = setTimeout(async () => {
      await saveShapesForPlan(currentPlanId, shapes);
    }, 2000); // Wait 2 seconds after last change before saving

    return () => clearTimeout(saveTimer);
  }, [shapes, currentPlanId]);

  // Manual save handler
  const handleManualSave = useCallback(async () => {
    if (!currentPlanId) {
      toast.error(t('elevation.noPlanSelected'));
      return;
    }
    const success = await saveShapesForPlan(currentPlanId, shapes);
    if (success) {
      toast.success(t('elevation.elevationSaved'));
    } else {
      toast.error(t('elevation.couldNotSave'));
    }
  }, [currentPlanId, shapes]);

  // Handle adding symbol from gallery
  const handleAddSymbol = useCallback((symbol: ElevationSymbolDefinition) => {
    const geom = wallGeometryRef.current;
    if (!geom) {
      toast.error(t('elevation.noWallSelected'));
      return;
    }

    saveToHistory();

    // Calculate position: center of wall, at typical installation height
    const typicalHeight = symbol.typicalHeightFromFloor ?? 1000;

    // Position in wall-relative mm coordinates
    // x: center of wall minus half of symbol width
    // y: wall height minus typical height from floor minus symbol height
    const xMm = (geom.wallLengthMM - symbol.defaultWidth) / 2;
    const yMm = geom.wallHeightMM - typicalHeight - symbol.defaultHeight;

    // Create the shape
    const newShape: FloorMapShape = {
      id: uuidv4(),
      type: 'rectangle', // Symbols are rendered as rectangles with metadata
      planId: currentPlanId || undefined,
      shapeViewMode: 'elevation',
      parentWallId: selectedWall?.id,
      coordinates: {
        x: Math.max(0, xMm),
        y: Math.max(0, yMm),
        width: symbol.defaultWidth,
        height: symbol.defaultHeight,
      },
      color: getSymbolColor(symbol.category),
      strokeColor: getSymbolStrokeColor(symbol.category),
      strokeWidth: 2,
      name: symbol.nameSv,
      notes: `${symbol.descriptionSv}\n\nTypisk höjd från golv: ${typicalHeight}mm`,
      // Store symbol metadata
      metadata: {
        symbolType: symbol.type,
        category: symbol.category,
        typicalHeightFromFloor: symbol.typicalHeightFromFloor,
        materialNotes: symbol.materialNotes,
      },
    };

    addShape(newShape);
    setSelectedShapeIds([newShape.id]);
    setActiveTool('select');
    toast.success(`${symbol.nameSv} placerad på väggen`);
  }, [currentPlanId, addShape, saveToHistory, setSelectedShapeIds, setActiveTool]);

  // Handler for dragging wall-relative objects in elevation view
  const handleWallRelativeDragEnd = useCallback((shape: FloorMapShape, node: Konva.Node) => {
    if (!shape.wallRelative || !selectedWall) return;

    const geom = wallGeometryRef.current;
    if (!geom) return;

    saveToHistory();

    // Convert new screen position to wall-relative coordinates
    const newX = node.x();
    const newY = node.y();

    syncShapeFromElevation(
      shape.id,
      newX,
      newY,
      shape.wallRelative.width * geom.effectiveScale,
      shape.wallRelative.height * geom.effectiveScale,
      {
        wallHeightMM: geom.wallHeightMM,
        effectiveScale: geom.effectiveScale,
        wallXOffset: geom.wallX,
        wallYOffset: geom.wallY,
      }
    );

    // Reset node position (store handles actual coordinates)
    node.position({ x: 0, y: 0 });
  }, [selectedWall, saveToHistory, syncShapeFromElevation]);

  // Handler for resizing wall-relative objects in elevation view
  const handleWallRelativeTransformEnd = useCallback((shape: FloorMapShape, node: Konva.Node) => {
    if (!shape.wallRelative || !selectedWall) return;

    const geom = wallGeometryRef.current;
    if (!geom) return;

    saveToHistory();

    // Get new dimensions from transform
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    const newWidth = shape.wallRelative.width * scaleX;
    const newHeight = shape.wallRelative.height * scaleY;

    // Update wall-relative data with new dimensions
    updateShapeWallRelative(shape.id, {
      width: newWidth,
      height: newHeight,
      // Also update position based on node position after transform
      distanceFromWallStart: shape.wallRelative.distanceFromWallStart + (node.x() / geom.effectiveScale),
      elevationBottom: Math.max(0, shape.wallRelative.elevationBottom - (node.y() / geom.effectiveScale)),
    });

    node.position({ x: 0, y: 0 });
  }, [selectedWall, saveToHistory, updateShapeWallRelative]);

  // Clear measurement when changing tools
  useEffect(() => {
    if (activeTool !== 'measure') {
      setMeasureStart(null);
      setMeasureEnd(null);
    }
  }, [activeTool]);

  // Empty state - no walls
  if (!selectedWall) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 relative">
        <ElevationToolbar
          onUndo={handleUndo}
          onRedo={handleRedo}
          onDelete={handleDelete}
          canUndo={canUndo}
          canRedo={canRedo}
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onAddSymbol={handleAddSymbol}
          onToggleSmartData={() => setSmartDataOpen(!smartDataOpen)}
          smartDataOpen={smartDataOpen}
        />
        <div className="text-center text-muted-foreground">
          <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">{t('elevation.noWalls')}</p>
          <p className="text-sm">{t('elevation.drawWallsFirst')}</p>
          <p className="text-sm mt-2 text-amber-600">{t('elevation.canStillDraw')}</p>
        </div>
      </div>
    );
  }

  // Get elevation data - use room-edge-based data in room mode, combined wall data otherwise
  const isRoomBasedMode = !!currentRoom;

  // Get the current room wall info for room-based mode
  const currentRoomWall = isRoomBasedMode
    ? wallsForDirection.find(rw => rw.wall.id === selectedWall?.id)
    : null;

  // For room-based mode, use room edge length; otherwise use combined wall data
  const combinedWallData = !isRoomBasedMode
    ? getCombinedWallElevationData(selectedWall.id, shapes, adminDefaults.wallHeightMM, pixelsPerMm)
    : null;

  // Calculate elevation view dimensions
  // In room mode: use the room edge length directly (already in pixels, convert to mm)
  // Otherwise: use combined wall length
  const wallLengthMM = isRoomBasedMode && currentRoomWall
    ? currentRoomWall.length / pixelsPerMm  // Room edge length is in pixels
    : (combinedWallData?.totalLengthMM || getWallLength(selectedWall, pixelsPerMm));
  const wallHeightMM = selectedWall.heightMM || adminDefaults.wallHeightMM;

  // Scale to fit in view
  const padding = 100;
  const availableWidth = dimensions.width - padding * 2;
  const availableHeight = dimensions.height - padding * 2;

  const scaleToFitWidth = availableWidth / wallLengthMM;
  const scaleToFitHeight = availableHeight / wallHeightMM;
  const baseScale = Math.min(scaleToFitWidth, scaleToFitHeight, 0.5);

  const effectiveScale = baseScale * zoom;

  // Rendered dimensions
  const renderedWallWidth = wallLengthMM * effectiveScale;
  const renderedWallHeight = wallHeightMM * effectiveScale;

  // Center position
  const centerX = dimensions.width / 2 + panX;
  const centerY = dimensions.height / 2 + panY;

  // Wall rectangle position
  const wallX = centerX - renderedWallWidth / 2;
  const wallY = centerY - renderedWallHeight / 2;

  // Update the ref so callbacks can access current wall geometry
  wallGeometryRef.current = { wallX, wallY, effectiveScale, wallLengthMM, wallHeightMM };

  // Find openings - in room mode, only show openings on the specific wall edge
  // In legacy mode, use combined wall data
  const openings = useMemo(() => {
    if (isRoomBasedMode && currentRoom && currentRoomWall) {
      // Filter to openings that are on this specific room edge (direction)
      const roomOpenings = findOpeningsInRoom(currentRoom, shapes);
      // Further filter to only openings close to this wall's position
      const wallCenter = currentRoomWall.center;
      const wallAngle = currentRoomWall.angle * (Math.PI / 180); // Convert to radians
      const wallLength = currentRoomWall.length;

      return roomOpenings.filter(opening => {
        const coords = opening.coordinates as { x1: number; y1: number; x2: number; y2: number };
        const openingMidX = (coords.x1 + coords.x2) / 2;
        const openingMidY = (coords.y1 + coords.y2) / 2;

        // Check if opening is aligned with this wall's direction
        const openingDx = coords.x2 - coords.x1;
        const openingDy = coords.y2 - coords.y1;
        const openingAngle = Math.atan2(openingDy, openingDx);

        // Angles should match (same or opposite direction)
        const angleDiff = Math.abs(wallAngle - openingAngle);
        const anglesMatch = angleDiff < 0.3 || Math.abs(angleDiff - Math.PI) < 0.3;

        if (!anglesMatch) return false;

        // Check if opening is close to this wall center (in perpendicular direction)
        const toOpeningX = openingMidX - wallCenter.x;
        const toOpeningY = openingMidY - wallCenter.y;

        // Project onto perpendicular direction
        const normalX = -Math.sin(wallAngle);
        const normalY = Math.cos(wallAngle);
        const perpDistance = Math.abs(toOpeningX * normalX + toOpeningY * normalY);

        return perpDistance < 100; // 100 pixel tolerance
      });
    }

    return combinedWallData?.openings || findOpeningsOnWall(selectedWall, shapes);
  }, [isRoomBasedMode, currentRoom, currentRoomWall, shapes, combinedWallData, selectedWall]);

  // Combined wall segments for rendering - not used in room-based mode
  const combinedSegments = isRoomBasedMode ? [] : (combinedWallData?.segments || []);

  // Floor and ceiling zones
  const floorHeight = 80 * effectiveScale;
  const ceilingHeight = 60 * effectiveScale;
  const skirtingHeight = 120 * effectiveScale;

  // Render drawing preview (drawStart/drawCurrent are in screen coordinates)
  const renderDrawingPreview = () => {
    if (!isDrawing || !drawStart || !drawCurrent) return null;

    // drawStart and drawCurrent are already in screen coordinates
    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const width = Math.abs(drawCurrent.x - drawStart.x);
    const height = Math.abs(drawCurrent.y - drawStart.y);

    if (activeTool === 'rectangle') {
      return (
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="rgba(59, 130, 246, 0.2)"
          stroke="#3b82f6"
          strokeWidth={2}
          dash={[5, 5]}
        />
      );
    } else if (activeTool === 'circle') {
      const centerX = (drawStart.x + drawCurrent.x) / 2;
      const centerY = (drawStart.y + drawCurrent.y) / 2;
      const dx = drawCurrent.x - drawStart.x;
      const dy = drawCurrent.y - drawStart.y;
      const radius = Math.sqrt(dx * dx + dy * dy) / 2;

      return (
        <Circle
          x={centerX}
          y={centerY}
          radius={radius}
          fill="rgba(245, 158, 11, 0.2)"
          stroke="#f59e0b"
          strokeWidth={2}
          dash={[5, 5]}
        />
      );
    } else if (activeTool === 'wall') {
      return (
        <Line
          points={[drawStart.x, drawStart.y, drawCurrent.x, drawCurrent.y]}
          stroke="#6b7280"
          strokeWidth={3}
          dash={[5, 5]}
        />
      );
    }

    return null;
  };

  // Render elevation shapes with dimension labels
  const renderElevationShapes = () => {
    return elevationShapes.map(shape => {
      const isSelected = selectedShapeIds.includes(shape.id);
      const isTransforming = transformingShape?.id === shape.id;

      if (shape.type === 'rectangle') {
        const coords = shape.coordinates as { x: number; y: number; width: number; height: number };
        // Convert wall-relative mm coordinates to screen coordinates
        const screenPos = wallMmToScreen(coords.x, coords.y, wallX, wallY, effectiveScale);
        const x = screenPos.x;
        const y = screenPos.y;
        const width = coords.width * effectiveScale;
        const height = coords.height * effectiveScale;

        // Use real-time dimensions during transform, otherwise use stored dimensions
        const displayWidth = isTransforming && transformingShape.width ? transformingShape.width : coords.width;
        const displayHeight = isTransforming && transformingShape.height ? transformingShape.height : coords.height;

        return (
          <Group key={shape.id}>
            <Rect
              id={`elevation-shape-${shape.id}`}
              x={x}
              y={y}
              width={width}
              height={height}
              fill={shape.color || '#93c5fd'}
              stroke={isSelected ? '#2563eb' : (shape.strokeColor || '#3b82f6')}
              strokeWidth={isSelected ? 3 : (shape.strokeWidth || 2)}
              rotation={shape.rotation || 0}
              draggable={activeTool === 'select'}
              onClick={(e) => handleShapeClick(shape.id, e)}
              onTap={(e) => handleShapeClick(shape.id, e)}
              onDblClick={(e) => handleShapeDoubleClick(shape, e)}
              onDblTap={(e) => handleShapeDoubleClick(shape, e)}
              onDragEnd={(e) => handleDragEnd(shape, e.target)}
              onTransform={(e) => handleTransform(shape, e.target)}
              onTransformEnd={(e) => handleTransformEnd(shape, e.target)}
            />
            {/* Dimension labels when selected or transforming */}
            {(isSelected || isTransforming) && (
              <>
                {/* Width label (bottom) */}
                <Group listening={false}>
                  <Line
                    points={[x, y + height + 8, x + width, y + height + 8]}
                    stroke={isTransforming ? '#dc2626' : '#3b82f6'}
                    strokeWidth={1}
                  />
                  <Line points={[x, y + height + 4, x, y + height + 12]} stroke={isTransforming ? '#dc2626' : '#3b82f6'} strokeWidth={1} />
                  <Line points={[x + width, y + height + 4, x + width, y + height + 12]} stroke={isTransforming ? '#dc2626' : '#3b82f6'} strokeWidth={1} />
                  <Rect
                    x={x + width / 2 - 35}
                    y={y + height + 12}
                    width={70}
                    height={18}
                    fill="white"
                    stroke={isTransforming ? '#dc2626' : '#3b82f6'}
                    strokeWidth={1}
                    cornerRadius={3}
                  />
                  <KonvaText
                    x={x + width / 2 - 35}
                    y={y + height + 14}
                    width={70}
                    text={formatDim(displayWidth)}
                    fontSize={11}
                    fill={isTransforming ? '#dc2626' : '#3b82f6'}
                    align="center"
                    fontStyle="bold"
                  />
                </Group>
                {/* Height label (right) */}
                <Group listening={false}>
                  <Line
                    points={[x + width + 8, y, x + width + 8, y + height]}
                    stroke={isTransforming ? '#dc2626' : '#3b82f6'}
                    strokeWidth={1}
                  />
                  <Line points={[x + width + 4, y, x + width + 12, y]} stroke={isTransforming ? '#dc2626' : '#3b82f6'} strokeWidth={1} />
                  <Line points={[x + width + 4, y + height, x + width + 12, y + height]} stroke={isTransforming ? '#dc2626' : '#3b82f6'} strokeWidth={1} />
                  <Rect
                    x={x + width + 12}
                    y={y + height / 2 - 10}
                    width={60}
                    height={18}
                    fill="white"
                    stroke={isTransforming ? '#dc2626' : '#3b82f6'}
                    strokeWidth={1}
                    cornerRadius={3}
                  />
                  <KonvaText
                    x={x + width + 14}
                    y={y + height / 2 - 6}
                    text={formatDim(displayHeight)}
                    fontSize={11}
                    fill={isTransforming ? '#dc2626' : '#3b82f6'}
                    fontStyle="bold"
                  />
                </Group>
                {/* Name label */}
                {shape.name && (
                  <KonvaText
                    x={x}
                    y={y - 18}
                    width={width}
                    text={shape.name}
                    fontSize={12}
                    fill="#1e40af"
                    align="center"
                    fontStyle="bold"
                    listening={false}
                  />
                )}
              </>
            )}
          </Group>
        );
      } else if (shape.type === 'circle') {
        const coords = shape.coordinates as { x: number; y: number; radius: number };
        // Convert wall-relative mm coordinates to screen coordinates
        const screenPos = wallMmToScreen(coords.x, coords.y, wallX, wallY, effectiveScale);
        const cx = screenPos.x;
        const cy = screenPos.y;
        const radius = coords.radius * effectiveScale;

        // Use real-time radius during transform
        const displayRadius = isTransforming && transformingShape.radius ? transformingShape.radius : coords.radius;

        return (
          <Group key={shape.id}>
            <Circle
              id={`elevation-shape-${shape.id}`}
              x={cx}
              y={cy}
              radius={radius}
              fill={shape.color || '#fcd34d'}
              stroke={isSelected ? '#2563eb' : (shape.strokeColor || '#f59e0b')}
              strokeWidth={isSelected ? 3 : (shape.strokeWidth || 2)}
              draggable={activeTool === 'select'}
              onClick={(e) => handleShapeClick(shape.id, e)}
              onTap={(e) => handleShapeClick(shape.id, e)}
              onDblClick={(e) => handleShapeDoubleClick(shape, e)}
              onDblTap={(e) => handleShapeDoubleClick(shape, e)}
              onDragEnd={(e) => handleDragEnd(shape, e.target)}
              onTransform={(e) => handleTransform(shape, e.target)}
              onTransformEnd={(e) => handleTransformEnd(shape, e.target)}
            />
            {/* Dimension labels when selected or transforming */}
            {(isSelected || isTransforming) && (
              <>
                {/* Radius line */}
                <Line
                  points={[cx, cy, cx + radius, cy]}
                  stroke={isTransforming ? '#dc2626' : '#f59e0b'}
                  strokeWidth={1}
                  dash={[3, 3]}
                  listening={false}
                />
                <Rect
                  x={cx + radius / 2 - 25}
                  y={cy - 24}
                  width={50}
                  height={18}
                  fill="white"
                  stroke={isTransforming ? '#dc2626' : '#f59e0b'}
                  strokeWidth={1}
                  cornerRadius={3}
                  listening={false}
                />
                <KonvaText
                  x={cx + radius / 2 - 25}
                  y={cy - 22}
                  width={50}
                  text={`r: ${formatDim(displayRadius)}`}
                  fontSize={11}
                  fill={isTransforming ? '#dc2626' : '#f59e0b'}
                  fontStyle="bold"
                  align="center"
                  listening={false}
                />
                {/* Diameter label */}
                <Rect
                  x={cx - 35}
                  y={cy + radius + 6}
                  width={70}
                  height={18}
                  fill="white"
                  stroke={isTransforming ? '#dc2626' : '#f59e0b'}
                  strokeWidth={1}
                  cornerRadius={3}
                  listening={false}
                />
                <KonvaText
                  x={cx - 35}
                  y={cy + radius + 8}
                  width={70}
                  text={`ø: ${formatDim(displayRadius * 2)}`}
                  fontSize={11}
                  fill={isTransforming ? '#dc2626' : '#f59e0b'}
                  fontStyle="bold"
                  align="center"
                  listening={false}
                />
                {/* Name label */}
                {shape.name && (
                  <KonvaText
                    x={cx - 50}
                    y={cy - radius - 20}
                    width={100}
                    text={shape.name}
                    fontSize={12}
                    fill="#b45309"
                    align="center"
                    fontStyle="bold"
                    listening={false}
                  />
                )}
              </>
            )}
          </Group>
        );
      } else if (shape.type === 'line') {
        const coords = shape.coordinates as { x1: number; y1: number; x2: number; y2: number };
        // Convert wall-relative mm coordinates to screen coordinates
        const screenPos1 = wallMmToScreen(coords.x1, coords.y1, wallX, wallY, effectiveScale);
        const screenPos2 = wallMmToScreen(coords.x2, coords.y2, wallX, wallY, effectiveScale);
        const x1 = screenPos1.x;
        const y1 = screenPos1.y;
        const x2 = screenPos2.x;
        const y2 = screenPos2.y;
        // Length in mm (stored coordinates are already in mm)
        const length = Math.sqrt(Math.pow(coords.x2 - coords.x1, 2) + Math.pow(coords.y2 - coords.y1, 2));
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        return (
          <Group key={shape.id}>
            <Line
              id={`elevation-shape-${shape.id}`}
              points={[x1, y1, x2, y2]}
              stroke={isSelected ? '#2563eb' : (shape.strokeColor || '#6b7280')}
              strokeWidth={isSelected ? 4 : (shape.strokeWidth || 3)}
              draggable={activeTool === 'select'}
              onClick={(e) => handleShapeClick(shape.id, e)}
              onTap={(e) => handleShapeClick(shape.id, e)}
              onDblClick={(e) => handleShapeDoubleClick(shape, e)}
              onDblTap={(e) => handleShapeDoubleClick(shape, e)}
              onDragEnd={(e) => handleDragEnd(shape, e.target)}
              hitStrokeWidth={20}
            />
            {/* Length label when selected */}
            {isSelected && (
              <KonvaText
                x={midX - 30}
                y={midY - 20}
                text={formatDim(length)}
                fontSize={12}
                fill="#2563eb"
                fontStyle="bold"
                padding={4}
              />
            )}
            {/* Name label */}
            {isSelected && shape.name && (
              <KonvaText
                x={midX - 40}
                y={midY + 10}
                text={shape.name}
                fontSize={11}
                fill="#1e40af"
                fontStyle="bold"
              />
            )}
          </Group>
        );
      }

      return null;
    });
  };

  // Render wall-relative objects (synced from floorplan)
  // Note: handlers are defined earlier in the component to satisfy React hooks rules
  const renderWallRelativeObjects = () => {
    if (!selectedWall) return null;

    const geom = wallGeometryRef.current;
    if (!geom) return null;

    return wallRelativeObjects.map(shape => {
      if (!shape.wallRelative) return null;

      const isSelected = selectedShapeIds.includes(shape.id);

      // Convert wall-relative position to elevation screen coordinates
      const elevPos = wallRelativeToElevation(
        shape.wallRelative,
        selectedWall,
        geom.wallHeightMM,
        0, // canvasHeight not used in this calculation
        geom.effectiveScale,
        geom.wallX,
        geom.wallY
      );

      if (!elevPos) return null;

      const { x, y, width, height } = elevPos;

      // Get category-based color
      const category = shape.objectCategory || inferCategoryFromSymbolType(shape.symbolType);
      const categoryColors: Record<string, { fill: string; stroke: string }> = {
        floor_cabinet: { fill: '#f5f5f4', stroke: '#78716c' },
        wall_cabinet: { fill: '#fef3c7', stroke: '#ca8a04' },
        countertop: { fill: '#e5e7eb', stroke: '#6b7280' },
        appliance_floor: { fill: '#f0fdf4', stroke: '#16a34a' },
        appliance_wall: { fill: '#fef9c3', stroke: '#eab308' },
        window: { fill: '#e0f2fe', stroke: '#0284c7' },
        door: { fill: '#f0fdf4', stroke: '#22c55e' },
        decoration: { fill: '#fdf4ff', stroke: '#a855f7' },
        custom: { fill: '#f3f4f6', stroke: '#374151' },
      };
      const colors = categoryColors[category] || categoryColors.custom;

      return (
        <Group key={`wall-rel-${shape.id}`}>
          <Rect
            id={`elevation-wall-rel-${shape.id}`}
            x={x}
            y={y}
            width={width}
            height={height}
            fill={shape.color || colors.fill}
            stroke={isSelected ? '#2563eb' : colors.stroke}
            strokeWidth={isSelected ? 3 : 2}
            draggable={activeTool === 'select'}
            onClick={(e) => handleShapeClick(shape.id, e)}
            onTap={(e) => handleShapeClick(shape.id, e)}
            onDblClick={(e) => handleShapeDoubleClick(shape, e)}
            onDblTap={(e) => handleShapeDoubleClick(shape, e)}
            onDragEnd={(e) => handleWallRelativeDragEnd(shape, e.target)}
            onTransformEnd={(e) => handleWallRelativeTransformEnd(shape, e.target)}
          />
          {/* Label showing object name and elevation */}
          {isSelected && (
            <Group listening={false}>
              {/* Name label */}
              {shape.name && (
                <KonvaText
                  x={x}
                  y={y - 18}
                  width={width}
                  text={shape.name}
                  fontSize={12}
                  fill="#1e40af"
                  align="center"
                  fontStyle="bold"
                />
              )}
              {/* Elevation from floor label */}
              <Rect
                x={x + width + 4}
                y={y + height / 2 - 10}
                width={80}
                height={18}
                fill="white"
                stroke="#059669"
                strokeWidth={1}
                cornerRadius={3}
              />
              <KonvaText
                x={x + width + 8}
                y={y + height / 2 - 6}
                text={`${formatDim(shape.wallRelative.elevationBottom)} ↑`}
                fontSize={10}
                fill="#059669"
                fontStyle="bold"
              />
              {/* Dimensions */}
              <Rect
                x={x + width / 2 - 40}
                y={y + height + 4}
                width={80}
                height={18}
                fill="white"
                stroke="#3b82f6"
                strokeWidth={1}
                cornerRadius={3}
              />
              <KonvaText
                x={x + width / 2 - 40}
                y={y + height + 6}
                width={80}
                text={`${formatDim(shape.wallRelative.width)} × ${formatDim(shape.wallRelative.height)}`}
                fontSize={9}
                fill="#3b82f6"
                align="center"
              />
            </Group>
          )}
          {/* "Synced from floorplan" indicator */}
          <Circle
            x={x + 8}
            y={y + 8}
            radius={4}
            fill="#059669"
            listening={false}
          />
        </Group>
      );
    });
  };

  // Render measurement line
  const renderMeasurement = () => {
    if (!measureStart || !measureEnd) return null;

    // measureStart/measureEnd are in screen coordinates
    const x1 = measureStart.x;
    const y1 = measureStart.y;
    const x2 = measureEnd.x;
    const y2 = measureEnd.y;

    const dx = measureEnd.x - measureStart.x;
    const dy = measureEnd.y - measureStart.y;
    const distanceScreen = Math.sqrt(dx * dx + dy * dy);
    // Convert screen distance to mm using effectiveScale
    const distanceMm = distanceScreen / effectiveScale;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    // Only show if there's a meaningful distance
    if (distanceScreen < 5) return null;

    return (
      <Group>
        {/* Main measurement line */}
        <Line
          points={[x1, y1, x2, y2]}
          stroke="#ef4444"
          strokeWidth={2}
          dash={[8, 4]}
        />
        {/* Start point */}
        <Circle x={x1} y={y1} radius={4} fill="#ef4444" />
        {/* End point */}
        <Circle x={x2} y={y2} radius={4} fill="#ef4444" />
        {/* Perpendicular end markers */}
        <Line
          points={[x1 - 8, y1 - 8, x1 + 8, y1 + 8]}
          stroke="#ef4444"
          strokeWidth={2}
        />
        <Line
          points={[x1 - 8, y1 + 8, x1 + 8, y1 - 8]}
          stroke="#ef4444"
          strokeWidth={2}
        />
        <Line
          points={[x2 - 8, y2 - 8, x2 + 8, y2 + 8]}
          stroke="#ef4444"
          strokeWidth={2}
        />
        <Line
          points={[x2 - 8, y2 + 8, x2 + 8, y2 - 8]}
          stroke="#ef4444"
          strokeWidth={2}
        />
        {/* Distance label with background */}
        <Rect
          x={midX - 45}
          y={midY - 28}
          width={90}
          height={24}
          fill="white"
          stroke="#ef4444"
          strokeWidth={1}
          cornerRadius={4}
        />
        <KonvaText
          x={midX - 45}
          y={midY - 24}
          width={90}
          text={formatDim(distanceMm)}
          fontSize={14}
          fill="#ef4444"
          align="center"
          fontStyle="bold"
        />
        {/* Angle indicator */}
        <KonvaText
          x={midX - 25}
          y={midY + 4}
          text={`${angle.toFixed(1)}°`}
          fontSize={10}
          fill="#9ca3af"
        />
      </Group>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-100 relative">
      {/* Elevation Toolbar */}
      <ElevationToolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDelete={handleDelete}
        canUndo={canUndo}
        canRedo={canRedo}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onAddSymbol={handleAddSymbol}
        onToggleSmartData={() => setSmartDataOpen(!smartDataOpen)}
        smartDataOpen={smartDataOpen}
      />

      {/* Top navigation bar */}
      <div className="h-12 bg-white border-b flex items-center justify-between px-4 gap-4 z-10">
        <div className="flex items-center gap-2">
          {/* Close button when in room-based mode */}
          {currentRoom && onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.close', 'Stäng')}</span>
            </Button>
          )}

          {/* Room-based mode: Show room name and direction selector */}
          {currentRoom ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded">
                <span
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: currentRoom.color || 'rgba(59, 130, 246, 0.3)' }}
                />
                <span className="text-sm font-medium">
                  {currentRoom.name || t('common.unnamed', 'Namnlöst rum')}
                </span>
              </div>

              {/* Direction selector (N, E, S, W) */}
              <div className="flex items-center gap-1 ml-2 pl-2 border-l">
                <Compass className="h-4 w-4 text-muted-foreground mr-1" />
                {(['north', 'east', 'south', 'west'] as WallDirection[]).map((dir) => {
                  const dirLabel = dir === 'north' ? 'N' : dir === 'east' ? 'Ö' : dir === 'south' ? 'S' : 'V';
                  const hasWall = roomWalls.some(rw => rw.direction === dir);
                  const isActive = currentDirection === dir;
                  return (
                    <Button
                      key={dir}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      className={`w-8 h-8 p-0 ${!hasWall ? 'opacity-50' : ''}`}
                      onClick={() => {
                        setCurrentDirection(dir);
                        // Select the first wall for this direction
                        const wallsInDir = roomWalls.filter(rw => rw.direction === dir);
                        if (wallsInDir.length > 0) {
                          setSelectedWallId(wallsInDir[0].wall.id);
                        }
                      }}
                      title={`${t(`directions.${dir}`, dir)} ${!hasWall ? '(ingen vägg)' : ''}`}
                    >
                      {dirLabel}
                    </Button>
                  );
                })}
              </div>

              {/* Wall dimensions */}
              <span className="text-muted-foreground text-sm ml-2">
                ({Math.round(wallLengthMM)}mm × {Math.round(wallHeightMM)}mm)
              </span>
            </>
          ) : (
            <>
              {/* Legacy wall-based mode navigation */}
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWall}
                disabled={walls.length <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="px-3 py-1 bg-gray-100 rounded text-sm font-medium min-w-[200px] text-center">
                Vägg {selectedWallIndex + 1} av {walls.length}
                {combinedWallData && combinedWallData.walls.length > 1 && (
                  <span className="text-purple-600 ml-1">
                    (+{combinedWallData.walls.length - 1} segment)
                  </span>
                )}
                <span className="text-muted-foreground ml-2">
                  ({Math.round(wallLengthMM)}mm × {Math.round(wallHeightMM)}mm)
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWall}
                disabled={walls.length <= 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              {/* Room perspective selector (legacy) */}
              {combinedWallData && (combinedWallData.adjacentRooms.left.length > 0 || combinedWallData.adjacentRooms.right.length > 0) && (
                <div className="flex items-center gap-2 ml-4 pl-4 border-l">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={selectedRoomId || 'all'}
                    onValueChange={(value) => setSelectedRoomId(value === 'all' ? null : value)}
                  >
                    <SelectTrigger className="w-[160px] h-8 text-sm">
                      <SelectValue placeholder={t('elevation.viewFrom', 'Visa från...')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('elevation.allRooms', 'Alla rum')}</SelectItem>
                      {combinedWallData.adjacentRooms.left.map((room) => (
                        <SelectItem key={`left-${room.room.id}`} value={room.room.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-sm border"
                              style={{ backgroundColor: room.color }}
                            />
                            {room.name}
                          </span>
                        </SelectItem>
                      ))}
                      {combinedWallData.adjacentRooms.right.map((room) => (
                        <SelectItem key={`right-${room.room.id}`} value={room.room.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-sm border"
                              style={{ backgroundColor: room.color }}
                            />
                            {room.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
            {elevationShapes.length} {t('elevation.elevationShapes')}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            className="gap-1"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Spara</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={resetView}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 overflow-hidden" style={{ touchAction: 'none' }}>
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: ['rectangle', 'circle', 'wall', 'freehand', 'measure'].includes(activeTool) ? 'crosshair' : 'default' }}
        >
          <Layer>
            {/* Background */}
            <Rect
              x={0}
              y={0}
              width={dimensions.width}
              height={dimensions.height}
              fill="#f8fafc"
            />

            {/* Ground line */}
            <Line
              points={[0, wallY + renderedWallHeight + floorHeight / 2, dimensions.width, wallY + renderedWallHeight + floorHeight / 2]}
              stroke="#94a3b8"
              strokeWidth={1}
              dash={[10, 5]}
            />

            {/* Floor zone */}
            <Rect
              x={wallX - 20}
              y={wallY + renderedWallHeight}
              width={renderedWallWidth + 40}
              height={floorHeight}
              fill="#d4a574"
              stroke="#a67c52"
              strokeWidth={1}
            />
            <KonvaText
              x={wallX - 20}
              y={wallY + renderedWallHeight + floorHeight / 2 - 6}
              width={renderedWallWidth + 40}
              text={t('elevation.floor')}
              fontSize={12}
              fill="#6b4423"
              align="center"
            />

            {/* Main wall - clickable for info */}
            <Rect
              x={wallX}
              y={wallY}
              width={renderedWallWidth}
              height={renderedWallHeight}
              fill={selectedWall.color || '#e5e7eb'}
              stroke={selectedWall.strokeColor || '#374151'}
              strokeWidth={2}
              onClick={handleWallClick}
              onTap={handleWallClick}
              onDblClick={handleWallDoubleClick}
              onDblTap={handleWallDoubleClick}
              style={{ cursor: activeTool === 'select' ? 'pointer' : 'default' }}
            />

            {/* Skirting (sockel) */}
            <Rect
              x={wallX}
              y={wallY + renderedWallHeight - skirtingHeight}
              width={renderedWallWidth}
              height={skirtingHeight}
              fill="#ffffff"
              stroke="#d1d5db"
              strokeWidth={1}
            />

            {/* Ceiling zone */}
            <Rect
              x={wallX - 20}
              y={wallY - ceilingHeight}
              width={renderedWallWidth + 40}
              height={ceilingHeight}
              fill="#f1f5f9"
              stroke="#cbd5e1"
              strokeWidth={1}
            />
            <KonvaText
              x={wallX - 20}
              y={wallY - ceilingHeight / 2 - 6}
              width={renderedWallWidth + 40}
              text={t('elevation.ceiling')}
              fontSize={12}
              fill="#64748b"
              align="center"
            />

            {/* Combined wall segments with openings */}
            {combinedSegments.length > 0 ? (
              // Use combined segments data for accurate positioning
              combinedSegments.map((segment, index) => {
                if (segment.type === 'wall' || segment.type === 'gap') {
                  // Render wall segment dividers (subtle dashed line)
                  if (index > 0 && segment.type === 'wall') {
                    const segX = wallX + segment.startPositionMM * effectiveScale;
                    return (
                      <Line
                        key={`seg-divider-${index}`}
                        points={[segX, wallY, segX, wallY + renderedWallHeight]}
                        stroke="#d1d5db"
                        strokeWidth={1}
                        dash={[5, 5]}
                      />
                    );
                  }
                  return null;
                }

                // Opening (door, window, sliding_door)
                const openingWidthMM = segment.lengthMM;
                const openingWidth = openingWidthMM * effectiveScale;

                const isDoor = segment.type === 'door' || segment.type === 'sliding_door';
                const isWindow = segment.type === 'window';

                const openingHeightMM = segment.heightMM || (isDoor ? 2100 : 1200);
                const sillHeightMM = segment.elevationBottom || (isWindow ? 900 : 0);

                const openingHeight = openingHeightMM * effectiveScale;
                const sillHeight = sillHeightMM * effectiveScale;

                const openingX = wallX + segment.startPositionMM * effectiveScale;
                const openingY = wallY + renderedWallHeight - openingHeight - sillHeight - skirtingHeight;

                return (
                  <Group key={`opening-${index}`}>
                    <Rect
                      x={openingX}
                      y={openingY}
                      width={openingWidth}
                      height={openingHeight}
                      fill={isDoor ? '#f0fdf4' : '#e0f2fe'}
                      stroke={isDoor ? '#22c55e' : '#3b82f6'}
                      strokeWidth={2}
                    />
                    <KonvaText
                      x={openingX}
                      y={openingY + openingHeight / 2 - 8}
                      width={openingWidth}
                      text={isDoor ? (segment.type === 'sliding_door' ? t('elevation.slidingDoor') : t('elevation.doorLabel')) : t('elevation.windowLabel')}
                      fontSize={11}
                      fill={isDoor ? '#166534' : '#1e40af'}
                      align="center"
                    />
                    <KonvaText
                      x={openingX}
                      y={openingY + openingHeight / 2 + 4}
                      width={openingWidth}
                      text={`${Math.round(openingWidthMM)}mm`}
                      fontSize={10}
                      fill="#6b7280"
                      align="center"
                    />
                    {isWindow && sillHeight > 0 && (
                      <Rect
                        x={openingX - 10}
                        y={openingY + openingHeight}
                        width={openingWidth + 20}
                        height={8}
                        fill="#f3f4f6"
                        stroke="#9ca3af"
                        strokeWidth={1}
                      />
                    )}
                  </Group>
                );
              })
            ) : (
              // Fallback to legacy openings rendering for single wall
              openings.map((opening) => {
                const position = getOpeningPositionOnWall(opening, selectedWall);
                const openingWidthMM = getOpeningWidth(opening, pixelsPerMm);
                const openingWidth = openingWidthMM * effectiveScale;

                const isDoor = opening.type === 'door_line' || opening.type === 'sliding_door_line';
                const isWindow = opening.type === 'window_line';

                const openingHeightMM = isDoor ? 2100 : 1200;
                const sillHeightMM = isWindow ? 900 : 0;

                const openingHeight = openingHeightMM * effectiveScale;
                const sillHeight = sillHeightMM * effectiveScale;

                const openingX = wallX + position * renderedWallWidth - openingWidth / 2;
                const openingY = wallY + renderedWallHeight - openingHeight - sillHeight - skirtingHeight;

                return (
                  <Group key={opening.id}>
                    <Rect
                      x={openingX}
                      y={openingY}
                      width={openingWidth}
                      height={openingHeight}
                      fill={isDoor ? '#f0fdf4' : '#e0f2fe'}
                      stroke={isDoor ? '#22c55e' : '#3b82f6'}
                      strokeWidth={2}
                    />
                    <KonvaText
                      x={openingX}
                      y={openingY + openingHeight / 2 - 8}
                      width={openingWidth}
                      text={isDoor ? (opening.type === 'sliding_door_line' ? t('elevation.slidingDoor') : t('elevation.doorLabel')) : t('elevation.windowLabel')}
                      fontSize={11}
                      fill={isDoor ? '#166534' : '#1e40af'}
                      align="center"
                    />
                    <KonvaText
                      x={openingX}
                      y={openingY + openingHeight / 2 + 4}
                      width={openingWidth}
                      text={`${Math.round(openingWidthMM)}mm`}
                      fontSize={10}
                      fill="#6b7280"
                      align="center"
                    />
                    {isWindow && sillHeight > 0 && (
                      <Rect
                        x={openingX - 10}
                        y={openingY + openingHeight}
                        width={openingWidth + 20}
                        height={8}
                        fill="#f3f4f6"
                        stroke="#9ca3af"
                        strokeWidth={1}
                      />
                    )}
                  </Group>
                );
              })
            )}

            {/* Dimension lines */}
            <Group>
              <Line
                points={[wallX + renderedWallWidth + 30, wallY, wallX + renderedWallWidth + 30, wallY + renderedWallHeight]}
                stroke="#6b7280"
                strokeWidth={1}
              />
              <Line points={[wallX + renderedWallWidth + 25, wallY, wallX + renderedWallWidth + 35, wallY]} stroke="#6b7280" strokeWidth={1} />
              <Line points={[wallX + renderedWallWidth + 25, wallY + renderedWallHeight, wallX + renderedWallWidth + 35, wallY + renderedWallHeight]} stroke="#6b7280" strokeWidth={1} />
              <KonvaText x={wallX + renderedWallWidth + 40} y={wallY + renderedWallHeight / 2 - 6} text={`${Math.round(wallHeightMM)}mm`} fontSize={12} fill="#374151" />
            </Group>

            <Group>
              <Line points={[wallX, wallY + renderedWallHeight + floorHeight + 20, wallX + renderedWallWidth, wallY + renderedWallHeight + floorHeight + 20]} stroke="#6b7280" strokeWidth={1} />
              <Line points={[wallX, wallY + renderedWallHeight + floorHeight + 15, wallX, wallY + renderedWallHeight + floorHeight + 25]} stroke="#6b7280" strokeWidth={1} />
              <Line points={[wallX + renderedWallWidth, wallY + renderedWallHeight + floorHeight + 15, wallX + renderedWallWidth, wallY + renderedWallHeight + floorHeight + 25]} stroke="#6b7280" strokeWidth={1} />
              <KonvaText x={wallX} y={wallY + renderedWallHeight + floorHeight + 30} width={renderedWallWidth} text={`${Math.round(wallLengthMM)}mm`} fontSize={12} fill="#374151" align="center" />
            </Group>

            {/* Wall-relative objects (synced from floorplan) */}
            {renderWallRelativeObjects()}

            {/* Elevation-specific shapes */}
            {renderElevationShapes()}

            {/* Drawing preview */}
            {renderDrawingPreview()}

            {/* Measurement line */}
            {renderMeasurement()}

            {/* Transformer for selected shapes */}
            <Transformer
              ref={transformerRef}
              rotateEnabled={true}
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 20 || newBox.height < 20) return oldBox;
                return newBox;
              }}
            />
          </Layer>
        </Stage>
      </div>

      {/* Smart Data Panel */}
      <ElevationSmartData
        wall={selectedWall}
        elevationShapes={elevationShapes}
        wallLengthMM={wallLengthMM}
        wallHeightMM={wallHeightMM}
        isOpen={smartDataOpen}
        onOpenChange={setSmartDataOpen}
      />

      {/* Bottom info bar */}
      <div className="h-10 bg-white border-t flex items-center justify-between px-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Väggtjocklek: {selectedWall.thicknessMM || adminDefaults.wallThicknessMM}mm</span>
          <span>•</span>
          {wallRelativeObjects.length > 0 && (
            <>
              <span className="text-emerald-600">{wallRelativeObjects.length} synkade objekt</span>
              <span>•</span>
            </>
          )}
          <span>Öppningar: {openings.length}</span>
          <span>•</span>
          <span className="text-amber-600">Elevation-former: {elevationShapes.length}</span>
          {activeTool === 'measure' && (
            <>
              <span>•</span>
              <span className="text-red-500">{t('elevation.measureToolActive')}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-green-600">{t('elevation.autoSavesChanges')}</span>
          <span className="text-xs">{t('elevation.scrollToPan')} &bull; {t('elevation.doubleClickForDetails')}</span>
        </div>
      </div>

      {/* Shape Details Dialog */}
      <ElevationShapeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        shape={selectedShapeForDialog}
        onUpdate={handleShapeUpdate}
        onDelete={handleShapeDeleteFromDialog}
        projectId={projectId}
        isWall={selectedShapeForDialog?.id === selectedWall?.id}
        wallLengthMM={wallLengthMM}
        wallHeightMM={wallHeightMM}
        elevationShapes={elevationShapes}
      />

      {/* Info Popover for quick view on single click */}
      <ElevationInfoPopover
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        shape={popoverShape}
        position={popoverPosition}
        isWall={popoverIsWall}
        wallLengthMM={wallLengthMM}
        wallHeightMM={wallHeightMM}
        elevationShapes={elevationShapes}
        onDoubleClick={() => {
          if (popoverShape) {
            setSelectedShapeForDialog(popoverShape);
            setDialogOpen(true);
            setPopoverOpen(false);
          }
        }}
      />
    </div>
  );
};

export default ElevationCanvas;
