/**
 * ConnectorShape - Miro-style connector arrow between two points
 *
 * Renders a straight arrow line between start (x1,y1) and end (x2,y2).
 * When selected, shows draggable endpoint handles so the user can reposition
 * either end. Endpoint handles snap to the nearest shape anchor if
 * snapEnabled is on and a shape is nearby.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { Arrow, Circle, Group } from 'react-konva';
import Konva from 'konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { ShapeWithViewProps } from './types';
import { LineCoordinates } from '../types';

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

  // Store ref for external access (box-select, etc.)
  useEffect(() => {
    if (groupRef.current) {
      shapeRefsMap.set(shape.id, groupRef.current);
    }
    return () => {
      shapeRefsMap.delete(shape.id);
    };
  }, [shape.id, shapeRefsMap]);

  const strokeColor = isSelected ? '#3b82f6' : (shape.strokeColor || '#6366f1');
  const strokeWidth = (shape.strokeWidth || 2) / zoom;
  const opacity = shape.opacity ?? 1;
  const handleRadius = 6 / zoom;

  // Snap a point to the grid if enabled
  const snapPoint = useCallback((x: number, y: number) => {
    if (projectSettings.snapEnabled && projectSettings.gridInterval) {
      const snapSize = projectSettings.gridInterval * scaleSettings.pixelsPerMm;
      return {
        x: Math.round(x / snapSize) * snapSize,
        y: Math.round(y / snapSize) * snapSize,
      };
    }
    return { x, y };
  }, [projectSettings.snapEnabled, projectSettings.gridInterval, scaleSettings.pixelsPerMm]);

  // Drag the whole connector
  const handleGroupDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const dx = node.x();
    const dy = node.y();
    node.x(0);
    node.y(0);

    const raw1 = snapPoint(coords.x1 + dx, coords.y1 + dy);
    const raw2 = snapPoint(coords.x2 + dx, coords.y2 + dy);
    onTransform({
      coordinates: { x1: raw1.x, y1: raw1.y, x2: raw2.x, y2: raw2.y } as LineCoordinates,
      // Clear shape anchors when manually moved
      startShapeId: undefined,
      endShapeId: undefined,
    });
  }, [coords, snapPoint, onTransform]);

  // Drag an endpoint handle
  const handleEndpointDragEnd = useCallback((
    endpoint: 'start' | 'end',
    e: KonvaEventObject<DragEvent>
  ) => {
    const node = e.target;
    const snapped = snapPoint(node.x(), node.y());
    node.x(snapped.x);
    node.y(snapped.y);

    const newCoords: LineCoordinates = endpoint === 'start'
      ? { x1: snapped.x, y1: snapped.y, x2: coords.x2, y2: coords.y2 }
      : { x1: coords.x1, y1: coords.y1, x2: snapped.x, y2: snapped.y };

    onTransform({
      coordinates: newCoords,
      // Clear the anchor for the moved endpoint
      ...(endpoint === 'start' ? { startShapeId: undefined } : { endShapeId: undefined }),
    });
  }, [coords, snapPoint, onTransform]);

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
      {/* Arrow line */}
      <Arrow
        points={[coords.x1, coords.y1, coords.x2, coords.y2]}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill={strokeColor}
        pointerLength={10 / zoom}
        pointerWidth={8 / zoom}
        pointerAtBeginning={false}
        pointerAtEnding={true}
        perfectDrawEnabled={false}
        hitStrokeWidth={Math.max(12, strokeWidth * 4)}
        listening={true}
        lineCap="round"
      />

      {/* Endpoint handles — only when selected */}
      {isSelected && (
        <>
          {/* Start handle */}
          <Circle
            x={coords.x1}
            y={coords.y1}
            radius={handleRadius}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={2 / zoom}
            draggable
            onDragEnd={(e) => handleEndpointDragEnd('start', e)}
          />
          {/* End handle */}
          <Circle
            x={coords.x2}
            y={coords.y2}
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
