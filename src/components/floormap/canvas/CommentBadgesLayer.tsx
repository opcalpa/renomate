/**
 * Comment Badges Layer
 *
 * Renders comment count badges on shapes that have comments.
 * Shows a blue badge with count, or green checkmark if resolved.
 */

import React from 'react';
import { Group, Rect, Text as KonvaText } from 'react-konva';
import { FloorMapShape } from '../types';
import { getUnifiedObjectById } from '../objectLibrary';

interface CommentBadgesLayerProps {
  shapes: FloorMapShape[];
  allShapes: FloorMapShape[]; // All shapes (needed for wallRelative lookups)
  commentCounts: Record<string, number>;
  resolvedStatus: Record<string, boolean>;
  viewState: { zoom: number };
  scaleSettings: { pixelsPerMm: number };
  onBadgeClick: (shapeId: string, screenX: number, screenY: number) => void;
}

/**
 * Calculate badge position based on shape type and coordinates.
 */
function getIndicatorPosition(
  shape: FloorMapShape,
  allShapes: FloorMapShape[],
  pixelsPerMm: number
): { x: number; y: number } | null {
  try {
    if (shape.type === 'room') {
      const coords = shape.coordinates as { points?: { x: number; y: number }[] };
      if (coords.points && coords.points.length > 0) {
        const xs = coords.points.map(p => p.x);
        const ys = coords.points.map(p => p.y);
        return { x: Math.max(...xs), y: Math.min(...ys) };
      }
    } else if (shape.type === 'wall' || shape.type === 'line') {
      const coords = shape.coordinates as { x1?: number; y1?: number; x2?: number; y2?: number };
      if (coords.x1 != null && coords.x2 != null && coords.y1 != null && coords.y2 != null) {
        return { x: Math.max(coords.x1, coords.x2), y: Math.min(coords.y1, coords.y2) };
      }
    } else if (shape.type === 'rectangle') {
      const coords = shape.coordinates as { left?: number; x?: number; top?: number; y?: number; width?: number };
      const x = coords.left ?? coords.x ?? 0;
      const y = coords.top ?? coords.y ?? 0;
      const width = coords.width ?? 100;
      return { x: x + width, y };
    } else if (shape.type === 'circle') {
      const coords = shape.coordinates as { cx?: number; x?: number; cy?: number; y?: number; radius?: number };
      const cx = coords.cx ?? coords.x ?? 0;
      const cy = coords.cy ?? coords.y ?? 0;
      const r = coords.radius ?? 50;
      return { x: cx + r * 0.7, y: cy - r * 0.7 };
    } else if (shape.type === 'text') {
      const coords = shape.coordinates as { x?: number; y?: number };
      return { x: (coords.x ?? 0) + 50, y: (coords.y ?? 0) - 10 };
    } else if (shape.type === 'freehand' || shape.type === 'polygon') {
      // Handle unified objects (SVG-based library objects with wallRelative)
      if (shape.metadata?.isUnifiedObject && shape.metadata?.unifiedObjectId) {
        const unifiedDef = getUnifiedObjectById(shape.metadata.unifiedObjectId as string);
        const scale = (shape.metadata.scale as number) || 1;
        let posX = (shape.metadata.placementX as number) || 0;
        let posY = (shape.metadata.placementY as number) || 0;

        // If object has wallRelative data, calculate position from wall
        if (shape.wallRelative?.wallId) {
          const wall = allShapes.find(s => s.id === shape.wallRelative?.wallId);
          if (wall) {
            const wallCoords = wall.coordinates as { x1: number; y1: number; x2: number; y2: number };
            if (wallCoords && typeof wallCoords.x1 === 'number') {
              const dx = wallCoords.x2 - wallCoords.x1;
              const dy = wallCoords.y2 - wallCoords.y1;
              const wallLengthPx = Math.sqrt(dx * dx + dy * dy);
              const unitX = dx / wallLengthPx;
              const unitY = dy / wallLengthPx;
              const normalX = -unitY;
              const normalY = unitX;
              const distAlongPx = (shape.wallRelative.distanceFromWallStart + shape.wallRelative.width / 2) * pixelsPerMm;
              const perpOffsetPx = (shape.wallRelative.perpendicularOffset + shape.wallRelative.depth / 2) * pixelsPerMm;
              posX = wallCoords.x1 + distAlongPx * unitX + perpOffsetPx * normalX;
              posY = wallCoords.y1 + distAlongPx * unitY + perpOffsetPx * normalY;
            }
          }
        }

        // Position badge at top-right of the object
        const width = unifiedDef ? unifiedDef.dimensions.width * pixelsPerMm * scale : 40;
        return { x: posX + width / 2, y: posY - width / 2 };
      } else {
        // Standard freehand/polygon with points
        const coords = shape.coordinates as { points?: { x: number; y: number }[] };
        if (coords.points && coords.points.length > 0) {
          const xs = coords.points.map(p => p.x);
          const ys = coords.points.map(p => p.y);
          return { x: Math.max(...xs), y: Math.min(...ys) };
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

export const CommentBadgesLayer: React.FC<CommentBadgesLayerProps> = ({
  shapes,
  allShapes,
  commentCounts,
  resolvedStatus,
  viewState,
  scaleSettings,
  onBadgeClick,
}) => {
  const badgeSize = 18 / viewState.zoom;
  const fontSize = 10 / viewState.zoom;

  return (
    <Group>
      {shapes.map((shape) => {
        const count = commentCounts[shape.id];
        if (!count || count === 0) return null;
        if (!shape.coordinates) return null;

        const isResolved = resolvedStatus[shape.id];
        const position = getIndicatorPosition(shape, allShapes, scaleSettings.pixelsPerMm);

        if (!position || !isFinite(position.x) || !isFinite(position.y)) {
          return null;
        }

        return (
          <Group
            key={`comment-${shape.id}`}
            x={position.x}
            y={position.y - badgeSize / 2}
            onClick={(e) => {
              e.cancelBubble = true;
              const stage = e.target.getStage();
              if (stage) {
                const containerRect = stage.container().getBoundingClientRect();
                const pointer = stage.getPointerPosition();
                if (pointer) {
                  onBadgeClick(shape.id, containerRect.left + pointer.x, containerRect.top + pointer.y);
                }
              }
            }}
            onMouseEnter={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'pointer';
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'default';
            }}
          >
            <Rect
              x={0}
              y={0}
              width={badgeSize}
              height={badgeSize}
              fill={isResolved ? '#22c55e' : '#3b82f6'}
              cornerRadius={badgeSize / 2}
              shadowColor="#000"
              shadowBlur={3 / viewState.zoom}
              shadowOpacity={0.3}
            />
            <KonvaText
              x={isResolved ? badgeSize * 0.2 : (count > 9 ? badgeSize * 0.15 : badgeSize * 0.35)}
              y={isResolved ? badgeSize * 0.15 : badgeSize * 0.2}
              text={isResolved ? '✓' : (count > 9 ? '9+' : String(count))}
              fontSize={isResolved ? fontSize * 1.1 : fontSize}
              fontStyle="bold"
              fill="white"
            />
          </Group>
        );
      })}
    </Group>
  );
};
