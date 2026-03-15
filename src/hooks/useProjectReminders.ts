/**
 * useProjectReminders — Computes "grundfunktions" reminders for a project.
 *
 * These are core app actions most users should complete to get full value.
 * Used by both the Overview reminder section and Renomate Junior's greeting.
 */

import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectReminder {
  id: string;
  titleKey: string;
  bodyKey: string;
  severity: "warning" | "info";  // warning = orange, info = blue
  actionTarget?: string;         // navigation target: "tasks", "settings", "budget", etc.
  actionKey?: string;            // i18n key for action button
}

interface ProjectReminderContext {
  projectId: string;
  taskCount: number;
  completionPct: number;
  hasBudget: boolean;
  budgetPct: number;
  hasStartDate: boolean;
  hasFinishDate: boolean;
  hasTeam: boolean;
  isPlanning: boolean;
  isHomeowner: boolean;
  propertyDesignation?: string | null;
  rotPersonnummer?: string | null;
}

function computeReminders(
  ctx: ProjectReminderContext,
  roomCount: number,
  unlinkedTaskCount: number
): ProjectReminder[] {
  const reminders: ProjectReminder[] = [];

  // No tasks created
  if (ctx.taskCount === 0) {
    reminders.push({
      id: "no_tasks",
      titleKey: "reminders.noTasks.title",
      bodyKey: "reminders.noTasks.body",
      severity: "info",
      actionTarget: "tasks",
      actionKey: "reminders.noTasks.action",
    });
  }

  // No rooms created (but has tasks)
  if (ctx.taskCount > 0 && roomCount === 0) {
    reminders.push({
      id: "no_rooms",
      titleKey: "reminders.noRooms.title",
      bodyKey: "reminders.noRooms.body",
      severity: "info",
      actionTarget: "floormap",
      actionKey: "reminders.noRooms.action",
    });
  }

  // Tasks and rooms exist but not linked
  if (ctx.taskCount > 0 && roomCount > 0 && unlinkedTaskCount > 0) {
    reminders.push({
      id: "unlinked_tasks",
      titleKey: "reminders.unlinkedTasks.title",
      bodyKey: "reminders.unlinkedTasks.body",
      severity: "info",
      actionTarget: "tasks",
      actionKey: "reminders.unlinkedTasks.action",
    });
  }

  // No finish date
  if (!ctx.hasFinishDate && ctx.taskCount > 0) {
    reminders.push({
      id: "no_deadline",
      titleKey: "reminders.noDeadline.title",
      bodyKey: "reminders.noDeadline.body",
      severity: "warning",
      actionTarget: "settings",
      actionKey: "reminders.noDeadline.action",
    });
  }

  // No start date
  if (!ctx.hasStartDate && ctx.taskCount > 0) {
    reminders.push({
      id: "no_start_date",
      titleKey: "reminders.noStartDate.title",
      bodyKey: "reminders.noStartDate.body",
      severity: "info",
      actionTarget: "settings",
      actionKey: "reminders.noStartDate.action",
    });
  }

  // ROT: missing personnummer (active phase, homeowner)
  if (!ctx.isPlanning && ctx.isHomeowner && !ctx.rotPersonnummer) {
    reminders.push({
      id: "rot_personnummer",
      titleKey: "reminders.rotPersonnummer.title",
      bodyKey: "reminders.rotPersonnummer.body",
      severity: "warning",
    });
  }

  // ROT: missing property designation (active phase)
  if (!ctx.isPlanning && !ctx.propertyDesignation) {
    reminders.push({
      id: "rot_property",
      titleKey: "reminders.rotProperty.title",
      bodyKey: "reminders.rotProperty.body",
      severity: "warning",
      actionTarget: "settings",
      actionKey: "reminders.rotProperty.action",
    });
  }

  // No budget set (active phase)
  if (!ctx.isPlanning && !ctx.hasBudget && ctx.taskCount > 0) {
    reminders.push({
      id: "no_budget",
      titleKey: "reminders.noBudget.title",
      bodyKey: "reminders.noBudget.body",
      severity: "info",
      actionTarget: "budget",
      actionKey: "reminders.noBudget.action",
    });
  }

  // Budget over 100%
  if (ctx.hasBudget && ctx.budgetPct > 100) {
    reminders.push({
      id: "budget_over",
      titleKey: "reminders.budgetOver.title",
      bodyKey: "reminders.budgetOver.body",
      severity: "warning",
      actionTarget: "budget",
      actionKey: "reminders.budgetOver.action",
    });
  }

  return reminders;
}

const DISMISSED_KEY = "renomate_dismissed_reminders";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function saveDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch { /* ignore */ }
}

export function useProjectReminders(ctx: ProjectReminderContext | null) {
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);
  const [roomCount, setRoomCount] = useState(0);
  const [unlinkedTaskCount, setUnlinkedTaskCount] = useState(0);

  // Fetch room count and unlinked task count
  useEffect(() => {
    if (!ctx) return;
    const fetchCounts = async () => {
      const [roomRes, taskRes] = await Promise.all([
        supabase
          .from("rooms")
          .select("id", { count: "exact", head: true })
          .eq("project_id", ctx.projectId),
        supabase
          .from("tasks")
          .select("id, room_id", { count: "exact" })
          .eq("project_id", ctx.projectId),
      ]);
      setRoomCount(roomRes.count ?? 0);
      const tasks = taskRes.data ?? [];
      setUnlinkedTaskCount(tasks.filter(t => !t.room_id).length);
    };
    fetchCounts();
  }, [ctx?.projectId, ctx?.taskCount]);

  const allReminders = useMemo(() => {
    if (!ctx) return [];
    return computeReminders(ctx, roomCount, unlinkedTaskCount);
  }, [ctx, roomCount, unlinkedTaskCount]);

  const reminders = useMemo(
    () => allReminders.filter(r => !dismissed.has(r.id)),
    [allReminders, dismissed]
  );

  const dismissReminder = (id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  };

  const dismissAll = () => {
    setDismissed(prev => {
      const next = new Set(prev);
      for (const r of allReminders) next.add(r.id);
      saveDismissed(next);
      return next;
    });
  };

  return { reminders, dismissReminder, dismissAll, totalCount: allReminders.length };
}
