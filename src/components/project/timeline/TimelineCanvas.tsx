import React, { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { Stage, Layer, Rect, Text as KonvaText, Group } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import {
  parseISO,
  differenceInDays,
  addDays,
  format,
} from "date-fns";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TimelineGrid } from "./TimelineGrid";
import { TimelineTaskBar } from "./TimelineTaskBar";
import { TimelineDependencyArrows } from "./TimelineDependencyArrows";
import { useTimelineStore } from "./store";
import type {
  TimelineTask,
  TimelineDependency,
  GroupRow,
  TaskPosition,
} from "./types";
import {
  dateToX,
  xToDate,
  ROW_HEIGHT,
  MIN_BAR_WIDTH,
  getDownstreamTasks,
} from "./utils";

interface TimelineCanvasProps {
  tasks: TimelineTask[];
  allTasks: TimelineTask[];
  dependencies: TimelineDependency[];
  rows: GroupRow[];
  totalRows: number;
  originDate: Date;
  daysToRender: number;
  onTaskClick: (taskId: string) => void;
  onRefetch: () => void;
}

const GROUP_HEADER_BG = "#f1f5f9";
const GROUP_HEADER_TEXT = "#475569";

const TimelineCanvasComponent: React.FC<TimelineCanvasProps> = ({
  tasks,
  allTasks,
  dependencies,
  rows,
  totalRows,
  originDate,
  daysToRender,
  onTaskClick,
  onRefetch,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(800);
  const stageHeight = Math.max(totalRows * ROW_HEIGHT + 20, 200);

  const { panX, panY, pixelsPerDay, dragState } = useTimelineStore();

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
  const handleWheel = useCallback(
    (evt: KonvaEventObject<WheelEvent>) => {
      evt.evt.preventDefault();
      const store = useTimelineStore.getState();

      if (evt.evt.ctrlKey || evt.evt.metaKey) {
        const pointer = evt.target.getStage()?.getPointerPosition();
        const anchorX = pointer?.x ?? stageWidth / 2;
        const zoomFactor = evt.evt.deltaY > 0 ? 0.9 : 1.1;
        store.setZoom(store.pixelsPerDay * zoomFactor, anchorX);
      } else {
        const dx = evt.evt.deltaX || evt.evt.deltaY;
        store.setPan(store.panX - dx, store.panY);
      }
    },
    [stageWidth]
  );

  // Build task positions for dependency arrows
  const taskPositions = useMemo(() => {
    const map = new Map<string, TaskPosition>();
    for (const row of rows) {
      if (row.type !== "task" || !row.task) continue;
      const task = row.task;
      if (!task.start_date || !task.finish_date) continue;

      const startDate = parseISO(task.start_date);
      const endDate = parseISO(task.finish_date);
      const xPos = dateToX(startDate, originDate, pixelsPerDay, panX);
      const days = Math.max(1, differenceInDays(endDate, startDate) + 1);
      const w = Math.max(MIN_BAR_WIDTH, days * pixelsPerDay);
      const yPos = row.rowIndex * ROW_HEIGHT;

      map.set(task.id, { x: xPos, y: yPos, width: w, taskId: task.id });
    }
    return map;
  }, [rows, originDate, pixelsPerDay, panX]);

  // Drag handlers
  const handleDragStart = useCallback(
    (_taskId: string, evt: KonvaEventObject<DragEvent>) => {
      const node = evt.target;
      node.y(node.y());
    },
    []
  );

  const handleDragMove = useCallback(
    (taskId: string, evt: KonvaEventObject<DragEvent>) => {
      const node = evt.target;
      const row = rows.find((r) => r.task?.id === taskId);
      if (row) {
        node.y(row.rowIndex * ROW_HEIGHT + 8);
      }
    },
    [rows]
  );

  // Save dates on drag end
  const handleDragEnd = useCallback(
    async (taskId: string, evt: KonvaEventObject<DragEvent>) => {
      const node = evt.target;
      const store = useTimelineStore.getState();

      // Calculate new start date from node position
      const newX = node.x();
      const newStartDate = xToDate(
        newX,
        originDate,
        store.pixelsPerDay,
        store.panX
      );

      const task = tasks.find((tt) => tt.id === taskId);
      if (!task?.start_date || !task?.finish_date) return;

      const origStart = parseISO(task.start_date);
      const origEnd = parseISO(task.finish_date);
      const duration = differenceInDays(origEnd, origStart);
      const newFinishDate = addDays(newStartDate, duration);

      const newStartStr = format(newStartDate, "yyyy-MM-dd");
      const newFinishStr = format(newFinishDate, "yyyy-MM-dd");

      // Skip if no change
      if (newStartStr === task.start_date && newFinishStr === task.finish_date) {
        return;
      }

      try {
        const { error } = await supabase
          .from("tasks")
          .update({ start_date: newStartStr, finish_date: newFinishStr })
          .eq("id", taskId);
        if (error) throw error;

        // Cascade dependent tasks
        const delta = differenceInDays(newStartDate, origStart);
        let cascadedCount = 0;
        if (delta !== 0) {
          const downstreamIds = getDownstreamTasks(taskId, dependencies);
          for (const dt of allTasks.filter((tt) =>
            downstreamIds.includes(tt.id)
          )) {
            if (dt.start_date && dt.finish_date) {
              const { error: ce } = await supabase
                .from("tasks")
                .update({
                  start_date: format(
                    addDays(parseISO(dt.start_date), delta),
                    "yyyy-MM-dd"
                  ),
                  finish_date: format(
                    addDays(parseISO(dt.finish_date), delta),
                    "yyyy-MM-dd"
                  ),
                })
                .eq("id", dt.id);
              if (!ce) cascadedCount++;
            }
          }
        }

        toast({
          title: t("timeline.taskRescheduled", "Task rescheduled"),
          description:
            cascadedCount > 0
              ? `${task.title} → ${format(newStartDate, "MMM d")}. ${t("timeline.dependenciesCascaded", "Also moved {{count}} dependent task(s)", { count: cascadedCount })}`
              : `${task.title} → ${format(newStartDate, "MMM d, yyyy")}`,
        });

        onRefetch();
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    },
    [tasks, allTasks, dependencies, originDate, onRefetch, toast, t]
  );

  const handleResizeStart = useCallback(
    (
      _taskId: string,
      _side: "left" | "right",
      _evt: KonvaEventObject<MouseEvent>
    ) => {
      // Resize implementation - would need pointer tracking
      // For now, log intent
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden konva-timeline-canvas"
    >
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
