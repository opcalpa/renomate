/**
 * Library Shape Components
 *
 * Renders library symbols and JSON-based objects from the object library.
 * Supports wall attachment with IKEA-style floor/elevation sync.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { Group, Line, Circle, Rect } from 'react-konva';
import Konva from 'konva';
import { useFloorMapStore } from '../store';
import { ShapeComponentProps } from './types';
import { getSymbolComponent, ArchSymbolType } from '../SymbolLibrary';
import { getObjectById } from '../ObjectRenderer';
import { createUnifiedDragHandlers } from '../canvas/utils';
import { shouldAttachToWall } from '../canvas/utils/wallObjectDefaults';

/**
 * LibrarySymbolShape - Renders professional architectural symbols from SymbolLibrary
 * PERFORMANCE: Memoized to prevent unnecessary re-renders
 */
export const LibrarySymbolShape = React.memo<ShapeComponentProps>(({ shape, isSelected, onSelect, onTransform, shapeRefsMap }) => {
  const symbolRef = useRef<Konva.Group>(null);

  // Get unified drag handlers for multi-select support
  const dragHandlers = createUnifiedDragHandlers(shape.id);

  // Store ref in shapeRefsMap for unified multi-select drag
  useEffect(() => {
    if (symbolRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, symbolRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);

  // Only handle shapes that are library symbols
  if (!shape.metadata?.isLibrarySymbol || !shape.metadata?.symbolType) {
    return null;
  }

  const symbolType = shape.metadata.symbolType as ArchSymbolType;
  const SymbolComponent = getSymbolComponent(symbolType);

  if (!SymbolComponent) {
    return null;
  }

  const placementX = shape.metadata.placementX || 0;
  const placementY = shape.metadata.placementY || 0;
  const symbolScale = shape.metadata.scale || 1;
  const symbolRotation = shape.metadata.rotation || 0;

  const isDraggable = true; // Always draggable

  return (
    <Group
      ref={symbolRef}
      id={`shape-${shape.id}`}
      name={shape.id}
      shapeId={shape.id}
      x={placementX}
      y={placementY}
      rotation={symbolRotation}
      scaleX={symbolScale * 0.1} // Scale from 1000mm -> 100px (1:100 scale)
      scaleY={symbolScale * 0.1}
      draggable={isDraggable}
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
      onTransformEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        const rotation = node.rotation();

        // Update scale and rotation
        onTransform({
          metadata: {
            ...shape.metadata,
            scale: (scaleX + scaleY) / 2, // Average scale
            rotation: rotation,
            placementX: node.x(),
            placementY: node.y(),
          }
        });

        // Reset transform (we store it in metadata)
        node.scaleX(symbolScale * 0.1);
        node.scaleY(symbolScale * 0.1);
        node.rotation(rotation);
      }}
    >
      {/* Render the symbol */}
      <SymbolComponent
        x={0}
        y={0}
        strokeColor={isSelected ? '#3b82f6' : '#000000'}
        fillColor="transparent"
        strokeWidth={2}
      />

      {/* Selection highlight */}
      {isSelected && (
        <Rect
          x={-50}
          y={-50}
          width={1100}
          height={1100}
          stroke="#3b82f6"
          strokeWidth={30}
          dash={[50, 30]}
          listening={false}
        />
      )}
    </Group>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.isSelected === nextProps.isSelected &&
    JSON.stringify(prevProps.shape.metadata) === JSON.stringify(nextProps.shape.metadata)
  );
});

/**
 * ObjectLibraryShape - Renders JSON-based objects from ObjectRenderer
 * Supports wall attachment with automatic re-snap on drag.
 * PERFORMANCE: Memoized to prevent unnecessary re-renders
 */
