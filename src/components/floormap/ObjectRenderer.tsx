/**
 * OBJECT RENDERER
 * 
 * Renders architectural objects from JSON definitions using Konva primitives.
 * Converts ObjectDefinition shapes to React-Konva components.
 */

import React from 'react';
import { Group, Line, Circle, Rect, Arc, Path, Ellipse } from 'react-konva';
import { ObjectDefinition, ObjectShape } from './objectLibraryDefinitions';

export interface ObjectRendererProps {
  definition: ObjectDefinition;
  x?: number;
  y?: number;
  rotation?: number;
  scale?: number;
  strokeColor?: string;
  fillColor?: string;
  opacity?: number;
  onClick?: () => void;
  onDragStart?: () => void;
  onDragMove?: () => void;
  onDragEnd?: (e: any) => void;
  draggable?: boolean;
}

/**
 * Render a single shape from JSON definition
 */
const renderShape = (
  shape: ObjectShape,
  index: number,
  overrideStroke?: string,
  overrideFill?: string
): JSX.Element => {
  const key = `shape-${index}`;
  const stroke = overrideStroke || shape.stroke || '#000000';
  const strokeWidth = shape.strokeWidth || 2;
  const fill = overrideFill || shape.fill || 'transparent';
  const opacity = shape.opacity !== undefined ? shape.opacity : 1;
  const dash = shape.dash;

  switch (shape.type) {
    case 'line':
      if (!shape.points || shape.points.length < 4) {
        return <Group key={key} />;
      }
      return (
        <Line
          key={key}
          points={shape.points}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          dash={dash}
          opacity={opacity}
        />
      );

    case 'circle':
      if (shape.x === undefined || shape.y === undefined || !shape.radius) {
        return <Group key={key} />;
      }
      return (
        <Circle
          key={key}
          x={shape.x}
          y={shape.y}
          radius={shape.radius}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill}
          opacity={opacity}
        />
      );

    case 'rect':
      if (
        shape.x === undefined ||
        shape.y === undefined ||
        !shape.width ||
        !shape.height
      ) {
        return <Group key={key} />;
      }
      return (
        <Rect
          key={key}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill}
          opacity={opacity}
        />
      );

    case 'ellipse':
      if (
        shape.x === undefined ||
        shape.y === undefined ||
        !shape.radiusX ||
        !shape.radiusY
      ) {
        return <Group key={key} />;
      }
      return (
        <Ellipse
          key={key}
          x={shape.x}
          y={shape.y}
          radiusX={shape.radiusX}
          radiusY={shape.radiusY}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill}
          opacity={opacity}
        />
      );

    case 'arc':
      if (
        shape.x === undefined ||
        shape.y === undefined ||
        shape.innerRadius === undefined ||
        shape.outerRadius === undefined ||
        shape.angle === undefined
      ) {
        return <Group key={key} />;
      }
      return (
        <Arc
          key={key}
          x={shape.x}
          y={shape.y}
          innerRadius={shape.innerRadius}
          outerRadius={shape.outerRadius}
          angle={shape.angle}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill}
          opacity={opacity}
        />
      );

    case 'path':
      if (!shape.data) {
        return <Group key={key} />;
      }
      return (
        <Path
          key={key}
          data={shape.data}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill}
          opacity={opacity}
        />
      );

    default:
      return <Group key={key} />;
  }
};

/**
 * Main Object Renderer Component
 * 
 * Renders an architectural object from JSON definition
 */
export const ObjectRenderer: React.FC<ObjectRendererProps> = ({
  definition,
  x = 0,
  y = 0,
  rotation = 0,
  scale = 1,
  strokeColor,
  fillColor,
  opacity = 1,
  onClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  draggable = false,
}) => {
  // Calculate offset to center object at position
  const offsetX = -definition.defaultWidth / 2;
  const offsetY = -definition.defaultHeight / 2;

  return (
    <Group
      x={x}
      y={y}
      rotation={rotation}
      scaleX={scale}
      scaleY={scale}
      opacity={opacity}
      onClick={onClick}
      onTap={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    >
      <Group offsetX={-offsetX} offsetY={-offsetY}>
        {definition.shapes.map((shape, index) =>
          renderShape(shape, index, strokeColor, fillColor)
        )}
      </Group>
    </Group>
  );
};

/**
 * Preview Renderer (for thumbnails, etc.)
 * 
 * Renders object scaled to fit within a bounding box
 */
export interface ObjectPreviewProps {
  definition: ObjectDefinition;
  width: number;
  height: number;
  strokeColor?: string;
  fillColor?: string;
}

export const ObjectPreview: React.FC<ObjectPreviewProps> = ({
  definition,
  width,
  height,
  strokeColor,
  fillColor,
}) => {
  // Calculate scale to fit within preview box
  const scaleX = width / definition.defaultWidth;
  const scaleY = height / definition.defaultHeight;
  const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to add padding

  return (
    <Group
      x={width / 2}
      y={height / 2}
      scaleX={scale}
      scaleY={scale}
    >
      <Group
        offsetX={definition.defaultWidth / 2}
        offsetY={definition.defaultHeight / 2}
      >
        {definition.shapes.map((shape, index) =>
          renderShape(shape, index, strokeColor, fillColor)
        )}
      </Group>
    </Group>
  );
};

/**
 * Get custom library from localStorage
 */
export function getCustomLibrary(): ObjectDefinition[] {
  const STORAGE_KEY = 'floormap_custom_object_library';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load custom library:', error);
      return [];
    }
  }
  return [];
}

/**
 * Get object definition by ID (checks custom library first, then defaults)
 */
export function getObjectById(
  id: string,
  customLibrary?: ObjectDefinition[]
): ObjectDefinition | undefined {
  const custom = customLibrary || getCustomLibrary();
  const customObj = custom.find((obj) => obj.id === id);
  if (customObj) return customObj;

  // Fall back to defaults
  const { DEFAULT_OBJECT_LIBRARY } = require('./objectLibraryDefinitions');
  return DEFAULT_OBJECT_LIBRARY.find((obj: ObjectDefinition) => obj.id === id);
}
