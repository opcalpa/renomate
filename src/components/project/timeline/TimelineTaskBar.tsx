import React, { useCallback, useRef } from "react";
import { Group, Rect, Text as KonvaText, Circle } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import {
  getTaskColor,
  darkenHex,
  lightenHex,
  BAR_PADDING_Y,
  ROW_HEIGHT,
} from "./utils";
import { useTimelineStore } from "./store";

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
  assigneeInitial?: string;
  roomName?: string;
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
const CLICK_THRESHOLD = 8;

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
  assigneeInitial,
  roomName,
}) => {
  const barY = y + BAR_PADDING_Y;
  const color = getTaskColor(status);
  const progressWidth = Math.max(0, (width * (progress || 0)) / 100);
  const progressColor = darkenHex(color, 0.15);
  const hoverColor = lightenHex(color, 0.08);

  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);

  const setCursor = useCallback((cursor: string) => {
    const container = document.querySelector(
      ".konva-timeline-canvas"
    ) as HTMLElement | null;
    if (container) container.style.cursor = cursor;
  }, []);

  const handleMouseEnter = useCallback(
    (evt: KonvaEventObject<MouseEvent>) => {
      const stage = evt.target.getStage();
      if (!stage) return;
      // Check if near resize handles
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const relX = pointer.x - x;
      if (relX < RESIZE_HANDLE_WIDTH || relX > width - RESIZE_HANDLE_WIDTH) {
        setCursor("ew-resize");
      } else {
        setCursor("grab");
      }

      // Set hover state with delay handled by parent
      const store = useTimelineStore.getState();
      store.setHover(taskId, { x: pointer.x, y: pointer.y });
    },
    [taskId, x, width, setCursor]
  );

  const handleMouseMove = useCallback(
    (evt: KonvaEventObject<MouseEvent>) => {
      const stage = evt.target.getStage();
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const relX = pointer.x - x;
      if (relX < RESIZE_HANDLE_WIDTH || relX > width - RESIZE_HANDLE_WIDTH) {
        setCursor("ew-resize");
      } else {
        setCursor(isDragging ? "grabbing" : "grab");
      }
    },
    [x, width, isDragging, setCursor]
  );

  const handleMouseLeave = useCallback(() => {
    setCursor("default");
    useTimelineStore.getState().clearHover();
  }, [setCursor]);

  const handleDragStart = useCallback(
    (evt: KonvaEventObject<DragEvent>) => {
      const stage = evt.target.getStage();
      const pointer = stage?.getPointerPosition();
      dragStartPos.current = pointer
        ? { x: pointer.x, y: pointer.y }
        : null;
      didDrag.current = false;
      setCursor("grabbing");
      onDragStart(taskId, evt);
    },
    [onDragStart, taskId, setCursor]
  );

  const handleDragMove = useCallback(
    (evt: KonvaEventObject<DragEvent>) => {
      const stage = evt.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (pointer && dragStartPos.current) {
        const dx = Math.abs(pointer.x - dragStartPos.current.x);
        const dy = Math.abs(pointer.y - dragStartPos.current.y);
        if (dx > CLICK_THRESHOLD || dy > CLICK_THRESHOLD) {
          didDrag.current = true;
        }
      }
      onDragMove(taskId, evt);
    },
    [onDragMove, taskId]
  );

  const handleDragEnd = useCallback(
    (evt: KonvaEventObject<DragEvent>) => {
      setCursor("grab");
      if (didDrag.current) {
        onDragEnd(taskId, evt);
      }
      dragStartPos.current = null;
      // Delay resetting didDrag so onClick/onTap can check it
      setTimeout(() => { didDrag.current = false; }, 50);
    },
    [onDragEnd, taskId, setCursor]
  );

  // Click/tap handler — fires on mouseup/touchend without drag movement
  const handleClick = useCallback(() => {
    // Skip if a drag just happened (didDrag stays true for 50ms after dragEnd)
    if (didDrag.current) return;
    onClick(taskId);
  }, [onClick, taskId]);

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

  // GripVertical dots (2 columns x 3 rows)
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
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
        fill={isDragging ? hoverColor : color}
        opacity={isDragging ? 0.85 : 1}
        shadowColor="rgba(0,0,0,0.15)"
        shadowBlur={isDragging ? 8 : 2}
        shadowOffsetY={isDragging ? 4 : 1}
        perfectDrawEnabled={false}
      />

      {/* Progress overlay (white semi-transparent) */}
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

      {/* Assignee initial circle (right side) */}
      {assigneeInitial && width > 60 && (
        <>
          <Circle
            x={width - 18}
            y={BAR_HEIGHT / 2}
            radius={10}
            fill="rgba(255,255,255,0.25)"
            listening={false}
            perfectDrawEnabled={false}
          />
          <KonvaText
            x={width - 25}
            y={BAR_HEIGHT / 2 - 5}
            width={14}
            text={assigneeInitial}
            fontSize={9}
            fontStyle="bold"
            fill="#ffffff"
            align="center"
            listening={false}
            perfectDrawEnabled={false}
          />
        </>
      )}

      {/* Title text */}
      <KonvaText
        x={24}
        y={roomName && width > 80 ? BAR_HEIGHT / 2 - 11 : BAR_HEIGHT / 2 - 6}
        width={Math.max(0, width - (assigneeInitial && width > 60 ? 56 : 32))}
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

      {/* Room name subtitle (if enough space) */}
      {roomName && width > 80 && (
        <KonvaText
          x={24}
          y={BAR_HEIGHT / 2 + 2}
          width={Math.max(0, width - (assigneeInitial && width > 60 ? 56 : 32))}
          height={11}
          text={roomName}
          fontSize={9}
          fill="rgba(255,255,255,0.7)"
          ellipsis
          wrap="none"
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* Progress % text (if enough room and no room name) */}
      {progress > 0 && width > 100 && !roomName && (
        <KonvaText
          x={width - (assigneeInitial ? 50 : 38)}
          y={BAR_HEIGHT / 2 - 5}
          width={30}
          text={`${Math.round(progress)}%`}
          fontSize={10}
          fill="rgba(255,255,255,0.8)"
          align="right"
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* Left resize handle */}
      <Rect
        x={0}
        y={0}
        width={RESIZE_HANDLE_WIDTH}
        height={BAR_HEIGHT}
        fill="transparent"
        onMouseDown={handleResizeLeft}
        onTouchStart={
          handleResizeLeft as unknown as (
            evt: KonvaEventObject<TouchEvent>
          ) => void
        }
      />

      {/* Right resize handle */}
      <Rect
        x={width - RESIZE_HANDLE_WIDTH}
        y={0}
        width={RESIZE_HANDLE_WIDTH}
        height={BAR_HEIGHT}
        fill="transparent"
        onMouseDown={handleResizeRight}
        onTouchStart={
          handleResizeRight as unknown as (
            evt: KonvaEventObject<TouchEvent>
          ) => void
        }
      />
    </Group>
  );
};

export const TimelineTaskBar = React.memo(TimelineTaskBarComponent);
