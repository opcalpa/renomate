/**
 * ImageObjectShape - Renders object library items using images instead of vectors
 *
 * Uses Konva.Image for photorealistic 2D rendering when sprite assets are available.
 * Falls back to vector rendering (ObjectLibraryShape) when no sprite is provided.
 */

import { useRef, useMemo, useEffect, useState } from 'react';
import { Group, Image as KonvaImage, Rect, Line } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { FloorMapShape, SymbolCoordinates } from '../types';
import { getObjectDefinition, type ObjectDefinition } from '../objectLibraryDefinitions';

interface ImageObjectShapeProps {
  shape: FloorMapShape;
  isSelected: boolean;
  onSelect: (evt?: KonvaEventObject<MouseEvent>) => void;
  onTransform: (updates: Partial<FloorMapShape>) => void;
  shapeRefsMap: Map<string, Konva.Node>;
  viewState: { zoom: number; panX: number; panY: number };
  scaleSettings: { pixelsPerMm: number };
  projectSettings?: { snapEnabled: boolean; showDimensions: boolean; unit: 'mm' | 'cm' | 'm' };
}

/**
 * Selection outline for the image object
 */
function SelectionOutline({ width, height }: { width: number; height: number }) {
  const padding = 4;
  return (
    <Rect
      x={-padding}
      y={-padding}
      width={width + padding * 2}
      height={height + padding * 2}
      stroke="#2196F3"
      strokeWidth={2}
      dash={[6, 3]}
      fill="transparent"
      listening={false}
    />
  );
}

/**
 * Shadow for depth perception
 */
function ObjectShadow({ width, height }: { width: number; height: number }) {
  return (
    <Rect
      x={5}
      y={5}
      width={width}
      height={height}
      fill="rgba(0, 0, 0, 0.1)"
      cornerRadius={2}
      listening={false}
    />
  );
}

export function ImageObjectShape({
  shape,
  isSelected,
  onSelect,
  onTransform,
  shapeRefsMap,
  viewState,
  scaleSettings,
}: ImageObjectShapeProps) {
  const groupRef = useRef<Konva.Group>(null);

  // Get object definition for sprite URL
  const objectDef = useMemo(() => {
    const objectId = shape.metadata?.objectId as string;
    return objectId ? getObjectDefinition(objectId) : null;
  }, [shape.metadata?.objectId]);

  // Get sprite URL
  const spriteUrl = objectDef?.assets?.sprite2D;

  // Load image using use-image hook
  const [image, imageStatus] = useImage(spriteUrl || '', 'anonymous');

  // Register ref
  useEffect(() => {
    if (groupRef.current) {
      shapeRefsMap.set(shape.id, groupRef.current);
    }
    return () => {
      shapeRefsMap.delete(shape.id);
    };
  }, [shape.id, shapeRefsMap]);

  // Calculate position and dimensions
  const { x, y, width, height, rotation } = useMemo(() => {
    const coords = shape.coordinates as SymbolCoordinates;
    const placementX = shape.metadata?.placementX as number;
    const placementY = shape.metadata?.placementY as number;

    // Use placement position if available, otherwise use coordinates
    const posX = placementX ?? coords?.x ?? 0;
    const posY = placementY ?? coords?.y ?? 0;

    // Get dimensions from object definition or shape
    const objWidth = shape.dimensions3D?.width || objectDef?.defaultWidth || coords?.width || 500;
    const objDepth = shape.dimensions3D?.depth || objectDef?.defaultHeight || coords?.height || 500;

    // Scale to pixels
    const scale = scaleSettings.pixelsPerMm;

    return {
      x: posX,
      y: posY,
      width: objWidth * scale,
      height: objDepth * scale,
      rotation: shape.rotation || (shape.metadata?.rotation as number) || 0,
    };
  }, [shape, objectDef, scaleSettings.pixelsPerMm]);

  // Handle drag end
  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    onTransform({
      metadata: {
        ...shape.metadata,
        placementX: node.x(),
        placementY: node.y(),
      },
    });
  };

  // Handle transform end
  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    const node = e.target as Konva.Group;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and apply to width/height
    node.scaleX(1);
    node.scaleY(1);

    onTransform({
      rotation: node.rotation(),
      metadata: {
        ...shape.metadata,
        placementX: node.x(),
        placementY: node.y(),
      },
      dimensions3D: shape.dimensions3D ? {
        ...shape.dimensions3D,
        width: shape.dimensions3D.width * scaleX,
        depth: shape.dimensions3D.depth * scaleY,
      } : undefined,
    });
  };

  // If no sprite URL or loading, return null (let the vector fallback handle it)
  if (!spriteUrl) {
    return null;
  }

  // Show loading placeholder while image loads
  if (imageStatus === 'loading') {
    return (
      <Group
        ref={groupRef}
        x={x}
        y={y}
        rotation={rotation}
        draggable={!shape.locked}
        onClick={onSelect}
        onTap={onSelect}
      >
        <Rect
          width={width}
          height={height}
          fill="#f0f0f0"
          stroke="#ddd"
          strokeWidth={1}
          cornerRadius={2}
        />
        {/* Loading indicator */}
        <Line
          points={[0, 0, width, height]}
          stroke="#ccc"
          strokeWidth={1}
        />
        <Line
          points={[width, 0, 0, height]}
          stroke="#ccc"
          strokeWidth={1}
        />
      </Group>
    );
  }

  // Show error state if image failed to load
  if (imageStatus === 'failed') {
    return (
      <Group
        ref={groupRef}
        x={x}
        y={y}
        rotation={rotation}
        draggable={!shape.locked}
        onClick={onSelect}
        onTap={onSelect}
      >
        <Rect
          width={width}
          height={height}
          fill="#ffebee"
          stroke="#f44336"
          strokeWidth={1}
          cornerRadius={2}
        />
      </Group>
    );
  }

  return (
    <Group
      ref={groupRef}
      x={x}
      y={y}
      rotation={rotation}
      draggable={!shape.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      {/* Shadow for depth */}
      <ObjectShadow width={width} height={height} />

      {/* Main sprite image */}
      <KonvaImage
        image={image}
        width={width}
        height={height}
        shadowColor="rgba(0,0,0,0.2)"
        shadowBlur={10}
        shadowOffsetX={3}
        shadowOffsetY={3}
        shadowOpacity={0.3}
      />

      {/* Selection outline */}
      {isSelected && <SelectionOutline width={width} height={height} />}
    </Group>
  );
}

export default ImageObjectShape;
