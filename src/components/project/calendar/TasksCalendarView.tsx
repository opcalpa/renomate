import React, { useState, useMemo, useCallback } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getStatusSolidColor } from "@/lib/statusColors";

interface CalendarTask {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  finish_date: string | null;
}

interface TasksCalendarViewProps {
  tasks: CalendarTask[];
  onTaskClick: (taskId: string) => void;
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

export const TasksCalendarView: React.FC<TasksCalendarViewProps> = ({ tasks, onTaskClick }) => {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const prev = useCallback(() => setCurrentMonth((m) => subMonths(m, 1)), []);
  const next = useCallback(() => setCurrentMonth((m) => addMonths(m, 1)), []);
  const today = useCallback(() => setCurrentMonth(new Date()), []);

  // Generate weeks for the current month view
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
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
  }, [currentMonth]);

  // Filter tasks with dates and compute which weeks they appear in
  const scheduledTasks = useMemo(
    () => tasks.filter((t) => t.start_date && t.finish_date),
    [tasks]
  );

  const DAY_NAMES = ["Mån", "Tis", "Ons", "Tors", "Fre", "Lör", "Sön"];
  const TASK_BAR_HEIGHT = 22;
  const TASK_BAR_GAP = 2;

  return (
    <div className="flex flex-col">
      {/* Month navigation */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Button variant="outline" size="sm" onClick={today} className="h-7 text-xs">
          {t("timeline.today", "Idag")}
        </Button>
        <Button variant="ghost" size="icon" onClick={prev} className="h-7 w-7">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[120px] text-center capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: sv })}
        </span>
        <Button variant="ghost" size="icon" onClick={next} className="h-7 w-7">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {DAY_NAMES.map((name) => (
          <div key={name} className="text-center text-xs font-medium text-muted-foreground py-2 border-r last:border-r-0">
            {name}
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
          <div key={weekIdx} className="grid grid-cols-7 border-b relative" style={{ minHeight: Math.max(80, 32 + taskAreaHeight) }}>
            {/* Day cells */}
            {week.map((day, dayIdx) => {
              const inMonth = isSameMonth(day, currentMonth);
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
                  onClick={() => onTaskClick(task.id)}
                  className={cn(
                    "absolute rounded text-[10px] font-medium text-white px-1.5 truncate cursor-pointer hover:opacity-90 transition-opacity",
                    colorClass
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
