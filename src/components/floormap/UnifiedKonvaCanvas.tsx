import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text as KonvaText, Group, Transformer } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { useFloorMapStore } from './store';
import { FloorMapShape, ScalePreset, GridPreset } from './types';
import { v4 as uuidv4 } from 'uuid';
import { RoomDetailDialog } from './RoomDetailDialog';
import { NameRoomDialog } from './NameRoomDialog';
import { PropertyPanel } from './PropertyPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { saveShapesForPlan, loadShapesForPlan } from './utils/plans';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minimap } from './Minimap';
import { getSymbolComponent, ArchSymbolType, SYMBOL_METADATA } from './SymbolLibrary';
import { CanvasSettingsPopover } from './CanvasSettingsPopover';
import { getObjectById } from './ObjectRenderer';
import { ObjectShape, ObjectDefinition } from './objectLibraryDefinitions';
import { getTemplateById, placeTemplateShapes, calculateBounds, DEFAULT_TEMPLATES } from './templateDefinitions';

// Canvas module imports
import { MIN_ZOOM, MAX_ZOOM, getAdminDefaults } from './canvas/constants';
import { throttle, createUnifiedDragHandlers } from './canvas/utils';

// Canvas dimensions are now dynamic - read from projectSettings
// Default: 50m × 50m grid + 10m margin = 70m total (configurable in Canvas Settings)

// Dynamic default based on admin settings
const getDefaultWallThickness = () => {
  const { wallThicknessMM } = getAdminDefaults();
  return wallThicknessMM / 10; // Convert mm to pixels at scale
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

  return {
    // Major grids - building/apartment overview
    METER_5: { size: pixelsPerMeter * 5, color: "#707070", lineWidth: 2, label: "5m", opacity: 0.8 },
    METER_1: { size: pixelsPerMeter, color: "#888888", lineWidth: 1.5, label: "1m", opacity: 0.7 },
    
    // Working grids - standard architectural precision
    CM_50: { size: pixelsPerCm * 50, color: "#a0a0a0", lineWidth: 1, label: "50cm", opacity: 0.55 },
    CM_25: { size: pixelsPerCm * 25, color: "#b8b8b8", lineWidth: 0.8, label: "25cm", opacity: 0.45 },
    CM_10: { size: pixelsPerCm * 10, color: "#d0d0d0", lineWidth: 0.7, label: "10cm (100mm)", opacity: 0.4 },
  };
};

// Simplified zoom-based grid system for practical floor plan work
// 5 logical zoom levels optimized for architectural workflow
const getActiveGridLevels = (zoomLevel: number, pixelsPerMm: number) => {
  const GRID_LEVELS = getGridLevels(pixelsPerMm);
  const levels = [];

  // Level 1: Extreme zoom out - building overview (5m only)
  if (zoomLevel < 0.5) {
    levels.push(GRID_LEVELS.METER_5);
  }
  // Level 2: Zoomed out - floor plan overview (5m + 1m)
  else if (zoomLevel < 1.0) {
    levels.push(GRID_LEVELS.METER_5, GRID_LEVELS.METER_1);
  }
  // Level 3: Standard working view - room layout (1m + 50cm)
  else if (zoomLevel < 2.0) {
    levels.push(GRID_LEVELS.METER_1, GRID_LEVELS.CM_50);
  }
  // Level 4: Detailed view - furniture placement (50cm + 25cm)
  else if (zoomLevel < 3.5) {
    levels.push(GRID_LEVELS.CM_50, GRID_LEVELS.CM_25);
  }
  // Level 5: Maximum detail - precise measurements (25cm + 10cm)
  // 10cm (100mm) is the finest grid - perfect for architectural work
  else {
    levels.push(GRID_LEVELS.CM_25, GRID_LEVELS.CM_10);
  }

  return levels;
};

