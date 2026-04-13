import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PortfolioProject {
  id: string;
  name: string;
  status: string | null;
  start_date: string | null;
  finish_goal_date: string | null;
}

export interface PortfolioTask {
  id: string;
  title: string;
  status: string | null;
  start_date: string | null;
  finish_date: string | null;
  progress: number | null;
  project_id: string;
}

export interface PortfolioTimelineData {
  projects: PortfolioProject[];
  tasksByProject: Map<string, PortfolioTask[]>;
}

export function usePortfolioTimelineData(projectIds: string[]) {
  return useQuery<PortfolioTimelineData>({
    queryKey: ["portfolio-timeline", projectIds],
    queryFn: async () => {
      const [projectsRes, tasksRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name, status, start_date, finish_goal_date")
          .in("id", projectIds),
        supabase
          .from("tasks")
          .select("id, title, status, start_date, finish_date, progress, project_id")
          .in("project_id", projectIds)
          .not("start_date", "is", null)
          .order("start_date", { ascending: true }),
      ]);

      const projects = (projectsRes.data || []) as PortfolioProject[];
      const tasks = (tasksRes.data || []) as PortfolioTask[];

      const tasksByProject = new Map<string, PortfolioTask[]>();
      for (const task of tasks) {
        const arr = tasksByProject.get(task.project_id);
        if (arr) arr.push(task);
        else tasksByProject.set(task.project_id, [task]);
      }

      return { projects, tasksByProject };
    },
    enabled: projectIds.length > 0,
    staleTime: 60_000,
  });
}
