import React, { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { parseISO, addDays, subDays, differenceInDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTimelineData } from "./hooks/useTimelineData";
import { useTimelineLayout } from "./hooks/useTimelineLayout";
import { useTimelineStore } from "./store";
import { TimelineDateRuler } from "./TimelineDateRuler";
import { TimelineCanvas } from "./TimelineCanvas";
import { DEFAULT_PIXELS_PER_DAY, RULER_HEIGHT } from "./utils";

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
  onTaskClick,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  const { tasks, dependencies, teamMembers, rooms, loading } =
    useTimelineData(projectId);

  const {
    panX,
    pixelsPerDay,
    groupBy,
    selectedAssignee,
    collapsedGroups,
    setPan,
    setZoom,
  } = useTimelineStore();

  const { rows, totalRows } = useTimelineLayout({
    tasks,
    groupBy,
    selectedAssignee,
    collapsedGroups,
    rooms,
    teamMembers,
  });

  // ResizeObserver for container width (shared with ruler)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute origin date (earliest task start or today - 7 days)
  const originDate = useMemo(() => {
    if (tasks.length === 0) return subDays(new Date(), 7);
    const starts = tasks
      .filter((t) => t.start_date)
      .map((t) => parseISO(t.start_date!));
    if (starts.length === 0) return subDays(new Date(), 7);
    const earliest = new Date(Math.min(...starts.map((d) => d.getTime())));
    return subDays(earliest, 3); // 3 days padding
  }, [tasks]);

  // Days to render
  const daysToRender = useMemo(() => {
    if (tasks.length === 0) return 60;
    const ends = tasks
      .filter((t) => t.finish_date)
      .map((t) => parseISO(t.finish_date!));
    if (ends.length === 0) return 60;
    const latest = new Date(Math.max(...ends.map((d) => d.getTime())));
    return differenceInDays(latest, originDate) + 14; // 14 days padding
  }, [tasks, originDate]);

  // Auto-center on first load
  const hasAutocentered = useRef(false);
  useEffect(() => {
    if (hasAutocentered.current || loading || tasks.length === 0) return;
    hasAutocentered.current = true;

    // Center on today
    const today = new Date();
    const daysFromOrigin = differenceInDays(today, originDate);
    const centerX = -(daysFromOrigin * pixelsPerDay - containerWidth / 2);
    setPan(centerX, 0);
  }, [loading, tasks, originDate, pixelsPerDay, containerWidth, setPan]);

  // Toolbar handlers
  const handleZoomIn = useCallback(() => {
    const store = useTimelineStore.getState();
    store.setZoom(store.pixelsPerDay * 1.25, containerWidth / 2);
  }, [containerWidth]);

  const handleZoomOut = useCallback(() => {
    const store = useTimelineStore.getState();
    store.setZoom(store.pixelsPerDay * 0.8, containerWidth / 2);
  }, [containerWidth]);

  const handleToday = useCallback(() => {
    const store = useTimelineStore.getState();
    const today = new Date();
    const daysFromOrigin = differenceInDays(today, originDate);
    const centerX = -(daysFromOrigin * store.pixelsPerDay - containerWidth / 2);
    store.setPan(centerX, 0);
  }, [originDate, containerWidth]);

  const handlePanLeft = useCallback(() => {
    const store = useTimelineStore.getState();
    store.setPan(store.panX + store.pixelsPerDay * 7, store.panY);
  }, []);

  const handlePanRight = useCallback(() => {
    const store = useTimelineStore.getState();
    store.setPan(store.panX - store.pixelsPerDay * 7, store.panY);
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

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        {t("projectDetail.noScheduledTasks", "No scheduled tasks")}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-background">
        <Button variant="ghost" size="sm" onClick={handlePanLeft}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleToday}>
          <Calendar className="w-4 h-4 mr-1" />
          {t("projectDetail.today", "Today")}
        </Button>
        <Button variant="ghost" size="sm" onClick={handlePanRight}>
          <ChevronRight className="w-4 h-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button variant="ghost" size="sm" onClick={handleZoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleZoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      {/* Date ruler */}
      <TimelineDateRuler
        originDate={originDate}
        pixelsPerDay={pixelsPerDay}
        panX={panX}
        stageWidth={containerWidth}
        daysToRender={daysToRender}
      />

      {/* Main canvas */}
      <TimelineCanvas
        tasks={tasks}
        dependencies={dependencies}
        rows={rows}
        totalRows={totalRows}
        originDate={originDate}
        daysToRender={daysToRender}
        onTaskClick={handleTaskClick}
      />
    </div>
  );
};

export default KonvaTimeline;
