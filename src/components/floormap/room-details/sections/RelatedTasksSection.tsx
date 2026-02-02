import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigned_to_stakeholder_id: string | null;
}

const ALL_STATUSES = [
  "ideas",
  "to_do",
  "in_progress",
  "on_hold",
  "completed",
  "scrapped",
] as const;

const DEFAULT_HIDDEN = new Set(["completed", "scrapped"]);

const statusKey = (s: string) => {
  const map: Record<string, string> = {
    to_do: 'toDo',
    in_progress: 'inProgress',
    on_hold: 'onHold',
  };
  return map[s] || s;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "in_progress":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "on_hold":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "scrapped":
      return "bg-gray-100 text-gray-500 border-gray-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

interface RelatedTasksSectionProps {
  roomId: string;
  projectId: string;
}

export function RelatedTasksSection({ roomId, projectId }: RelatedTasksSectionProps) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(
    () => new Set(ALL_STATUSES.filter((s) => !DEFAULT_HIDDEN.has(s)))
  );

  useEffect(() => {
    async function fetchTasks() {
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, priority, assigned_to_stakeholder_id")
        .eq("room_id", roomId);

      if (error) {
        console.error("Failed to load tasks:", error);
      } else {
        setTasks((data as Task[]) ?? []);
      }
      setLoading(false);
    }
    fetchTasks();
  }, [roomId]);

  const toggleStatus = (status: string) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const filtered = useMemo(
    () => tasks.filter((task) => activeStatuses.has(task.status)),
    [tasks, activeStatuses]
  );

  if (loading) {
    return <p className="text-sm text-muted-foreground py-2">{t('rooms.loadingTasks')}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggleStatus(s)}
            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
              activeStatuses.has(s)
                ? getStatusColor(s)
                : "bg-transparent text-muted-foreground border-dashed border-muted-foreground/40"
            }`}
          >
            {t(`statuses.${statusKey(s)}`)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          {tasks.length === 0
            ? t('rooms.noTasksForRoom')
            : t('rooms.noTasksMatchFilter')}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {filtered.map((task) => (
            <li key={task.id} className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className={`text-[10px] shrink-0 ${getStatusColor(task.status)}`}>
                {t(`statuses.${statusKey(task.status)}`)}
              </Badge>
              <span className="truncate font-medium">{task.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
