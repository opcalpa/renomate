/**
 * UnifiedObjectShape - Renders objects as single, indivisible units
 *
 * Key features:
 * - Objects cannot be broken apart (all paths in one Group)
 * - Single click selects entire object
 * - Transform operations apply to the whole object
 * - Works in both Floor Plan and Elevation views
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { Group, Path, Rect } from 'react-konva';
import Konva from 'konva';
import { UnifiedObjectDefinition, SVGSymbol } from './types';
import { useFloorMapStore } from '../store';
import { createUnifiedDragHandlers } from '../canvas/utils';

export interface UnifiedObjectShapeProps {
  /** Object definition */
  definition: UnifiedObjectDefinition;
  /** Instance ID */
  instanceId: string;
  /** Position in canvas coordinates */
  position: { x: number; y: number };
  /** Rotation in degrees */
  rotation: number;
  /** Scale factor */
  scale: number;
  /** Is selected */
  isSelected: boolean;
  /** View mode */
  viewMode: 'floorplan' | 'elevation';
  /** Zoom level for stroke scaling */
  zoom: number;
  /** Pixels per mm for scaling */
  pixelsPerMm: number;
  /** Selection handler */
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  /** Transform handler */
  onTransform: (updates: { position?: { x: number; y: number }; rotation?: number; scale?: number }) => void;
  /** Shape refs map for multi-select */
  shapeRefsMap?: Map<string, Konva.Node>;
  /** Is flipped horizontally */
  flipped?: boolean;
}

/**
 * Render SVG symbol as Konva paths
 */
const renderSymbol = (
  symbol: SVGSymbol,
  width: number,
  height: number,
  zoom: number,
  isSelected: boolean
): React.ReactNode[] => {
  // Parse viewBox to get original dimensions
  const [, , vbWidth, vbHeight] = symbol.viewBox.split(' ').map(Number);
  const scaleX = width / vbWidth;
  const scaleY = height / vbHeight;

  return symbol.paths.map((path, index) => {
    // Scale stroke width inversely with zoom for consistent appearance
    const strokeWidth = (path.strokeWidth || 2) * Math.min(scaleX, scaleY);

    return (
      <Path
        key={index}
        data={path.d}
        fill={path.fill || 'none'}
        stroke={isSelected ? '#3b82f6' : (path.stroke || symbol.defaultStroke || '#374151')}
        strokeWidth={strokeWidth}
        scaleX={scaleX}
        scaleY={scaleY}
        listening={false} // Sub-shapes don't capture events
        perfectDrawEnabled={false}
      />
    );
  });
};

export const UnifiedObjectShape: React.FC<UnifiedObjectShapeProps> = ({
  definition,
  instanceId,
  position,
  rotation,
  scale,
  isSelected,
  viewMode,
  zoom,
  pixelsPerMm,
  onSelect,
  onTransform,
  shapeRefsMap,
  flipped = false,
}) => {
  const groupRef = useRef<Konva.Group>(null);

  // Get active tool to disable selection during drawing
  const activeTool = useFloorMapStore((state) => state.activeTool);
  const drawingTools = ['wall', 'door_line', 'window_line', 'sliding_door_line', 'line', 'freehand', 'rectangle', 'circle', 'text', 'room', 'bezier'];
  const isDrawingMode = drawingTools.includes(activeTool);
  const canSelect = !isDrawingMode;

  // Register ref in shapeRefsMap for multi-select drag
  useEffect(() => {
    if (groupRef.current && shapeRefsMap) {
      shapeRefsMap.set(instanceId, groupRef.current);
      return () => {
        shapeRefsMap.delete(instanceId);
      };
    }
  }, [instanceId, shapeRefsMap]);

  // Get the appropriate symbol for current view
  const symbol = viewMode === 'elevation'
    ? definition.elevationSymbol
    : definition.floorPlanSymbol;

  // Calculate display dimensions in pixels
  const displayWidth = definition.dimensions.width * pixelsPerMm * scale;
  const displayHeight = (viewMode === 'elevation'
    ? definition.dimensions.height
    : definition.dimensions.width) * pixelsPerMm * scale;

  // Handle click
  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!canSelect) return;
    e.cancelBubble = true;
    onSelect(e);
  }, [canSelect, onSelect]);

  // Selection box padding
  const padding = 4 / zoom;

  return (
    <Group
      ref={groupRef}
      id={`unified-object-${instanceId}`}
      name={instanceId}
      x={position.x}
      y={position.y}
      rotation={rotation}
      scaleX={flipped ? -1 : 1}
      draggable={canSelect}
      listening={canSelect}
      onClick={handleClick}
      onTap={handleClick}
      {...(canSelect ? createUnifiedDragHandlers(instanceId) : {})}
    >
      {/* Invisible hit area for easier selection */}
      <Rect
        x={-displayWidth / 2 - padding}
        y={-displayHeight / 2 - padding}
        width={displayWidth + padding * 2}
        height={displayHeight + padding * 2}
        fill="transparent"
        listening={true}
      />

      {/* Selection highlight */}
      {isSelected && (
        <Rect
          x={-displayWidth / 2 - padding}
          y={-displayHeight / 2 - padding}
          width={displayWidth + padding * 2}
          height={displayHeight + padding * 2}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#3b82f6"
          strokeWidth={2 / zoom}
          dash={[4 / zoom, 4 / zoom]}
          listening={false}
        />
      )}

      {/* Symbol container - offset to center */}
      <Group
        x={-displayWidth / 2}
        y={-displayHeight / 2}
      >
        {renderSymbol(symbol, displayWidth, displayHeight, zoom, isSelected)}
      </Group>
    </Group>
  );
};

export default UnifiedObjectShape;
