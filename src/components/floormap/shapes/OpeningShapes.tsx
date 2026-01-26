/**
 * OpeningShapes - Line-based architectural opening shapes with dimension support
 *
 * These shapes work like walls with endpoint handles and measurement labels:
 * - WindowLineShape: Two thin parallel lines representing a window
 * - DoorLineShape: Line with swing arc indicating opening direction
 * - SlidingDoorLineShape: Two parallel tracks with overlapping door panels
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Line, Arc, Circle, Group, Text as KonvaText } from 'react-konva';
import Konva from 'konva';
import { ShapeWithViewProps } from './types';
import { LineCoordinates } from '../types';
import { useFloorMapStore } from '../store';
import { createUnifiedDragHandlers } from '../canvas/utils';

// Shared measurement formatting
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

/**
 * WindowLineShape - Two thin parallel lines representing a window
 */
export const WindowLineShape = React.memo<ShapeWithViewProps>(({
  shape,
  isSelected,
  onSelect,
  onTransform,
  shapeRefsMap,
  viewState,
  scaleSettings,
  projectSettings,
}) => {
  const { zoom } = viewState;
  const { pixelsPerMm } = scaleSettings;
  const { snapEnabled, showDimensions, unit: displayUnit } = projectSettings;
  const snapSize = 100 * pixelsPerMm;

  const groupRef = useRef<Konva.Group>(null);
  const [draggedCoords, setDraggedCoords] = useState<LineCoordinates | null>(null);
  const [draggedHandle, setDraggedHandle] = useState<'start' | 'end' | null>(null);

  const activeTool = useFloorMapStore((state) => state.activeTool);
  const isDrawingMode = activeTool === 'window_line';
  const canSelect = !isDrawingMode;

  useEffect(() => {
    if (groupRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, groupRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);

  if (shape.type !== 'window_line') return null;

  const coords = shape.coordinates as LineCoordinates;
  const displayCoords = draggedCoords || coords;

  const dx = displayCoords.x2 - displayCoords.x1;
  const dy = displayCoords.y2 - displayCoords.y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length < 2) return null;

  const angle = Math.atan2(dy, dx);
  const angleDeg = angle * (180 / Math.PI);

  // Perpendicular offset for parallel lines
  const offset = 4 / zoom;
  const perpX = Math.sin(angle) * offset;
  const perpY = -Math.cos(angle) * offset;

  const strokeColor = isSelected ? '#3b82f6' : (shape.strokeColor || '#3b82f6');
  const strokeWidth = 2 / zoom;
  const handleRadius = Math.max(6, 8 / zoom);

  // Measurement
  const lengthMM = length / pixelsPerMm;
  const measurement = formatMeasurement(lengthMM, displayUnit);

  // Label positioning
  const midX = (displayCoords.x1 + displayCoords.x2) / 2;
  const midY = (displayCoords.y1 + displayCoords.y2) / 2;
  let labelAngle = angleDeg;
  if (labelAngle > 90 || labelAngle < -90) labelAngle += 180;

  const offsetDistance = (offset + 15) / zoom;
  const normalAngle = labelAngle + 90;
  const normalX = Math.cos(normalAngle * Math.PI / 180) * offsetDistance;
  const normalY = Math.sin(normalAngle * Math.PI / 180) * offsetDistance;

  const labelX = draggedHandle === 'start' ? displayCoords.x1 : draggedHandle === 'end' ? displayCoords.x2 : midX;
  const labelY = draggedHandle === 'start' ? displayCoords.y1 : draggedHandle === 'end' ? displayCoords.y2 : midY;

  return (
    <Group
      ref={groupRef}
      id={`shape-${shape.id}`}
      name={shape.id}
      shapeId={shape.id}
      draggable={canSelect}
      onClick={canSelect ? (e) => { e.cancelBubble = true; onSelect(e); } : undefined}
      onTap={canSelect ? (e) => { e.cancelBubble = true; onSelect(e); } : undefined}
      {...createUnifiedDragHandlers(shape.id)}
    >
      {/* Top parallel line */}
      <Line
        points={[coords.x1 + perpX, coords.y1 + perpY, coords.x2 + perpX, coords.y2 + perpY]}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        lineCap="round"
        hitStrokeWidth={Math.max(20, 30 / zoom)}
      />
      {/* Bottom parallel line */}
      <Line
        points={[coords.x1 - perpX, coords.y1 - perpY, coords.x2 - perpX, coords.y2 - perpY]}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        lineCap="round"
      />
      {/* Cross marks along window */}
      <Line
        points={[midX - perpX, midY - perpY, midX + perpX, midY + perpY]}
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.8}
        lineCap="round"
      />
      {/* Hit area */}
      <Line
        points={[coords.x1, coords.y1, coords.x2, coords.y2]}
        stroke="transparent"
        strokeWidth={Math.max(20, 30 / zoom)}
        hitStrokeWidth={Math.max(20, 30 / zoom)}
      />

      {/* Endpoint handles when selected */}
      {isSelected && canSelect && (
        <>
          <Circle
            x={coords.x1}
            y={coords.y1}
            radius={handleRadius}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={2}
            draggable={true}
            onMouseDown={(e) => e.cancelBubble = true}
            onDragStart={(e) => { e.cancelBubble = true; setDraggedHandle('start'); }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              let newX = e.target.x();
              let newY = e.target.y();
              if (snapEnabled) {
                newX = Math.round(newX / snapSize) * snapSize;
                newY = Math.round(newY / snapSize) * snapSize;
                e.target.position({ x: newX, y: newY });
              }
              setDraggedCoords({ x1: newX, y1: newY, x2: coords.x2, y2: coords.y2 });
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              let newX = e.target.x();
              let newY = e.target.y();
              if (snapEnabled) {
                newX = Math.round(newX / snapSize) * snapSize;
                newY = Math.round(newY / snapSize) * snapSize;
              }
              onTransform({ coordinates: { x1: newX, y1: newY, x2: coords.x2, y2: coords.y2 } });
              setDraggedCoords(null);
              setDraggedHandle(null);
            }}
          />
          <Circle
            x={coords.x2}
            y={coords.y2}
            radius={handleRadius}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={2}
            draggable={true}
            onMouseDown={(e) => e.cancelBubble = true}
            onDragStart={(e) => { e.cancelBubble = true; setDraggedHandle('end'); }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              let newX = e.target.x();
              let newY = e.target.y();
              if (snapEnabled) {
                newX = Math.round(newX / snapSize) * snapSize;
                newY = Math.round(newY / snapSize) * snapSize;
                e.target.position({ x: newX, y: newY });
              }
              setDraggedCoords({ x1: coords.x1, y1: coords.y1, x2: newX, y2: newY });
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              let newX = e.target.x();
              let newY = e.target.y();
              if (snapEnabled) {
                newX = Math.round(newX / snapSize) * snapSize;
                newY = Math.round(newY / snapSize) * snapSize;
              }
              onTransform({ coordinates: { x1: coords.x1, y1: coords.y1, x2: newX, y2: newY } });
              setDraggedCoords(null);
              setDraggedHandle(null);
            }}
          />
        </>
      )}

      {/* Measurement label */}
      {(showDimensions || draggedHandle) && (
        <Group
          x={labelX + (draggedHandle ? 15 / zoom : normalX)}
          y={labelY + (draggedHandle ? -20 / zoom : normalY)}
          rotation={draggedHandle ? 0 : labelAngle}
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
});

/**
 * DoorLineShape - Line with swing arc indicating opening direction
 */
export const DoorLineShape = React.memo<ShapeWithViewProps & { onDoubleClick?: () => void }>(({
  shape,
  isSelected,
  onSelect,
  onTransform,
  shapeRefsMap,
  viewState,
  scaleSettings,
  projectSettings,
  onDoubleClick,
}) => {
  const { zoom } = viewState;
  const { pixelsPerMm } = scaleSettings;
  const { snapEnabled, showDimensions, unit: displayUnit } = projectSettings;
  const snapSize = 100 * pixelsPerMm;

  const groupRef = useRef<Konva.Group>(null);
  const [draggedCoords, setDraggedCoords] = useState<LineCoordinates | null>(null);
  const [draggedHandle, setDraggedHandle] = useState<'start' | 'end' | null>(null);

  const activeTool = useFloorMapStore((state) => state.activeTool);
  const isDrawingMode = activeTool === 'door_line';
  const canSelect = !isDrawingMode;

  useEffect(() => {
    if (groupRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, groupRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);

  const handleDoubleClick = useCallback((e: any) => {
    e.cancelBubble = true;
    const newDirection = shape.openingDirection === 'left' ? 'right' : 'left';
    onTransform({ openingDirection: newDirection });
  }, [shape.openingDirection, onTransform]);

  if (shape.type !== 'door_line') return null;

  const coords = shape.coordinates as LineCoordinates;
  const displayCoords = draggedCoords || coords;

  const dx = displayCoords.x2 - displayCoords.x1;
  const dy = displayCoords.y2 - displayCoords.y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length < 2) return null;

  const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
  const strokeColor = isSelected ? '#8b5cf6' : (shape.strokeColor || '#8b5cf6');
  const strokeWidth = 2.5 / zoom;
  const handleRadius = Math.max(6, 8 / zoom);
  const openRight = shape.openingDirection !== 'left';

  // Arc parameters - ensure positive values
  const arcRadius = Math.max(2, length);
  const arcInnerRadius = Math.max(1, length - 1);

  // Measurement
  const lengthMM = length / pixelsPerMm;
  const measurement = formatMeasurement(lengthMM, displayUnit);

  // Label positioning
  const midX = (displayCoords.x1 + displayCoords.x2) / 2;
  const midY = (displayCoords.y1 + displayCoords.y2) / 2;
  let labelAngle = angleDeg;
  if (labelAngle > 90 || labelAngle < -90) labelAngle += 180;

  const offsetDistance = 20 / zoom;
  const normalAngle = labelAngle + 90;
  const normalX = Math.cos(normalAngle * Math.PI / 180) * offsetDistance;
  const normalY = Math.sin(normalAngle * Math.PI / 180) * offsetDistance;

  const labelX = draggedHandle === 'start' ? displayCoords.x1 : draggedHandle === 'end' ? displayCoords.x2 : midX;
  const labelY = draggedHandle === 'start' ? displayCoords.y1 : draggedHandle === 'end' ? displayCoords.y2 : midY;

  return (
    <Group
      ref={groupRef}
      id={`shape-${shape.id}`}
      name={shape.id}
      shapeId={shape.id}
      draggable={canSelect}
      onClick={canSelect ? (e) => { e.cancelBubble = true; onSelect(e); } : undefined}
      onTap={canSelect ? (e) => { e.cancelBubble = true; onSelect(e); } : undefined}
      onDblClick={handleDoubleClick}
      onDblTap={handleDoubleClick}
      {...createUnifiedDragHandlers(shape.id)}
    >
      {/* Door panel line */}
      <Line
        points={[coords.x1, coords.y1, coords.x2, coords.y2]}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        lineCap="round"
        hitStrokeWidth={Math.max(20, 30 / zoom)}
      />
      {/* Swing arc */}
      <Arc
        x={coords.x1}
        y={coords.y1}
        innerRadius={arcInnerRadius}
        outerRadius={arcRadius}
        angle={90}
        rotation={openRight ? angleDeg : angleDeg - 90}
        fill="transparent"
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.5}
        dash={[4 / zoom, 4 / zoom]}
      />
      {/* Door hinge indicator */}
      <Circle
        x={coords.x1}
        y={coords.y1}
        radius={4 / zoom}
        fill={strokeColor}
      />
      {/* Hit area */}
      <Line
        points={[coords.x1, coords.y1, coords.x2, coords.y2]}
        stroke="transparent"
        strokeWidth={Math.max(20, 30 / zoom)}
        hitStrokeWidth={Math.max(20, 30 / zoom)}
      />

      {/* Endpoint handles when selected */}
      {isSelected && canSelect && (
        <>
          <Circle
            x={coords.x1}
            y={coords.y1}
            radius={handleRadius}
            fill="#8b5cf6"
            stroke="#ffffff"
            strokeWidth={2}
            draggable={true}
            onMouseDown={(e) => e.cancelBubble = true}
            onDragStart={(e) => { e.cancelBubble = true; setDraggedHandle('start'); }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              let newX = e.target.x();
              let newY = e.target.y();
              if (snapEnabled) {
                newX = Math.round(newX / snapSize) * snapSize;
                newY = Math.round(newY / snapSize) * snapSize;
                e.target.position({ x: newX, y: newY });
              }
              setDraggedCoords({ x1: newX, y1: newY, x2: coords.x2, y2: coords.y2 });
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              let newX = e.target.x();
              let newY = e.target.y();
              if (snapEnabled) {
                newX = Math.round(newX / snapSize) * snapSize;
                newY = Math.round(newY / snapSize) * snapSize;
              }
              onTransform({ coordinates: { x1: newX, y1: newY, x2: coords.x2, y2: coords.y2 } });
              setDraggedCoords(null);
              setDraggedHandle(null);
            }}
          />
          <Circle
            x={coords.x2}
            y={coords.y2}
            radius={handleRadius}
            fill="#8b5cf6"
            stroke="#ffffff"
            strokeWidth={2}
            draggable={true}
            onMouseDown={(e) => e.cancelBubble = true}
            onDragStart={(e) => { e.cancelBubble = true; setDraggedHandle('end'); }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              let newX = e.target.x();
              let newY = e.target.y();
              if (snapEnabled) {
                newX = Math.round(newX / snapSize) * snapSize;
                newY = Math.round(newY / snapSize) * snapSize;
                e.target.position({ x: newX, y: newY });
              }
              setDraggedCoords({ x1: coords.x1, y1: coords.y1, x2: newX, y2: newY });
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              let newX = e.target.x();
              let newY = e.target.y();
              if (snapEnabled) {
                newX = Math.round(newX / snapSize) * snapSize;
                newY = Math.round(newY / snapSize) * snapSize;
              }
              onTransform({ coordinates: { x1: coords.x1, y1: coords.y1, x2: newX, y2: newY } });
              setDraggedCoords(null);
              setDraggedHandle(null);
            }}
          />
        </>
      )}

      {/* Measurement label */}
      {(showDimensions || draggedHandle) && (
        <Group
          x={labelX + (draggedHandle ? 15 / zoom : normalX)}
          y={labelY + (draggedHandle ? -20 / zoom : normalY)}
          rotation={draggedHandle ? 0 : labelAngle}
        >
          <KonvaText
            x={-30}
            y={-8}
            width={60}
            text={measurement}
            fontSize={Math.max(9, 10 / zoom)}
            fontStyle={draggedHandle ? 'bold' : 'normal'}
            fill={draggedHandle ? '#8b5cf6' : '#000000'}
            align="center"
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
});

/**
 * SlidingDoorLineShape - Two parallel tracks with overlapping door panels
 */
export const SlidingDoorLineShape = React.memo<ShapeWithViewProps>(({
  shape,
  isSelected,
  onSelect,
  onTransform,
  shapeRefsMap,
  viewState,
  scaleSettings,
  projectSettings,
}) => {
  const { zoom } = viewState;
  const { pixelsPerMm } = scaleSettings;
  const { snapEnabled, showDimensions, unit: displayUnit } = projectSettings;
  const snapSize = 100 * pixelsPerMm;

  const groupRef = useRef<Konva.Group>(null);
  const [draggedCoords, setDraggedCoords] = useState<LineCoordinates | null>(null);
  const [draggedHandle, setDraggedHandle] = useState<'start' | 'end' | null>(null);

  const activeTool = useFloorMapStore((state) => state.activeTool);
  const isDrawingMode = activeTool === 'sliding_door_line';
  const canSelect = !isDrawingMode;

  useEffect(() => {
    if (groupRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, groupRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);

  if (shape.type !== 'sliding_door_line') return null;

  const coords = shape.coordinates as LineCoordinates;
  const displayCoords = draggedCoords || coords;

  const dx = displayCoords.x2 - displayCoords.x1;
  const dy = displayCoords.y2 - displayCoords.y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length < 2) return null;

  const angle = Math.atan2(dy, dx);
  const angleDeg = angle * (180 / Math.PI);

  // Track offset for parallel lines
  const trackOffset = 4 / zoom;
  const perpX = Math.sin(angle) * trackOffset;
  const perpY = -Math.cos(angle) * trackOffset;

  const strokeColor = isSelected ? '#10b981' : (shape.strokeColor || '#10b981');
  const trackWidth = 1 / zoom;
  const panelWidth = 3 / zoom;
  const handleRadius = Math.max(6, 8 / zoom);

  // Panel lengths with overlap in center
  const panelRatio = 0.52;
  const panel1EndX = dx * panelRatio;
  const panel1EndY = dy * panelRatio;
  const panel2StartX = dx * (1 - panelRatio);
  const panel2StartY = dy * (1 - panelRatio);

  // Measurement
  const lengthMM = length / pixelsPerMm;
  const measurement = formatMeasurement(lengthMM, displayUnit);

  // Label positioning
  const midX = (displayCoords.x1 + displayCoords.x2) / 2;
  const midY = (displayCoords.y1 + displayCoords.y2) / 2;
  let labelAngle = angleDeg;
  if (labelAngle > 90 || labelAngle < -90) labelAngle += 180;

  const offsetDistance = (trackOffset + 18) / zoom;
  const normalAngle = labelAngle + 90;
  const normalX = Math.cos(normalAngle * Math.PI / 180) * offsetDistance;
  const normalY = Math.sin(normalAngle * Math.PI / 180) * offsetDistance;

  const labelX = draggedHandle === 'start' ? displayCoords.x1 : draggedHandle === 'end' ? displayCoords.x2 : midX;
  const labelY = draggedHandle === 'start' ? displayCoords.y1 : draggedHandle === 'end' ? displayCoords.y2 : midY;

  return (
    <Group
      ref={groupRef}
      id={`shape-${shape.id}`}
      name={shape.id}
      shapeId={shape.id}
      draggable={canSelect}
      onClick={canSelect ? (e) => { e.cancelBubble = true; onSelect(e); } : undefined}
      onTap={canSelect ? (e) => { e.cancelBubble = true; onSelect(e); } : undefined}
      {...createUnifiedDragHandlers(shape.id)}
    >
      {/* Top track */}
      <Line
        points={[coords.x1 + perpX, coords.y1 + perpY, coords.x2 + perpX, coords.y2 + perpY]}
        stroke={strokeColor}
        strokeWidth={trackWidth}
        lineCap="butt"
      />
      {/* Bottom track */}
      <Line
        points={[coords.x1 - perpX, coords.y1 - perpY, coords.x2 - perpX, coords.y2 - perpY]}
        stroke={strokeColor}
        strokeWidth={trackWidth}
        lineCap="butt"
      />
      {/* Left door panel (on top track) */}
      <Line
        points={[coords.x1 + perpX, coords.y1 + perpY, coords.x1 + panel1EndX + perpX, coords.y1 + panel1EndY + perpY]}
        stroke={strokeColor}
        strokeWidth={panelWidth}
        lineCap="butt"
      />
      {/* Right door panel (on bottom track) */}
      <Line
        points={[coords.x1 + panel2StartX - perpX, coords.y1 + panel2StartY - perpY, coords.x2 - perpX, coords.y2 - perpY]}
        stroke={strokeColor}
        strokeWidth={panelWidth}
        lineCap="butt"
      />
      {/* Hit area */}
      <Line
        points={[coords.x1, coords.y1, coords.x2, coords.y2]}
        stroke="transparent"
        strokeWidth={Math.max(20, 30 / zoom)}
        hitStrokeWidth={Math.max(20, 30 / zoom)}
      />

      {/* Endpoint handles when selected */}
      {isSelected && canSelect && (
        <>
          <Circle
            x={coords.x1}
            y={coords.y1}
            radius={handleRadius}
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth={2}
            draggable={true}
            onMouseDown={(e) => e.cancelBubble = true}
            onDragStart={(e) => { e.cancelBubble = true; setDraggedHandle('start'); }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              let newX = e.target.x();
              let newY = e.target.y();
              if (snapEnabled) {
                newX = Math.round(newX / snapSize) * snapSize;
                newY = Math.round(newY / snapSize) * snapSize;
                e.target.position({ x: newX, y: newY });
              }
              setDraggedCoords({ x1: newX, y1: newY, x2: coords.x2, y2: coords.y2 });
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              let newX = e.target.x();
              let newY = e.target.y();
              if (snapEnabled) {
                newX = Math.round(newX / snapSize) * snapSize;
                newY = Math.round(newY / snapSize) * snapSize;
              }
              onTransform({ coordinates: { x1: newX, y1: newY, x2: coords.x2, y2: coords.y2 } });
              setDraggedCoords(null);
              setDraggedHandle(null);
            }}
          />
          <Circle
            x={coords.x2}
            y={coords.y2}
            radius={handleRadius}
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth={2}
            draggable={true}
            onMouseDown={(e) => e.cancelBubble = true}
            onDragStart={(e) => { e.cancelBubble = true; setDraggedHandle('end'); }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              let newX = e.target.x();
              let newY = e.target.y();
              if (snapEnabled) {
                newX = Math.round(newX / snapSize) * snapSize;
                newY = Math.round(newY / snapSize) * snapSize;
                e.target.position({ x: newX, y: newY });
              }
              setDraggedCoords({ x1: coords.x1, y1: coords.y1, x2: newX, y2: newY });
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              let newX = e.target.x();
              let newY = e.target.y();
              if (snapEnabled) {
                newX = Math.round(newX / snapSize) * snapSize;
                newY = Math.round(newY / snapSize) * snapSize;
              }
              onTransform({ coordinates: { x1: coords.x1, y1: coords.y1, x2: newX, y2: newY } });
              setDraggedCoords(null);
              setDraggedHandle(null);
            }}
          />
        </>
      )}

      {/* Measurement label */}
      {(showDimensions || draggedHandle) && (
        <Group
          x={labelX + (draggedHandle ? 15 / zoom : normalX)}
          y={labelY + (draggedHandle ? -20 / zoom : normalY)}
          rotation={draggedHandle ? 0 : labelAngle}
        >
          <KonvaText
            x={-30}
            y={-8}
            width={60}
            text={measurement}
            fontSize={Math.max(9, 10 / zoom)}
            fontStyle={draggedHandle ? 'bold' : 'normal'}
            fill={draggedHandle ? '#10b981' : '#000000'}
            align="center"
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
});
