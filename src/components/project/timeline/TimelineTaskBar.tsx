import React, { useCallback } from "react";
import { Group, Rect, Text as KonvaText, Circle } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import { getTaskColor, darkenHex, BAR_PADDING_Y, ROW_HEIGHT } from "./utils";

interface TimelineTaskBarProps {
  taskId: string;
  title: string;
  status: string;
  progress: number;
  x: number;
  y: number;
  width: number;
  isSelected: boolean;
  isDragging: boolean;
  onDragStart: (taskId: string, evt: KonvaEventObject<DragEvent>) => void;
  onDragMove: (taskId: string, evt: KonvaEventObject<DragEvent>) => void;
  onDragEnd: (taskId: string, evt: KonvaEventObject<DragEvent>) => void;
  onResizeStart: (
    taskId: string,
    side: "left" | "right",
    evt: KonvaEventObject<MouseEvent>
  ) => void;
  onClick: (taskId: string) => void;
}

const BAR_HEIGHT = ROW_HEIGHT - BAR_PADDING_Y * 2;
const CORNER_RADIUS = 6;
const RESIZE_HANDLE_WIDTH = 8;
const GRIP_DOT_RADIUS = 1.5;

const TimelineTaskBarComponent: React.FC<TimelineTaskBarProps> = ({
  taskId,
  title,
  status,
  progress,
  x,
  y,
  width,
  isSelected,
  isDragging,
  onDragStart,
  onDragMove,
  onDragEnd,
  onResizeStart,
  onClick,
}) => {
  const barY = y + BAR_PADDING_Y;
  const color = getTaskColor(status);
  const progressWidth = Math.max(0, (width * (progress || 0)) / 100);
  const progressColor = darkenHex(color, 0.15);

  const handleClick = useCallback(() => {
    onClick(taskId);
  }, [onClick, taskId]);

  const handleDragStart = useCallback(
    (evt: KonvaEventObject<DragEvent>) => onDragStart(taskId, evt),
    [onDragStart, taskId]
  );
  const handleDragMove = useCallback(
    (evt: KonvaEventObject<DragEvent>) => onDragMove(taskId, evt),
    [onDragMove, taskId]
  );
  const handleDragEnd = useCallback(
    (evt: KonvaEventObject<DragEvent>) => onDragEnd(taskId, evt),
    [onDragEnd, taskId]
  );

  const handleResizeLeft = useCallback(
    (evt: KonvaEventObject<MouseEvent>) => {
      evt.cancelBubble = true;
      onResizeStart(taskId, "left", evt);
    },
    [onResizeStart, taskId]
  );

  const handleResizeRight = useCallback(
    (evt: KonvaEventObject<MouseEvent>) => {
      evt.cancelBubble = true;
      onResizeStart(taskId, "right", evt);
    },
    [onResizeStart, taskId]
  );

  // GripVertical dots (2 columns x 3 rows of small circles)
  const gripDots: React.ReactNode[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      gripDots.push(
        <Circle
          key={`grip-${row}-${col}`}
          x={10 + col * 5}
          y={BAR_HEIGHT / 2 - 6 + row * 6}
          radius={GRIP_DOT_RADIUS}
          fill="rgba(255,255,255,0.6)"
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    }
  }

  return (
    <Group
      x={x}
      y={barY}
      draggable
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
    >
      {/* Selection highlight */}
      {isSelected && (
        <Rect
          x={-2}
          y={-2}
          width={width + 4}
          height={BAR_HEIGHT + 4}
          cornerRadius={CORNER_RADIUS + 2}
          stroke="#3b82f6"
          strokeWidth={2}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* Background bar */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={BAR_HEIGHT}
        cornerRadius={CORNER_RADIUS}
        fill={color}
        opacity={isDragging ? 0.7 : 1}
        shadowColor="rgba(0,0,0,0.15)"
        shadowBlur={isDragging ? 8 : 2}
        shadowOffsetY={isDragging ? 4 : 1}
        perfectDrawEnabled={false}
      />

      {/* Progress overlay */}
      {progressWidth > 0 && (
        <Rect
          x={0}
          y={0}
          width={progressWidth}
          height={BAR_HEIGHT}
          cornerRadius={CORNER_RADIUS}
          fill={progressColor}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* Grip dots */}
      {gripDots}

      {/* Title text */}
      <KonvaText
        x={24}
        y={BAR_HEIGHT / 2 - 6}
        width={Math.max(0, width - 40)}
        height={14}
        text={title}
        fontSize={12}
        fontStyle="bold"
        fill="#ffffff"
        ellipsis
        wrap="none"
        listening={false}
        perfectDrawEnabled={false}
      />

      {/* Left resize handle */}
      <Rect
        x={0}
        y={0}
        width={RESIZE_HANDLE_WIDTH}
        height={BAR_HEIGHT}
        fill="transparent"
        onMouseDown={handleResizeLeft}
        onTouchStart={handleResizeLeft as unknown as (evt: KonvaEventObject<TouchEvent>) => void}
      />

      {/* Right resize handle */}
      <Rect
        x={width - RESIZE_HANDLE_WIDTH}
        y={0}
        width={RESIZE_HANDLE_WIDTH}
        height={BAR_HEIGHT}
        fill="transparent"
        onMouseDown={handleResizeRight}
        onTouchStart={handleResizeRight as unknown as (evt: KonvaEventObject<TouchEvent>) => void}
      />
    </Group>
  );
};

export const TimelineTaskBar = React.memo(TimelineTaskBarComponent);
