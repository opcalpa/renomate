// ---------------------------------------------------------------------------
// RFQ Clone — copies a homeowner's project scope into a new builder project
// ---------------------------------------------------------------------------

import { supabase } from "@/integrations/supabase/client";

interface CloneResult {
  projectId: string;
  tasksCloned: number;
  roomsCloned: number;
}

/**
 * Clone a homeowner RFQ project into a new builder project.
 *
 * Copies: project metadata, rooms (with dimensions), tasks (scope only, no pricing).
 * The new project gets `source_rfq_project_id` pointing back to the original.
 * The builder is set as owner; the homeowner is added as a client share.
 */
export async function cloneRfqForBuilder(
  sourceProjectId: string,
  builderProfileId: string
): Promise<CloneResult> {
  // 1. Fetch source project
  const { data: source, error: projErr } = await supabase
    .from("projects")
    .select("name, description, address, postal_code, city, project_type, start_date, finish_goal_date, property_designation, owner_id")
    .eq("id", sourceProjectId)
    .single();

  if (projErr || !source) throw new Error("Could not read source project");

  // 2. Create builder's project
  const { data: newProject, error: createErr } = await supabase
    .from("projects")
    .insert({
      name: source.name,
      description: source.description,
      address: source.address,
      postal_code: source.postal_code,
      city: source.city,
      project_type: source.project_type,
      start_date: source.start_date,
      finish_goal_date: source.finish_goal_date,
      property_designation: source.property_designation,
      owner_id: builderProfileId,
      status: "planning",
      source_rfq_project_id: sourceProjectId,
    })
    .select("id")
    .single();

  if (createErr || !newProject) throw new Error("Could not create project");
  const newProjectId = newProject.id;

  // 3. Clone rooms — map old IDs to new IDs for task linking
  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, dimensions, ceiling_height_mm, room_type, room_status")
    .eq("project_id", sourceProjectId)
    .order("created_at", { ascending: true });

  const roomIdMap = new Map<string, string>();
  let roomsCloned = 0;

  if (rooms && rooms.length > 0) {
    for (const room of rooms) {
      const { data: newRoom } = await supabase
        .from("rooms")
        .insert({
          project_id: newProjectId,
          name: room.name,
          dimensions: room.dimensions,
          ceiling_height_mm: room.ceiling_height_mm,
          room_type: room.room_type,
          room_status: room.room_status,
        })
        .select("id")
        .single();

      if (newRoom) {
        roomIdMap.set(room.id, newRoom.id);
        roomsCloned++;
      }
    }
  }

  // 4. Clone tasks — scope only (title, description, room links, cost_center)
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, description, room_id, room_ids, cost_center, sort_order")
    .eq("project_id", sourceProjectId)
    .order("sort_order", { ascending: true });

  let tasksCloned = 0;

  if (tasks && tasks.length > 0) {
    for (const task of tasks) {
      const newRoomId = task.room_id ? roomIdMap.get(task.room_id) ?? null : null;
      const newRoomIds = task.room_ids
        ? (task.room_ids as string[]).map((id) => roomIdMap.get(id) ?? id).filter(Boolean)
        : null;

      const { error: taskErr } = await supabase
        .from("tasks")
        .insert({
          project_id: newProjectId,
          title: task.title,
          description: task.description,
          room_id: newRoomId,
          room_ids: newRoomIds,
          cost_center: task.cost_center,
          sort_order: task.sort_order,
          status: "to_do",
        });

      if (!taskErr) tasksCloned++;
    }
  }

  // 5. Add homeowner as client share on builder's project
  await supabase.from("project_shares").insert({
    project_id: newProjectId,
    shared_with_user_id: source.owner_id,
    role: "viewer",
    role_type: "client",
    customer_view_access: "view",
    budget_access: "none",
    tasks_access: "view",
    tasks_scope: "all",
  });

  return { projectId: newProjectId, tasksCloned, roomsCloned };
}
