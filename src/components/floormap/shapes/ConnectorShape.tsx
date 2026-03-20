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

  // Compute live anchor positions as a string primitive so Zustand's
  // reference-equality check is stable and doesn't cause infinite loops.
  // A new string is only produced when actual coordinate values change.
  const liveCoordStr = useFloorMapStore((state) => {
    let ax1 = coords.x1, ay1 = coords.y1, ax2 = coords.x2, ay2 = coords.y2;

    if (shape.startShapeId && shape.startAnchor) {
      const s = state.shapes.find((sh) => sh.id === shape.startShapeId);
      const pt = s ? getAnchorPoint(s, shape.startAnchor!) : null;
      if (pt) { ax1 = pt.x; ay1 = pt.y; }
    }
    if (shape.endShapeId && shape.endAnchor) {
      const s = state.shapes.find((sh) => sh.id === shape.endShapeId);
      const pt = s ? getAnchorPoint(s, shape.endAnchor!) : null;
      if (pt) { ax2 = pt.x; ay2 = pt.y; }
    }

    return `${ax1},${ay1},${ax2},${ay2}`;
  });

  const [x1, y1, x2, y2] = liveCoordStr.split(',').map(Number);

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
            onDragStart={(e) => { e.cancelBubble = true; }}
            onDragMove={(e) => { e.cancelBubble = true; }}
            onDragEnd={(e) => { e.cancelBubble = true; handleEndpointDragEnd('start', e); }}
          />
          <Circle
            x={x2} y={y2}
            radius={handleRadius}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={2 / zoom}
            draggable
            onDragStart={(e) => { e.cancelBubble = true; }}
            onDragMove={(e) => { e.cancelBubble = true; }}
            onDragEnd={(e) => { e.cancelBubble = true; handleEndpointDragEnd('end', e); }}
          />
        </>
      )}
    </Group>
  );
};
