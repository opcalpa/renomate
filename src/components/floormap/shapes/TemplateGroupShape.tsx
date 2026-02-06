/**
 * TemplateGroupShape - Renders grouped template shapes as a single transformable unit
 *
 * This component handles:
 * - Moving all shapes together as one unit
 * - Rotating all shapes around the group center
 * - Scaling all shapes proportionally
 * - Showing dimension labels for the bounding box
 * - Grid snapping for the group as a whole
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { Group, Rect, Line, Circle, Text as KonvaText, Transformer } from 'react-konva';
import Konva from 'konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { FloorMapShape, LineCoordinates, RectangleCoordinates, PolygonCoordinates, SymbolCoordinates } from '../types';

interface TemplateGroupShapeProps {
  shapes: FloorMapShape[];
  groupLeader: FloorMapShape;
  isSelected: boolean;
  /** ID of individually selected shape within the group (after double-click) */
  selectedIndividualId?: string | null;
  onSelect: (evt?: KonvaEventObject<MouseEvent>) => void;
  /** Called when user double-clicks to select individual shape within group */
  onSelectIndividual?: (shapeId: string, evt?: KonvaEventObject<MouseEvent>) => void;
  /** Called when user double-clicks on already-selected individual shape */
  onOpenPropertyPanel?: (shape: FloorMapShape) => void;
  onTransformGroup: (updates: Array<{ id: string; updates: Partial<FloorMapShape> }>) => void;
  pixelsPerMm: number;
  gridSnapSize: number; // in pixels
  snapEnabled: boolean;
  showDimensions: boolean;
}

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

// Helper to format dimension
const formatDim = (valueMM: number): string => {
  if (valueMM >= 1000) {
    return `${(valueMM / 1000).toFixed(2)}m`;
  } else if (valueMM >= 10) {
    return `${(valueMM / 10).toFixed(1)}cm`;
  }
  return `${Math.round(valueMM)}mm`;
};

