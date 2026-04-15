import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  format,
  differenceInDays,
} from "date-fns";
import { sv } from "date-fns/locale";
import { ChevronLeft, ChevronRight, ChevronDown, CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getStatusSolidColor } from "@/lib/statusColors";

interface CalendarTask {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  finish_date: string | null;
}

interface CalendarMilestone {
  id: string;
  title: string;
  date: string;
  color: string | null;
}

interface TasksCalendarViewProps {
  tasks: CalendarTask[];
  milestones?: CalendarMilestone[];
  selectedTaskIds?: Set<string>;
  onTaskClick: (taskId: string, nativeEvent?: React.MouseEvent) => void;
}

/** Assigns each task to a swim-lane row within a week to avoid overlaps */
function assignLanes(
  weekTasks: Array<{ task: CalendarTask; startCol: number; endCol: number }>
): Array<{ task: CalendarTask; startCol: number; endCol: number; lane: number }> {
  const result: Array<{ task: CalendarTask; startCol: number; endCol: number; lane: number }> = [];
  const lanes: number[] = []; // tracks the last endCol per lane

  // Sort by start column, then by wider span first
  const sorted = [...weekTasks].sort(
    (a, b) => a.startCol - b.startCol || (b.endCol - b.startCol) - (a.endCol - a.startCol)
  );

  for (const item of sorted) {
    let lane = lanes.findIndex((end) => end <= item.startCol);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(0);
    }
    lanes[lane] = item.endCol;
    result.push({ ...item, lane });
  }
  return result;
}

