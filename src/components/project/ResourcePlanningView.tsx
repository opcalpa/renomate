import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useResourcePlanningData, type ResourcePerson, type ResourceTask } from "@/hooks/useResourcePlanningData";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, Clock, Loader2 } from "lucide-react";

interface ResourcePlanningViewProps {
  projectIds: string[];
}

const ROW_HEIGHT = 48;
const LABEL_WIDTH = 200;
const DAY_WIDTH = 18;

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function getWeekNumber(d: Date): number {
  const onejan = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - onejan.getTime()) / 86400000);
  return Math.ceil((days + onejan.getDay() + 1) / 7);
}

export function ResourcePlanningView({ projectIds }: ResourcePlanningViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { people, unassigned, dateRange, isLoading } = useResourcePlanningData(projectIds);

  const totalDays = useMemo(() => daysBetween(dateRange.start, dateRange.end), [dateRange]);
  const totalWidth = totalDays * DAY_WIDTH;

  // Generate week markers
  const weeks = useMemo(() => {
    const result: { weekNum: number; label: string; x: number; width: number }[] = [];
    const d = new Date(dateRange.start);
    while (d < dateRange.end) {
      const weekStart = new Date(d);
      const weekEnd = new Date(d);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const x = daysBetween(dateRange.start, weekStart) * DAY_WIDTH;
      result.push({
        weekNum: getWeekNumber(weekStart),
        label: weekStart.toLocaleDateString("sv-SE", { day: "numeric", month: "short" }),
        x,
        width: 7 * DAY_WIDTH,
      });
      d.setDate(d.getDate() + 7);
    }
    return result;
  }, [dateRange, totalDays]);

  // Today marker
  const todayX = daysBetween(dateRange.start, new Date()) * DAY_WIDTH;

  const dateToX = (date: string) => daysBetween(dateRange.start, new Date(date)) * DAY_WIDTH;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        {t("common.loading")}
      </div>
    );
  }

  if (people.length === 0 && unassigned.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p className="font-medium">{t("resourcePlanning.noData", "No scheduled resources")}</p>
        <p className="text-sm mt-1">{t("resourcePlanning.noDataDescription", "Assign team members to tasks with dates to see the resource plan.")}</p>
      </div>
    );
  }

  const allRows: (ResourcePerson | { id: "unassigned"; name: string; role: null; company: null; tasks: ResourceTask[] })[] = [
    ...people,
    ...(unassigned.length > 0 ? [{ id: "unassigned" as const, name: t("resourcePlanning.unassigned", "Unassigned"), role: null, company: null, tasks: unassigned }] : []),
  ];

  return (
    <TooltipProvider>
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <div style={{ minWidth: LABEL_WIDTH + totalWidth }}>
            {/* Week header */}
            <div className="flex border-b bg-muted/30 sticky top-0 z-10" style={{ height: 32 }}>
              <div
                className="shrink-0 border-r bg-muted/30 sticky left-0 z-20 px-3 flex items-center text-xs font-medium text-muted-foreground uppercase tracking-wider"
                style={{ width: LABEL_WIDTH }}
              >
                {t("resourcePlanning.person", "Person")}
              </div>
              <div className="relative" style={{ width: totalWidth }}>
                {weeks.map((w, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full border-r border-muted flex items-center px-2"
                    style={{ left: w.x, width: w.width }}
                  >
                    <span className="text-[11px] text-muted-foreground font-medium truncate">
                      V.{w.weekNum} {w.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Person rows */}
            {allRows.map((person) => (
              <div key={person.id} className="flex border-b last:border-b-0 hover:bg-muted/20">
                {/* Person label */}
                <div
                  className="shrink-0 border-r bg-card sticky left-0 z-10 px-3 flex flex-col justify-center"
                  style={{ width: LABEL_WIDTH, minHeight: ROW_HEIGHT }}
                >
                  <div className="text-sm font-medium truncate">{person.name}</div>
                  {person.role && (
                    <div className="text-[11px] text-muted-foreground truncate">{person.role}</div>
                  )}
                </div>

                {/* Timeline bars */}
                <div className="relative flex-1" style={{ width: totalWidth, minHeight: ROW_HEIGHT }}>
                  {/* Week grid lines */}
                  {weeks.map((w, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-r border-border/20"
                      style={{ left: w.x }}
                    />
                  ))}

                  {/* Today line */}
                  {todayX > 0 && todayX < totalWidth && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-primary/40 z-[5]"
                      style={{ left: todayX }}
                    />
                  )}

                  {/* Task bars */}
                  {person.tasks.map((task) => {
                    const x = dateToX(task.startDate);
                    const w = Math.max(dateToX(task.endDate) - x, DAY_WIDTH);

                    return (
                      <Tooltip key={task.id}>
                        <TooltipTrigger asChild>
                          <button
                            className="absolute rounded-md text-white text-[11px] font-medium px-2 truncate cursor-pointer hover:brightness-110 transition-all"
                            style={{
                              left: x,
                              width: w,
                              top: 8,
                              height: ROW_HEIGHT - 16,
                              backgroundColor: task.projectColor,
                              opacity: task.status === "completed" ? 0.5 : 1,
                            }}
                            onClick={() => navigate(`/projects/${task.projectId}?tab=tasks`)}
                          >
                            {task.title}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[280px]">
                          <div className="space-y-1">
                            <div className="font-medium">{task.title}</div>
                            <div className="text-xs text-muted-foreground">{task.projectName}</div>
                            <div className="text-xs">
                              {new Date(task.startDate).toLocaleDateString("sv-SE")} – {new Date(task.endDate).toLocaleDateString("sv-SE")}
                            </div>
                            {task.progress > 0 && (
                              <div className="text-xs">{task.progress}% {t("common.completed", "completed")}</div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
