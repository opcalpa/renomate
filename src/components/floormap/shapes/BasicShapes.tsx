/**
 * Basic Shape Components
 *
 * Simple shape renderers for Rectangle, Circle, Text, and Freehand.
 * All shapes use unified drag handlers for multi-select support.
 * Includes Transformer support for rotation and scaling.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { Rect, Circle, Line, Text as KonvaText, Group, Transformer } from 'react-konva';
import Konva from 'konva';
import { ShapeComponentProps } from './types';
import { createUnifiedDragHandlers } from '../canvas/utils';
import { useFloorMapStore } from '../store';

/**
 * RectangleShape - Renders rectangle, door, and opening shapes
 * Supports rotation and scaling via Transformer
 */
export const RectangleShape = React.memo<ShapeComponentProps>(({ shape, isSelected, onSelect, onTransform, shapeRefsMap }) => {
  const shapeRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Get unified drag handlers for multi-select support
  const dragHandlers = createUnifiedDragHandlers(shape.id);

  // Store ref in shapeRefsMap for unified multi-select drag
  useEffect(() => {
    if (shapeRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, shapeRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  // Handle transform end (resize/rotate)
  const handleTransformEnd = useCallback(() => {
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and update width/height
    node.scaleX(1);
    node.scaleY(1);

    const coords = shape.coordinates as { left: number; top: number; width: number; height: number };

    onTransform({
      coordinates: {
        left: node.x(),
        top: node.y(),
        width: Math.max(5, coords.width * scaleX),
        height: Math.max(5, coords.height * scaleY),
      },
      rotation: node.rotation(),
    });
  }, [shape.coordinates, onTransform]);

  if (shape.type !== 'rectangle' && shape.type !== 'door' && shape.type !== 'opening') return null;

  const coords = shape.coordinates as { left: number; top: number; width: number; height: number };

  return (
    <>
      <Rect
        ref={shapeRef}
        id={`shape-${shape.id}`}
        name={shape.id}
        shapeId={shape.id}
        x={coords.left}
        y={coords.top}
        width={coords.width}
        height={coords.height}
        fill={shape.color || 'rgba(0,0,0,0.001)'}
        stroke={isSelected ? '#3b82f6' : shape.strokeColor || '#000000'}
        strokeWidth={2}
        cornerRadius={2}
        rotation={shape.rotation || 0}
        draggable={true}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect(e);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect(e);
        }}
        onDragStart={dragHandlers.onDragStart}
        onDragMove={dragHandlers.onDragMove}
        onDragEnd={dragHandlers.onDragEnd}
        onTransformEnd={handleTransformEnd}
        listening={true}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={true}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit minimum size
            if (newBox.width < 10 || newBox.height < 10) {
              return oldBox;
            }
            return newBox;
          }}
          anchorSize={8}
          anchorCornerRadius={2}
          anchorStroke="#3b82f6"
          anchorFill="white"
          borderStroke="#3b82f6"
          borderStrokeWidth={1}
          rotateAnchorOffset={20}
        />
      )}
    </>
  );
}, (prevProps, nextProps) => {
  const coordsEqual = JSON.stringify(prevProps.shape.coordinates) === JSON.stringify(nextProps.shape.coordinates);

  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.isSelected === nextProps.isSelected &&
    coordsEqual &&
    prevProps.shape.color === nextProps.shape.color &&
    prevProps.shape.strokeColor === nextProps.shape.strokeColor &&
    prevProps.shape.rotation === nextProps.shape.rotation
  );
});

/**
 * CircleShape - Renders circle shapes
 * Supports rotation and scaling via Transformer
 */
