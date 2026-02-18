/**
 * Multi-Selection Bounds
 *
 * Renders a visual indicator for multi-selection showing the bounding box
 * around all selected shapes with a count badge.
 */

import React, { useMemo } from 'react';
import { Group, Rect, Text as KonvaText } from 'react-konva';
import { FloorMapShape } from '../types';

interface MultiSelectionBoundsProps {
  selectedShapeIds: string[];
  currentShapes: FloorMapShape[];
  isBoxSelecting: boolean;
  zoom: number;
}

interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  count: number;
}

/**
 * Calculate the bounding box for a set of selected shapes.
 */
export function calculateMultiSelectionBounds(
  selectedShapeIds: string[],
  currentShapes: FloorMapShape[]
): SelectionBounds | null {
  if (selectedShapeIds.length < 2) return null;

  const selectedShapes = currentShapes.filter(s => selectedShapeIds.includes(s.id));
  if (selectedShapes.length < 2) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  selectedShapes.forEach(shape => {
    const coords = shape.coordinates as Record<string, unknown>;

    if (shape.type === 'wall' || shape.type === 'line') {
      const { x1, y1, x2, y2 } = coords as { x1: number; y1: number; x2: number; y2: number };
      minX = Math.min(minX, x1, x2);
      maxX = Math.max(maxX, x1, x2);
      minY = Math.min(minY, y1, y2);
      maxY = Math.max(maxY, y1, y2);
    } else if (shape.type === 'rectangle' || shape.type === 'door' || shape.type === 'opening') {
      const { left, top, width = 0, height = 0 } = coords as { left: number; top: number; width?: number; height?: number };
      minX = Math.min(minX, left);
      maxX = Math.max(maxX, left + width);
      minY = Math.min(minY, top);
      maxY = Math.max(maxY, top + height);
    } else if (shape.type === 'circle') {
      const { cx, cy, radius } = coords as { cx: number; cy: number; radius: number };
      minX = Math.min(minX, cx - radius);
      maxX = Math.max(maxX, cx + radius);
      minY = Math.min(minY, cy - radius);
      maxY = Math.max(maxY, cy + radius);
    } else if (shape.type === 'room' || shape.type === 'polygon' || shape.type === 'freehand') {
      const points = (coords as { points?: { x: number; y: number }[] }).points;
      if (points) {
        points.forEach((p) => {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        });
      }
    } else if (shape.type === 'symbol' || shape.type === 'text') {
      const { x, y, width = 100, height = 100 } = coords as { x: number; y: number; width?: number; height?: number };
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + width);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + height);
    } else if (shape.type === 'image') {
      const { x, y, width = 0, height = 0 } = coords as { x: number; y: number; width?: number; height?: number };
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + width);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + height);
    }
  });

  if (minX === Infinity) return null;

  // Add padding (100mm = 10cm)
  const padding = 100;
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
    count: selectedShapes.length,
  };
}

export const MultiSelectionBoundsOverlay: React.FC<MultiSelectionBoundsProps> = ({
  selectedShapeIds,
  currentShapes,
  isBoxSelecting,
  zoom,
}) => {
  const bounds = useMemo(
    () => calculateMultiSelectionBounds(selectedShapeIds, currentShapes),
    [selectedShapeIds, currentShapes]
  );

  if (!bounds || isBoxSelecting) return null;

  const strokeWidth = 2 / zoom;
  const dash = [8 / zoom, 4 / zoom];
  const badgeWidth = 30 / zoom;
  const badgeHeight = 20 / zoom;
  const fontSize = 12 / zoom;
  const cornerRadius = 4 / zoom;

  return (
    <Group listening={false}>
      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        stroke="#3b82f6"
        strokeWidth={strokeWidth}
        dash={dash}
        fill="rgba(59, 130, 246, 0.03)"
        cornerRadius={cornerRadius}
      />
      {/* Selection count badge */}
      <Group
        x={bounds.x + bounds.width - badgeWidth}
        y={bounds.y - badgeHeight + 8 / zoom}
      >
        <Rect
          width={badgeWidth}
          height={badgeHeight}
          fill="#3b82f6"
          cornerRadius={cornerRadius}
        />
        <KonvaText
          text={String(bounds.count)}
          fontSize={fontSize}
          fill="white"
          width={badgeWidth}
          height={badgeHeight}
          align="center"
          verticalAlign="middle"
        />
      </Group>
    </Group>
  );
};
