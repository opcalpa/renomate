/**
 * Basic Shape Components
 *
 * Simple shape renderers for Rectangle, Circle, Text, and Freehand.
 * All shapes use unified drag handlers for multi-select support.
 */

import React, { useRef, useEffect } from 'react';
import { Rect, Circle, Line, Text as KonvaText, Group } from 'react-konva';
import Konva from 'konva';
import { ShapeComponentProps } from './types';
import { createUnifiedDragHandlers } from '../canvas/utils';

/**
 * RectangleShape - Renders rectangle, door, and opening shapes
 * PERFORMANCE: Memoized to prevent unnecessary re-renders
 */
export const RectangleShape = React.memo<ShapeComponentProps>(({ shape, isSelected, onSelect, onTransform, shapeRefsMap }) => {
  const shapeRef = useRef<Konva.Rect>(null);

  // Store ref in shapeRefsMap for unified multi-select drag
  useEffect(() => {
    if (shapeRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, shapeRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);

  if (shape.type !== 'rectangle' && shape.type !== 'door' && shape.type !== 'opening') return null;

  const coords = shape.coordinates as { left: number; top: number; width: number; height: number };

  return (
    <Group
      id={`shape-${shape.id}`}
      name={shape.id}
      shapeId={shape.id}
      draggable={true}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      {...createUnifiedDragHandlers(shape.id, shapeRefsMap)}
    >
      <Rect
        ref={shapeRef}
        x={coords.left}
        y={coords.top}
        width={coords.width}
        height={coords.height}
        fill={shape.color || 'transparent'}
        stroke={isSelected ? '#3b82f6' : shape.strokeColor || '#000000'}
        strokeWidth={2}
        cornerRadius={2}
        listening={false}
      />
    </Group>
  );
}, (prevProps, nextProps) => {
  const coordsEqual = JSON.stringify(prevProps.shape.coordinates) === JSON.stringify(nextProps.shape.coordinates);

  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.isSelected === nextProps.isSelected &&
    coordsEqual &&
    prevProps.shape.color === nextProps.shape.color &&
    prevProps.shape.strokeColor === nextProps.shape.strokeColor
  );
});

/**
 * CircleShape - Renders circle shapes
 * PERFORMANCE: Memoized to prevent unnecessary re-renders
 */
export const CircleShape = React.memo<ShapeComponentProps>(({ shape, isSelected, onSelect, onTransform, shapeRefsMap }) => {
  const shapeRef = useRef<Konva.Circle>(null);

  // Store ref in shapeRefsMap for unified multi-select drag
  useEffect(() => {
    if (shapeRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, shapeRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);

  if (shape.type !== 'circle') return null;

  const coords = shape.coordinates as { cx: number; cy: number; radius: number };

  return (
    <Group
      id={`shape-${shape.id}`}
      name={shape.id}
      shapeId={shape.id}
      draggable={true}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      {...createUnifiedDragHandlers(shape.id, shapeRefsMap)}
    >
      <Circle
        ref={shapeRef}
        x={coords.cx}
        y={coords.cy}
        radius={coords.radius}
        fill={shape.color || 'transparent'}
        stroke={isSelected ? '#3b82f6' : shape.strokeColor || '#000000'}
        strokeWidth={2}
        listening={false}
      />
    </Group>
  );
}, (prevProps, nextProps) => {
  const coordsEqual = JSON.stringify(prevProps.shape.coordinates) === JSON.stringify(nextProps.shape.coordinates);

  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.isSelected === nextProps.isSelected &&
    coordsEqual &&
    prevProps.shape.color === nextProps.shape.color &&
    prevProps.shape.strokeColor === nextProps.shape.strokeColor
  );
});

/**
 * TextShape - Renders text shapes
 * PERFORMANCE: Memoized to prevent unnecessary re-renders
 */
export const TextShape = React.memo<ShapeComponentProps>(({ shape, isSelected, onSelect, onTransform, shapeRefsMap }) => {
  const textRef = useRef<Konva.Text>(null);

  // Store ref in shapeRefsMap for unified multi-select drag
  useEffect(() => {
    if (textRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, textRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);

  if (shape.type !== 'text') return null;

  const coords = shape.coordinates as { x: number; y: number };

  return (
    <Group
      id={`shape-${shape.id}`}
      name={shape.id}
      shapeId={shape.id}
      draggable={true}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      {...createUnifiedDragHandlers(shape.id, shapeRefsMap)}
    >
      <KonvaText
        ref={textRef}
        x={coords.x}
        y={coords.y}
        text={shape.text || 'Text'}
        fontSize={shape.metadata?.lengthMM || 16}
        fill={shape.color || '#000000'}
        rotation={shape.rotation || 0}
        listening={false}
      />
    </Group>
  );
}, (prevProps, nextProps) => {
  const coordsEqual = JSON.stringify(prevProps.shape.coordinates) === JSON.stringify(nextProps.shape.coordinates);

  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.isSelected === nextProps.isSelected &&
    coordsEqual &&
    prevProps.shape.text === nextProps.shape.text &&
    prevProps.shape.color === nextProps.shape.color &&
    prevProps.shape.rotation === nextProps.shape.rotation &&
    prevProps.shape.metadata?.lengthMM === nextProps.shape.metadata?.lengthMM
  );
});

/**
 * FreehandShape - Renders freehand/polygon shapes
 * PERFORMANCE: Memoized to prevent unnecessary re-renders
 */
export const FreehandShape = React.memo<ShapeComponentProps>(({ shape, isSelected, onSelect, onTransform, shapeRefsMap }) => {
  const shapeRef = useRef<Konva.Line>(null);

  // Store ref in shapeRefsMap for unified multi-select drag
  useEffect(() => {
    if (shapeRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, shapeRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);

  if (shape.type !== 'freehand' && shape.type !== 'polygon') return null;

  const coords = shape.coordinates as { points: { x: number; y: number }[] };
  const points = coords.points || [];
  const flatPoints = points.flatMap((p: { x: number; y: number }) => [p.x, p.y]);

  return (
    <Group
      id={`shape-${shape.id}`}
      name={shape.id}
      shapeId={shape.id}
      draggable={true}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect(e);
      }}
      {...createUnifiedDragHandlers(shape.id, shapeRefsMap)}
    >
      <Line
        ref={shapeRef}
        points={flatPoints}
        stroke={isSelected ? '#3b82f6' : shape.strokeColor || '#000000'}
        strokeWidth={shape.strokeWidth || 2}
        tension={0.5}
        lineCap="round"
        lineJoin="round"
        perfectDrawEnabled={false}
        hitStrokeWidth={10}
        listening={false}
      />
    </Group>
  );
}, (prevProps, nextProps) => {
  const coordsEqual = JSON.stringify(prevProps.shape.coordinates) === JSON.stringify(nextProps.shape.coordinates);

  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.isSelected === nextProps.isSelected &&
    coordsEqual &&
    prevProps.shape.color === nextProps.shape.color &&
    prevProps.shape.strokeColor === nextProps.shape.strokeColor
  );
});