export const CircleShape = React.memo<ShapeComponentProps>(({ shape, isSelected, onSelect, onTransform, shapeRefsMap }) => {
  const shapeRef = useRef<Konva.Circle>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Get unified drag handlers for multi-select support
  const dragHandlers = createUnifiedDragHandlers(shape.id);

  // Store ref in shapeRefsMap for unified multi-select drag
  useEffect(() => {
    if (shapeRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, shapeRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  // Handle transform end (resize)
  const handleTransformEnd = useCallback(() => {
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and update radius (use average of scaleX/scaleY)
    node.scaleX(1);
    node.scaleY(1);

    const coords = shape.coordinates as { cx: number; cy: number; radius: number };
    const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;

    onTransform({
      coordinates: {
        cx: node.x(),
        cy: node.y(),
        radius: Math.max(5, coords.radius * avgScale),
      },
      rotation: node.rotation(),
    });
  }, [shape.coordinates, onTransform]);

  if (shape.type !== 'circle') return null;

  const coords = shape.coordinates as { cx: number; cy: number; radius: number };

  return (
    <>
      <Circle
        ref={shapeRef}
        id={`shape-${shape.id}`}
        name={shape.id}
        shapeId={shape.id}
        x={coords.cx}
        y={coords.cy}
        radius={coords.radius}
        fill={shape.color || 'rgba(0,0,0,0.001)'}
        stroke={isSelected ? '#3b82f6' : shape.strokeColor || '#000000'}
        strokeWidth={2}
        rotation={shape.rotation || 0}
        draggable={true}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect(e);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect(e);
        }}
        onDragStart={dragHandlers.onDragStart}
        onDragMove={dragHandlers.onDragMove}
        onDragEnd={dragHandlers.onDragEnd}
        onTransformEnd={handleTransformEnd}
        listening={true}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={true}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit minimum size
            if (newBox.width < 10 || newBox.height < 10) {
              return oldBox;
            }
            return newBox;
          }}
          anchorSize={8}
          anchorCornerRadius={2}
          anchorStroke="#3b82f6"
          anchorFill="white"
          borderStroke="#3b82f6"
          borderStrokeWidth={1}
          rotateAnchorOffset={20}
        />
      )}
    </>
  );
}, (prevProps, nextProps) => {
  const coordsEqual = JSON.stringify(prevProps.shape.coordinates) === JSON.stringify(nextProps.shape.coordinates);

  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.isSelected === nextProps.isSelected &&
    coordsEqual &&
    prevProps.shape.color === nextProps.shape.color &&
    prevProps.shape.strokeColor === nextProps.shape.strokeColor &&
    prevProps.shape.rotation === nextProps.shape.rotation
  );
});

/**
 * TextShape - Renders text shapes with resizable box
 * Supports bold, italic, font size presets, rotation (0/90/180/270), and optional background
 * Double-click to edit text content
 */
