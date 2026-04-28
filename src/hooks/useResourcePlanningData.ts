import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ResourceTask {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: string | null;
}

export interface ResourcePerson {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  tasks: ResourceTask[];
}

export interface ResourcePlanningData {
  people: ResourcePerson[];
  unassigned: ResourceTask[];
  dateRange: { start: Date; end: Date };
  isLoading: boolean;
}

// Deterministic color from project ID
function projectColor(id: string): string {
  const colors = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

export function useResourcePlanningData(projectIds: string[]): ResourcePlanningData {
  const { data, isLoading } = useQuery({
    queryKey: ["resource-planning", projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return { people: [], unassigned: [], projects: [] };

      const [projectsRes, sharesRes, tasksRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name")
          .in("id", projectIds),
        supabase
          .from("project_shares")
          .select("shared_with_user_id, display_name, contractor_role, company, project_id")
          .in("project_id", projectIds)
          .not("shared_with_user_id", "is", null),
        supabase
          .from("tasks")
          .select("id, title, project_id, start_date, finish_date, progress, status, assigned_to_stakeholder_id")
          .in("project_id", projectIds)
          .not("start_date", "is", null)
          .not("finish_date", "is", null),
      ]);

      const projectMap = new Map((projectsRes.data || []).map((p) => [p.id, p.name]));

      // Fetch profile names for shared users
      const userIds = [...new Set((sharesRes.data || []).map((s) => s.shared_with_user_id).filter(Boolean))] as string[];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("id, name").in("id", userIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p) => [p.id, p.name]));

      // Build person map: profile id → person info (merged across projects)
      const personMap = new Map<string, { name: string; role: string | null; company: string | null }>();
      for (const share of sharesRes.data || []) {
        const uid = share.shared_with_user_id;
        if (!uid || personMap.has(uid)) continue;
        personMap.set(uid, {
          name: share.display_name || profileMap.get(uid) || "–",
          role: share.contractor_role || null,
          company: share.company || null,
        });
      }

      // Group tasks by assigned person
      const tasksByPerson = new Map<string, ResourceTask[]>();
      const unassigned: ResourceTask[] = [];

      for (const task of tasksRes.data || []) {
        const rt: ResourceTask = {
          id: task.id,
          title: task.title,
          projectId: task.project_id,
          projectName: projectMap.get(task.project_id) || "–",
          projectColor: projectColor(task.project_id),
          startDate: task.start_date!,
          endDate: task.finish_date!,
          progress: task.progress || 0,
          status: task.status,
        };

        const assignee = task.assigned_to_stakeholder_id;
        if (assignee && personMap.has(assignee)) {
          const arr = tasksByPerson.get(assignee) || [];
          arr.push(rt);
          tasksByPerson.set(assignee, arr);
        } else {
          unassigned.push(rt);
        }
      }

      // Build final people array
      const people: ResourcePerson[] = [];
      for (const [id, info] of personMap) {
        const tasks = tasksByPerson.get(id) || [];
        if (tasks.length > 0) {
          people.push({ id, ...info, tasks });
        }
      }

      // Sort by number of tasks descending
      people.sort((a, b) => b.tasks.length - a.tasks.length);

      return { people, unassigned, projects: projectsRes.data || [] };
    },
    enabled: projectIds.length > 0,
    staleTime: 60_000,
  });

  // Calculate date range: from earliest task start to latest task end (+ padding)
  const allTasks = [
    ...(data?.people.flatMap((p) => p.tasks) || []),
    ...(data?.unassigned || []),
  ];

  const now = new Date();
  let rangeStart = new Date(now);
  let rangeEnd = new Date(now);
  rangeEnd.setDate(rangeEnd.getDate() + 56); // default 8 weeks

  // Clamp range: max 3 months back, 6 months forward from today
  const minStart = new Date(now);
  minStart.setMonth(minStart.getMonth() - 3);
  const maxEnd = new Date(now);
  maxEnd.setMonth(maxEnd.getMonth() + 6);

  if (allTasks.length > 0) {
    const starts = allTasks.map((t) => new Date(t.startDate).getTime());
    const ends = allTasks.map((t) => new Date(t.endDate).getTime());
    rangeStart = new Date(Math.max(Math.min(...starts, now.getTime()), minStart.getTime()));
    rangeEnd = new Date(Math.min(Math.max(...ends, rangeEnd.getTime()), maxEnd.getTime()));
    // Pad 1 week each side
    rangeStart.setDate(rangeStart.getDate() - 7);
    rangeEnd.setDate(rangeEnd.getDate() + 7);
  }

  // Align to Monday
  rangeStart.setDate(rangeStart.getDate() - ((rangeStart.getDay() + 6) % 7));

  return {
    people: data?.people || [],
    unassigned: data?.unassigned || [],
    dateRange: { start: rangeStart, end: rangeEnd },
    isLoading,
  };
}
