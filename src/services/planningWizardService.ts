import { supabase } from "@/integrations/supabase/client";
import { workTypeToCostCenter, getWorkTypeLabel } from "./intakeService";
import type { WorkType } from "./intakeService";
import type { PlanningWizardData } from "@/components/project/overview/planning-wizard/types";

/**
 * Populate an existing project with rooms and tasks from the planning wizard.
 * Follows the same pattern as createProjectFromGuidedSetup but operates on an
 * existing project (homeowner already created it).
 */
export async function populateProjectFromPlanningWizard(
  projectId: string,
  data: PlanningWizardData,
  profileId: string
): Promise<{ roomCount: number; taskCount: number }> {
  const roomNameToId = new Map<string, string>();
  let taskCount = 0;

  // 1. Create rooms with optional dimensions
  for (const room of data.rooms) {
    const dimensions: Record<string, number> = {};
    if (room.area_sqm) dimensions.area_sqm = room.area_sqm;
    if (room.width_m) dimensions.width_mm = Math.round(room.width_m * 1000);
    if (room.depth_m) dimensions.height_mm = Math.round(room.depth_m * 1000);

    const { data: created, error } = await supabase
      .from("rooms")
      .insert({
        project_id: projectId,
        name: room.name,
        ceiling_height_mm: room.ceiling_height_m ? Math.round(room.ceiling_height_m * 1000) : null,
        dimensions: Object.keys(dimensions).length > 0 ? dimensions : null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create room:", error);
      continue;
    }
    roomNameToId.set(room.id, created.id);
  }

  // 2. Collect all work types per room to deduplicate
  const tasksByRoom = new Map<string, Set<WorkType>>();
  for (const room of data.rooms) {
    tasksByRoom.set(room.id, new Set<WorkType>());
  }

  // Global work types → applied to every room
  for (const workType of data.globalWorkTypes) {
    for (const room of data.rooms) {
      tasksByRoom.get(room.id)!.add(workType);
    }
  }

  // Room-specific work types (skip if already global)
  for (const room of data.rooms) {
    const specific = data.roomSpecificWork[room.id];
    if (!specific) continue;
    for (const workType of specific.workTypes) {
      tasksByRoom.get(room.id)!.add(workType);
    }
  }

  // 3. Create tasks from deduplicated sets
  for (const room of data.rooms) {
    const dbRoomId = roomNameToId.get(room.id);
    if (!dbRoomId) continue;

    const workTypes = tasksByRoom.get(room.id)!;
    for (const workType of workTypes) {
      const { error } = await supabase.from("tasks").insert({
        project_id: projectId,
        room_id: dbRoomId,
        title: `${getWorkTypeLabel(workType)} - ${room.name}`,
        status: "planned",
        priority: "medium",
        cost_center: workTypeToCostCenter(workType),
        created_by_user_id: profileId,
      });
      if (!error) taskCount++;
    }

    // Free-text description without specific work type → create a general task
    const specific = data.roomSpecificWork[room.id];
    if (specific?.description?.trim()) {
      const desc = specific.description.trim();
      // Only create if there are no typed tasks for this room, or description adds context
      const { error } = await supabase.from("tasks").insert({
        project_id: projectId,
        room_id: dbRoomId,
        title: room.name,
        description: desc,
        status: "planned",
        priority: "medium",
        cost_center: "other",
        created_by_user_id: profileId,
      });
      if (!error) taskCount++;
    }
  }

  return { roomCount: data.rooms.length, taskCount };
}
