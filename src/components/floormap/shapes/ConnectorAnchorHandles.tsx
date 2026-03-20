/**
 * ConnectorAnchorHandles - Miro-style connection anchor dots
 *
 * Renders 4 small blue circles at the N/E/S/W edges of a connectable shape
 * when it is hovered in select mode. Dragging from a dot starts a connector
 * with the source shape already bound.
 */

import React from 'react';
import { Group, Circle } from 'react-konva';
import { FloorMapShape, AnchorSide } from '../types';
import { getAnchorPoint, isConnectableShape } from '../canvas/connectorUtils';

interface ConnectorAnchorHandlesProps {
  shape: FloorMapShape;
  zoom: number;
  onAnchorMouseDown: (
    shapeId: string,
    anchor: AnchorSide,
    worldX: number,
    worldY: number,
  ) => void;
}

const SIDES: AnchorSide[] = ['n', 'e', 's', 'w'];

export const ConnectorAnchorHandles: React.FC<ConnectorAnchorHandlesProps> = ({
  shape,
  zoom,
  onAnchorMouseDown,
}) => {
  if (!isConnectableShape(shape)) return null;

  const radius = 5 / zoom;
  const strokeWidth = 1.5 / zoom;
  const outerRadius = 6 / zoom; // tight hit area — avoids hijacking shape drag

  return (
    <Group listening={true}>
      {SIDES.map((anchor) => {
        const pt = getAnchorPoint(shape, anchor);
        if (!pt) return null;

        return (
          <Group key={anchor} x={pt.x} y={pt.y}>
            {/* Large invisible hit area for easy clicking */}
            <Circle
              radius={outerRadius}
              fill="transparent"
              listening={true}
              onMouseDown={(e) => {
                e.cancelBubble = true;
                onAnchorMouseDown(shape.id, anchor, pt.x, pt.y);
              }}
              onMouseEnter={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'crosshair';
              }}
              onMouseLeave={(e) => {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'default';
              }}
            />
            {/* Visible dot */}
            <Circle
              radius={radius}
              fill="#3b82f6"
              stroke="white"
              strokeWidth={strokeWidth}
              listening={false}
              perfectDrawEnabled={false}
            />
          </Group>
        );
      })}
    </Group>
  );
};
