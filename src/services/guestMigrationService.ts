/**
 * Guest Migration Service
 * Handles migrating guest data from localStorage to Supabase when user logs in
 */

import { supabase } from '@/integrations/supabase/client';
import {
  getAllGuestData,
  clearAllGuestData,
  hasGuestProjectsToMigrate,
  exitGuestMode,
} from './guestStorageService';
import type { MigrationResult, GuestProject, GuestRoom, GuestTask } from '@/types/guest.types';

export { hasGuestProjectsToMigrate };

export async function migrateGuestProjects(
  profileId: string,
  projectIdsToMigrate?: string[]
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedProjects: 0,
    migratedRooms: 0,
    migratedTasks: 0,
    errors: [],
  };

  try {
    const guestData = getAllGuestData();

    // Filter projects if specific IDs are provided
    const projectsToMigrate = projectIdsToMigrate
      ? guestData.projects.filter((p) => projectIdsToMigrate.includes(p.id))
      : guestData.projects;

    if (projectsToMigrate.length === 0) {
      result.success = true;
      return result;
    }

    // Map to track old guest IDs to new database IDs
    const projectIdMap = new Map<string, string>();
    const roomIdMap = new Map<string, string>();

    // Migrate projects
    for (const guestProject of projectsToMigrate) {
      try {
        const { data: newProject, error } = await supabase
          .from('projects')
          .insert({
            name: guestProject.name,
            description: guestProject.description,
            status: guestProject.status || 'active',
            owner_id: profileId,
            address: guestProject.address,
            postal_code: guestProject.postal_code,
            city: guestProject.city,
            project_type: guestProject.project_type,
            start_date: guestProject.start_date,
            total_budget: guestProject.total_budget,
          })
          .select()
          .single();

        if (error) {
          result.errors.push(`Project "${guestProject.name}": ${error.message}`);
          continue;
        }

        projectIdMap.set(guestProject.id, newProject.id);
        result.migratedProjects++;

        // Migrate rooms for this project
        const guestRooms = guestData.rooms[guestProject.id] || [];
        for (const guestRoom of guestRooms) {
          try {
            const { data: newRoom, error: roomError } = await supabase
              .from('rooms')
              .insert({
                project_id: newProject.id,
                name: guestRoom.name,
                room_type: guestRoom.room_type,
                status: guestRoom.status || 'existing',
                area_sqm: guestRoom.area_sqm,
                floor_number: guestRoom.floor_number,
                notes: guestRoom.notes,
              })
              .select()
              .single();

            if (roomError) {
              result.errors.push(`Room "${guestRoom.name}": ${roomError.message}`);
              continue;
            }

            roomIdMap.set(guestRoom.id, newRoom.id);
            result.migratedRooms++;
          } catch (roomErr) {
            result.errors.push(`Room "${guestRoom.name}": ${(roomErr as Error).message}`);
          }
        }

        // Migrate tasks for this project
        const guestTasks = guestData.tasks[guestProject.id] || [];
        for (const guestTask of guestTasks) {
          try {
            // Map room_id to new ID if it exists
            const newRoomId = guestTask.room_id ? roomIdMap.get(guestTask.room_id) : null;

            const { error: taskError } = await supabase
              .from('tasks')
              .insert({
                project_id: newProject.id,
                room_id: newRoomId || null,
                title: guestTask.title,
                description: guestTask.description,
                status: guestTask.status || 'to_do',
                priority: guestTask.priority || 'medium',
                due_date: guestTask.due_date,
              });

            if (taskError) {
              result.errors.push(`Task "${guestTask.title}": ${taskError.message}`);
              continue;
            }

            result.migratedTasks++;
          } catch (taskErr) {
            result.errors.push(`Task "${guestTask.title}": ${(taskErr as Error).message}`);
          }
        }
      } catch (projErr) {
        result.errors.push(`Project "${guestProject.name}": ${(projErr as Error).message}`);
      }
    }

    // If all requested projects were migrated, clear guest data
    if (result.migratedProjects === projectsToMigrate.length) {
      clearAllGuestData();
      exitGuestMode();
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push(`Migration failed: ${(error as Error).message}`);
    return result;
  }
}

export function getGuestProjectsForMigration(): GuestProject[] {
  const guestData = getAllGuestData();
  return guestData.projects;
}
