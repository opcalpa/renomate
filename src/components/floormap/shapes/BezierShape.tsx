/**
 * BezierShape - Quadratic bezier curve with draggable control points
 * Supports rotation and scaling via Transformer
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { Path, Circle, Line, Group, Transformer } from 'react-konva';
import Konva from 'konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { ShapeWithViewProps } from './types';
import { BezierCoordinates } from '../types';
import { createUnifiedDragHandlers } from '../canvas/utils';

export const BezierShape: React.FC<ShapeWithViewProps> = ({
  shape,
  isSelected,
  onSelect,
  onTransform,
  shapeRefsMap,
  viewState,
  scaleSettings,
  projectSettings,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const pathRef = useRef<Konva.Path>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const coords = shape.coordinates as BezierCoordinates;
  const { zoom } = viewState;

  // Get unified drag handlers for multi-select support
  const dragHandlers = createUnifiedDragHandlers(shape.id);

  // Store ref for external access
  useEffect(() => {
    if (groupRef.current) {
      shapeRefsMap.set(shape.id, groupRef.current);
    }
    return () => {
      shapeRefsMap.delete(shape.id);
    };
  }, [shape.id, shapeRefsMap]);

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && groupRef.current) {
      transformerRef.current.nodes([groupRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  // Build SVG path data for quadratic bezier
  const pathData = `M ${coords.start.x} ${coords.start.y} Q ${coords.control.x} ${coords.control.y} ${coords.end.x} ${coords.end.y}`;

  // Visual settings
  const strokeColor = shape.strokeColor || '#8b5cf6';
  const strokeWidth = (shape.strokeWidth || 2) / zoom;
  const opacity = shape.opacity ?? 1;

  // Control point settings
  const controlPointRadius = 6 / zoom;
  const controlPointColor = '#8b5cf6';
  const controlLineWidth = 1 / zoom;

  // Handle control point drag
  const handleControlPointDragEnd = (
    pointType: 'start' | 'control' | 'end',
    e: KonvaEventObject<DragEvent>
  ) => {
    const node = e.target;
    let newX = node.x();
    let newY = node.y();

    // Snap to grid if enabled
    if (projectSettings.snapEnabled && projectSettings.gridInterval) {
      const snapSize = projectSettings.gridInterval * scaleSettings.pixelsPerMm;
      newX = Math.round(newX / snapSize) * snapSize;
      newY = Math.round(newY / snapSize) * snapSize;
    }

    const newCoords: BezierCoordinates = { ...coords };
    newCoords[pointType] = { x: newX, y: newY };

    onTransform({ coordinates: newCoords });
  };

  // Handle group drag (move entire curve)
  const handleGroupDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const dx = node.x();
    const dy = node.y();

    // Reset group position
    node.x(0);
    node.y(0);

    // Calculate new coordinates
    let newCoords: BezierCoordinates = {
      start: { x: coords.start.x + dx, y: coords.start.y + dy },
      control: { x: coords.control.x + dx, y: coords.control.y + dy },
      end: { x: coords.end.x + dx, y: coords.end.y + dy },
    };

    // Snap if enabled
    if (projectSettings.snapEnabled && projectSettings.gridInterval) {
      const snapSize = projectSettings.gridInterval * scaleSettings.pixelsPerMm;
      const snappedStartX = Math.round(newCoords.start.x / snapSize) * snapSize;
      const snappedStartY = Math.round(newCoords.start.y / snapSize) * snapSize;
      const snapDx = snappedStartX - newCoords.start.x;
      const snapDy = snappedStartY - newCoords.start.y;

      newCoords.start.x += snapDx;
      newCoords.start.y += snapDy;
      newCoords.control.x += snapDx;
      newCoords.control.y += snapDy;
      newCoords.end.x += snapDx;
      newCoords.end.y += snapDy;
    }

    onTransform({ coordinates: newCoords });
  }, [coords, projectSettings.snapEnabled, projectSettings.gridInterval, scaleSettings.pixelsPerMm, onTransform]);

  // Handle transform end (scale/rotate)
  const handleTransformEnd = useCallback(() => {
    const node = groupRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();
    const x = node.x();
    const y = node.y();

    // Reset transform
    node.scaleX(1);
    node.scaleY(1);
    node.rotation(0);
    node.x(0);
    node.y(0);

    // Calculate center of original points
    const points = [coords.start, coords.control, coords.end];
    const centerX = (coords.start.x + coords.end.x) / 2;
    const centerY = (coords.start.y + coords.end.y) / 2;

    // Apply scale and rotation to each point
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const transformPoint = (p: { x: number; y: number }) => {
      // Translate to origin
      let px = p.x - centerX;
      let py = p.y - centerY;

      // Scale
      px *= scaleX;
      py *= scaleY;

      // Rotate
      const rx = px * cos - py * sin;
      const ry = px * sin + py * cos;

      // Translate back + add drag offset
      return {
        x: rx + centerX + x,
        y: ry + centerY + y,
      };
    };

    const newCoords: BezierCoordinates = {
      start: transformPoint(coords.start),
      control: transformPoint(coords.control),
      end: transformPoint(coords.end),
    };

    onTransform({
      coordinates: newCoords,
      rotation: 0, // Rotation is baked into coordinates
    });
  }, [coords, onTransform]);

  return (
    <>
      <Group
        ref={groupRef}
        id={`shape-${shape.id}`}
        name={shape.id}
        shapeId={shape.id}
        draggable={true}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect(e);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect(e);
        }}
        onDragStart={dragHandlers.onDragStart}
        onDragMove={dragHandlers.onDragMove}
        onDragEnd={dragHandlers.onDragEnd}
        onTransformEnd={handleTransformEnd}
      >
        {/* Main bezier curve path */}
        <Path
          ref={pathRef}
          data={pathData}
          stroke={isSelected ? '#3b82f6' : strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          opacity={opacity}
          perfectDrawEnabled={false}
          hitStrokeWidth={Math.max(10, strokeWidth * 3)}
          listening={true}
        />

        {/* Control handles (only when selected) */}
        {isSelected && (
          <>
            {/* Control lines */}
            <Line
              points={[coords.start.x, coords.start.y, coords.control.x, coords.control.y]}
              stroke={controlPointColor}
              strokeWidth={controlLineWidth}
              dash={[4 / zoom, 4 / zoom]}
              opacity={0.5}
              listening={false}
              perfectDrawEnabled={false}
            />
            <Line
              points={[coords.control.x, coords.control.y, coords.end.x, coords.end.y]}
              stroke={controlPointColor}
              strokeWidth={controlLineWidth}
              dash={[4 / zoom, 4 / zoom]}
              opacity={0.5}
              listening={false}
              perfectDrawEnabled={false}
            />

            {/* Start point */}
            <Circle
              x={coords.start.x}
              y={coords.start.y}
              radius={controlPointRadius}
              fill="white"
              stroke={controlPointColor}
              strokeWidth={2 / zoom}
              draggable
              onDragEnd={(e) => handleControlPointDragEnd('start', e)}
            />

            {/* Control point */}
            <Circle
              x={coords.control.x}
              y={coords.control.y}
              radius={controlPointRadius * 1.2}
              fill={controlPointColor}
              stroke="white"
              strokeWidth={2 / zoom}
              draggable
              onDragEnd={(e) => handleControlPointDragEnd('control', e)}
            />

            {/* End point */}
            <Circle
              x={coords.end.x}
              y={coords.end.y}
              radius={controlPointRadius}
              fill="white"
              stroke={controlPointColor}
              strokeWidth={2 / zoom}
              draggable
              onDragEnd={(e) => handleControlPointDragEnd('end', e)}
            />
          </>
        )}
      </Group>

      {/* Transformer for scale/rotate */}
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={true}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10 || newBox.height < 10) {
              return oldBox;
            }
            return newBox;
          }}
          anchorSize={8}
          anchorCornerRadius={2}
          anchorStroke="#8b5cf6"
          anchorFill="white"
          borderStroke="#8b5cf6"
          borderStrokeWidth={1}
          rotateAnchorOffset={20}
        />
      )}
    </>
  );
};
