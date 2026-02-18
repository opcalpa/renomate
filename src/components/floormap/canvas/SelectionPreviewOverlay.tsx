/**
 * Selection Preview Overlay
 *
 * Renders preview shapes during selection/drawing operations:
 * - Box selection rectangle
 * - Room/rectangle creation preview
 * - Circle creation preview
 * - Bezier curve creation preview
 */

import React from 'react';
import { Group, Rect, Circle, Path } from 'react-konva';
import { Tool } from '../types';

interface SelectionPreviewOverlayProps {
  isBoxSelecting: boolean;
  selectionBox: { start: { x: number; y: number }; end: { x: number; y: number } } | null;
  activeTool: Tool;
  zoom: number;
}

export const SelectionPreviewOverlay: React.FC<SelectionPreviewOverlayProps> = ({
  isBoxSelecting,
  selectionBox,
  activeTool,
  zoom,
}) => {
  if (!isBoxSelecting || !selectionBox) return null;

  const strokeWidth = 2 / zoom;
  const dash = [4 / zoom, 2 / zoom];

  // Box selection/room/rectangle preview
  if (activeTool !== 'bezier' && activeTool !== 'circle') {
    const isCreationTool = activeTool === 'room' || activeTool === 'rectangle';
    return (
      <Rect
        x={Math.min(selectionBox.start.x, selectionBox.end.x)}
        y={Math.min(selectionBox.start.y, selectionBox.end.y)}
        width={Math.abs(selectionBox.end.x - selectionBox.start.x)}
        height={Math.abs(selectionBox.end.y - selectionBox.start.y)}
        stroke={isCreationTool ? '#10b981' : '#3b82f6'}
        fill={isCreationTool ? 'rgba(16, 185, 129, 0.1)' : undefined}
        strokeWidth={strokeWidth}
        dash={dash}
        listening={false}
      />
    );
  }

  // Circle preview
  if (activeTool === 'circle') {
    return (
      <Circle
        x={(selectionBox.start.x + selectionBox.end.x) / 2}
        y={(selectionBox.start.y + selectionBox.end.y) / 2}
        radius={Math.max(
          Math.abs(selectionBox.end.x - selectionBox.start.x),
          Math.abs(selectionBox.end.y - selectionBox.start.y)
        ) / 2}
        stroke="#3b82f6"
        fill="rgba(147, 197, 253, 0.2)"
        strokeWidth={strokeWidth}
        dash={dash}
        listening={false}
      />
    );
  }

  // Bezier curve preview
  if (activeTool === 'bezier') {
    const start = selectionBox.start;
    const end = selectionBox.end;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 10) return null;

    // Calculate control point preview
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const perpX = -dy;
    const perpY = dx;
    const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);
    const curveAmount = distance * 0.3;
    const controlX = midX + (perpX / perpLength) * curveAmount;
    const controlY = midY + (perpY / perpLength) * curveAmount;

    const pathData = `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;

    return (
      <Group listening={false}>
        <Path
          data={pathData}
          stroke="#8b5cf6"
          strokeWidth={strokeWidth}
          dash={dash}
          fill="transparent"
        />
        {/* Control point indicator */}
        <Circle
          x={controlX}
          y={controlY}
          radius={4 / zoom}
          fill="#8b5cf6"
          opacity={0.5}
        />
        {/* Start point */}
        <Circle
          x={start.x}
          y={start.y}
          radius={3 / zoom}
          fill="white"
          stroke="#8b5cf6"
          strokeWidth={1 / zoom}
        />
        {/* End point */}
        <Circle
          x={end.x}
          y={end.y}
          radius={3 / zoom}
          fill="white"
          stroke="#8b5cf6"
          strokeWidth={1 / zoom}
        />
      </Group>
    );
  }

  return null;
};
