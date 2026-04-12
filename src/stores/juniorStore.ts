/**
 * Lightweight store for Renofine Junior chatbot state.
 * Used to pass project reminder data from OverviewTab to the global HelpBot component.
 */
import { create } from "zustand";
import type { ProjectReminder } from "@/hooks/useProjectReminders";

interface JuniorState {
  reminderCount: number;
  reminders: ProjectReminder[];
  projectName: string | null;
  projectCountry: string | null;
  setReminders: (reminders: ProjectReminder[], projectName?: string, projectCountry?: string) => void;
  clear: () => void;
}

export const useJuniorStore = create<JuniorState>((set) => ({
  reminderCount: 0,
  reminders: [],
  projectName: null,
  projectCountry: null,
  setReminders: (reminders, projectName, projectCountry) =>
    set({ reminders, reminderCount: reminders.length, projectName: projectName ?? null, projectCountry: projectCountry ?? null }),
  clear: () => set({ reminders: [], reminderCount: 0, projectName: null, projectCountry: null }),
}));
