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

  // 2. Global work types → ONE task per type, linked to ALL applicable rooms via room_ids
  //    with checklist items per room for tracking
  for (const workType of data.globalWorkTypes) {
    const applicableRooms = data.rooms.filter((room) => {
      const excluded = data.roomSpecificWork[room.id]?.excludedGlobals ?? [];
      return !excluded.includes(workType);
    });
    if (applicableRooms.length === 0) continue;

    const roomIds = applicableRooms
      .map((r) => roomNameToId.get(r.id))
      .filter(Boolean) as string[];

    // Create checklist with one item per room
    const checklist = {
      id: crypto.randomUUID(),
      title: getWorkTypeLabel(workType),
      items: applicableRooms.map((r) => ({
        id: crypto.randomUUID(),
        title: r.name,
        completed: false,
      })),
    };

    const { error } = await supabase.from("tasks").insert({
      project_id: projectId,
      room_id: roomIds[0], // primary room
      room_ids: roomIds,
      title: getWorkTypeLabel(workType),
      description: applicableRooms.map((r) => r.name).join(", "),
      status: "planned",
      priority: "medium",
      cost_center: workTypeToCostCenter(workType),
      created_by_user_id: profileId,
      checklists: [checklist],
    });
    if (!error) taskCount++;
  }

  // 3. Room-specific work types → one task per room-workType combo
  for (const room of data.rooms) {
    const dbRoomId = roomNameToId.get(room.id);
    if (!dbRoomId) continue;

    const specific = data.roomSpecificWork[room.id];
    if (!specific) continue;

    // Room-specific work types (excluding globals)
    for (const workType of specific.workTypes) {
      if (data.globalWorkTypes.includes(workType)) continue; // already handled globally
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

    // Free-text description → general task for this room
    if (specific.description?.trim()) {
      const desc = specific.description.trim();
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
