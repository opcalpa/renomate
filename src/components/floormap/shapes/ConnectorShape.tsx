/**
 * ConnectorShape - Miro-style connector arrow between two points or shapes
 *
 * Supports two modes:
 * 1. Free: start/end are fixed pixel coordinates (x1,y1 → x2,y2)
 * 2. Anchored: startShapeId/endShapeId are set → endpoints follow those shapes
 *    dynamically as they are moved.
 *
 * When selected, draggable endpoint handles let the user reposition either end.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { Arrow, Circle, Group } from 'react-konva';
import Konva from 'konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { ShapeWithViewProps } from './types';
import { LineCoordinates, AnchorSide } from '../types';
import { useFloorMapStore } from '../store';
import { getAnchorPoint } from '../canvas/connectorUtils';

export const ConnectorShape: React.FC<ShapeWithViewProps> = ({
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
  const coords = shape.coordinates as LineCoordinates;
  const { zoom } = viewState;

  // Subscribe only to the shapes that this connector is anchored to.
  // This causes re-render when anchored shapes are moved.
  const trackedShapes = useFloorMapStore((state) => {
    if (!shape.startShapeId && !shape.endShapeId) return [];
    return state.shapes.filter(
      (s) => s.id === shape.startShapeId || s.id === shape.endShapeId,
    );
  });

  const startShape = trackedShapes.find((s) => s.id === shape.startShapeId);
  const endShape = trackedShapes.find((s) => s.id === shape.endShapeId);

  const startPt =
    startShape && shape.startAnchor
      ? getAnchorPoint(startShape, shape.startAnchor)
      : null;
  const endPt =
    endShape && shape.endAnchor
      ? getAnchorPoint(endShape, shape.endAnchor)
      : null;

  const x1 = startPt?.x ?? coords.x1;
  const y1 = startPt?.y ?? coords.y1;
  const x2 = endPt?.x ?? coords.x2;
  const y2 = endPt?.y ?? coords.y2;

  // Store ref for selection / box-select
  useEffect(() => {
    if (groupRef.current) shapeRefsMap.set(shape.id, groupRef.current);
    return () => { shapeRefsMap.delete(shape.id); };
  }, [shape.id, shapeRefsMap]);

  const strokeColor = isSelected ? '#3b82f6' : (shape.strokeColor || '#6366f1');
  const strokeWidth = (shape.strokeWidth || 2) / zoom;
  const opacity = shape.opacity ?? 1;
  const handleRadius = 6 / zoom;

  const snapPoint = useCallback(
    (x: number, y: number) => {
      if (projectSettings.snapEnabled && projectSettings.gridInterval) {
        const snap = projectSettings.gridInterval * scaleSettings.pixelsPerMm;
        return { x: Math.round(x / snap) * snap, y: Math.round(y / snap) * snap };
      }
      return { x, y };
    },
    [projectSettings.snapEnabled, projectSettings.gridInterval, scaleSettings.pixelsPerMm],
  );

  // Move entire connector (clears shape anchors)
  const handleGroupDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const dx = node.x();
      const dy = node.y();
      node.x(0);
      node.y(0);

      const p1 = snapPoint(x1 + dx, y1 + dy);
      const p2 = snapPoint(x2 + dx, y2 + dy);
      onTransform({
        coordinates: { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y } as LineCoordinates,
        startShapeId: undefined,
        startAnchor: undefined,
        endShapeId: undefined,
        endAnchor: undefined,
      });
    },
    [x1, y1, x2, y2, snapPoint, onTransform],
  );

  // Drag one endpoint (clears that anchor only)
  const handleEndpointDragEnd = useCallback(
    (endpoint: 'start' | 'end', e: KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const snapped = snapPoint(node.x(), node.y());
      node.x(snapped.x);
      node.y(snapped.y);

      const newCoords: LineCoordinates =
        endpoint === 'start'
          ? { x1: snapped.x, y1: snapped.y, x2, y2 }
          : { x1, y1, x2: snapped.x, y2: snapped.y };

      onTransform({
        coordinates: newCoords,
        ...(endpoint === 'start'
          ? { startShapeId: undefined, startAnchor: undefined }
          : { endShapeId: undefined, endAnchor: undefined }),
      });
    },
    [x1, y1, x2, y2, snapPoint, onTransform],
  );

  return (
    <Group
      ref={groupRef}
      id={`shape-${shape.id}`}
      name={shape.id}
      draggable={!shape.locked}
      onClick={(e) => { e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
      onDragEnd={handleGroupDragEnd}
      opacity={opacity}
    >
      <Arrow
        points={[x1, y1, x2, y2]}
        stroke={strokeColor}
        fill={strokeColor}
        strokeWidth={strokeWidth}
        pointerLength={10 / zoom}
        pointerWidth={8 / zoom}
        pointerAtBeginning={false}
        pointerAtEnding={true}
        perfectDrawEnabled={false}
        hitStrokeWidth={Math.max(12, strokeWidth * 4)}
        lineCap="round"
      />

      {/* Endpoint handles when selected */}
      {isSelected && (
        <>
          <Circle
            x={x1} y={y1}
            radius={handleRadius}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={2 / zoom}
            draggable
            onDragEnd={(e) => handleEndpointDragEnd('start', e)}
          />
          <Circle
            x={x2} y={y2}
            radius={handleRadius}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={2 / zoom}
            draggable
            onDragEnd={(e) => handleEndpointDragEnd('end', e)}
          />
        </>
      )}
    </Group>
  );
};
