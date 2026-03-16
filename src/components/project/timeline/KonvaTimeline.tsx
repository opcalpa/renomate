import React, { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { parseISO, subDays, differenceInDays, format } from "date-fns";
import { sv } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useTimelineData } from "./hooks/useTimelineData";
import { useTimelineLayout } from "./hooks/useTimelineLayout";
import { useTimelineStore } from "./store";
import { TimelineDateRuler } from "./TimelineDateRuler";
import { TimelineCanvas } from "./TimelineCanvas";
import { TimelineHoverCard } from "./TimelineHoverCard";
import { TimelineToolbar } from "./TimelineToolbar";
import { DEFAULT_PIXELS_PER_DAY } from "./utils";
import type { GroupByOption } from "./types";

interface KonvaTimelineProps {
  projectId: string;
  projectName?: string;
  projectStartDate?: string | null;
  projectFinishDate?: string | null;
  onTaskClick?: (taskId: string) => void;
  onNavigateToRoom?: (roomId: string) => void;
  currency?: string | null;
  isDemo?: boolean;
  userType?: string | null;
}

export const KonvaTimeline: React.FC<KonvaTimelineProps> = ({
  projectId,
  projectName,
  onTaskClick,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  const { tasks, allTasks, dependencies, teamMembers, rooms, loading, refetch } =
    useTimelineData(projectId);

  const {
    panX,
    pixelsPerDay,
    groupBy,
    selectedAssignee,
    collapsedGroups,
    setPan,
    setGroupBy,
    setSelectedAssignee,
  } = useTimelineStore();

  const { rows, totalRows } = useTimelineLayout({
    tasks,
    groupBy,
    selectedAssignee,
    collapsedGroups,
    rooms,
    teamMembers,
  });

  const unscheduledTasks = useMemo(
    () => allTasks.filter((tt) => !tt.start_date || !tt.finish_date),
    [allTasks]
  );

  const daysVisible = useMemo(
    () => Math.round(containerWidth / pixelsPerDay),
    [containerWidth, pixelsPerDay]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const originDate = useMemo(() => {
    if (tasks.length === 0) return subDays(new Date(), 7);
    const starts = tasks
      .filter((tt) => tt.start_date)
      .map((tt) => parseISO(tt.start_date!));
    if (starts.length === 0) return subDays(new Date(), 7);
    const earliest = new Date(Math.min(...starts.map((d) => d.getTime())));
    return subDays(earliest, 30); // 30 days buffer before first task
  }, [tasks]);

  const daysToRender = useMemo(() => {
    // Render plenty of days in both directions so scrolling never hits blank space
    if (tasks.length === 0) return 180;
    const ends = tasks
      .filter((tt) => tt.finish_date)
      .map((tt) => parseISO(tt.finish_date!));
    if (ends.length === 0) return 180;
    const latest = new Date(Math.max(...ends.map((d) => d.getTime())));
    const taskSpan = differenceInDays(latest, originDate) + 14;
    return Math.max(taskSpan, 180); // Always at least 180 days (6 months)
  }, [tasks, originDate]);

  const dateRangeLabel = useMemo(() => {
    if (tasks.length === 0) return "";
    const starts = tasks.filter((tt) => tt.start_date).map((tt) => parseISO(tt.start_date!));
    const ends = tasks.filter((tt) => tt.finish_date).map((tt) => parseISO(tt.finish_date!));
    if (starts.length === 0 || ends.length === 0) return "";
    const min = new Date(Math.min(...starts.map((d) => d.getTime())));
    const max = new Date(Math.max(...ends.map((d) => d.getTime())));
    const total = differenceInDays(max, min) + 1;
    return `${format(min, "MMM d", { locale: sv })} - ${format(max, "MMM d, yyyy", { locale: sv })} (${total} ${t("timeline.days", "days")})`;
  }, [tasks, t]);

  // Auto-center on first load
  const hasAutocentered = useRef(false);
  useEffect(() => {
    if (hasAutocentered.current || loading || tasks.length === 0) return;
    hasAutocentered.current = true;
    const today = new Date();
    const daysFromOrigin = differenceInDays(today, originDate);
    const centerX = -(daysFromOrigin * pixelsPerDay - containerWidth / 2);
    setPan(centerX, 0);
  }, [loading, tasks, originDate, pixelsPerDay, containerWidth, setPan]);

  const handleZoomIn = useCallback(() => {
    const s = useTimelineStore.getState();
    s.setZoom(s.pixelsPerDay * 1.25, containerWidth / 2);
  }, [containerWidth]);

  const handleZoomOut = useCallback(() => {
    const s = useTimelineStore.getState();
    s.setZoom(s.pixelsPerDay * 0.8, containerWidth / 2);
  }, [containerWidth]);

  const handleResetZoom = useCallback(() => {
    const s = useTimelineStore.getState();
    s.setZoom(DEFAULT_PIXELS_PER_DAY, containerWidth / 2);
  }, [containerWidth]);

  const handleToday = useCallback(() => {
    const s = useTimelineStore.getState();
    const today = new Date();
    const daysFromOrigin = differenceInDays(today, originDate);
    const centerX = -(daysFromOrigin * s.pixelsPerDay - containerWidth / 2);
    s.setPan(centerX, 0);
  }, [originDate, containerWidth]);

  const handlePanLeft = useCallback(() => {
    const s = useTimelineStore.getState();
    s.setPan(s.panX + s.pixelsPerDay * 7, s.panY);
  }, []);

  const handlePanRight = useCallback(() => {
    const s = useTimelineStore.getState();
    s.setPan(s.panX - s.pixelsPerDay * 7, s.panY);
  }, []);

  const handleTaskClick = useCallback(
    (taskId: string) => {
      useTimelineStore.getState().setSelectedTaskId(taskId);
      onTaskClick?.(taskId);
    },
    [onTaskClick]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (allTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        {t("projectDetail.noScheduledTasks", "No scheduled tasks")}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full relative">
      <TimelineToolbar
        projectName={projectName}
        dateRangeLabel={dateRangeLabel}
        daysVisible={daysVisible}
        unscheduledTasks={unscheduledTasks}
        teamMembers={teamMembers}
        groupBy={groupBy}
        selectedAssignee={selectedAssignee}
        onGroupByChange={setGroupBy}
        onAssigneeChange={setSelectedAssignee}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onPanLeft={handlePanLeft}
        onPanRight={handlePanRight}
        onToday={handleToday}
        onTaskClick={onTaskClick}
      />

      <TimelineDateRuler
        originDate={originDate}
        pixelsPerDay={pixelsPerDay}
        panX={panX}
        stageWidth={containerWidth}
        daysToRender={daysToRender}
      />

      <TimelineCanvas
        tasks={tasks}
        allTasks={allTasks}
        dependencies={dependencies}
        rows={rows}
        totalRows={totalRows}
        originDate={originDate}
        daysToRender={daysToRender}
        onTaskClick={handleTaskClick}
        onRefetch={refetch}
      />

      <TimelineHoverCard tasks={allTasks} teamMembers={teamMembers} />
    </div>
  );
};

export default KonvaTimeline;
