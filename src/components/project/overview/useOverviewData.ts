import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProjectActivities } from "../feed/utils";
import { differenceInDays, parseISO, startOfDay } from "date-fns";
import type { OverviewTask, TaskStats, BudgetStats, OrderStats, TimelineStats, OverviewData, OverviewProject } from "./types";

interface RawTask {
  id: string;
  title: string;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  progress: number | null;
  assigned_to_contractor_id: string | null;
  assigned_to_stakeholder_id?: string | null;
  budget: number | null;
}

interface Stakeholder {
  id: string;
  name: string;
}

interface Material {
  price_total: number | null;
  exclude_from_budget: boolean;
  status: string | null;
}

export function useOverviewData(project: OverviewProject): OverviewData {
  const [loading, setLoading] = useState(true);
  const [taskStats, setTaskStats] = useState<TaskStats>({
    total: 0, completed: 0, inProgress: 0, overdue: [], blockedOrOnHold: [], percentage: 0,
  });
  const [budgetStats, setBudgetStats] = useState<BudgetStats>({
    total: null, spent: 0, percentage: 0, isWarning: false,
  });
  const [orderStats, setOrderStats] = useState<OrderStats>({ pendingCount: 0 });
  const [timelineStats, setTimelineStats] = useState<TimelineStats>({
    finishGoalDate: null, startDate: null, daysRemaining: null,
  });
  const [inProgressTasks, setInProgressTasks] = useState<OverviewTask[]>([]);
  const [recentActivities, setRecentActivities] = useState<import("../feed/types").ActivityLogItem[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, stakeholdersRes, materialsRes, activitiesData] = await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .eq("project_id", project.id),
        supabase
          .from("stakeholders" as never)
          .select("id, name")
          .eq("project_id", project.id),
        supabase
          .from("materials")
          .select("price_total, exclude_from_budget, status")
          .eq("project_id", project.id),
        fetchProjectActivities(project.id),
      ]);

      const tasks: RawTask[] = (tasksRes.data || []) as unknown as RawTask[];
      const stakeholders: Stakeholder[] = (stakeholdersRes.data || []) as unknown as Stakeholder[];
      const materials: Material[] = materialsRes.data || [];

      const stakeholderMap = new Map(stakeholders.map(s => [s.id, s.name]));
      const today = startOfDay(new Date());

      // Task stats
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === "completed").length;
      const inProgressCount = tasks.filter(t => t.status === "in_progress").length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      const mapTask = (t: RawTask): OverviewTask => {
        const assigneeId = t.assigned_to_stakeholder_id || t.assigned_to_contractor_id;
        return {
          id: t.id,
          title: t.title,
          status: t.status || "",
          priority: t.priority || "",
          due_date: t.due_date,
          progress: t.progress || 0,
          assigned_to_contractor_id: assigneeId || null,
          assignee_name: assigneeId ? stakeholderMap.get(assigneeId) || null : null,
        };
      };

      const overdue = tasks
        .filter(t => t.due_date && t.status !== "completed" && startOfDay(parseISO(t.due_date)) < today)
        .map(mapTask);

      const blockedOrOnHold = tasks
        .filter(t => t.status && ["on_hold", "blocked", "waiting"].includes(t.status))
        .map(mapTask);

      setTaskStats({ total, completed, inProgress: inProgressCount, overdue, blockedOrOnHold, percentage });

      // In-progress tasks (limit 5)
      const inProgressList = tasks
        .filter(t => t.status === "in_progress")
        .slice(0, 5)
        .map(mapTask);
      setInProgressTasks(inProgressList);

      // Budget stats
      const taskBudgetTotal = tasks.reduce((sum, t) => sum + (t.budget || 0), 0);
      const materialCostTotal = materials.reduce((sum, m) => {
        if (m.exclude_from_budget) return sum;
        return sum + (m.price_total || 0);
      }, 0);
      const spent = taskBudgetTotal + materialCostTotal;
      const totalBudget = project.total_budget;
      const budgetPercentage = totalBudget && totalBudget > 0
        ? Math.round((spent / totalBudget) * 100)
        : 0;
      setBudgetStats({
        total: totalBudget,
        spent,
        percentage: budgetPercentage,
        isWarning: budgetPercentage > 80,
      });

      // Order stats
      const pendingCount = materials.filter(m => m.status === "submitted").length;
      setOrderStats({ pendingCount });

      // Timeline stats
      const finishGoalDate = project.finish_goal_date;
      const daysRemaining = finishGoalDate
        ? differenceInDays(parseISO(finishGoalDate), today)
        : null;
      setTimelineStats({
        finishGoalDate,
        startDate: project.start_date,
        daysRemaining,
      });

      // Recent activities (limit 8)
      setRecentActivities(activitiesData.slice(0, 8));
    } catch (error: unknown) {
      console.error("Failed to load overview data:", error);
    } finally {
      setLoading(false);
    }
  }, [project.id, project.total_budget, project.finish_goal_date, project.start_date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    taskStats,
    budgetStats,
    orderStats,
    timelineStats,
    inProgressTasks,
    recentActivities,
    loading,
    refetch: fetchData,
  };
}
