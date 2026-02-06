/**
 * WallShape Component
 *
 * Renders wall/line shapes with measurements, endpoint handles, and drag support.
 */

import React, { useRef, useState, useEffect } from 'react';
import { Line, Circle, Group, Text as KonvaText } from 'react-konva';
import Konva from 'konva';
import { useFloorMapStore } from '../store';
import { WallShapeProps } from './types';
import { createUnifiedDragHandlers } from '../canvas/utils';
import { getAdminDefaults } from '../canvas/constants';

// Dynamic default based on admin settings
const getDefaultWallThickness = () => {
  const { wallThicknessMM } = getAdminDefaults();
  return wallThicknessMM / 10; // Convert mm to pixels at scale
};

/**
 * WallShape - Renders a wall/line with measurement labels and handles
 * PERFORMANCE: Memoized to prevent unnecessary re-renders
 */
export const WallShape = React.memo<WallShapeProps>(({
  shape,
  isSelected,
  onSelect,
  onTransform,
  shapeRefsMap,
  viewState,
  scaleSettings,
  projectSettings,
  transformState,
  onBatchLengthChange,
  wallIndex,
  totalWalls
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

  // Hover state for showing wall number
  const [isHovered, setIsHovered] = useState(false);

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

  const coords = shape.coordinates as { x1: number; y1: number; x2: number; y2: number };
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
      {...createUnifiedDragHandlers(shape.id)}
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
        hitStrokeWidth={Math.max(thickness, 20 / zoom)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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

            // Calculate new length
            const newDx = coords.x2 - newX;
            const newDy = coords.y2 - newY;
            const newLengthPixels = Math.sqrt(newDx * newDx + newDy * newDy);
            const newLengthMM = newLengthPixels / pixelsPerMm;

            // Check if Shift is held for batch update
            if (e.evt.shiftKey && onBatchLengthChange) {
              // First update this wall
              onTransform({
                coordinates: {
                  x1: newX,
                  y1: newY,
                  x2: coords.x2,
                  y2: coords.y2,
                }
              });
              // Then apply same length to all other selected walls
              onBatchLengthChange(newLengthMM);
            } else {
              // Normal single-wall update
              onTransform({
                coordinates: {
                  x1: newX,
                  y1: newY,
                  x2: coords.x2,
                  y2: coords.y2,
                }
              });
            }

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

            // Calculate new length
            const newDx = newX - coords.x1;
            const newDy = newY - coords.y1;
            const newLengthPixels = Math.sqrt(newDx * newDx + newDy * newDy);
            const newLengthMM = newLengthPixels / pixelsPerMm;

            // Check if Shift is held for batch update
            if (e.evt.shiftKey && onBatchLengthChange) {
              // First update this wall
              onTransform({
                coordinates: {
                  x1: coords.x1,
                  y1: coords.y1,
                  x2: newX,
                  y2: newY,
                }
              });
              // Then apply same length to all other selected walls
              onBatchLengthChange(newLengthMM);
            } else {
              // Normal single-wall update
              onTransform({
                coordinates: {
                  x1: coords.x1,
                  y1: coords.y1,
                  x2: newX,
                  y2: newY,
                }
              });
            }

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

      {/* Wall number badge - shown on hover or when selected */}
      {wallIndex !== undefined && totalWalls !== undefined && (isHovered || isSelected) && (
        <Group x={midX} y={midY}>
          {/* Background circle */}
          <Circle
            x={0}
            y={0}
            radius={12 / zoom}
            fill={isSelected ? '#3b82f6' : '#6b7280'}
            listening={false}
          />
          {/* Wall number text */}
          <KonvaText
            x={-10 / zoom}
            y={-6 / zoom}
            width={20 / zoom}
            text={String(wallIndex)}
            fontSize={Math.max(8, 10 / zoom)}
            fontStyle="bold"
            fill="#ffffff"
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
    prevProps.viewState.zoom === nextProps.viewState.zoom &&
    prevProps.projectSettings.snapEnabled === nextProps.projectSettings.snapEnabled &&
    prevProps.projectSettings.showDimensions === nextProps.projectSettings.showDimensions &&
    prevProps.projectSettings.unit === nextProps.projectSettings.unit &&
    coordsEqual &&
    JSON.stringify(prevProps.transformState) === JSON.stringify(nextProps.transformState) &&
    prevProps.shape.thicknessMM === nextProps.shape.thicknessMM &&
    prevProps.shape.strokeColor === nextProps.shape.strokeColor &&
    prevProps.wallIndex === nextProps.wallIndex &&
    prevProps.totalWalls === nextProps.totalWalls
  );
});
