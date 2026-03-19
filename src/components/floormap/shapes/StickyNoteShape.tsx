/**
 * StickyNoteShape - Renders sticky note annotation shapes on the canvas.
 * Yellow card with fold corner. Double-click to edit text.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { Rect, Text as KonvaText, Group, Transformer, Line } from 'react-konva';
import Konva from 'konva';
import { ShapeComponentProps } from './types';
import { createUnifiedDragHandlers } from '../canvas/utils';
import { TextCoordinates } from '../types';

const FOLD_SIZE = 14;
const DEFAULT_W = 200;
const DEFAULT_H = 150;

export const StickyNoteShape = React.memo<ShapeComponentProps & { onEdit?: (shape: any) => void }>(
  ({ shape, isSelected, onSelect, onTransform, shapeRefsMap, onEdit }) => {
    const groupRef = useRef<Konva.Group>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const dragHandlers = createUnifiedDragHandlers(shape.id);

    useEffect(() => {
      if (groupRef.current && shapeRefsMap) {
        shapeRefsMap.set(shape.id, groupRef.current);
        return () => { shapeRefsMap.delete(shape.id); };
      }
    }, [shape.id, shapeRefsMap]);

    useEffect(() => {
      if (isSelected && transformerRef.current && groupRef.current) {
        transformerRef.current.nodes([groupRef.current]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    }, [isSelected]);

    const handleTransformEnd = useCallback(() => {
      const node = groupRef.current;
      if (!node) return;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const coords = shape.coordinates as TextCoordinates;
      const newW = Math.max(80, (coords.width || DEFAULT_W) * scaleX);
      const newH = Math.max(60, (coords.height || DEFAULT_H) * scaleY);
      node.scaleX(1);
      node.scaleY(1);
      onTransform({
        coordinates: { ...coords, x: node.x(), y: node.y(), width: newW, height: newH },
        rotation: node.rotation(),
      });
    }, [onTransform, shape.coordinates]);

    if (shape.type !== 'sticky_note') return null;

    const coords = shape.coordinates as TextCoordinates;
    const w = coords.width || DEFAULT_W;
    const h = coords.height || DEFAULT_H;
    const text = shape.text || '';
    const isLocked = shape.locked ?? false;

    return (
      <>
        <Group
          ref={groupRef}
          id={`shape-${shape.id}`}
          name={shape.id}
          x={coords.x}
          y={coords.y}
          rotation={shape.rotation || 0}
          draggable={!isLocked}
          onClick={(e) => { e.cancelBubble = true; onSelect(e); }}
          onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
          onDblClick={() => { if (onEdit) onEdit(shape); }}
          onDblTap={() => { if (onEdit) onEdit(shape); }}
          onDragStart={dragHandlers.onDragStart}
          onDragMove={dragHandlers.onDragMove}
          onDragEnd={dragHandlers.onDragEnd}
          onTransformEnd={handleTransformEnd}
        >
          {/* Drop shadow */}
          <Rect x={3} y={3} width={w} height={h} fill="rgba(0,0,0,0.12)" cornerRadius={2} listening={false} />
          {/* Body */}
          <Rect
            width={w}
            height={h}
            fill="#fef3c7"
            stroke={isSelected ? '#f59e0b' : '#fbbf24'}
            strokeWidth={isSelected ? 2 : 1}
            cornerRadius={2}
          />
          {/* Folded corner */}
          <Line
            points={[w - FOLD_SIZE, 0, w, FOLD_SIZE]}
            stroke="#fbbf24"
            strokeWidth={1}
            listening={false}
          />
          <Line
            points={[w - FOLD_SIZE, 0, w - FOLD_SIZE, FOLD_SIZE, w, FOLD_SIZE]}
            closed
            fill="#fde68a"
            stroke="#fbbf24"
            strokeWidth={1}
            listening={false}
          />
          {/* Text content */}
          <KonvaText
            x={8}
            y={8}
            width={w - 16}
            height={h - 16}
            text={text || '...'}
            fontSize={13}
            fontFamily="'Inter', system-ui, sans-serif"
            fill={text ? '#1c1917' : '#a8a29e'}
            wrap="word"
            ellipsis
            listening={false}
          />
        </Group>

        {isSelected && !isLocked && (
          <Transformer
            ref={transformerRef}
            rotateEnabled
            keepRatio={false}
            borderStroke="#f59e0b"
            borderStrokeWidth={2}
            anchorStroke="#f59e0b"
            anchorFill="white"
            anchorSize={8}
            anchorCornerRadius={2}
          />
        )}
      </>
    );
  },
  (prev, next) =>
    prev.shape.id === next.shape.id &&
    prev.isSelected === next.isSelected &&
    prev.shape.coordinates === next.shape.coordinates &&
    prev.shape.text === next.shape.text &&
    prev.shape.rotation === next.shape.rotation &&
    prev.shape.locked === next.shape.locked &&
    prev.onEdit === next.onEdit
);

StickyNoteShape.displayName = 'StickyNoteShape';
