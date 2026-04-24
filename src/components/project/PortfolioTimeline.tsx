import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { usePortfolioTimelineData, type PortfolioProject, type PortfolioTask } from "@/hooks/usePortfolioTimelineData";
import { getTaskColor } from "./timeline/utils";
import { normalizeStatus, STATUS_META } from "@/lib/projectStatus";
import { ChevronRight, ChevronDown, Loader2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { sv } from "date-fns/locale";

interface PortfolioTimelineProps {
  projectIds: string[];
  onProjectClick: (projectId: string) => void;
  onTaskClick?: (projectId: string, taskId: string) => void;
}

const ROW_HEIGHT = 40;
const TASK_ROW_HEIGHT = 32;
const LABEL_WIDTH = 200;
const MIN_PIXELS_PER_DAY = 3;

function getProjectColor(status: string | null): string {
  const s = normalizeStatus(status || "planning");
  const colors: Record<string, string> = {
    planning: "#818cf8",
    in_progress: "#3b82f6",
    active: "#3b82f6",
    completed: "#10b981",
    on_hold: "#9ca3af",
  };
  return colors[s] || "#94a3b8";
}

export function PortfolioTimeline({ projectIds, onProjectClick, onTaskClick }: PortfolioTimelineProps) {
  const { t } = useTranslation();
  const { data, isLoading } = usePortfolioTimelineData(projectIds);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Calculate date range across all projects
  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (!data) return { minDate: new Date(), maxDate: new Date(), totalDays: 90 };

    const dates: Date[] = [];
    for (const p of data.projects) {
      if (p.start_date) dates.push(new Date(p.start_date));
      if (p.finish_goal_date) dates.push(new Date(p.finish_goal_date));
    }
    for (const [, tasks] of data.tasksByProject) {
      for (const task of tasks) {
        if (task.start_date) dates.push(new Date(task.start_date));
        if (task.finish_date) dates.push(new Date(task.finish_date));
      }
    }

    if (dates.length === 0) {
      const now = new Date();
      return { minDate: now, maxDate: addDays(now, 90), totalDays: 90 };
    }

    const min = startOfMonth(new Date(Math.min(...dates.map((d) => d.getTime()))));
    const max = endOfMonth(new Date(Math.max(...dates.map((d) => d.getTime()))));
    return { minDate: min, maxDate: max, totalDays: Math.max(differenceInDays(max, min), 30) };
  }, [data]);

  // Month labels for ruler
  const months = useMemo(() => {
    return eachMonthOfInterval({ start: minDate, end: maxDate });
  }, [minDate, maxDate]);

  // Projects with dates (skip those without any dates)
  const projectsWithDates = useMemo(() => {
    if (!data) return [];
    return data.projects.filter((p) => p.start_date || p.finish_goal_date || (data.tasksByProject.get(p.id)?.length || 0) > 0);
  }, [data]);

  const pixelsPerDay = useMemo(() => {
    const available = Math.max(800, (scrollRef.current?.clientWidth || 1000) - LABEL_WIDTH);
    return Math.max(MIN_PIXELS_PER_DAY, available / totalDays);
  }, [totalDays]);

  const timelineWidth = totalDays * pixelsPerDay;

  const dateToX = (dateStr: string) => {
    return differenceInDays(new Date(dateStr), minDate) * pixelsPerDay;
  };

  const todayX = differenceInDays(new Date(), minDate) * pixelsPerDay;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projectsWithDates.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          {t("projects.noTimelineData", "No projects with dates to display")}
        </p>
      </div>
    );
  }

  const renderBar = (
    startStr: string | null,
    endStr: string | null,
    color: string,
    progress?: number | null,
    height = 20,
  ) => {
    if (!startStr) return null;
    const end = endStr || startStr;
    const x = dateToX(startStr);
    const w = Math.max(8, differenceInDays(new Date(end), new Date(startStr)) * pixelsPerDay);
    const pct = Math.min(Math.max(progress || 0, 0), 100);

    return (
      <div
        className="absolute rounded-sm"
        style={{
          left: x,
          width: w,
          height,
          top: "50%",
          transform: "translateY(-50%)",
          backgroundColor: color,
          opacity: 0.85,
        }}
      >
        {pct > 0 && (
          <div
            className="absolute inset-y-0 left-0 rounded-sm"
            style={{ width: `${pct}%`, backgroundColor: color, opacity: 1, filter: "brightness(0.8)" }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div ref={scrollRef} className="overflow-x-auto">
        <div style={{ minWidth: LABEL_WIDTH + timelineWidth }}>
          {/* Month ruler */}
          <div className="flex border-b bg-muted/30 sticky top-0 z-10" style={{ height: 32 }}>
            <div className="shrink-0 border-r bg-muted/30 sticky left-0 z-20" style={{ width: LABEL_WIDTH }} />
            <div className="relative" style={{ width: timelineWidth }}>
              {months.map((month) => {
                const x = differenceInDays(month, minDate) * pixelsPerDay;
                const daysInMonth = differenceInDays(endOfMonth(month), month) + 1;
                const w = daysInMonth * pixelsPerDay;
                return (
                  <div
                    key={month.toISOString()}
                    className="absolute top-0 h-full border-r border-muted flex items-center px-2"
                    style={{ left: x, width: w }}
                  >
                    <span className="text-[11px] text-muted-foreground font-medium truncate">
                      {format(month, "MMM yyyy", { locale: sv })}
                    </span>
                  </div>
                );
              })}
              {/* Today line */}
              {todayX > 0 && todayX < timelineWidth && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-400 z-20"
                  style={{ left: todayX }}
                />
              )}
            </div>
          </div>

          {/* Project rows */}
          {projectsWithDates.map((project) => {
            const isExpanded = expanded.has(project.id);
            const tasks = data?.tasksByProject.get(project.id) || [];
            const status = normalizeStatus(project.status || "planning");
            const meta = STATUS_META[status];
            const color = getProjectColor(project.status);

            // Derive project date range from tasks if not set
            const projectStart = project.start_date
              || (tasks.length > 0 ? tasks[0].start_date : null);
            const projectEnd = project.finish_goal_date
              || (tasks.length > 0 ? tasks[tasks.length - 1].finish_date || tasks[tasks.length - 1].start_date : null);

            return (
              <div key={project.id}>
                {/* Project bar row */}
                <div
                  className="flex border-b hover:bg-muted/30 transition-colors cursor-pointer group"
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Label */}
                  <div
                    className="shrink-0 flex items-center gap-1.5 px-3 border-r overflow-hidden bg-card sticky left-0 z-20"
                    style={{ width: LABEL_WIDTH }}
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleExpand(project.id); }}
                      className="shrink-0 p-0.5 rounded hover:bg-muted"
                    >
                      {isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onProjectClick(project.id)}
                      className="text-xs font-medium truncate hover:text-primary hover:underline text-left"
                    >
                      {project.name}
                    </button>
                    <Badge
                      variant="secondary"
                      className={cn("text-[9px] px-1.5 py-0 h-4 shrink-0", meta?.badgeClass)}
                    >
                      {tasks.length}
                    </Badge>
                  </div>

                  {/* Timeline area */}
                  <div
                    className="relative flex-1"
                    style={{ width: timelineWidth }}
                    onClick={() => onProjectClick(project.id)}
                  >
                    {renderBar(projectStart, projectEnd, color, null, 22)}
                    {/* Today line */}
                    {todayX > 0 && todayX < timelineWidth && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-red-400/30"
                        style={{ left: todayX }}
                      />
                    )}
                  </div>
                </div>

                {/* Expanded task rows */}
                {isExpanded && tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex border-b border-dashed hover:bg-muted/20 transition-colors"
                    style={{ height: TASK_ROW_HEIGHT }}
                  >
                    {/* Task label */}
                    <button
                      type="button"
                      className="shrink-0 flex items-center pl-9 pr-3 border-r overflow-hidden bg-card sticky left-0 z-20 cursor-pointer hover:bg-muted/30 text-left"
                      style={{ width: LABEL_WIDTH }}
                      onClick={() => onTaskClick?.(project.id, task.id)}
                    >
                      <span className="text-[11px] text-muted-foreground truncate hover:text-primary hover:underline">
                        {task.title}
                      </span>
                    </button>

                    {/* Task bar */}
                    <div
                      className="relative flex-1 cursor-pointer"
                      style={{ width: timelineWidth }}
                      onClick={() => onTaskClick?.(project.id, task.id)}
                    >
                      {renderBar(
                        task.start_date,
                        task.finish_date,
                        getTaskColor(task.status || "planned"),
                        task.progress,
                        14,
                      )}
                      {todayX > 0 && todayX < timelineWidth && (
                        <div
                          className="absolute top-0 bottom-0 w-px bg-red-400/30"
                          style={{ left: todayX }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