export const TextShape = React.memo<ShapeComponentProps & { onEdit?: (shape: any) => void }>(({ shape, isSelected, onSelect, onTransform, shapeRefsMap, onEdit }) => {
  const groupRef = useRef<Konva.Group>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Get unified drag handlers for multi-select support
  const dragHandlers = createUnifiedDragHandlers(shape.id);

  // Store ref in shapeRefsMap for unified multi-select drag
  useEffect(() => {
    if (groupRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, groupRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && groupRef.current) {
      transformerRef.current.nodes([groupRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  // Handle transform end - scale font size proportionally with box
  const handleTransformEnd = useCallback(() => {
    const node = groupRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale
    node.scaleX(1);
    node.scaleY(1);

    const coords = shape.coordinates as { x: number; y: number; width?: number; height?: number };
    const currentWidth = coords.width || 200;
    const currentHeight = coords.height || 50;
    const currentFontSize = shape.fontSize || 16;

    // Scale font size based on average scale (use the smaller to avoid overflow)
    const avgScale = Math.min(scaleX, scaleY);
    const newFontSize = Math.max(8, Math.min(72, Math.round(currentFontSize * avgScale)));

    onTransform({
      coordinates: {
        x: node.x(),
        y: node.y(),
        width: Math.max(50, currentWidth * scaleX),
        height: Math.max(30, currentHeight * scaleY),
      },
      fontSize: newFontSize,
      rotation: node.rotation(),
    });
  }, [shape.coordinates, shape.fontSize, onTransform]);

  // Handle double-click to edit
  const handleDoubleClick = useCallback((e: any) => {
    e.cancelBubble = true;
    if (onEdit) {
      onEdit(shape);
    }
  }, [onEdit, shape]);

  if (shape.type !== 'text') return null;

  const coords = shape.coordinates as { x: number; y: number; width?: number; height?: number };
  const boxWidth = coords.width || 200;
  const boxHeight = coords.height || 50;

  // Text style properties
  const fontSize = shape.fontSize || shape.metadata?.lengthMM || 16;
  const isBold = shape.textStyle?.isBold || false;
  const isItalic = shape.textStyle?.isItalic || false;
  const hasBackground = shape.hasBackground || false;
  const textRotation = shape.textRotation || 0;

  // Build font style string
  let fontStyle = '';
  if (isBold && isItalic) {
    fontStyle = 'bold italic';
  } else if (isBold) {
    fontStyle = 'bold';
  } else if (isItalic) {
    fontStyle = 'italic';
  }

  return (
    <>
      <Group
        ref={groupRef}
        id={`shape-${shape.id}`}
        name={shape.id}
        shapeId={shape.id}
        x={coords.x}
        y={coords.y}
        rotation={shape.rotation || textRotation || 0}
        draggable={true}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect(e);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect(e);
        }}
        onDblClick={handleDoubleClick}
        onDblTap={handleDoubleClick}
        onDragStart={dragHandlers.onDragStart}
        onDragMove={dragHandlers.onDragMove}
        onDragEnd={dragHandlers.onDragEnd}
        onTransformEnd={handleTransformEnd}
      >
        {/* Hit area - always present for click detection */}
        <Rect
          width={boxWidth}
          height={boxHeight}
          fill={hasBackground ? 'rgba(255, 255, 255, 0.9)' : 'transparent'}
          stroke={isSelected ? '#3b82f6' : (hasBackground ? '#d1d5db' : 'transparent')}
          strokeWidth={isSelected || hasBackground ? 1 : 0}
          cornerRadius={hasBackground ? 4 : 0}
          dash={!hasBackground && isSelected ? [4, 4] : undefined}
          listening={true}
        />

        {/* Text content */}
        <KonvaText
          text={shape.text || 'Text'}
          fontSize={fontSize}
          fontStyle={fontStyle || undefined}
          fill={shape.color || '#000000'}
          width={boxWidth}
          height={boxHeight}
          padding={hasBackground ? 8 : 4}
          align="left"
          verticalAlign="middle"
          listening={false}
        />
      </Group>

      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={true}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
          boundBoxFunc={(oldBox, newBox) => {
            // Minimum box size
            if (newBox.width < 50 || newBox.height < 30) {
              return oldBox;
            }
            return newBox;
          }}
          anchorSize={8}
          anchorCornerRadius={2}
          anchorStroke="#3b82f6"
          anchorFill="white"
          borderStroke="#3b82f6"
          borderStrokeWidth={1}
          rotateAnchorOffset={20}
        />
      )}
    </>
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
    prevProps.shape.fontSize === nextProps.shape.fontSize &&
    prevProps.shape.textStyle?.isBold === nextProps.shape.textStyle?.isBold &&
    prevProps.shape.textStyle?.isItalic === nextProps.shape.textStyle?.isItalic &&
    prevProps.shape.hasBackground === nextProps.shape.hasBackground &&
    prevProps.shape.textRotation === nextProps.shape.textRotation &&
    prevProps.onEdit === nextProps.onEdit
  );
});

/**
 * FreehandShape - Renders freehand/polygon shapes
 * Supports rotation and scaling via Transformer
 */
export const FreehandShape = React.memo<ShapeComponentProps>(({ shape, isSelected, onSelect, onTransform, shapeRefsMap }) => {
  const shapeRef = useRef<Konva.Line>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const zoom = useFloorMapStore((state) => state.viewState.zoom);

  // Get unified drag handlers for multi-select support
  const dragHandlers = createUnifiedDragHandlers(shape.id);

  // Store ref in shapeRefsMap for unified multi-select drag
  useEffect(() => {
    if (shapeRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, shapeRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  // Handle transform end
  const handleTransformEnd = useCallback(() => {
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();
    const x = node.x();
    const y = node.y();

    // Reset transform
    node.scaleX(1);
    node.scaleY(1);
    node.rotation(0);
    node.x(0);
    node.y(0);

    const coords = shape.coordinates as { points: { x: number; y: number }[] };
    const points = coords.points || [];

    // Calculate center of original points
    let sumX = 0, sumY = 0;
    points.forEach(p => {
      sumX += p.x;
      sumY += p.y;
    });
    const centerX = sumX / points.length;
    const centerY = sumY / points.length;

    // Apply scale and rotation to each point
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const newPoints = points.map(p => {
      // Translate to origin
      let px = p.x - centerX;
      let py = p.y - centerY;

      // Scale
      px *= scaleX;
      py *= scaleY;

      // Rotate
      const rx = px * cos - py * sin;
      const ry = px * sin + py * cos;

      // Translate back + add drag offset
      return {
        x: rx + centerX + x,
        y: ry + centerY + y,
      };
    });

    onTransform({
      coordinates: { points: newPoints },
      rotation: 0, // Rotation is baked into points
    });
  }, [shape.coordinates, onTransform]);

  if (shape.type !== 'freehand' && shape.type !== 'polygon') return null;

  const coords = shape.coordinates as { points: { x: number; y: number }[] };
  const points = coords.points || [];
  const flatPoints = points.flatMap((p: { x: number; y: number }) => [p.x, p.y]);

  return (
    <>
      <Line
        ref={shapeRef}
        id={`shape-${shape.id}`}
        name={shape.id}
        shapeId={shape.id}
        points={flatPoints}
        stroke={isSelected ? '#3b82f6' : shape.strokeColor || '#000000'}
        strokeWidth={shape.strokeWidth || 2}
        tension={0.5}
        lineCap="round"
        lineJoin="round"
        perfectDrawEnabled={false}
        hitStrokeWidth={Math.max(shape.strokeWidth || 2, 20 / zoom)}
        draggable={true}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect(e);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect(e);
        }}
        onDragStart={dragHandlers.onDragStart}
        onDragMove={dragHandlers.onDragMove}
        onDragEnd={dragHandlers.onDragEnd}
        onTransformEnd={handleTransformEnd}
        listening={true}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={true}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10 || newBox.height < 10) {
              return oldBox;
            }
            return newBox;
          }}
          anchorSize={8}
          anchorCornerRadius={2}
          anchorStroke="#3b82f6"
          anchorFill="white"
          borderStroke="#3b82f6"
          borderStrokeWidth={1}
          rotateAnchorOffset={20}
        />
      )}
    </>
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