export const ObjectLibraryShape = React.memo<ShapeComponentProps>(({ shape, isSelected, onSelect, onTransform, shapeRefsMap }) => {
  const objectRef = useRef<Konva.Group>(null);

  // Get unified drag handlers for multi-select support
  const dragHandlers = createUnifiedDragHandlers(shape.id);

  // Get store actions for wall snapping
  const snapShapeToWall = useFloorMapStore((state) => state.snapShapeToWall);

  // Store ref in shapeRefsMap for unified multi-select drag
  useEffect(() => {
    if (objectRef.current && shapeRefsMap) {
      shapeRefsMap.set(shape.id, objectRef.current);
      return () => {
        shapeRefsMap.delete(shape.id);
      };
    }
  }, [shape.id, shapeRefsMap]);

  // Only handle shapes that are object library objects
  if (!shape.metadata?.isObjectLibrary || !shape.metadata?.objectId) {
    return null;
  }

  const objectId = shape.metadata.objectId as string;
  const objectDef = getObjectById(objectId);

  if (!objectDef) {
    return null;
  }

  const placementX = shape.metadata.placementX || 0;
  const placementY = shape.metadata.placementY || 0;
  const objectScale = shape.metadata.scale || 1;
  const objectRotation = shape.metadata.rotation || 0;

  // Get scale settings for proper rendering
  const scaleSettings = useFloorMapStore((state) => state.scaleSettings);

  // Check if this object should attach to walls
  const shouldSnap = shouldAttachToWall(
    objectDef.category,
    objectDef.wallMountable,
    objectDef.freestanding
  );

  const isDraggable = true; // Always draggable

  // Custom drag end handler that re-snaps to walls
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    const node = e.target;
    const newX = node.x();
    const newY = node.y();

    // First update the position
    onTransform({
      metadata: {
        ...shape.metadata,
        placementX: newX,
        placementY: newY,
      }
    });

    // Then try to re-snap to nearest wall if applicable
    if (shouldSnap) {
      // Use setTimeout to allow the position update to complete first
      setTimeout(() => {
        snapShapeToWall(shape.id);
      }, 0);
    }

    // Call unified drag handler for multi-select support
    dragHandlers.onDragEnd(e);
  }, [shape.id, shape.metadata, onTransform, shouldSnap, snapShapeToWall, dragHandlers]);

  return (
    <Group
      ref={objectRef}
      id={`shape-${shape.id}`}
      name={shape.id}
      shapeId={shape.id}
      x={placementX}
      y={placementY}
      rotation={objectRotation}
      scaleX={objectScale * scaleSettings.pixelsPerMm}
      scaleY={objectScale * scaleSettings.pixelsPerMm}
      draggable={isDraggable}
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
      onDragEnd={handleDragEnd}
      onTransformEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        const rotation = node.rotation();

        // Update scale and rotation
        onTransform({
          metadata: {
            ...shape.metadata,
            scale: (scaleX + scaleY) / (2 * scaleSettings.pixelsPerMm), // Normalize scale
            rotation: rotation,
            placementX: node.x(),
            placementY: node.y(),
          }
        });

        // Reset transform (we store it in metadata)
        node.scaleX(objectScale * scaleSettings.pixelsPerMm);
        node.scaleY(objectScale * scaleSettings.pixelsPerMm);
        node.rotation(rotation);

        // Re-snap to wall after transform if applicable
        if (shouldSnap) {
          setTimeout(() => {
            snapShapeToWall(shape.id);
          }, 0);
        }
      }}
    >
      {/* Render the object using ObjectRenderer */}
      {objectDef.shapes && objectDef.shapes.map((objShape, idx) => {
        const commonProps = {
          key: `obj-shape-${idx}`,
          listening: false,
        };

        switch (objShape.type) {
          case 'line':
            return (
              <Line
                {...commonProps}
                points={objShape.points}
                stroke={isSelected ? '#3b82f6' : (objShape.stroke || '#000000')}
                strokeWidth={objShape.strokeWidth || 2}
                lineCap="round"
                lineJoin="round"
                dash={objShape.dash}
                opacity={objShape.opacity}
              />
            );

          case 'circle':
            return (
              <Circle
                {...commonProps}
                x={objShape.x}
                y={objShape.y}
                radius={objShape.radius}
                stroke={isSelected ? '#3b82f6' : (objShape.stroke || '#000000')}
                strokeWidth={objShape.strokeWidth || 2}
                fill={objShape.fill}
                opacity={objShape.opacity}
              />
            );

          case 'rect':
            return (
              <Rect
                {...commonProps}
                x={objShape.x}
                y={objShape.y}
                width={objShape.width}
                height={objShape.height}
                stroke={isSelected ? '#3b82f6' : (objShape.stroke || '#000000')}
                strokeWidth={objShape.strokeWidth || 2}
                fill={objShape.fill}
                opacity={objShape.opacity}
              />
            );

          case 'ellipse':
            return (
              <Circle
                {...commonProps}
                x={objShape.x}
                y={objShape.y}
                radiusX={objShape.radiusX}
                radiusY={objShape.radiusY}
                stroke={isSelected ? '#3b82f6' : (objShape.stroke || '#000000')}
                strokeWidth={objShape.strokeWidth || 2}
                fill={objShape.fill}
                opacity={objShape.opacity}
              />
            );

          default:
            return null;
        }
      })}

      {/* Selection highlight */}
      {isSelected && (
        <Rect
          x={-50}
          y={-50}
          width={objectDef.defaultWidth + 100}
          height={objectDef.defaultHeight + 100}
          stroke="#3b82f6"
          strokeWidth={30 / scaleSettings.pixelsPerMm}
          dash={[50 / scaleSettings.pixelsPerMm, 30 / scaleSettings.pixelsPerMm]}
          listening={false}
        />
      )}

      {/* Wall attachment indicator - green dot when attached to wall */}
      {shape.wallRelative && (
        <Circle
          x={objectDef.defaultWidth - 30}
          y={30}
          radius={20}
          fill="#10b981"
          stroke="#ffffff"
          strokeWidth={4}
          listening={false}
        />
      )}
    </Group>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.shape.wallRelative?.wallId === nextProps.shape.wallRelative?.wallId &&
    JSON.stringify(prevProps.shape.metadata) === JSON.stringify(nextProps.shape.metadata)
  );
});
