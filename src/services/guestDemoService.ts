/**
 * Guest Demo Service
 * Seeds a demo project in localStorage for guest users
 */

import { v4 as uuidv4 } from 'uuid';
import {
  getGuestProjects,
  GUEST_STORAGE_KEYS,
} from './guestStorageService';
import type { GuestProject, GuestRoom, GuestTask } from '@/types/guest.types';

const DEMO_PROJECT_ID = 'demo-project-guest';

/**
 * Check if guest already has a demo project
 */
export function hasGuestDemoProject(): boolean {
  const projects = getGuestProjects();
  return projects.some((p) => p.id === DEMO_PROJECT_ID || p.project_type === 'demo_project');
}

/**
 * Get the guest demo project ID if it exists
 */
export function getGuestDemoProjectId(): string | null {
  const projects = getGuestProjects();
  const demo = projects.find((p) => p.id === DEMO_PROJECT_ID || p.project_type === 'demo_project');
  return demo?.id || null;
}

/**
 * Seed a demo project for guest users
 * Returns the project ID
 */
export function seedGuestDemoProject(): string {
  // Check if already exists
  const existingId = getGuestDemoProjectId();
  if (existingId) {
    return existingId;
  }

  const projectId = DEMO_PROJECT_ID;
  const today = new Date();

  // Create demo project
  const demoProject: GuestProject = {
    id: projectId,
    name: 'Villa Andersson - Renovering',
    description: 'Totalrenovering av villa från 1970-talet. Projektet omfattar kök, badrum och vardagsrum.',
    status: 'active',
    created_at: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
    address: 'Exempelgatan 123',
    postal_code: '123 45',
    city: 'Stockholm',
    project_type: 'demo_project',
    total_budget: 850000,
    start_date: today.toISOString().split('T')[0],
  };

  // Create demo rooms
  const kitchenId = uuidv4();
  const bathroomId = uuidv4();
  const livingRoomId = uuidv4();

  const demoRooms: GuestRoom[] = [
    {
      id: kitchenId,
      project_id: projectId,
      name: 'Kök',
      room_type: 'kitchen',
      status: 'to_be_renovated',
      area_sqm: 18,
      floor_number: 1,
      notes: 'Nytt kök med köksö. Behålla befintligt fönster.',
      created_at: new Date().toISOString(),
    },
    {
      id: bathroomId,
      project_id: projectId,
      name: 'Badrum',
      room_type: 'bathroom',
      status: 'to_be_renovated',
      area_sqm: 8,
      floor_number: 1,
      notes: 'Totalrenovering med nytt kakel och klinker. Dusch och badkar.',
      created_at: new Date().toISOString(),
    },
    {
      id: livingRoomId,
      project_id: projectId,
      name: 'Vardagsrum',
      room_type: 'living_room',
      status: 'existing',
      area_sqm: 35,
      floor_number: 1,
      notes: 'Målning och nya golv.',
      created_at: new Date().toISOString(),
    },
  ];

  // Create demo tasks
  const demoTasks: GuestTask[] = [
    {
      id: uuidv4(),
      project_id: projectId,
      room_id: kitchenId,
      title: 'Rivning av gammalt kök',
      description: 'Ta bort befintliga skåp, bänkskivor och vitvaror',
      status: 'completed',
      priority: 'high',
      due_date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      project_id: projectId,
      room_id: kitchenId,
      title: 'El-dragning kök',
      description: 'Dra ny el för köksö och extra uttag',
      status: 'in_progress',
      priority: 'high',
      due_date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      project_id: projectId,
      room_id: kitchenId,
      title: 'Montera nya köksskåp',
      description: 'IKEA-kök med vita luckor',
      status: 'to_do',
      priority: 'medium',
      due_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      project_id: projectId,
      room_id: bathroomId,
      title: 'Rivning badrum',
      description: 'Ta bort kakel, klinker och inredning',
      status: 'completed',
      priority: 'high',
      due_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      project_id: projectId,
      room_id: bathroomId,
      title: 'VVS-arbete',
      description: 'Ny rördragning för dusch och badkar',
      status: 'in_progress',
      priority: 'high',
      due_date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      project_id: projectId,
      room_id: bathroomId,
      title: 'Kakelsättning',
      description: 'Vitt kakel på väggar, grått klinker på golv',
      status: 'to_do',
      priority: 'medium',
      due_date: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      project_id: projectId,
      room_id: livingRoomId,
      title: 'Slipa och lacka golv',
      description: 'Befintligt ekgolv ska slipas och lackas',
      status: 'to_do',
      priority: 'low',
      due_date: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      project_id: projectId,
      room_id: livingRoomId,
      title: 'Måla väggar',
      description: 'Vit färg NCS S 0502-Y',
      status: 'to_do',
      priority: 'low',
      due_date: new Date(today.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    },
  ];

  // Save to localStorage
  const existingProjects = getGuestProjects();
  localStorage.setItem(GUEST_STORAGE_KEYS.projects, JSON.stringify([demoProject, ...existingProjects]));
  localStorage.setItem(GUEST_STORAGE_KEYS.rooms(projectId), JSON.stringify(demoRooms));
  localStorage.setItem(GUEST_STORAGE_KEYS.tasks(projectId), JSON.stringify(demoTasks));

  return projectId;
}
