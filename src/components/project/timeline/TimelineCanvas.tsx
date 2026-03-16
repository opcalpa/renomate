import React, { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { Stage, Layer, Rect, Text as KonvaText, Group } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import { parseISO, differenceInDays, addDays, subDays } from "date-fns";
import { TimelineGrid } from "./TimelineGrid";
import { TimelineTaskBar } from "./TimelineTaskBar";
import { TimelineDependencyArrows } from "./TimelineDependencyArrows";
import { useTimelineStore } from "./store";
import type { TimelineTask, TimelineDependency, GroupRow, TaskPosition } from "./types";
import { dateToX, ROW_HEIGHT, MIN_BAR_WIDTH } from "./utils";

interface TimelineCanvasProps {
  tasks: TimelineTask[];
  dependencies: TimelineDependency[];
  rows: GroupRow[];
  totalRows: number;
  originDate: Date;
  daysToRender: number;
  onTaskClick: (taskId: string) => void;
}

const GROUP_HEADER_BG = "#f1f5f9";
const GROUP_HEADER_TEXT = "#475569";

const TimelineCanvasComponent: React.FC<TimelineCanvasProps> = ({
  tasks,
  dependencies,
  rows,
  totalRows,
  originDate,
  daysToRender,
  onTaskClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(800);
  const stageHeight = Math.max(totalRows * ROW_HEIGHT + 20, 200);

  const { panX, panY, pixelsPerDay, dragState } = useTimelineStore();

  // ResizeObserver for dynamic width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setStageWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Wheel handler: pan + zoom
  const handleWheel = useCallback((evt: KonvaEventObject<WheelEvent>) => {
    evt.evt.preventDefault();
    const store = useTimelineStore.getState();

    if (evt.evt.ctrlKey || evt.evt.metaKey) {
      // Zoom
      const pointer = evt.target.getStage()?.getPointerPosition();
      const anchorX = pointer?.x ?? stageWidth / 2;
      const zoomFactor = evt.evt.deltaY > 0 ? 0.9 : 1.1;
      store.setZoom(store.pixelsPerDay * zoomFactor, anchorX);
    } else {
      // Pan horizontally (both deltaX and deltaY for macOS trackpad)
      const dx = evt.evt.deltaX || evt.evt.deltaY;
      store.setPan(store.panX - dx, store.panY);
    }
  }, [stageWidth]);

  // Build task positions map for dependency arrows
  const taskPositions = useMemo(() => {
    const map = new Map<string, TaskPosition>();
    for (const row of rows) {
      if (row.type !== "task" || !row.task) continue;
      const task = row.task;
      if (!task.start_date || !task.finish_date) continue;

      const startDate = parseISO(task.start_date);
      const endDate = parseISO(task.finish_date);
      const x = dateToX(startDate, originDate, pixelsPerDay, panX);
      const days = Math.max(1, differenceInDays(endDate, startDate) + 1);
      const width = Math.max(MIN_BAR_WIDTH, days * pixelsPerDay);
      const y = row.rowIndex * ROW_HEIGHT;

      map.set(task.id, { x, y, width, taskId: task.id });
    }
    return map;
  }, [rows, originDate, pixelsPerDay, panX]);

  // Drag handlers (placeholder - full implementation in Phase 3)
  const handleDragStart = useCallback(
    (taskId: string, evt: KonvaEventObject<DragEvent>) => {
      const node = evt.target;
      // Constrain to horizontal only
      node.y(node.y());
    },
    []
  );

  const handleDragMove = useCallback(
    (taskId: string, evt: KonvaEventObject<DragEvent>) => {
      const node = evt.target;
      const row = rows.find((r) => r.task?.id === taskId);
      if (row) {
        // Lock Y position
        node.y(row.rowIndex * ROW_HEIGHT + 8); // BAR_PADDING_Y
      }
    },
    [rows]
  );

  const handleDragEnd = useCallback(
    (_taskId: string, _evt: KonvaEventObject<DragEvent>) => {
      // Phase 3: persist date changes
    },
    []
  );

  const handleResizeStart = useCallback(
    (_taskId: string, _side: "left" | "right", _evt: KonvaEventObject<MouseEvent>) => {
      // Phase 3: implement resize
    },
    []
  );

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <Stage
        width={stageWidth}
        height={stageHeight}
        onWheel={handleWheel}
      >
        {/* Grid layer */}
        <Layer listening={false}>
          <TimelineGrid
            originDate={originDate}
            pixelsPerDay={pixelsPerDay}
            panX={panX}
            stageWidth={stageWidth}
            stageHeight={stageHeight}
            daysToRender={daysToRender}
          />
        </Layer>

        {/* Content layer */}
        <Layer>
          {rows.map((row) => {
            if (row.type === "group-header") {
              return (
                <Group key={`gh-${row.groupId}`} listening={false}>
                  <Rect
                    x={0}
                    y={row.rowIndex * ROW_HEIGHT}
                    width={stageWidth}
                    height={ROW_HEIGHT}
                    fill={GROUP_HEADER_BG}
                    perfectDrawEnabled={false}
                  />
                  <KonvaText
                    x={12}
                    y={row.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2 - 7}
                    text={row.groupLabel}
                    fontSize={13}
                    fontStyle="bold"
                    fill={GROUP_HEADER_TEXT}
                  />
                </Group>
              );
            }

            const task = row.task;
            if (!task?.start_date || !task?.finish_date) return null;

            const pos = taskPositions.get(task.id);
            if (!pos) return null;

            return (
              <TimelineTaskBar
                key={task.id}
                taskId={task.id}
                title={task.title}
                status={task.status}
                progress={task.progress}
                x={pos.x}
                y={pos.y}
                width={pos.width}
                isSelected={
                  useTimelineStore.getState().selectedTaskId === task.id
                }
                isDragging={dragState?.taskId === task.id}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onResizeStart={handleResizeStart}
                onClick={onTaskClick}
              />
            );
          })}

          <TimelineDependencyArrows
            dependencies={dependencies}
            taskPositions={taskPositions}
          />
        </Layer>
      </Stage>
    </div>
  );
};

export const TimelineCanvas = React.memo(TimelineCanvasComponent);
