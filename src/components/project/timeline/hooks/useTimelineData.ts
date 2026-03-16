import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  TimelineTask,
  TimelineDependency,
  TeamMember,
  Room,
} from "../types";

interface UseTimelineDataResult {
  tasks: TimelineTask[];
  allTasks: TimelineTask[];
  dependencies: TimelineDependency[];
  teamMembers: TeamMember[];
  rooms: Room[];
  loading: boolean;
  refetch: () => void;
}

export function useTimelineData(projectId: string): UseTimelineDataResult {
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [allTasks, setAllTasks] = useState<TimelineTask[]>([]);
  const [dependencies, setDependencies] = useState<TimelineDependency[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    // Fetch all tasks (for unscheduled count)
    const { data: all, error: allError } = await supabase
      .from("tasks")
      .select(
        "id, title, status, priority, start_date, finish_date, progress, assigned_to_stakeholder_id, room_id"
      )
      .eq("project_id", projectId)
      .order("start_date", { ascending: true });

    if (allError) {
      console.error("Failed to fetch timeline tasks:", allError);
      return;
    }

    setAllTasks(all || []);
    setTasks(
      (all || []).filter(
        (t) => t.start_date !== null && t.finish_date !== null
      )
    );
  }, [projectId]);

  const fetchDependencies = useCallback(async () => {
    const { data, error } = await supabase
      .from("task_dependencies")
      .select("*");

    if (error) {
      console.error("Failed to fetch dependencies:", error);
      return;
    }
    setDependencies(data || []);
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    const { data: projectData } = await supabase
      .from("projects")
      .select("owner_id, profiles!projects_owner_id_fkey(id, name)")
      .eq("id", projectId)
      .single();

    const members: TeamMember[] = [];
    if (projectData?.profiles) {
      const p = projectData.profiles as unknown as {
        id: string;
        name: string;
      };
      members.push({ id: p.id, name: p.name });
    }

    const { data: shares } = await supabase
      .from("project_shares")
      .select(
        "shared_with_user_id, profiles!project_shares_shared_with_user_id_fkey(id, name)"
      )
      .eq("project_id", projectId);

    if (shares) {
      const existingIds = new Set(members.map((m) => m.id));
      for (const share of shares) {
        const p = share.profiles as unknown as {
          id: string;
          name: string;
        } | null;
        if (p && !existingIds.has(p.id)) {
          existingIds.add(p.id);
          members.push({ id: p.id, name: p.name });
        }
      }
    }

    setTeamMembers(members);
  }, [projectId]);

  const fetchRooms = useCallback(async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("id, name")
      .eq("project_id", projectId)
      .order("name");

    if (error) {
      console.error("Failed to fetch rooms:", error);
      return;
    }
    setRooms(data || []);
  }, [projectId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchTasks(),
      fetchDependencies(),
      fetchTeamMembers(),
      fetchRooms(),
    ]);
    setLoading(false);
  }, [fetchTasks, fetchDependencies, fetchTeamMembers, fetchRooms]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    tasks,
    allTasks,
    dependencies,
    teamMembers,
    rooms,
    loading,
    refetch: fetchAll,
  };
}
