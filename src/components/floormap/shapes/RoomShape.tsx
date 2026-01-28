/**
 * RoomShape Component
 *
 * Renders room polygon shapes with editable vertices, name labels, and edge measurements.
 */

import React, { useRef, useState, useEffect } from 'react';
import { Line, Circle, Group, Text as KonvaText, Rect } from 'react-konva';
import Konva from 'konva';
import { useFloorMapStore } from '../store';
import { RoomShapeProps } from './types';
import { createUnifiedDragHandlers } from '../canvas/utils';
import { toast } from 'sonner';

/**
 * RoomShape - Renders a room polygon with vertex handles and edge measurements
 * PERFORMANCE: Memoized to prevent unnecessary re-renders
 */
export const RoomShape = React.memo<RoomShapeProps>(({
  shape,
  isSelected,
  onSelect,
  onDoubleClick,
  onTransform,
  shapeRefsMap,
  viewState,
  scaleSettings,
  projectSettings,
  snapSize
}) => {
  const { zoom } = viewState;
  const { pixelsPerMm } = scaleSettings;
  const { snapEnabled, showDimensions, unit: displayUnit } = projectSettings;

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

  const coords = shape.coordinates as { points: { x: number; y: number }[] };
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

  const isDraggable = true; // Always draggable

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

  // Calculate edge measurements
  const getEdgeMeasurement = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lengthPixels = Math.sqrt(dx * dx + dy * dy);
    const lengthMM = lengthPixels / pixelsPerMm;
    return {
      length: lengthMM,
      midX: (p1.x + p2.x) / 2,
      midY: (p1.y + p2.y) / 2,
      angle: Math.atan2(dy, dx) * 180 / Math.PI,
      dx,
      dy
    };
  };

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
      onDblClick={(e) => {
        e.cancelBubble = true;
        if (onDoubleClick) {
          onDoubleClick();
        }
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      {...createUnifiedDragHandlers(shape.id)}
    >
      {/* Room polygon - filled area is clickable */}
      <Line
        points={flatPoints}
        closed
        fill={shape.color || 'rgba(59, 130, 246, 0.2)'}
        stroke={isSelected ? '#3b82f6' : (shape.strokeColor || 'rgba(41, 91, 172, 0.8)')}
        strokeWidth={isSelected ? 3 : 2}
        shapeId={shape.id}
        perfectDrawEnabled={false}
        listening={true}
      />

      {/* Edge measurements - show when showDimensions is enabled */}
      {showDimensions && points.map((point: { x: number; y: number }, index: number) => {
        const nextIndex = (index + 1) % points.length;
        const nextPoint = points[nextIndex];
        const edge = getEdgeMeasurement(point, nextPoint);

        // Normalize angle so text is always readable (never upside down)
        let angle = edge.angle;
        if (angle > 90 || angle < -90) {
          angle += 180;
        }

        // Calculate offset perpendicular to edge (outside the room)
        const offsetDistance = 15 / zoom;
        const normalAngle = edge.angle + 90;
        const normalX = Math.cos(normalAngle * Math.PI / 180) * offsetDistance;
        const normalY = Math.sin(normalAngle * Math.PI / 180) * offsetDistance;

        const measurement = formatMeasurement(edge.length, displayUnit);

        return (
          <Group
            key={`measure-${index}`}
            x={edge.midX + normalX}
            y={edge.midY + normalY}
            rotation={angle}
            listening={false}
          >
            <KonvaText
              x={-30}
              y={-6}
              width={60}
              text={measurement}
              fontSize={Math.max(9, 10 / zoom)}
              fill="#374151"
              align="center"
              listening={false}
            />
          </Group>
        );
      })}

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
                const newPoints = originalPoints.filter((_: { x: number; y: number }, i: number) => i !== index);

                onTransform({
                  coordinates: { points: newPoints }
                });

                toast.success('Punkt borttagen');
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
    prevProps.viewState.zoom === nextProps.viewState.zoom &&
    prevProps.projectSettings.snapEnabled === nextProps.projectSettings.snapEnabled &&
    prevProps.projectSettings.showDimensions === nextProps.projectSettings.showDimensions &&
    prevProps.projectSettings.unit === nextProps.projectSettings.unit &&
    prevProps.snapSize === nextProps.snapSize &&
    coordsEqual &&
    prevProps.shape.color === nextProps.shape.color &&
    prevProps.shape.strokeColor === nextProps.shape.strokeColor &&
    prevProps.shape.name === nextProps.shape.name
  );
});