// Simplified snap size - matches the 5-level zoom system
// Maximum precision: 10cm (100mm) - perfect for architectural work
const getSnapSize = (zoomLevel: number, pixelsPerMm: number, forWalls: boolean = false): number => {
  const GRID_LEVELS = getGridLevels(pixelsPerMm);
  const pixelsPerCm = pixelsPerMm * 10;

  // FOR WALLS: Use the finest visible grid line based on zoom
  // Maximum precision: 10cm (100mm) at max zoom
  if (forWalls) {
    if (zoomLevel < 0.5) {
      return GRID_LEVELS.METER_5.size; // 5m snap (overview)
    }
    else if (zoomLevel < 1.0) {
      return GRID_LEVELS.METER_1.size; // 1m snap (floor plan)
    }
    else if (zoomLevel < 2.0) {
      return GRID_LEVELS.CM_50.size; // 50cm snap (standard)
    }
    else if (zoomLevel < 3.5) {
      return GRID_LEVELS.CM_25.size; // 25cm snap (detailed)
    }
    else {
      return GRID_LEVELS.CM_10.size; // 10cm snap (max precision)
    }
  }

  // FOR OTHER TOOLS: Dynamic scaling for optimal workflow
  // Same logic - maximum 10cm precision
  if (zoomLevel < 0.5) {
    return pixelsPerCm * 100; // 1m snap (overview)
  }
  else if (zoomLevel < 1.0) {
    return pixelsPerCm * 50;  // 50cm snap (floor plan)
  }
  else if (zoomLevel < 2.0) {
    return pixelsPerCm * 25;  // 25cm snap (standard)
  }
  else if (zoomLevel < 3.5) {
    return pixelsPerCm * 10;  // 10cm snap (detailed)
  }
  else {
    return pixelsPerCm * 10;  // 10cm snap (max precision - same as above)
  }
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

// Helper function to check if two walls are connected
const areWallsConnected = (wall1: FloorMapShape, wall2: FloorMapShape): boolean => {
  if ((wall1.type !== 'wall' && wall1.type !== 'line') || (wall2.type !== 'wall' && wall2.type !== 'line')) {
    return false;
  }
  
  const coords1 = wall1.coordinates as any;
  const coords2 = wall2.coordinates as any;
  
  const tolerance = 5; // 5 pixels tolerance
  
  // Check if any endpoint of wall1 matches any endpoint of wall2
  const w1Start = { x: coords1.x1, y: coords1.y1 };
  const w1End = { x: coords1.x2, y: coords1.y2 };
  const w2Start = { x: coords2.x1, y: coords2.y1 };
  const w2End = { x: coords2.x2, y: coords2.y2 };
  
  const distance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => 
    Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  
  return (
    distance(w1Start, w2Start) < tolerance ||
    distance(w1Start, w2End) < tolerance ||
    distance(w1End, w2Start) < tolerance ||
    distance(w1End, w2End) < tolerance
  );
};


// ============================================================================
// SHAPE COMPONENTS
// ============================================================================

interface ShapeComponentProps {
  shape: FloorMapShape;
  isSelected: boolean;
  onSelect: (evt?: KonvaEventObject<MouseEvent>) => void; // Pass event for modifier keys
  onTransform: (updates: Partial<FloorMapShape>) => void;
  shapeRefsMap: Map<string, Konva.Node>; // For unified drag system
}

// Wall Component with measurements
// PERFORMANCE: Memoized to prevent unnecessary re-renders
const WallShape = React.memo<ShapeComponentProps & { 
  viewState: { zoom: number; panX: number; panY: number };
  scaleSettings: { pixelsPerMm: number };
  projectSettings: { 
    snapEnabled: boolean;
    showDimensions: boolean;
    unit: 'mm' | 'cm' | 'm';
  };
  transformState?: {
    scaleX: number;
    scaleY: number;
    rotation: number;
    x: number;
    y: number;
  };
}>(({ 
  shape, 
  isSelected, 
  onSelect, 
  onTransform,
  shapeRefsMap,
  viewState,
  scaleSettings,
  projectSettings,
  transformState
}) => {
  const { zoom } = viewState;
  const { pixelsPerMm } = scaleSettings;
  const { snapEnabled, showDimensions, unit: displayUnit } = projectSettings;
  
  // Get active tool and snap size from store
  const activeTool = useFloorMapStore((state) => state.activeTool);
  const snapSize = 100 * pixelsPerMm; // 100mm snap size
  const shapeRef = useRef<Konva.Line>(null);
  
  // Track temporary coordinates while dragging for real-time measurement
  const [draggedCoords, setDraggedCoords] = useState<{x1: number, y1: number, x2: number, y2: number} | null>(null);
  const [draggedHandle, setDraggedHandle] = useState<'start' | 'end' | null>(null);

  // Store ref in shapeRefsMap for unified multi-select drag
  useEffect(() => {
    if (shapeRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, shapeRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);
  
  if (shape.type !== 'wall' && shape.type !== 'line') return null;
  
  const coords = shape.coordinates as any; // LineCoordinates
  const thickness = shape.thicknessMM ? shape.thicknessMM / 10 : getDefaultWallThickness();
  
  // Don't allow selecting walls when wall tool is active (drawing mode)
  const isDrawingWalls = activeTool === 'wall';
  const canSelect = !isDrawingWalls;
  
  // Calculate display coords: Handle transform state (multi-select scaling) OR manual dragging
  let displayCoords = coords;
  
  if (transformState) {
    // Apply transform from multi-select scaling
    const { scaleX, scaleY, x, y } = transformState;
    
    // Calculate transformed endpoints
    const transformedX1 = coords.x1 * scaleX + x;
    const transformedY1 = coords.y1 * scaleY + y;
    const transformedX2 = coords.x2 * scaleX + x;
    const transformedY2 = coords.y2 * scaleY + y;
    
    displayCoords = {
      x1: transformedX1,
      y1: transformedY1,
      x2: transformedX2,
      y2: transformedY2
    };
  } else if (draggedCoords) {
    // Use manual drag coords
    displayCoords = draggedCoords;
  }
  
  // Calculate wall length in millimeters (using display coords for real-time update)
  const dx = displayCoords.x2 - displayCoords.x1;
  const dy = displayCoords.y2 - displayCoords.y1;
  const lengthPixels = Math.sqrt(dx * dx + dy * dy);
  const lengthMM = lengthPixels / pixelsPerMm;
  
  // Format measurement according to display unit preference
  const formatMeasurement = (lengthInMM: number, unit: 'mm' | 'cm' | 'm'): string => {
    switch (unit) {
      case 'mm':
        return `${Math.round(lengthInMM)}mm`;
      case 'cm':
        return `${(lengthInMM / 10).toFixed(1)}cm`;
      case 'm':
        return `${(lengthInMM / 1000).toFixed(2)}m`;
      default:
        return `${Math.round(lengthInMM)}mm`;
    }
  };
  
  const measurement = formatMeasurement(lengthMM, displayUnit);
  
  // Calculate midpoint for label
  const midX = (displayCoords.x1 + displayCoords.x2) / 2;
  const midY = (displayCoords.y1 + displayCoords.y2) / 2;
  
  // Calculate angle for label rotation
  let angle = Math.atan2(dy, dx) * 180 / Math.PI;
  
  // Normalize angle so text is always readable (never upside down)
  // If angle is between 90-270 degrees, flip it 180 degrees
  if (angle > 90 || angle < -90) {
    angle += 180;
  }
  
  // Calculate offset perpendicular to wall (professional style - above wall line)
  // Position text above the wall with small margin
  const offsetDistance = (thickness / 2 + 12) / zoom; // Above wall + small margin
  const normalAngle = angle + 90; // Perpendicular to wall (upward)
  const normalX = Math.cos(normalAngle * Math.PI / 180) * offsetDistance;
  const normalY = Math.sin(normalAngle * Math.PI / 180) * offsetDistance;
  
  // Handle size based on zoom for better visibility
  const handleRadius = Math.max(6, 8 / zoom);
  
  // Label position: show at handle if dragging, otherwise show at midpoint
  const labelX = draggedHandle === 'start' ? displayCoords.x1 : 
                draggedHandle === 'end' ? displayCoords.x2 : 
                midX;
  const labelY = draggedHandle === 'start' ? displayCoords.y1 : 
                draggedHandle === 'end' ? displayCoords.y2 : 
                midY;
  
  // Offset label from handle when dragging (show above/beside)
  const labelOffsetX = draggedHandle ? 15 / zoom : 0;
  const labelOffsetY = draggedHandle ? -20 / zoom : 0;
  
  // Get selected shapes and multi-select state
  const selectedShapeIds = useFloorMapStore((state) => state.selectedShapeIds);
  const isMultiSelect = selectedShapeIds.length > 1;
  const isThisShapeSelected = selectedShapeIds.includes(shape.id);
  
  // Keep shapes draggable even in multi-select
  const isDraggable = canSelect;
  
  return (
    <Group
      id={`shape-${shape.id}`}
      name={shape.id}
      shapeId={shape.id}
      draggable={isDraggable}
      onClick={canSelect ? (e) => {
        e.cancelBubble = true;
        onSelect(e);
      } : undefined}
      onTap={canSelect ? (e) => {
        e.cancelBubble = true;
        onSelect(e);
      } : undefined}
      {...createUnifiedDragHandlers(shape.id, shapeRefsMap)}
      onDragEnd={(e) => {
        // Call unified handler first
        const unifiedHandlers = createUnifiedDragHandlers(shape.id, shapeRefsMap);
        unifiedHandlers.onDragEnd(e);
        
        // Then handle single-shape transform (if not multi-select)
        const selectedIds = useFloorMapStore.getState().selectedShapeIds;
        if (selectedIds.length === 1 || !selectedIds.includes(shape.id)) {
          const node = e.target;
          const snapEnabled = useFloorMapStore.getState().projectSettings.snapEnabled;
          const gridInterval = useFloorMapStore.getState().projectSettings.gridInterval;
          const scaleSettings = useFloorMapStore.getState().scaleSettings;
          const snapSize = gridInterval * scaleSettings.pixelsPerMm;
          
          let deltaX = node.x();
          let deltaY = node.y();
          
          if (snapEnabled && snapSize) {
            deltaX = Math.round(deltaX / snapSize) * snapSize;
            deltaY = Math.round(deltaY / snapSize) * snapSize;
          }
          
          onTransform({
            coordinates: {
              x1: coords.x1 + deltaX,
              y1: coords.y1 + deltaY,
              x2: coords.x2 + deltaX,
              y2: coords.y2 + deltaY,
            }
          });
          
          node.position({ x: 0, y: 0 });
        }
      }}
    >
      <Line
        ref={shapeRef}
        shapeId={shape.id}
        points={[coords.x1, coords.y1, coords.x2, coords.y2]}
        stroke={isSelected ? '#3b82f6' : shape.strokeColor || '#2d3748'}
        strokeWidth={thickness}
        strokeLineCap="square"
        listening={canSelect}
        // PERFORMANCE: Faster rendering during pan/zoom
        perfectDrawEnabled={false}
        hitStrokeWidth={12}
      />
      
      {/* Start point handle - only show when selected */}
      {isSelected && canSelect && (
        <Circle
          x={coords.x1}
          y={coords.y1}
          radius={handleRadius}
          fill="#3b82f6"
          stroke="#ffffff"
          strokeWidth={2}
          draggable={true}
          onMouseDown={(e) => {
            e.cancelBubble = true; // Prevent wall drag
          }}
          onDragStart={(e) => {
            e.cancelBubble = true; // Prevent wall drag
            setDraggedHandle('start');
          }}
          onDragMove={(e) => {
            e.cancelBubble = true; // Prevent wall drag
            let newX = e.target.x();
            let newY = e.target.y();
            
            // SNAP TO GRID
            if (snapEnabled) {
              newX = Math.round(newX / snapSize) * snapSize;
              newY = Math.round(newY / snapSize) * snapSize;
              e.target.position({ x: newX, y: newY });
            }
            
            // Update temporary coords for real-time measurement
            setDraggedCoords({
              x1: newX,
              y1: newY,
              x2: coords.x2,
              y2: coords.y2,
            });
          }}
          onDragEnd={(e) => {
            e.cancelBubble = true; // Prevent wall drag
            let newX = e.target.x();
            let newY = e.target.y();
            
            // SNAP TO GRID
            if (snapEnabled) {
              newX = Math.round(newX / snapSize) * snapSize;
              newY = Math.round(newY / snapSize) * snapSize;
            }
            
            onTransform({
              coordinates: {
                x1: newX,
                y1: newY,
                x2: coords.x2,
                y2: coords.y2,
              }
            });
            
            // Reset temporary state
            setDraggedCoords(null);
            setDraggedHandle(null);
          }}
        />
      )}
      
      {/* End point handle - only show when selected */}
      {isSelected && canSelect && (
        <Circle
          x={coords.x2}
          y={coords.y2}
          radius={handleRadius}
          fill="#3b82f6"
          stroke="#ffffff"
          strokeWidth={2}
          draggable={true}
          onMouseDown={(e) => {
            e.cancelBubble = true; // Prevent wall drag
          }}
          onDragStart={(e) => {
            e.cancelBubble = true; // Prevent wall drag
            setDraggedHandle('end');
          }}
          onDragMove={(e) => {
            e.cancelBubble = true; // Prevent wall drag
            let newX = e.target.x();
            let newY = e.target.y();
            
            // SNAP TO GRID
            if (snapEnabled) {
              newX = Math.round(newX / snapSize) * snapSize;
              newY = Math.round(newY / snapSize) * snapSize;
              e.target.position({ x: newX, y: newY });
            }
            
            // Update temporary coords for real-time measurement
            setDraggedCoords({
              x1: coords.x1,
              y1: coords.y1,
              x2: newX,
              y2: newY,
            });
          }}
          onDragEnd={(e) => {
            e.cancelBubble = true; // Prevent wall drag
            let newX = e.target.x();
            let newY = e.target.y();
            
            // SNAP TO GRID
            if (snapEnabled) {
              newX = Math.round(newX / snapSize) * snapSize;
              newY = Math.round(newY / snapSize) * snapSize;
            }
            
            onTransform({
              coordinates: {
                x1: coords.x1,
                y1: coords.y1,
                x2: newX,
                y2: newY,
              }
            });
            
            // Reset temporary state
            setDraggedCoords(null);
            setDraggedHandle(null);
          }}
        />
      )}
      
      {/* Measurement label - Professional style (no background, positioned above wall) */}
      {/* Only show if showDimensions is enabled OR actively dragging handle */}
      {(showDimensions || draggedHandle) && (
        <Group 
          x={labelX + labelOffsetX + (draggedHandle ? 0 : normalX)} 
          y={labelY + labelOffsetY + (draggedHandle ? 0 : normalY)} 
          rotation={draggedHandle ? 0 : angle}
        >
          <KonvaText
            x={-30}
            y={-8}
            width={60}
            text={measurement}
            fontSize={Math.max(9, 10 / zoom)}
            fontStyle={draggedHandle ? 'bold' : 'normal'}
            fill={draggedHandle ? '#3b82f6' : '#000000'}
            align="center"
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  const coordsEqual = JSON.stringify(prevProps.shape.coordinates) === JSON.stringify(nextProps.shape.coordinates);
  
  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.zoom === nextProps.zoom &&
    prevProps.activeTool === nextProps.activeTool &&
    prevProps.snapEnabled === nextProps.snapEnabled &&
    prevProps.snapSize === nextProps.snapSize &&
    prevProps.showDimensions === nextProps.showDimensions &&
    prevProps.displayUnit === nextProps.displayUnit &&
    coordsEqual &&
    JSON.stringify(prevProps.transformState) === JSON.stringify(nextProps.transformState) &&
    prevProps.shape.thicknessMM === nextProps.shape.thicknessMM &&
    prevProps.shape.strokeColor === nextProps.shape.strokeColor
  );
});

// Room Component
// PERFORMANCE: Memoized to prevent unnecessary re-renders
const RoomShape = React.memo<ShapeComponentProps & { 
  snapEnabled: boolean; 
  snapSize: number;
  zoom: number;
}>(({ 
  shape, 
  isSelected, 
  onSelect, 
  onTransform,
  shapeRefsMap,
  snapEnabled,
  snapSize,
  zoom
}) => {
  const groupRef = useRef<Konva.Group>(null);

  // Store ref in shapeRefsMap for unified multi-select drag
  useEffect(() => {
    if (groupRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, groupRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);

  // Track temporary points while dragging for real-time update
  const [draggedPoints, setDraggedPoints] = useState<{x: number, y: number}[] | null>(null);
  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);
  
  if (shape.type !== 'room') return null;
  
  const coords = shape.coordinates as any; // PolygonCoordinates
  const originalPoints = coords.points || [];
  
  // Use dragged points if dragging, otherwise use original points
  const points = draggedPoints || originalPoints;
  
  // Flatten points for Konva Line
  const flatPoints = points.flatMap((p: { x: number; y: number }) => [p.x, p.y]);
  
  // Calculate bounds for name positioning
  const xs = points.map((p: { x: number; y: number }) => p.x);
  const ys = points.map((p: { x: number; y: number }) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const roomWidth = maxX - minX;
  const roomHeight = maxY - minY;
  
  // Calculate font size
  const fontSize = Math.max(12, Math.min(roomHeight * 0.15, roomWidth * 0.08));
  
  // Handle size based on zoom for better visibility
  const handleRadius = Math.max(6, 8 / zoom);
  
  // Get selected shapes for multi-select (refs are from parent component)
  const selectedShapeIds = useFloorMapStore((state) => state.selectedShapeIds);
  const isMultiSelect = selectedShapeIds.length > 1;
  const isThisShapeSelected = selectedShapeIds.includes(shape.id);
  
  const isDraggable = true; // Always draggable
  
  return (
    <Group
      id={`shape-${shape.id}`}
      ref={groupRef}
      name={shape.id}
      shapeId={shape.id}
      draggable={isDraggable}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      {...createUnifiedDragHandlers(shape.id, shapeRefsMap)}
      onDragEnd={(e) => {
        // Call unified handler first
        const unifiedHandlers = createUnifiedDragHandlers(shape.id, shapeRefsMap);
        unifiedHandlers.onDragEnd(e);
        
        // Then handle single-shape transform (if not multi-select)
        const selectedIds = useFloorMapStore.getState().selectedShapeIds;
        if (selectedIds.length === 1 || !selectedIds.includes(shape.id)) {
          const node = e.target;
          const snapEnabled = useFloorMapStore.getState().projectSettings.snapEnabled;
          const gridInterval = useFloorMapStore.getState().projectSettings.gridInterval;
          const scaleSettings = useFloorMapStore.getState().scaleSettings;
          const snapSize = gridInterval * scaleSettings.pixelsPerMm;
          
          let deltaX = node.x();
          let deltaY = node.y();
          
          if (snapEnabled && snapSize) {
            deltaX = Math.round(deltaX / snapSize) * snapSize;
            deltaY = Math.round(deltaY / snapSize) * snapSize;
          }
          
          const newPoints = originalPoints.map((p: { x: number; y: number }) => ({
            x: p.x + deltaX,
            y: p.y + deltaY
          }));
          
          onTransform({
            coordinates: { points: newPoints }
          });
          
          node.position({ x: 0, y: 0 });
        }
      }}
    >
      {/* Room polygon - listening=false so Group receives all clicks (select + double-click) */}
      <Line
        points={flatPoints}
        closed
        fill={shape.color || 'rgba(59, 130, 246, 0.2)'}
        stroke={isSelected ? '#3b82f6' : (shape.strokeColor || 'rgba(41, 91, 172, 0.8)')}
        strokeWidth={isSelected ? 3 : 2}
        shapeId={shape.id}
        perfectDrawEnabled={false}
        listening={false}
      />
      
      {/* Room name - listening=false so Group receives clicks; name is display-only */}
      {shape.name && (
        <>
          <Rect
            x={centerX - (shape.name.length * fontSize * 0.3)}
            y={centerY - fontSize * 0.6}
            width={shape.name.length * fontSize * 0.6}
            height={fontSize * 1.2}
            fill="rgba(255, 255, 255, 0.9)"
            cornerRadius={2}
            listening={false}
          />
          <KonvaText
            x={centerX}
            y={centerY}
            text={shape.name}
            fontSize={fontSize}
            fill="#000000"
            align="center"
            verticalAlign="middle"
            offsetX={(shape.name.length * fontSize * 0.6) / 2}
            offsetY={fontSize * 0.6}
            listening={false}
          />
        </>
      )}
      
      {/* Edge midpoint handles - for adding new points */}
      {isSelected && originalPoints.map((point: { x: number; y: number }, index: number) => {
        const nextIndex = (index + 1) % originalPoints.length;
        const nextPoint = originalPoints[nextIndex];
        const midX = (point.x + nextPoint.x) / 2;
        const midY = (point.y + nextPoint.y) / 2;
        
        return (
          <Circle
            key={`edge-${index}`}
            x={midX}
            y={midY}
            radius={handleRadius * 0.8}
            fill={hoveredEdge === index ? '#10b981' : 'rgba(16, 185, 129, 0.6)'}
            stroke="#ffffff"
            strokeWidth={1.5}
            opacity={hoveredEdge === index ? 1 : 0.7}
            onMouseEnter={() => setHoveredEdge(index)}
            onMouseLeave={() => setHoveredEdge(null)}
            onClick={(e) => {
              e.cancelBubble = true;
              
              // Snap the midpoint to grid
              let newX = midX;
              let newY = midY;
              if (snapEnabled) {
                newX = Math.round(newX / snapSize) * snapSize;
                newY = Math.round(newY / snapSize) * snapSize;
              }
              
              // Insert new point between current point and next point
              const newPoints = [...originalPoints];
              newPoints.splice(nextIndex, 0, { x: newX, y: newY });
              
              onTransform({
                coordinates: { points: newPoints }
              });
              
              toast.success('Ny punkt tillagd');
              // New point added
            }}
          />
        );
      })}
      
      {/* Corner handles - only show when selected */}
      {isSelected && originalPoints.map((point: { x: number; y: number }, index: number) => {
        // Allow deletion if more than 3 points (minimum for a room)
        const canDelete = originalPoints.length > 3;
        
        return (
          <Circle
            key={`handle-${index}`}
            x={point.x}
            y={point.y}
            radius={handleRadius}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={2}
            draggable={true}
            onMouseDown={(e) => {
              e.cancelBubble = true; // Prevent group drag
            }}
            onDragStart={(e) => {
              e.cancelBubble = true; // Prevent group drag
              setDraggedPointIndex(index);
            }}
            onDragMove={(e) => {
              e.cancelBubble = true; // Prevent group drag
              let newX = e.target.x();
              let newY = e.target.y();
              
              // SNAP TO GRID
              if (snapEnabled) {
                newX = Math.round(newX / snapSize) * snapSize;
                newY = Math.round(newY / snapSize) * snapSize;
                e.target.position({ x: newX, y: newY });
              }
              
              // Update temporary points for real-time update
              const newPoints = [...originalPoints];
              newPoints[index] = { x: newX, y: newY };
              setDraggedPoints(newPoints);
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true; // Prevent group drag
              let newX = e.target.x();
              let newY = e.target.y();
              
              // SNAP TO GRID
              if (snapEnabled) {
                newX = Math.round(newX / snapSize) * snapSize;
                newY = Math.round(newY / snapSize) * snapSize;
              }
              
              // Update the actual shape coordinates
              const newPoints = [...originalPoints];
              newPoints[index] = { x: newX, y: newY };
              
              onTransform({
                coordinates: { points: newPoints }
              });
              
              // Reset temporary state
              setDraggedPoints(null);
              setDraggedPointIndex(null);
            }}
            onDblClick={(e) => {
              e.cancelBubble = true;
              
              if (canDelete) {
                // Remove this point
                const newPoints = originalPoints.filter((_: any, i: number) => i !== index);
                
                onTransform({
                  coordinates: { points: newPoints }
                });
                
                toast.success('Punkt borttagen');
                // Point removed
              } else {
                toast.error('Rummet måste ha minst 3 punkter');
              }
            }}
          />
        );
      })}
    </Group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  const coordsEqual = JSON.stringify(prevProps.shape.coordinates) === JSON.stringify(nextProps.shape.coordinates);
  
  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.zoom === nextProps.zoom &&
    prevProps.snapEnabled === nextProps.snapEnabled &&
    prevProps.snapSize === nextProps.snapSize &&
    coordsEqual &&
    prevProps.shape.color === nextProps.shape.color &&
    prevProps.shape.strokeColor === nextProps.shape.strokeColor &&
    prevProps.shape.name === nextProps.shape.name
  );
});

// Rectangle Shape Component
// PERFORMANCE: Memoized to prevent unnecessary re-renders
const RectangleShape = React.memo<ShapeComponentProps>(({ shape, isSelected, onSelect, onTransform, shapeRefsMap }) => {
  const shapeRef = useRef<Konva.Rect>(null);

  // Store ref in shapeRefsMap for unified multi-select drag
  useEffect(() => {
    if (shapeRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, shapeRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);
  
  if (shape.type !== 'rectangle' && shape.type !== 'door' && shape.type !== 'opening') return null;
  
  const coords = shape.coordinates as any; // RectangleCoordinates
  
  // Get selected shapes count to determine if multi-select is active
  const selectedShapeIds = useFloorMapStore((state) => state.selectedShapeIds);
  const isMultiSelect = selectedShapeIds.length > 1;
  const isDraggable = true; // Always draggable
  
  return (
    <Rect
      id={`shape-${shape.id}`}
      ref={shapeRef}
      name={shape.id}
      shapeId={shape.id}
      x={coords.left}
      y={coords.top}
      width={coords.width}
      height={coords.height}
      fill={shape.color || 'transparent'}
      stroke={isSelected ? '#3b82f6' : shape.strokeColor || '#000000'}
      strokeWidth={2}
      cornerRadius={2}
      draggable={isDraggable}
      onClick={(e) => {
        e.cancelBubble = true; // Stop event propagation
        onSelect(e);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      onDragStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target;
        
        // Handle drag for both selected and non-selected shapes
        onTransform({
          coordinates: {
            left: node.x(),
            top: node.y(),
            width: coords.width,
            height: coords.height,
          }
        });
        
        // Reset node position after updating coordinates
        node.position({ x: 0, y: 0 });
      }}
      onTransformEnd={(e) => {
        const node = shapeRef.current;
        if (!node) return;
        
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        
        node.scaleX(1);
        node.scaleY(1);
        
        onTransform({
          coordinates: {
            left: node.x(),
            top: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
          }
        });
      }}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  const coordsEqual = JSON.stringify(prevProps.shape.coordinates) === JSON.stringify(nextProps.shape.coordinates);
  
  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.isSelected === nextProps.isSelected &&
    coordsEqual &&
    prevProps.shape.color === nextProps.shape.color &&
    prevProps.shape.strokeColor === nextProps.shape.strokeColor
  );
});

// Circle Shape Component
// PERFORMANCE: Memoized to prevent unnecessary re-renders
const CircleShape = React.memo<ShapeComponentProps>(({ shape, isSelected, onSelect, onTransform, shapeRefsMap }) => {
  const shapeRef = useRef<Konva.Circle>(null);

  // Store ref in shapeRefsMap for unified multi-select drag
  useEffect(() => {
    if (shapeRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, shapeRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);
  
  if (shape.type !== 'circle') return null;
  
  const coords = shape.coordinates as any; // CircleCoordinates
  
  // Get selected shapes count to determine if multi-select is active
  const selectedShapeIds = useFloorMapStore((state) => state.selectedShapeIds);
  const isMultiSelect = selectedShapeIds.length > 1;
  const isDraggable = true; // Always draggable
  
  return (
    <Circle
      id={`shape-${shape.id}`}
      ref={shapeRef}
      name={shape.id}
      shapeId={shape.id}
      x={coords.cx}
      y={coords.cy}
      radius={coords.radius}
      fill={shape.color || 'transparent'}
      stroke={isSelected ? '#3b82f6' : shape.strokeColor || '#000000'}
      strokeWidth={2}
      draggable={isDraggable}
      onClick={(e) => {
        e.cancelBubble = true; // Stop event propagation
        onSelect(e);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      onDragStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target;
        
        // Handle drag for both selected and non-selected shapes
        onTransform({
          coordinates: {
            cx: node.x(),
            cy: node.y(),
            radius: coords.radius,
          }
        });
        
        // Reset node position after updating coordinates
        node.position({ x: 0, y: 0 });
      }}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  const coordsEqual = JSON.stringify(prevProps.shape.coordinates) === JSON.stringify(nextProps.shape.coordinates);
  
  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.isSelected === nextProps.isSelected &&
    coordsEqual &&
    prevProps.shape.color === nextProps.shape.color &&
    prevProps.shape.strokeColor === nextProps.shape.strokeColor
  );
});

// Text Shape Component
// PERFORMANCE: Memoized to prevent unnecessary re-renders
const TextShape = React.memo<ShapeComponentProps>(({ shape, isSelected, onSelect, onTransform, shapeRefsMap }) => {
  const textRef = useRef<Konva.Text>(null);

  // Store ref in textRefsMap for unified multi-select drag
  useEffect(() => {
    if (textRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, textRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);
  
  if (shape.type !== 'text') return null;
  
  const coords = shape.coordinates as any; // TextCoordinates
  
  // Get selected shapes count to determine if multi-select is active
  const selectedShapeIds = useFloorMapStore((state) => state.selectedShapeIds);
  const isMultiSelect = selectedShapeIds.length > 1;
  const isDraggable = true; // Always draggable
  
  return (
    <KonvaText
      id={`shape-${shape.id}`}
      ref={textRef}
      name={shape.id}
      shapeId={shape.id}
      x={coords.x}
      y={coords.y}
      text={shape.text || 'Text'}
      fontSize={shape.metadata?.lengthMM || 16}
      fill={shape.color || '#000000'}
      draggable={isDraggable}
      onClick={(e) => {
        e.cancelBubble = true; // Stop event propagation
        onSelect(e);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      rotation={shape.rotation || 0}
      onDragStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target;
        
        // Handle drag for both selected and non-selected shapes
        onTransform({
          coordinates: {
            x: node.x(),
            y: node.y(),
          }
        });
        
        // Reset node position after updating coordinates
        node.position({ x: 0, y: 0 });
      }}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  const coordsEqual = JSON.stringify(prevProps.shape.coordinates) === JSON.stringify(nextProps.shape.coordinates);
  
  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.isSelected === nextProps.isSelected &&
    coordsEqual &&
    prevProps.shape.text === nextProps.shape.text &&
    prevProps.shape.color === nextProps.shape.color &&
    prevProps.shape.rotation === nextProps.shape.rotation &&
    prevProps.shape.metadata?.lengthMM === nextProps.shape.metadata?.lengthMM
  );
});

// Freehand/Polygon Shape Component
// PERFORMANCE: Memoized to prevent unnecessary re-renders
const FreehandShape = React.memo<ShapeComponentProps>(({ shape, isSelected, onSelect, onTransform, shapeRefsMap }) => {
  const shapeRef = useRef<Konva.Line>(null);

  // Store ref in shapeRefsMap for unified multi-select drag
  useEffect(() => {
    if (shapeRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, shapeRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);

  if (shape.type !== 'freehand' && shape.type !== 'polygon') return null;
  
  const coords = shape.coordinates as any; // PolygonCoordinates
  const points = coords.points || [];
  const flatPoints = points.flatMap((p: { x: number; y: number }) => [p.x, p.y]);
  
  // Get selected shapes count to determine if multi-select is active
  const selectedShapeIds = useFloorMapStore((state) => state.selectedShapeIds);
  const isMultiSelect = selectedShapeIds.length > 1;
  const isDraggable = true; // Always draggable
  
  return (
    <Line
      ref={shapeRef}
      id={`shape-${shape.id}`}
      name={shape.id}
      shapeId={shape.id}
      points={flatPoints}
      stroke={isSelected ? '#3b82f6' : shape.strokeColor || '#000000'}
      strokeWidth={shape.strokeWidth || 2}
      tension={0.5}
      lineCap="round"
      lineJoin="round"
      draggable={isDraggable}
      // PERFORMANCE: Disable perfect draw for faster rendering
      perfectDrawEnabled={false}
      hitStrokeWidth={10}
      onClick={(e) => {
        e.cancelBubble = true; // Stop event propagation
        onSelect(e);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      onDragStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target;
        const deltaX = node.x();
        const deltaY = node.y();
        
        // Handle drag for both selected and non-selected shapes
        const newPoints = points.map((p: { x: number; y: number }) => ({
          x: p.x + deltaX,
          y: p.y + deltaY
        }));
        
        onTransform({
          coordinates: { points: newPoints }
        });
        
        // Reset node position after updating coordinates
        node.position({ x: 0, y: 0 });
      }}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  const coordsEqual = JSON.stringify(prevProps.shape.coordinates) === JSON.stringify(nextProps.shape.coordinates);
  
  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.isSelected === nextProps.isSelected &&
    coordsEqual &&
    prevProps.shape.color === nextProps.shape.color &&
    prevProps.shape.strokeColor === nextProps.shape.strokeColor
  );
});

// ============================================================================
// LIBRARY SYMBOL SHAPE - Renders professional architectural symbols
// ============================================================================

/**
 * Renders a library symbol from the SymbolLibrary
 * Detects shapes with metadata.isLibrarySymbol = true
 */
const LibrarySymbolShape = React.memo<ShapeComponentProps>(({ shape, isSelected, onSelect, onTransform, shapeRefsMap }) => {
  const symbolRef = useRef<Konva.Group>(null);

  // Store ref in shapeRefsMap for unified multi-select drag
  useEffect(() => {
    if (symbolRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, symbolRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);

  // Only handle shapes that are library symbols
  if (!shape.metadata?.isLibrarySymbol || !shape.metadata?.symbolType) {
    return null;
  }
  
  const symbolType = shape.metadata.symbolType as ArchSymbolType;
  const SymbolComponent = getSymbolComponent(symbolType);
  
  if (!SymbolComponent) {
    console.warn(`Symbol component not found for type: ${symbolType}`);
    return null;
  }
  
  const placementX = shape.metadata.placementX || 0;
  const placementY = shape.metadata.placementY || 0;
  const symbolScale = shape.metadata.scale || 1;
  const symbolRotation = shape.metadata.rotation || 0;
  
  // Get selected shapes count to determine if multi-select is active
  const selectedShapeIds = useFloorMapStore((state) => state.selectedShapeIds);
  const isMultiSelect = selectedShapeIds.length > 1;
  const isDraggable = true; // Always draggable
  
  return (
    <Group
      ref={symbolRef}
      id={`shape-${shape.id}`}
      name={shape.id}
      shapeId={shape.id}
      x={placementX}
      y={placementY}
      rotation={symbolRotation}
      scaleX={symbolScale * 0.1} // Scale from 1000mm → 100px (1:100 scale)
      scaleY={symbolScale * 0.1}
      draggable={isDraggable}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target;
        
        // Update placement position
        onTransform({
          metadata: {
            ...shape.metadata,
            placementX: node.x(),
            placementY: node.y(),
          }
        });
        
        node.position({ x: node.x(), y: node.y() });
      }}
      onTransformEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        const rotation = node.rotation();
        
        // Update scale and rotation
        onTransform({
          metadata: {
            ...shape.metadata,
            scale: (scaleX + scaleY) / 2, // Average scale
            rotation: rotation,
            placementX: node.x(),
            placementY: node.y(),
          }
        });
        
        // Reset transform (we store it in metadata)
        node.scaleX(symbolScale * 0.1);
        node.scaleY(symbolScale * 0.1);
        node.rotation(rotation);
      }}
    >
      {/* Render the symbol */}
      <SymbolComponent
        x={0}
        y={0}
        strokeColor={isSelected ? '#3b82f6' : '#000000'}
        fillColor="transparent"
        strokeWidth={2}
      />
      
      {/* Selection highlight */}
      {isSelected && (
        <Rect
          x={-50}
          y={-50}
          width={1100}
          height={1100}
          stroke="#3b82f6"
          strokeWidth={30}
          dash={[50, 30]}
          listening={false}
        />
      )}
    </Group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison
  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.isSelected === nextProps.isSelected &&
    JSON.stringify(prevProps.shape.metadata) === JSON.stringify(nextProps.shape.metadata)
  );
});

/**
 * OBJECT LIBRARY SHAPE - Renders JSON-based objects
 */
const ObjectLibraryShape = React.memo<ShapeComponentProps>(({ shape, isSelected, onSelect, onTransform, shapeRefsMap }) => {
  const objectRef = useRef<Konva.Group>(null);

  // Store ref in shapeRefsMap for unified multi-select drag
  useEffect(() => {
    if (objectRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, objectRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);

  // Only handle shapes that are object library objects
  if (!shape.metadata?.isObjectLibrary || !shape.metadata?.objectId) {
    return null;
  }
  
  const objectId = shape.metadata.objectId as string;
  const objectDef = getObjectById(objectId);
  
  if (!objectDef) {
    console.warn(`Object definition not found for ID: ${objectId}`);
    return null;
  }
  
  const placementX = shape.metadata.placementX || 0;
  const placementY = shape.metadata.placementY || 0;
  const objectScale = shape.metadata.scale || 1;
  const objectRotation = shape.metadata.rotation || 0;
  
  // Get selected shapes count to determine if multi-select is active
  const selectedShapeIds = useFloorMapStore((state) => state.selectedShapeIds);
  const isMultiSelect = selectedShapeIds.length > 1;
  const isDraggable = true; // Always draggable
  
  // Get scale settings for proper rendering
  const scaleSettings = useFloorMapStore((state) => state.scaleSettings);
  
  return (
    <Group
      ref={objectRef}
      id={`shape-${shape.id}`}
      name={shape.id}
      shapeId={shape.id}
      x={placementX}
      y={placementY}
      rotation={objectRotation}
      scaleX={objectScale * scaleSettings.pixelsPerMm}
      scaleY={objectScale * scaleSettings.pixelsPerMm}
      draggable={isDraggable}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target;
        
        // Update placement position
        onTransform({
          metadata: {
            ...shape.metadata,
            placementX: node.x(),
            placementY: node.y(),
          }
        });
        
        node.position({ x: node.x(), y: node.y() });
      }}
      onTransformEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        const rotation = node.rotation();
        
        // Update scale and rotation
        onTransform({
          metadata: {
            ...shape.metadata,
            scale: (scaleX + scaleY) / (2 * scaleSettings.pixelsPerMm), // Normalize scale
            rotation: rotation,
            placementX: node.x(),
            placementY: node.y(),
          }
        });
        
        // Reset transform (we store it in metadata)
        node.scaleX(objectScale * scaleSettings.pixelsPerMm);
        node.scaleY(objectScale * scaleSettings.pixelsPerMm);
        node.rotation(rotation);
      }}
    >
      {/* Render the object using ObjectRenderer */}
      {objectDef.shapes && objectDef.shapes.map((objShape, idx) => {
        const commonProps = {
          key: `obj-shape-${idx}`,
          listening: false,
        };
        
        switch (objShape.type) {
          case 'line':
            return (
              <Line
                {...commonProps}
                points={objShape.points}
                stroke={isSelected ? '#3b82f6' : (objShape.stroke || '#000000')}
                strokeWidth={objShape.strokeWidth || 2}
                lineCap="round"
                lineJoin="round"
                dash={objShape.dash}
                opacity={objShape.opacity}
              />
            );
            
          case 'circle':
            return (
              <Circle
                {...commonProps}
                x={objShape.x}
                y={objShape.y}
                radius={objShape.radius}
                stroke={isSelected ? '#3b82f6' : (objShape.stroke || '#000000')}
                strokeWidth={objShape.strokeWidth || 2}
                fill={objShape.fill}
                opacity={objShape.opacity}
              />
            );
            
          case 'rect':
            return (
              <Rect
                {...commonProps}
                x={objShape.x}
                y={objShape.y}
                width={objShape.width}
                height={objShape.height}
                stroke={isSelected ? '#3b82f6' : (objShape.stroke || '#000000')}
                strokeWidth={objShape.strokeWidth || 2}
                fill={objShape.fill}
                opacity={objShape.opacity}
              />
            );
            
          case 'ellipse':
            return (
              <Circle
                {...commonProps}
                x={objShape.x}
                y={objShape.y}
                radiusX={objShape.radiusX}
                radiusY={objShape.radiusY}
                stroke={isSelected ? '#3b82f6' : (objShape.stroke || '#000000')}
                strokeWidth={objShape.strokeWidth || 2}
                fill={objShape.fill}
                opacity={objShape.opacity}
              />
            );
            
          default:
            return null;
        }
      })}
      
      {/* Selection highlight */}
      {isSelected && (
        <Rect
          x={-50}
          y={-50}
          width={objectDef.defaultWidth + 100}
          height={objectDef.defaultHeight + 100}
          stroke="#3b82f6"
          strokeWidth={30 / scaleSettings.pixelsPerMm}
          dash={[50 / scaleSettings.pixelsPerMm, 30 / scaleSettings.pixelsPerMm]}
          listening={false}
        />
      )}
    </Group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison
  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.isSelected === nextProps.isSelected &&
    JSON.stringify(prevProps.shape.metadata) === JSON.stringify(nextProps.shape.metadata)
  );
});

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
  activeGrids.forEach((gridLevel, levelIndex) => {
    const gridSize = gridLevel.size;
    
    // Calculate grid line positions aligned to grid
    const startX = Math.floor(extendedLeft / gridSize) * gridSize;
    const endX = Math.ceil(extendedRight / gridSize) * gridSize;
    const startY = Math.floor(extendedTop / gridSize) * gridSize;
    const endY = Math.ceil(extendedBottom / gridSize) * gridSize;
    
    // Vertical lines - extend infinitely across viewport
    for (let x = startX; x <= endX; x += gridSize) {
      lines.push(
        <Line
          key={`${levelIndex}-v-${x}`}
          points={[x, extendedTop, x, extendedBottom]}
          stroke={gridLevel.color}
          strokeWidth={Math.max(0.3, gridLevel.lineWidth / zoom)}
          opacity={gridLevel.opacity}
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    }
    
    // Horizontal lines - extend infinitely across viewport
    for (let y = startY; y <= endY; y += gridSize) {
      lines.push(
        <Line
          key={`${levelIndex}-h-${y}`}
          points={[extendedLeft, y, extendedRight, y]}
          stroke={gridLevel.color}
          strokeWidth={Math.max(0.3, gridLevel.lineWidth / zoom)}
          opacity={gridLevel.opacity}
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    }
  });
  
  // Canvas working area (centered at 0,0) - for background
  const canvasWidthPx = canvasWidthMeters * 1000 * pixelsPerMm;
  const canvasHeightPx = canvasHeightMeters * 1000 * pixelsPerMm;
  const canvasOffsetX = -canvasWidthPx / 2;
  const canvasOffsetY = -canvasHeightPx / 2;
  
  return (
    <>
      {/* White background for canvas working area */}
      <Rect
        x={canvasOffsetX}
        y={canvasOffsetY}
        width={canvasWidthPx}
        height={canvasHeightPx}
        fill="#ffffff"
        listening={false}
      />
      
      {/* Gridlines - extend infinitely across visible viewport */}
      {lines}
      
      {/* Canvas boundary - blue dashed border */}
      <Rect
        x={canvasOffsetX}
        y={canvasOffsetY}
        width={canvasWidthPx}
        height={canvasHeightPx}
        stroke="#3b82f6"
        strokeWidth={2 / zoom}
        dash={[10 / zoom, 5 / zoom]}
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
}

export const UnifiedKonvaCanvas: React.FC<UnifiedKonvaCanvasProps> = ({ onRoomCreated }) => {
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
  
  // Double-click handling state (simplified like old canvas)
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickedShapeId, setLastClickedShapeId] = useState<string | null>(null);
  const [isGroupMode, setIsGroupMode] = useState(true); // Start in group mode
  
  // Wall chaining state (for continuous wall drawing like old canvas)
  const [lastWallEndPoint, setLastWallEndPoint] = useState<{ x: number; y: number } | null>(null);
  
  // Drag selection state (box select)
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  
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
  
  
  // Text input dialog state
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [pendingTextPosition, setPendingTextPosition] = useState<{ x: number; y: number } | null>(null);
  
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
        const { data, error} = await supabase
          .from('rooms')
          .select('*')
          .eq('id', selectedRoomForDetail)
          .single();

        if (data && !error) {
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
  
  // Actions (don't cause re-renders)
  const setViewState = useFloorMapStore((state) => state.setViewState);
  const setCurrentPlanId = useFloorMapStore((state) => state.setCurrentPlanId);
  const setSelectedShapeId = useFloorMapStore((state) => state.setSelectedShapeId);
  const setSelectedShapeIds = useFloorMapStore((state) => state.setSelectedShapeIds);
  const setShapes = useFloorMapStore((state) => state.setShapes);
  const updateShape = useFloorMapStore((state) => state.updateShape);
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
  const setActiveTool = useFloorMapStore((state) => state.setActiveTool);
  
  // Calculate canvas dimensions from settings (in pixels)
  // SIMPLIFIED: Canvas = Working area (no margin)
  const CANVAS_WIDTH = useMemo(() => {
    return projectSettings.canvasWidthMeters * 1000 * scaleSettings.pixelsPerMm;
  }, [projectSettings.canvasWidthMeters, scaleSettings.pixelsPerMm]);
  
  const CANVAS_HEIGHT = useMemo(() => {
    return projectSettings.canvasHeightMeters * 1000 * scaleSettings.pixelsPerMm;
  }, [projectSettings.canvasHeightMeters, scaleSettings.pixelsPerMm]);
  
  // Filter shapes for current plan
  const currentShapes = useMemo(
    () => shapes.filter(shape => shape.planId === currentPlanId),
    [shapes, currentPlanId]
  );
  
  // Handle text dialog submit (must be after store extraction)
  const handleTextSubmit = useCallback(() => {
    if (textInputValue.trim() && pendingTextPosition && currentPlanId) {
      const newShape: FloorMapShape = {
        id: uuidv4(),
        planId: currentPlanId,
        type: 'text',
        coordinates: { x: pendingTextPosition.x, y: pendingTextPosition.y },
        text: textInputValue,
        metadata: { lengthMM: 16 }, // Font size
      };
      addShape(newShape);
      toast.success('Text tillagd');
    }
    setIsTextDialogOpen(false);
    setTextInputValue('');
    setPendingTextPosition(null);
  }, [textInputValue, pendingTextPosition, currentPlanId, addShape]);
  
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
  
  // Initialize viewport on mount - simple initial state
  useEffect(() => {
    // Start centered - constrainPan will be applied on first interaction
    setViewState({ panX: 0, panY: 0, zoom: 1 });
  }, [setViewState]); // Run once on mount
  
  // Load shapes when plan changes
  useEffect(() => {
    if (!currentPlanId) {
      // No plan selected, clear shapes
      setShapes([]);
      return;
    }
    
    const loadShapes = async () => {
      const loadedShapes = await loadShapesForPlan(currentPlanId);
      
      // Load room names from rooms table for room shapes
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
            const shapesWithRoomData = loadedShapes.map(shape => {
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
            setShapes(shapesWithRoomData);
            // Loaded room data successfully
            return;
          }
        } catch (error) {
          console.error('Error loading room data:', error);
        }
      }
      
      setShapes(loadedShapes);
      
      // Check if AI import has centering instructions
      setTimeout(() => {
        const aiCenterView = (window as any).__aiImportCenterView;
        if (aiCenterView) {
          // Applying AI import center view
          setViewState({
            zoom: aiCenterView.zoom,
            panX: aiCenterView.panX,
            panY: aiCenterView.panY,
          });
          // Clear the flag
          delete (window as any).__aiImportCenterView;
          toast.success('Canvas centrerad på AI-importerade objekt');
        }
      }, 800); // Delay to ensure shapes are rendered
    };
    
    loadShapes();
  }, [currentPlanId, currentProjectId, setShapes]);
  
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
  }, [undo, redo, canUndo, canRedo, addShape, updateShape, deleteShape, deleteShapes, setSelectedShapeId, setSelectedShapeIds, selectedShapeId, selectedShapeIds, currentShapes, clipboard, currentPlanId, setActiveTool]);
  
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
      
      // Escape key - cancel operation and return to select tool
      if (e.key === 'Escape' && !isTyping) {
        e.preventDefault();
        
        // Cancel any active drawing operations
        setLastWallEndPoint(null);
        setIsDrawing(false);
        setCurrentDrawingPoints([]);
        
        // Return to select tool (basic pointer functionality)
        setActiveToolRef.current('select');
        
        toast.info('Återgick till markör-verktyget');
      }
      
      // Delete key
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping) {
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
        setSelectedShapeIdsRef.current(allIds);
        if (allIds.length > 0) {
          setSelectedShapeIdRef.current(allIds[0]);
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
            }
            
            return newShape;
          });
          
          // Add all new shapes
          newShapes.forEach(shape => addShapeRef.current(shape));
          
          // Select the pasted shapes
          setSelectedShapeIdsRef.current(newShapes.map(s => s.id));
          setSelectedShapeIdRef.current(newShapes[0].id);
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
              }
              
              return newShape;
            });
            
            // Add all duplicated shapes
            newShapes.forEach(shape => addShapeRef.current(shape));
            
            // Select the duplicated shapes
            setSelectedShapeIdsRef.current(newShapes.map(s => s.id));
            setSelectedShapeIdRef.current(newShapes[0].id);
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
    // ERASER TOOL - delete shape immediately (before any other logic)
    if (activeTool === 'eraser') {
      deleteShape(shapeId);
      toast.success('Objekt raderat');
      return; // Stop here, don't select or open panels
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
      
      // SNAP SPLIT POINT TO GRID (use wall precision)
      const currentSnapSize = getSnapSize(viewState.zoom, scaleSettings.pixelsPerMm, true);
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
    const isDoubleClick = now - lastClickTime < 300 && lastClickedShapeId === shapeId;
    
    if (isDoubleClick) {
      // DOUBLE-CLICK → Different behavior based on Shift key
      // Double-click detected
      
      const shape = currentShapes.find(s => s.id === shapeId);
      if (shape) {
        // Check if Shift is held (we'll need to pass event to check this properly)
        // For now, regular double-click = open properties
        // TODO: Shift+Double-Click = select connected group
        
        // Double-click - opening unified object info panel
        setSelectedShapeId(shapeId);
        setSelectedShapeIds([shapeId]); // Only this shape
        // Double-click - opening properties
        setSelectedShapeId(shapeId);
        setSelectedShapeIds([shapeId]); // Only this shape
        
        // For rooms, open RoomDetailDialog (full DB integration)
        if (shapeType === 'room') {
          if (shape.roomId) {
            setSelectedRoomForDetail(shape.roomId);
            setIsRoomDetailOpen(true);
            // Opening RoomDetailDialog
          } else {
            // Room not saved yet
            const roomId = await saveRoomToDB(shape);
            if (roomId) {
              setSelectedRoomForDetail(roomId);
              setIsRoomDetailOpen(true);
            }
          }
        } else {
          // For all other objects (walls, doors, text, etc.) → PropertyPanel
          setPropertyPanelShape(shape);
          setShowPropertyPanel(true);
          const shapeWord = shapeType === 'wall' ? 'vägg' : 'objekt';
          toast.success(`Enskilt ${shapeWord} markerat - Öppnar egenskapspanel`);
        }
      }
      
      setLastClickTime(0);
      setLastClickedShapeId(null);
    } else {
      // SINGLE CLICK - Miro-style selection with modifier support

      // Check for modifier keys to enable multi-select
      const isMultiSelect = evt && (evt.evt.ctrlKey || evt.evt.metaKey || evt.evt.shiftKey);
      const currentlySelected = useFloorMapStore.getState().selectedShapeIds;

      if (isMultiSelect) {
        // MODIFIER + CLICK: Toggle selection (add/remove from current selection)
        if (currentlySelected.includes(shapeId)) {
          // Remove from selection
          const newIds = currentlySelected.filter(id => id !== shapeId);
          setSelectedShapeIds(newIds);
          if (newIds.length > 0) {
            setSelectedShapeId(newIds[0]);
          } else {
            setSelectedShapeId(null);
          }
          toast.success(`Objekt borttaget från markering`);
        } else {
          // Add to selection
          const newIds = [...currentlySelected, shapeId];
          setSelectedShapeIds(newIds);
          setSelectedShapeId(shapeId);
          toast.success(`${newIds.length} objekt markerade`);
        }
      } else {
        // REGULAR CLICK: Replace selection with single shape
        setSelectedShapeId(shapeId);
        setSelectedShapeIds([shapeId]);

        const shapeWord = shapeType === 'wall' ? 'vägg' : shapeType === 'room' ? 'rum' : 'objekt';
        toast.success(`Enskilt ${shapeWord} markerat`);
      }

      setSelectedWallUnit(null);
      setWallSelectionMode('unit');

      setLastClickTime(now);
      setLastClickedShapeId(shapeId);
    }
  }, [activeTool, deleteShape, addShape, viewState, gridSettings, scaleSettings, currentShapes, lastClickTime, lastClickedShapeId, saveRoomToDB, setSelectedShapeId, setSelectedShapeIds, selectedShapeIds, setSelectedRoomForDetail, setIsRoomDetailOpen, setPropertyPanelShape, setShowPropertyPanel]);
  
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
  
  // Handle touch start (for pinch zoom)
  const handleTouchStart = useCallback((e: KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    
    // Two-finger touch = prepare for pinch zoom
    if (touches.length === 2) {
      e.evt.preventDefault(); // Prevent browser zoom
      
      const distance = getTouchDistance(touches[0], touches[1]);
      const center = getTouchCenter(touches[0], touches[1]);
      
      setLastTouchDistance(distance);
      setLastTouchCenter(center);
    }
  }, []);
  
  // Handle touch move (pinch zoom)
  const handleTouchMove = useCallback((e: KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    const stage = stageRef.current;
    if (!stage) return;
    
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
    
    // Reset pinch zoom state when fingers are lifted
    if (touches.length < 2) {
      setLastTouchDistance(null);
      setLastTouchCenter(null);
    }
  }, []);
  
  // Handle mouse down
  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    // CRITICAL: If clicking on a shape, let the shape handle it - don't interfere
    const target = e.target;
    const isShape = target !== target.getStage() && (target as any).attrs?.shapeId;
    if (isShape) {
      // Shape will handle its own events - don't interfere
      return;
    }
    
    const stage = stageRef.current;
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    // Transform to canvas coordinates
    let pos = {
      x: (pointer.x - viewState.panX) / viewState.zoom,
      y: (pointer.y - viewState.panY) / viewState.zoom,
    };
    
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
            rotation: 0,
          }
        };
        
        addShape(newShape);
        toast.success(`✨ ${symbolMetadata.name} placed`);
        
        // Clear the pending symbol so user can continue working
        setPendingLibrarySymbol(null);
      }
      
      return;
    }
    
    // ============================================================================
    // OBJECT LIBRARY PLACEMENT - JSON-based Architectural Objects
    // ============================================================================
    if (pendingObjectId && currentPlanId) {
      const objectDef = getObjectById(pendingObjectId);
      
      if (objectDef) {
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
          metadata: {
            isObjectLibrary: true,
            objectId: pendingObjectId,
            placementX: pos.x,
            placementY: pos.y,
            scale: 1, // Default scale - user can transform after placement
            rotation: 0,
          }
        };
        
        addShape(newShape);
        toast.success(`✨ ${objectDef.name} placed`);
        
        // Clear the pending object so user can continue working
        setPendingObjectId(null);
      }
      
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
    
    // Snap to grid if enabled (dynamic snap size based on zoom)
    // Use wall precision (finest visible grid) if wall tool is active
    const forWalls = activeTool === 'wall';
    const currentSnapSize = getSnapSize(viewState.zoom, scaleSettings.pixelsPerMm, forWalls);
    // Use projectSettings for snap control
    pos = snapToGrid(pos, currentSnapSize, projectSettings.snapEnabled);
    
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
    
    if (clickedOnEmpty && activeTool === 'select' && !e.evt.shiftKey && !e.evt.ctrlKey && !e.evt.metaKey) {
      // Start box selection
      setIsBoxSelecting(true);
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
    
    // FREEHAND TOOL - Click to add freehand points
    if (activeTool === 'freehand' && !isDrawing) {
      setIsDrawing(true);
      addDrawingPoint(pos);
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

    // Calculate position
    const pos = {
      x: (pointer.x - viewState.panX) / viewState.zoom,
      y: (pointer.y - viewState.panY) / viewState.zoom,
    };

    // Snap to grid if enabled (dynamic snap size based on zoom)
    // Use wall precision (finest visible grid) if wall tool is active
    const forWalls = activeTool === 'wall';
    const currentSnapSize = getSnapSize(viewState.zoom, scaleSettings.pixelsPerMm, forWalls);
    // Use projectSettings for snap control
    const snappedPos = snapToGrid(pos, currentSnapSize, projectSettings.snapEnabled);

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
    
    // Drawing mode - add points (for wall and freehand, NOT room)
    if (isDrawing && (activeTool === 'wall' || activeTool === 'freehand')) {
      addDrawingPoint(snappedPos);
      return;
    }
  }, [isPanning, panStart, isBoxSelecting, selectionBox, isDrawing, currentDrawingPoints, viewState, activeTool, gridSettings.snap, scaleSettings.pixelsPerMm, setViewState, addDrawingPoint, setCurrentDrawingPoints, throttledSetSelectionBox, projectSettings.snapEnabled, constrainPan]);
  
  // Handle mouse up
  const handleMouseUp = useCallback((e: KonvaEventObject<MouseEvent>) => {
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
            
            return false;
          })
          .map(shape => shape.id);
        
        setSelectedShapeIds(selectedIds);
        
        if (selectedIds.length > 0) {
          toast.success(`${selectedIds.length} objekt markerade`);
        }
      }
      setSelectionBox(null);
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
      }
      
      if (newShape) {
        addShape(newShape);
      }
      
      setIsDrawing(false);
      setCurrentDrawingPoints([]);
      return;
    }
  }, [isPanning, isBoxSelecting, selectionBox, isDrawing, currentDrawingPoints, currentPlanId, activeTool, currentShapes, viewState, gridSettings.snap, scaleSettings.pixelsPerMm, addShape, setIsDrawing, setCurrentDrawingPoints, setSelectedShapeIds, setSelectedShapeId, setIsPanning, setPanStart, setIsBoxSelecting, setSelectionBox, updateShape, projectSettings]);
  
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
    }
  }, [activeTool, setSelectedShapeIds, setSelectedShapeId]);
  
  // Handle shape transformation
  const handleShapeTransform = useCallback((shapeId: string, updates: Partial<FloorMapShape>) => {
    updateShape(shapeId, updates);
  }, [updateShape]);

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
    >
      {/* Canvas Settings Popover */}
      <CanvasSettingsPopover />
      
      {/* Text Input Dialog */}
      <Dialog open={isTextDialogOpen} onOpenChange={setIsTextDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Text</DialogTitle>
          </DialogHeader>
          <Input
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            placeholder="Enter text..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && textInputValue.trim() && pendingTextPosition) {
                const textShape: FloorMapShape = {
                  id: uuidv4(),
                  planId: currentPlanId!,
                  type: 'text',
                  coordinates: {
                    x: pendingTextPosition.x,
                    y: pendingTextPosition.y,
                  },
                  text: textInputValue,
                  strokeColor: '#000000',
                };
                addShape(textShape);
                setIsTextDialogOpen(false);
                setPendingTextPosition(null);
                setTextInputValue('');
              }
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* Name Room Dialog */}
      <NameRoomDialog
        open={isNameRoomDialogOpen}
        onOpenChange={setIsNameRoomDialogOpen}
        onConfirm={(name) => {
          if (selectedShapeForNaming) {
            const shape = currentShapes.find(s => s.id === selectedShapeForNaming);
            if (shape && shape.type === 'room') {
              updateShape(selectedShapeForNaming, { name });
              toast.success(`Rum döpt till "${name}"`);
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
      {/* TEMP: Restore old panels for testing */}
      <RoomDetailDialog
        open={isRoomDetailOpen}
        onOpenChange={setIsRoomDetailOpen}
        roomId={selectedRoomForDetail}
        projectId={currentProjectId}
      />

      {/* Property Panel */}
      {showPropertyPanel && propertyPanelShape && currentProjectId && (
        <>
          <PropertyPanel
            shape={propertyPanelShape}
            projectId={currentProjectId}
            pixelsPerMm={scaleSettings.pixelsPerMm}
            onClose={() => {
              setShowPropertyPanel(false);
              setPropertyPanelShape(null);
            }}
            onUpdateShape={(shapeId, updates) => {
              updateShape(shapeId, updates);
              setPropertyPanelShape({ ...propertyPanelShape, ...updates });
            }}
          />
        </>
      )}
      
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
          
          {/* Box selection/room preview - blue dashed rectangle */}
          {isBoxSelecting && selectionBox && (
            <Rect
              x={Math.min(selectionBox.start.x, selectionBox.end.x)}
              y={Math.min(selectionBox.start.y, selectionBox.end.y)}
              width={Math.abs(selectionBox.end.x - selectionBox.start.x)}
              height={Math.abs(selectionBox.end.y - selectionBox.start.y)}
              stroke={activeTool === 'room' ? '#10b981' : '#3b82f6'}
              fill={activeTool === 'room' ? 'rgba(16, 185, 129, 0.1)' : undefined}
              strokeWidth={activeTool === 'room' ? 2 / viewState.zoom : 1 / viewState.zoom}
              dash={[4 / viewState.zoom, 2 / viewState.zoom]}
              listening={false}
            />
          )}
          
          {/* All shapes */}
          {currentShapes.map((shape) => {
            const isSelected = selectedShapeIds.includes(shape.id);
            const handleSelect = (evt?: KonvaEventObject<MouseEvent>) => handleShapeClick(shape.id, shape.type, evt);
            const handleTransform = (updates: Partial<FloorMapShape>) => handleShapeTransform(shape.id, updates);
            
            if (shape.type === 'freehand' || shape.type === 'polygon') {
              if (shape.metadata?.isLibrarySymbol) {
                return (<LibrarySymbolShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} />);
              }
              if (shape.metadata?.isObjectLibrary) {
                return (<ObjectLibraryShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} />);
              }
              return (<FreehandShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} />);
            }
            
            if (shape.type === 'wall') {
              return (<WallShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} viewState={viewState} scaleSettings={scaleSettings} projectSettings={projectSettings} />);
            }
            
            if (shape.type === 'room') {
              return (
                <RoomShape 
                  key={shape.id} 
                  shape={shape} 
                  isSelected={isSelected} 
                  onSelect={handleSelect} 
                  onTransform={handleTransform}
                  shapeRefsMap={shapeRefs.current}
                  snapEnabled={projectSettings.snapEnabled}
                  snapSize={100 * scaleSettings.pixelsPerMm}
                  zoom={viewState.zoom}
                />
              );
            }
            
            if (shape.type === 'rectangle') {
              return (<RectangleShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} />);
            }
            
            if (shape.type === 'circle') {
              return (<CircleShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} />);
            }
            
            if (shape.type === 'text') {
              return (<TextShape key={shape.id} shape={shape} isSelected={isSelected} onSelect={handleSelect} onTransform={handleTransform} shapeRefsMap={shapeRefs.current} />);
            }
            
            return null;
          })}
          
          {/* Transformer removed - shapes handle their own selection visual (blue stroke) */}
          {/* Multi-select dragging handled by unified drag system */}
        </Layer>
      </Stage>

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
    </div>
  );
};

export default UnifiedKonvaCanvas;
