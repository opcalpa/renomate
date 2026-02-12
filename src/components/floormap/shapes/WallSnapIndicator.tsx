/**
 * WallSnapIndicator - Visual feedback showing where an object will snap to a wall
 *
 * Displays:
 * 1. A glowing circle at the snap point
 * 2. A line along the wall to show attachment
 * 3. Pulses to draw attention
 */

import React from 'react';
import { Group, Circle, Line } from 'react-konva';
import { FloorMapShape } from '../types';

interface WallSnapIndicatorProps {
  wallId: string;
  snapPoint: { x: number; y: number };
  snapRotation: number;
  walls: FloorMapShape[];
  zoom: number;
}

export const WallSnapIndicator: React.FC<WallSnapIndicatorProps> = ({
  wallId,
  snapPoint,
  snapRotation,
  walls,
  zoom,
}) => {
  // Find the wall to highlight
  const wall = walls.find(w => w.id === wallId);
  if (!wall) return null;

  const coords = wall.coordinates as { x1: number; y1: number; x2: number; y2: number };
  const thickness = wall.thicknessMM ? wall.thicknessMM / 10 : 15;

  // Sizes that scale inversely with zoom
  const circleRadius = Math.max(8, 12 / zoom);
  const strokeWidth = Math.max(2, 3 / zoom);
  const wallHighlightWidth = Math.max(2, 4 / zoom);

  // Calculate perpendicular direction for the indicator line
  const dx = coords.x2 - coords.x1;
  const dy = coords.y2 - coords.y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len;
  const ny = dx / len;
  const indicatorLength = thickness + 30;

  return (
    <Group listening={false}>
      {/* Highlight the target wall with a colored stroke */}
      <Line
        points={[coords.x1, coords.y1, coords.x2, coords.y2]}
        stroke="#22c55e"
        strokeWidth={wallHighlightWidth + thickness}
        opacity={0.3}
        lineCap="round"
        perfectDrawEnabled={false}
      />

      {/* Perpendicular indicator line showing snap direction */}
      <Line
        points={[
          snapPoint.x - nx * indicatorLength / 2,
          snapPoint.y - ny * indicatorLength / 2,
          snapPoint.x + nx * indicatorLength / 2,
          snapPoint.y + ny * indicatorLength / 2,
        ]}
        stroke="#22c55e"
        strokeWidth={strokeWidth}
        dash={[5 / zoom, 3 / zoom]}
        opacity={0.8}
        perfectDrawEnabled={false}
      />

      {/* Snap point - outer glow */}
      <Circle
        x={snapPoint.x}
        y={snapPoint.y}
        radius={circleRadius + 4}
        fill="transparent"
        stroke="#22c55e"
        strokeWidth={strokeWidth * 2}
        opacity={0.3}
        perfectDrawEnabled={false}
      />

      {/* Snap point - main circle */}
      <Circle
        x={snapPoint.x}
        y={snapPoint.y}
        radius={circleRadius}
        fill="#22c55e"
        stroke="#16a34a"
        strokeWidth={strokeWidth}
        opacity={0.9}
        perfectDrawEnabled={false}
      />

      {/* Snap point - inner white dot */}
      <Circle
        x={snapPoint.x}
        y={snapPoint.y}
        radius={circleRadius / 3}
        fill="white"
        opacity={0.9}
        perfectDrawEnabled={false}
      />
    </Group>
  );
};

export default WallSnapIndicator;
