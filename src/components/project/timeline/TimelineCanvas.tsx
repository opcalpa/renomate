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
  projectStartDate?: string | null;
  projectFinishDate?: string | null;
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
  projectStartDate,
  projectFinishDate,
  onTaskClick,
  onRefetch,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(800);

  const { panX, panY, pixelsPerDay, dragState } = useTimelineStore();

  // Dynamic height: count rows whose tasks are visible in the current viewport
  const MIN_VISIBLE_ROWS = 4;
  const stageHeight = useMemo(() => {
    const visibleStart = xToDate(0, originDate, pixelsPerDay, panX);
    const visibleEnd = xToDate(stageWidth, originDate, pixelsPerDay, panX);
    const visibleGroupIds = new Set<string>();
    let visibleTaskRows = 0;
    for (const row of rows) {
      if (row.type === "task" && row.task?.start_date && row.task?.finish_date) {
        const start = parseISO(row.task.start_date);
        const end = parseISO(row.task.finish_date);
        if (start <= visibleEnd && end >= visibleStart) {
          visibleTaskRows++;
          if (row.groupId) visibleGroupIds.add(row.groupId);
        }
      }
    }
    const visibleGroupHeaders = rows.filter(
      (r) => r.type === "group-header" && visibleGroupIds.has(r.groupId ?? "")
    ).length;
    const visibleRows = visibleTaskRows + visibleGroupHeaders;
    return Math.max(visibleRows * ROW_HEIGHT + 20, MIN_VISIBLE_ROWS * ROW_HEIGHT + 20);
  }, [rows, originDate, pixelsPerDay, panX, stageWidth]);

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

  // Touch gestures: single-finger pan + two-finger pinch-to-zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let lastX = 0;
    let lastDist = 0;

    const getTouchDist = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        lastX = e.touches[0].clientX;
      } else if (e.touches.length === 2) {
        lastDist = getTouchDist(e.touches);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const store = useTimelineStore.getState();
      if (e.touches.length === 2 && lastDist > 0) {
        const newDist = getTouchDist(e.touches);
        const scale = newDist / lastDist;
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const rect = el.getBoundingClientRect();
        store.setZoom(store.pixelsPerDay * scale, midX - rect.left);
        lastDist = newDist;
      } else if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastX;
        store.setPan(store.panX + dx, store.panY);
        lastX = e.touches[0].clientX;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        lastDist = 0;
      } else if (e.touches.length === 1) {
        lastX = e.touches[0].clientX;
        lastDist = 0;
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
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

        // Cascade dependent tasks — ONLY forward in time
        // Moving a predecessor backward should NOT pull dependents back
        // (the crew for the next job doesn't need to come earlier just
        // because the previous job can start sooner)
        const delta = differenceInDays(newStartDate, origStart);
        let cascadedCount = 0;
        if (delta > 0) {
          // Moving forward: push dependents whose start would now overlap
          const downstreamIds = getDownstreamTasks(taskId, dependencies);
          for (const dt of allTasks.filter((tt) =>
            downstreamIds.includes(tt.id)
          )) {
            if (dt.start_date && dt.finish_date) {
              const depStart = parseISO(dt.start_date);
              // Only push if the dependent starts before our new finish
              if (depStart <= newFinishDate) {
                const pushDays = differenceInDays(newFinishDate, depStart) + 1;
                const { error: ce } = await supabase
                  .from("tasks")
                  .update({
                    start_date: format(addDays(depStart, pushDays), "yyyy-MM-dd"),
                    finish_date: format(
                      addDays(parseISO(dt.finish_date), pushDays),
                      "yyyy-MM-dd"
                    ),
                  })
                  .eq("id", dt.id);
                if (!ce) cascadedCount++;
              }
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
      style={{ touchAction: "none" }}
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
            projectStartDate={projectStartDate}
            projectFinishDate={projectFinishDate}
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
