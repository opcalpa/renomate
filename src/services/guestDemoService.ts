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
export function seedGuestDemoProject(language?: string): string {
  // Check if already exists
  const existingId = getGuestDemoProjectId();
  if (existingId) {
    return existingId;
  }

  const projectId = DEMO_PROJECT_ID;
  const today = new Date();
  const lang = language || navigator.language?.split("-")[0] || "sv";
  const en = lang === "en";

  // Create demo project
  const demoProject: GuestProject = {
    id: projectId,
    name: en ? 'Villa Andersson - Renovation' : 'Villa Andersson - Renovering',
    description: en
      ? 'Full renovation of a 1970s villa. The project covers kitchen, bathroom and living room.'
      : 'Totalrenovering av villa från 1970-talet. Projektet omfattar kök, badrum och vardagsrum.',
    status: 'active',
    created_at: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    address: en ? '123 Example Street' : 'Exempelgatan 123',
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
      name: en ? 'Kitchen' : 'Kök',
      room_type: 'kitchen',
      status: 'to_be_renovated',
      area_sqm: 18,
      floor_number: 1,
      notes: en ? 'New kitchen with island. Keep existing window.' : 'Nytt kök med köksö. Behålla befintligt fönster.',
      created_at: new Date().toISOString(),
    },
    {
      id: bathroomId,
      project_id: projectId,
      name: en ? 'Bathroom' : 'Badrum',
      room_type: 'bathroom',
      status: 'to_be_renovated',
      area_sqm: 8,
      floor_number: 1,
      notes: en ? 'Full renovation with new tiles. Shower and bathtub.' : 'Totalrenovering med nytt kakel och klinker. Dusch och badkar.',
      created_at: new Date().toISOString(),
    },
    {
      id: livingRoomId,
      project_id: projectId,
      name: en ? 'Living Room' : 'Vardagsrum',
      room_type: 'living_room',
      status: 'existing',
      area_sqm: 35,
      floor_number: 1,
      notes: en ? 'Painting and new floors.' : 'Målning och nya golv.',
      created_at: new Date().toISOString(),
    },
  ];

  // Create demo tasks
  const demoTasks: GuestTask[] = [
    {
      id: uuidv4(),
      project_id: projectId,
      room_id: kitchenId,
      title: en ? 'Demolish old kitchen' : 'Rivning av gammalt kök',
      description: en ? 'Remove existing cabinets, countertops and appliances' : 'Ta bort befintliga skåp, bänkskivor och vitvaror',
      status: 'completed',
      priority: 'high',
      due_date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      project_id: projectId,
      room_id: kitchenId,
      title: en ? 'Kitchen electrical wiring' : 'El-dragning kök',
      description: en ? 'Run new wiring for kitchen island and extra outlets' : 'Dra ny el för köksö och extra uttag',
      status: 'in_progress',
      priority: 'high',
      due_date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      project_id: projectId,
      room_id: kitchenId,
      title: en ? 'Install new kitchen cabinets' : 'Montera nya köksskåp',
      description: en ? 'IKEA kitchen with white cabinet fronts' : 'IKEA-kök med vita luckor',
      status: 'to_do',
      priority: 'medium',
      due_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      project_id: projectId,
      room_id: bathroomId,
      title: en ? 'Bathroom demolition' : 'Rivning badrum',
      description: en ? 'Remove tiles and fixtures' : 'Ta bort kakel, klinker och inredning',
      status: 'completed',
      priority: 'high',
      due_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      project_id: projectId,
      room_id: bathroomId,
      title: en ? 'Plumbing work' : 'VVS-arbete',
      description: en ? 'New piping for shower and bathtub' : 'Ny rördragning för dusch och badkar',
      status: 'in_progress',
      priority: 'high',
      due_date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      project_id: projectId,
      room_id: bathroomId,
      title: en ? 'Tiling' : 'Kakelsättning',
      description: en ? 'White wall tiles, grey floor tiles' : 'Vitt kakel på väggar, grått klinker på golv',
      status: 'to_do',
      priority: 'medium',
      due_date: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      project_id: projectId,
      room_id: livingRoomId,
      title: en ? 'Sand and lacquer floors' : 'Slipa och lacka golv',
      description: en ? 'Existing oak floor to be sanded and lacquered' : 'Befintligt ekgolv ska slipas och lackas',
      status: 'to_do',
      priority: 'low',
      due_date: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      project_id: projectId,
      room_id: livingRoomId,
      title: en ? 'Paint walls' : 'Måla väggar',
      description: en ? 'White paint NCS S 0502-Y' : 'Vit färg NCS S 0502-Y',
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
