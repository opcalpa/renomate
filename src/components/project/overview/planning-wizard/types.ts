import type { WorkType } from "@/services/intakeService";

export interface PlanningWizardRoom {
  id: string;
  name: string;
  nameKey?: string; // maps to getRoomSuggestions() for icon lookup
  width_m?: number;
  depth_m?: number;
  area_sqm?: number;
  ceiling_height_m?: number;
  aiSuggested?: boolean;
}

export interface RoomSpecificWork {
  description: string;
  workTypes: WorkType[];
}

export interface AIParsedResult {
  rooms: Array<{ nameKey: string; name: string; suggestedWorkTypes: WorkType[] }>;
  globalWorkTypes: WorkType[];
  summary: string;
}

export interface PlanningWizardData {
  // Step 1
  description: string;
  aiParsed: AIParsedResult | null;

  // Step 2
  rooms: PlanningWizardRoom[];

  // Step 3 — global work types applied to ALL rooms
  globalWorkTypes: WorkType[];

  // Step 4 — per-room specific work
  roomSpecificWork: Record<string, RoomSpecificWork>;
}

export interface PlanningStepProps {
  formData: PlanningWizardData;
  updateFormData: (updates: Partial<PlanningWizardData>) => void;
}

export const TOTAL_STEPS = 4;

export const INITIAL_FORM_DATA: PlanningWizardData = {
  description: "",
  aiParsed: null,
  rooms: [],
  globalWorkTypes: [],
  roomSpecificWork: {},
};