export const TasksCalendarView: React.FC<TasksCalendarViewProps> = ({ tasks, milestones = [], selectedTaskIds, onTaskClick }) => {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [calMode, setCalMode] = useState<"month" | "week">("month");

  const prev = useCallback(() => {
    setCurrentDate((d) => calMode === "month" ? subMonths(d, 1) : subWeeks(d, 1));
  }, [calMode]);
  const next = useCallback(() => {
    setCurrentDate((d) => calMode === "month" ? addMonths(d, 1) : addWeeks(d, 1));
  }, [calMode]);
  const today = useCallback(() => setCurrentDate(new Date()), []);

  // Generate weeks to display
  const weeks = useMemo(() => {
    if (calMode === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) week.push(addDays(weekStart, i));
      return [week];
    }
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const result: Date[][] = [];
    let day = calStart;
    while (day <= calEnd) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(day);
        day = addDays(day, 1);
      }
      result.push(week);
    }
    return result;
  }, [currentDate, calMode]);

  // Header label
  const headerLabel = useMemo(() => {
    if (calMode === "week") {
      const ws = weeks[0][0];
      const we = weeks[0][6];
      return `${format(ws, "d MMM", { locale: sv })} – ${format(we, "d MMM yyyy", { locale: sv })}`;
    }
    return format(currentDate, "MMMM yyyy", { locale: sv });
  }, [currentDate, calMode, weeks]);

  // Filter tasks with dates and compute which weeks they appear in
  const scheduledTasks = useMemo(
    () => tasks.filter((t) => t.start_date && t.finish_date),
    [tasks]
  );
  const unscheduledCount = tasks.length - scheduledTasks.length;

  // Earliest task date for "Project" button
  const projectStart = useMemo(() => {
    const dates = scheduledTasks.map((t) => parseISO(t.start_date!)).sort((a, b) => a.getTime() - b.getTime());
    return dates[0] ?? null;
  }, [scheduledTasks]);

  const goToProject = useCallback(() => {
    if (projectStart) setCurrentDate(projectStart);
  }, [projectStart]);

  // Swipe to change month/week
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    // Only trigger on horizontal swipe (|dx| > 60px and more horizontal than vertical)
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) prev(); else next();
    }
  }, [prev, next]);

  const DAY_NAMES = [
    t("timeline.calendarMon", "Mon"), t("timeline.calendarTue", "Tue"), t("timeline.calendarWed", "Wed"),
    t("timeline.calendarThu", "Thu"), t("timeline.calendarFri", "Fri"), t("timeline.calendarSat", "Sat"), t("timeline.calendarSun", "Sun"),
  ];
  const TASK_BAR_HEIGHT = 22;
  const TASK_BAR_GAP = 2;

  return (
    <div className="flex flex-col" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Navigation */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Button variant="outline" size="sm" onClick={today} className="h-7 text-xs">
          {t("timeline.today", "Today")}
        </Button>
        {projectStart && (
          <Button variant="outline" size="sm" onClick={goToProject} className="h-7 text-xs">
            {t("timeline.projectStart", "Projekt")}
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={prev} className="h-7 w-7">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[140px] text-center capitalize">
          {headerLabel}
        </span>
        <Button variant="ghost" size="icon" onClick={next} className="h-7 w-7">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Select value={calMode} onValueChange={(v) => setCalMode(v as "month" | "week")}>
          <SelectTrigger className="h-7 w-[100px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">{t("timeline.calendarMonth", "Månad")}</SelectItem>
            <SelectItem value="week">{t("timeline.calendarWeek", "Vecka")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Missing dates hint */}
      {unscheduledCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b text-xs text-amber-700">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span>
            {scheduledTasks.length === 0
              ? t("timeline.calendarNoDates", "No tasks have start and end dates. Add dates to see them on the calendar.")
              : t("timeline.calendarSomeDates", "{{count}} task(s) without dates are not shown.", { count: unscheduledCount })}
          </span>
        </div>
      )}

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {DAY_NAMES.map((name, i) => (
          <div key={name} className="text-center text-xs font-medium text-muted-foreground py-2 border-r last:border-r-0">
            {name}{calMode === "week" && weeks[0] ? ` ${format(weeks[0][i], "d")}` : ""}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((week, weekIdx) => {
        const weekStart = week[0];
        const weekEnd = week[6];

        // Find tasks that overlap this week
        const weekTaskItems = scheduledTasks
          .map((task) => {
            const tStart = parseISO(task.start_date!);
            const tEnd = parseISO(task.finish_date!);

            // Check overlap with this week
            if (tEnd < weekStart || tStart > weekEnd) return null;

            // Clamp to week boundaries
            const visStart = tStart < weekStart ? weekStart : tStart;
            const visEnd = tEnd > weekEnd ? weekEnd : tEnd;

            // Column indices (0-6, Mon-Sun)
            const startCol = differenceInDays(visStart, weekStart);
            const endCol = differenceInDays(visEnd, weekStart) + 1; // exclusive

            return { task, startCol, endCol };
          })
          .filter(Boolean) as Array<{ task: CalendarTask; startCol: number; endCol: number }>;

        const laned = assignLanes(weekTaskItems);
        const maxLane = laned.length > 0 ? Math.max(...laned.map((l) => l.lane)) + 1 : 0;
        const taskAreaHeight = maxLane * (TASK_BAR_HEIGHT + TASK_BAR_GAP);

        return (
          <div key={weekIdx} className="grid grid-cols-7 border-b relative" style={{ minHeight: Math.max(calMode === "week" ? 200 : 80, 32 + taskAreaHeight) }}>
            {/* Day cells */}
            {week.map((day, dayIdx) => {
              const inMonth = calMode === "week" || isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              return (
                <div
                  key={dayIdx}
                  className={cn(
                    "border-r last:border-r-0 p-1 text-xs",
                    !inMonth && "bg-muted/30 text-muted-foreground/50",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex items-center justify-center h-6 w-6 rounded-full text-[11px]",
                      isCurrentDay && "bg-primary text-primary-foreground font-bold",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>
              );
            })}

            {/* Milestone markers */}
            {milestones.map((ms) => {
              const msDate = parseISO(ms.date);
              if (msDate < weekStart || msDate > weekEnd) return null;
              const col = differenceInDays(msDate, weekStart);
              const left = `${((col + 0.5) / 7) * 100}%`;
              const top = 30 + maxLane * (TASK_BAR_HEIGHT + TASK_BAR_GAP);
              return (
                <div
                  key={`ms-${ms.id}-${weekIdx}`}
                  className="absolute flex items-center gap-1 -translate-x-1/2"
                  style={{ left, top }}
                  title={`${ms.title} — ${format(msDate, "d MMM", { locale: sv })}`}
                >
                  <span className="text-[10px] rotate-45 inline-block w-2.5 h-2.5 rounded-[1px]" style={{ backgroundColor: ms.color || "#6366f1" }} />
                  <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: ms.color || "#6366f1" }}>{ms.title}</span>
                </div>
              );
            })}

            {/* Task bars overlay */}
            {laned.map(({ task, startCol, endCol, lane }) => {
              const colorClass = getStatusSolidColor(task.status);
              const left = `${(startCol / 7) * 100}%`;
              const width = `${((endCol - startCol) / 7) * 100}%`;
              const top = 30 + lane * (TASK_BAR_HEIGHT + TASK_BAR_GAP);

              return (
                <button
                  key={`${task.id}-${weekIdx}`}
                  type="button"
                  onClick={(e) => onTaskClick(task.id, e)}
                  className={cn(
                    "absolute rounded text-[10px] font-medium text-white px-1.5 truncate cursor-pointer hover:opacity-90 transition-opacity",
                    colorClass,
                    selectedTaskIds?.has(task.id) && "ring-2 ring-primary ring-offset-1"
                  )}
                  style={{ left, width, top, height: TASK_BAR_HEIGHT }}
                  title={task.title}
                >
                  {task.title}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