// Calculate bounding box for all shapes
function calculateBoundingBox(shapes: FloorMapShape[]): BoundingBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const shape of shapes) {
    const coords = shape.coordinates;

    if ('x1' in coords && 'x2' in coords) {
      const c = coords as LineCoordinates;
      minX = Math.min(minX, c.x1, c.x2);
      minY = Math.min(minY, c.y1, c.y2);
      maxX = Math.max(maxX, c.x1, c.x2);
      maxY = Math.max(maxY, c.y1, c.y2);
    } else if ('left' in coords && 'width' in coords) {
      const c = coords as RectangleCoordinates;
      minX = Math.min(minX, c.left);
      minY = Math.min(minY, c.top);
      maxX = Math.max(maxX, c.left + c.width);
      maxY = Math.max(maxY, c.top + c.height);
    } else if ('x' in coords && 'width' in coords) {
      const c = coords as SymbolCoordinates;
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + c.width);
      maxY = Math.max(maxY, c.y + c.height);
    } else if ('points' in coords) {
      const c = coords as PolygonCoordinates;
      for (const p of c.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    } else if ('cx' in coords && 'radius' in coords) {
      const c = coords as { cx: number; cy: number; radius: number };
      minX = Math.min(minX, c.cx - c.radius);
      minY = Math.min(minY, c.cy - c.radius);
      maxX = Math.max(maxX, c.cx + c.radius);
      maxY = Math.max(maxY, c.cy + c.radius);
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

// Transform a point around a center with rotation and scale
function transformPoint(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  rotation: number, // in radians
  scaleX: number,
  scaleY: number,
  translateX: number,
  translateY: number
): { x: number; y: number } {
  // Translate to origin
  let px = x - centerX;
  let py = y - centerY;

  // Scale
  px *= scaleX;
  py *= scaleY;

  // Rotate
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const rx = px * cos - py * sin;
  const ry = px * sin + py * cos;

  // Translate back and add movement
  return {
    x: rx + centerX + translateX,
    y: ry + centerY + translateY,
  };
}

// Apply transformation to a shape's coordinates
function transformShapeCoordinates(
  shape: FloorMapShape,
  centerX: number,
  centerY: number,
  rotation: number,
  scaleX: number,
  scaleY: number,
  translateX: number,
  translateY: number
): FloorMapShape['coordinates'] {
  const coords = shape.coordinates;

  if ('x1' in coords && 'x2' in coords) {
    const c = coords as LineCoordinates;
    const p1 = transformPoint(c.x1, c.y1, centerX, centerY, rotation, scaleX, scaleY, translateX, translateY);
    const p2 = transformPoint(c.x2, c.y2, centerX, centerY, rotation, scaleX, scaleY, translateX, translateY);
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
  }

  if ('left' in coords && 'width' in coords) {
    const c = coords as RectangleCoordinates;
    // Transform all four corners and find new bounding box
    const corners = [
      { x: c.left, y: c.top },
      { x: c.left + c.width, y: c.top },
      { x: c.left + c.width, y: c.top + c.height },
      { x: c.left, y: c.top + c.height },
    ];
    const transformed = corners.map(corner =>
      transformPoint(corner.x, corner.y, centerX, centerY, rotation, scaleX, scaleY, translateX, translateY)
    );
    const newMinX = Math.min(...transformed.map(p => p.x));
    const newMinY = Math.min(...transformed.map(p => p.y));
    const newMaxX = Math.max(...transformed.map(p => p.x));
    const newMaxY = Math.max(...transformed.map(p => p.y));

    return {
      left: newMinX,
      top: newMinY,
      width: newMaxX - newMinX,
      height: newMaxY - newMinY,
    };
  }

  if ('x' in coords && 'width' in coords) {
    const c = coords as SymbolCoordinates;
    const center = transformPoint(c.x + c.width / 2, c.y + c.height / 2, centerX, centerY, rotation, scaleX, scaleY, translateX, translateY);
    const newWidth = c.width * scaleX;
    const newHeight = c.height * scaleY;
    return {
      x: center.x - newWidth / 2,
      y: center.y - newHeight / 2,
      width: newWidth,
      height: newHeight,
    };
  }

  if ('points' in coords) {
    const c = coords as PolygonCoordinates;
    return {
      points: c.points.map(p =>
        transformPoint(p.x, p.y, centerX, centerY, rotation, scaleX, scaleY, translateX, translateY)
      ),
    };
  }

  if ('cx' in coords && 'radius' in coords) {
    const c = coords as { cx: number; cy: number; radius: number };
    const newCenter = transformPoint(c.cx, c.cy, centerX, centerY, rotation, scaleX, scaleY, translateX, translateY);
    // For circles, use average scale for radius
    const avgScale = (scaleX + scaleY) / 2;
    return {
      cx: newCenter.x,
      cy: newCenter.y,
      radius: c.radius * avgScale,
    };
  }

  return coords;
}

export const TemplateGroupShape: React.FC<TemplateGroupShapeProps> = ({
  shapes,
  groupLeader,
  isSelected,
  selectedIndividualId,
  onSelect,
  onSelectIndividual,
  onOpenPropertyPanel,
  onTransformGroup,
  pixelsPerMm,
  gridSnapSize,
  snapEnabled,
  showDimensions,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Track initial bounding box for transforms (use ref for synchronous access)
  const initialBoundsRef = useRef<BoundingBox | null>(null);

  // Calculate current bounding box
  const bounds = useMemo(() => calculateBoundingBox(shapes), [shapes]);

  // Calculate bounding box for a single shape (for hit detection)
  const getShapeBounds = useCallback((shape: FloorMapShape): BoundingBox => {
    return calculateBoundingBox([shape]);
  }, []);

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && groupRef.current) {
      transformerRef.current.nodes([groupRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [isSelected]);

  // Handle drag start
  const handleDragStart = useCallback(() => {
    initialBoundsRef.current = bounds;
  }, [bounds]);

  // Handle drag end - update all shape coordinates
  const handleDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    let deltaX = node.x();
    let deltaY = node.y();

    // Apply grid snap
    if (snapEnabled && gridSnapSize > 0) {
      deltaX = Math.round(deltaX / gridSnapSize) * gridSnapSize;
      deltaY = Math.round(deltaY / gridSnapSize) * gridSnapSize;
    }

    // Reset node position (we'll update coordinates in store)
    node.position({ x: 0, y: 0 });

    if (deltaX === 0 && deltaY === 0) return;

    // Build updates for all shapes
    const updates = shapes.map(shape => {
      const newCoords = transformShapeCoordinates(
        shape,
        bounds.centerX,
        bounds.centerY,
        0, // no rotation
        1, // no scale
        1,
        deltaX,
        deltaY
      );
      return { id: shape.id, updates: { coordinates: newCoords } };
    });

    onTransformGroup(updates);
  }, [shapes, bounds, snapEnabled, gridSnapSize, onTransformGroup]);

  // Handle transform end (rotation/scale) - called by Transformer
  const handleTransformEnd = useCallback(() => {
    const node = groupRef.current;
    const initialBounds = initialBoundsRef.current;

    if (!node) {
      console.error('TemplateGroupShape: No group ref on transform end');
      return;
    }

    // Use current bounds if initialBounds wasn't set
    const boundsToUse = initialBounds || bounds;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotationDeg = node.rotation();
    const rotation = rotationDeg * (Math.PI / 180); // Convert to radians

    // IMPORTANT: Konva's Transformer changes the Group's x/y position to compensate
    // for rotation around (0,0). Since we rotate around bounds center ourselves,
    // we should NOT use node.x()/y() as translation - it causes shapes to fly away.
    // Only use x/y for actual drag movements (handled in handleDragEnd).

    // Reset node transform first (IMPORTANT: do this before checking for no change)
    node.scaleX(1);
    node.scaleY(1);
    node.rotation(0);
    node.position({ x: 0, y: 0 });

    // If no actual change, skip
    if (Math.abs(scaleX - 1) < 0.001 && Math.abs(scaleY - 1) < 0.001 &&
        Math.abs(rotation) < 0.001) {
      initialBoundsRef.current = null;
      return;
    }

    // Validate bounds
    if (!isFinite(boundsToUse.centerX) || !isFinite(boundsToUse.centerY)) {
      console.error('Invalid bounds center:', boundsToUse);
      initialBoundsRef.current = null;
      return;
    }

    // Build updates for all shapes
    // Do NOT pass nodeX/nodeY as translation - rotation around center doesn't need position offset
    const updates = shapes.map(shape => {
      const newCoords = transformShapeCoordinates(
        shape,
        boundsToUse.centerX,
        boundsToUse.centerY,
        rotation,
        scaleX,
        scaleY,
        0, // No translation for rotation/scale transforms
        0  // Translation is handled separately in handleDragEnd
      );

      // Validate new coordinates
      const coordValues = Object.values(newCoords).flat();
      const hasInvalidCoord = coordValues.some(v =>
        typeof v === 'number' && (!isFinite(v) || isNaN(v))
      );
      if (hasInvalidCoord) {
        console.error('Invalid coordinates calculated for shape:', shape.id, newCoords);
        // Return original coordinates to prevent data loss
        return { id: shape.id, updates: {} };
      }

      // Update templateInfo bounds on group leader
      const shapeUpdates: Partial<FloorMapShape> = { coordinates: newCoords };
      if (shape.isGroupLeader && shape.templateInfo) {
        shapeUpdates.templateInfo = {
          ...shape.templateInfo,
          boundsWidth: shape.templateInfo.boundsWidth * scaleX,
          boundsHeight: shape.templateInfo.boundsHeight * scaleY,
        };
      }

      return { id: shape.id, updates: shapeUpdates };
    });

    onTransformGroup(updates);
    initialBoundsRef.current = null;
  }, [shapes, bounds, onTransformGroup]);

  // Handle transform start - called by Transformer
  const handleTransformStart = useCallback(() => {
    initialBoundsRef.current = bounds;
  }, [bounds]);

  // Handle double-click to select individual shape or open property panel
  const handleDoubleClick = useCallback((evt: KonvaEventObject<MouseEvent>) => {
    if (!isSelected) return; // Only handle double-click when group is already selected

    evt.cancelBubble = true;

    // Get click position in stage coordinates
    const stage = evt.target.getStage();
    if (!stage) return;

    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    // Convert to group-local coordinates (accounting for Group position if any)
    const groupNode = groupRef.current;
    if (!groupNode) return;

    const transform = groupNode.getAbsoluteTransform().copy().invert();
    const localPos = transform.point(pointerPos);

    // Find which shape was clicked by checking bounds
    let clickedShape: FloorMapShape | null = null;
    for (const shape of shapes) {
      const shapeBounds = getShapeBounds(shape);
      // Add some padding for easier clicking
      const padding = 5;
      if (
        localPos.x >= shapeBounds.minX - padding &&
        localPos.x <= shapeBounds.maxX + padding &&
        localPos.y >= shapeBounds.minY - padding &&
        localPos.y <= shapeBounds.maxY + padding
      ) {
        clickedShape = shape;
        break;
      }
    }

    if (!clickedShape) return;

    // If this shape is already individually selected, open property panel
    if (selectedIndividualId === clickedShape.id) {
      onOpenPropertyPanel?.(clickedShape);
    } else {
      // Select this individual shape
      onSelectIndividual?.(clickedShape.id, evt);
    }
  }, [isSelected, shapes, getShapeBounds, selectedIndividualId, onSelectIndividual, onOpenPropertyPanel]);

  // Render individual shape within the group
  const renderShape = (shape: FloorMapShape) => {
    const coords = shape.coordinates;
    const isIndividuallySelected = selectedIndividualId === shape.id;
    // Highlight individually selected shape with different stroke
    const stroke = isIndividuallySelected ? '#f59e0b' : (shape.strokeColor || '#374151');
    const fill = shape.color || 'transparent';
    const strokeWidth = isIndividuallySelected ? (shape.strokeWidth || 2) + 1 : (shape.strokeWidth || 2);

    if ('x1' in coords && 'x2' in coords) {
      const c = coords as LineCoordinates;
      return (
        <Line
          key={shape.id}
          points={[c.x1, c.y1, c.x2, c.y2]}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
        />
      );
    }

    if ('left' in coords && 'width' in coords) {
      const c = coords as RectangleCoordinates;
      return (
        <Rect
          key={shape.id}
          x={c.left}
          y={c.top}
          width={c.width}
          height={c.height}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill !== 'transparent' ? fill : undefined}
        />
      );
    }

    if ('x' in coords && 'width' in coords && !('radius' in coords)) {
      const c = coords as SymbolCoordinates;
      return (
        <Rect
          key={shape.id}
          x={c.x}
          y={c.y}
          width={c.width}
          height={c.height}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill !== 'transparent' ? fill : undefined}
        />
      );
    }

    if ('points' in coords) {
      const c = coords as PolygonCoordinates;
      const flatPoints = c.points.flatMap(p => [p.x, p.y]);
      return (
        <Line
          key={shape.id}
          points={flatPoints}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill !== 'transparent' ? fill : undefined}
          closed={shape.type === 'room' || shape.type === 'polygon'}
        />
      );
    }

    if ('cx' in coords && 'radius' in coords) {
      const c = coords as { cx: number; cy: number; radius: number };
      return (
        <Circle
          key={shape.id}
          x={c.cx}
          y={c.cy}
          radius={c.radius}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill !== 'transparent' ? fill : undefined}
        />
      );
    }

    return null;
  };

  // Dimension label for width/height
  const widthMM = bounds.width / pixelsPerMm;
  const heightMM = bounds.height / pixelsPerMm;

  // Don't show group selection box if individual shape is selected
  const showGroupSelection = isSelected && !selectedIndividualId;

  return (
    <>
      <Group
        ref={groupRef}
        draggable={!selectedIndividualId} // Disable group drag when individual shape is selected
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={handleDoubleClick}
        onDblTap={handleDoubleClick}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Selection/hover bounding box - hidden when individual shape selected */}
        <Rect
          x={bounds.minX - 5}
          y={bounds.minY - 5}
          width={bounds.width + 10}
          height={bounds.height + 10}
          stroke={showGroupSelection ? '#3b82f6' : 'transparent'}
          strokeWidth={showGroupSelection ? 2 : 0}
          dash={[8, 4]}
          fill={showGroupSelection ? 'rgba(59, 130, 246, 0.05)' : 'transparent'}
          listening={false}
        />

        {/* Render all shapes in the group */}
        {shapes.map(renderShape)}

        {/* Dimension labels when selected */}
        {isSelected && showDimensions && (
          <>
            {/* Width label (top) */}
            <KonvaText
              x={bounds.centerX - 30}
              y={bounds.minY - 25}
              text={formatDim(widthMM)}
              fontSize={12}
              fontStyle="bold"
              fill="#3b82f6"
              align="center"
            />
            {/* Height label (right) */}
            <KonvaText
              x={bounds.maxX + 10}
              y={bounds.centerY - 6}
              text={formatDim(heightMM)}
              fontSize={12}
              fontStyle="bold"
              fill="#3b82f6"
            />
            {/* Template name label */}
            {groupLeader.templateInfo?.templateName && (
              <KonvaText
                x={bounds.centerX - 40}
                y={bounds.maxY + 10}
                text={groupLeader.templateInfo.templateName}
                fontSize={11}
                fill="#6b7280"
                align="center"
              />
            )}
          </>
        )}
      </Group>

      {/* Transformer for rotation and scaling - hidden when individual shape selected */}
      {showGroupSelection && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={true}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit minimum size
            if (newBox.width < 20 || newBox.height < 20) {
              return oldBox;
            }
            return newBox;
          }}
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          rotationSnapTolerance={5}
          onTransformStart={handleTransformStart}
          onTransformEnd={handleTransformEnd}
        />
      )}
    </>
  );
};
