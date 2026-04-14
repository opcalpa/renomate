import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { useTimelineStore } from "./store";
import type { TimelineTask, TimelineDependency, TeamMember } from "./types";

interface TimelineHoverCardProps {
  tasks: TimelineTask[];
  teamMembers: TeamMember[];
  dependencies?: TimelineDependency[];
}

const STATUS_LABELS: Record<string, string> = {
  to_do: "To Do",
  in_progress: "In Progress",
  done: "Done",
  completed: "Completed",
  on_hold: "On Hold",
  blocked: "Blocked",
  cancelled: "Cancelled",
  planned: "Planned",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  to_do: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  on_hold: "bg-gray-100 text-gray-600",
  blocked: "bg-red-100 text-red-800",
  cancelled: "bg-red-50 text-red-600",
  planned: "bg-indigo-100 text-indigo-800",
};

export const TimelineHoverCard: React.FC<TimelineHoverCardProps> = ({
  tasks,
  teamMembers,
  dependencies = [],
}) => {
  const { t } = useTranslation();
  const hoveredTaskId = useTimelineStore((s) => s.hoveredTaskId);
  const hoverPosition = useTimelineStore((s) => s.hoverPosition);
  const dragState = useTimelineStore((s) => s.dragState);

  const [visible, setVisible] = useState(false);
  const [delayedTaskId, setDelayedTaskId] = useState<string | null>(null);

  // Delay showing the hover card
  useEffect(() => {
    if (!hoveredTaskId || dragState) {
      setVisible(false);
      setDelayedTaskId(null);
      return;
    }

    const timer = setTimeout(() => {
      setDelayedTaskId(hoveredTaskId);
      setVisible(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [hoveredTaskId, dragState]);

  if (!visible || !delayedTaskId || !hoverPosition || dragState) return null;

  const task = tasks.find((t) => t.id === delayedTaskId);
  if (!task) return null;

  const assignee = task.assigned_to_stakeholder_id
    ? teamMembers.find((m) => m.id === task.assigned_to_stakeholder_id)
    : null;

  const statusLabel = STATUS_LABELS[task.status] || task.status;
  const badgeClass =
    STATUS_BADGE_CLASSES[task.status] || "bg-slate-100 text-slate-600";

  const dateRange =
    task.start_date && task.finish_date
      ? `${format(parseISO(task.start_date), "d MMM", { locale: sv })} - ${format(parseISO(task.finish_date), "d MMM yyyy", { locale: sv })}`
      : t("timeline.unscheduledTasksTitle", "Unscheduled");

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        left: hoverPosition.x + 16,
        top: hoverPosition.y + 64 + 8,
      }}
    >
      <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 min-w-[200px] max-w-[280px]">
        <p className="font-medium text-sm mb-1.5 leading-tight">
          {task.title}
        </p>

        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badgeClass}`}
          >
            {statusLabel}
          </span>
          {task.progress > 0 && (
            <span className="text-xs text-muted-foreground">
              {Math.round(task.progress)}%
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">{dateRange}</p>

        {assignee && (
          <p className="text-xs text-muted-foreground mt-1">
            {assignee.name}
          </p>
        )}

        {/* Dependencies */}
        {(() => {
          const blockedBy = dependencies
            .filter((d) => d.task_id === task.id)
            .map((d) => tasks.find((t) => t.id === d.depends_on_task_id))
            .filter(Boolean);
          const blocks = dependencies
            .filter((d) => d.depends_on_task_id === task.id)
            .map((d) => tasks.find((t) => t.id === d.task_id))
            .filter(Boolean);

          if (blockedBy.length === 0 && blocks.length === 0) return null;

          return (
            <div className="mt-2 pt-1.5 border-t space-y-1">
              {blockedBy.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  <span className="font-medium">⛓ {t("tasks.dependsOn", "Depends on")}:</span>{" "}
                  {blockedBy.map((t) => t!.title).join(", ")}
                </p>
              )}
              {blocks.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  <span className="font-medium">→ {t("tasks.blocks", "Blocks")}:</span>{" "}
                  {blocks.map((t) => t!.title).join(", ")}
                </p>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
