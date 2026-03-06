import { useState, useCallback } from "react";

export type DemoViewRole = "homeowner" | "contractor";
export type DemoPhase = "planning" | "quote_sent" | "planning";

interface DemoPreferences {
  role: DemoViewRole | null;
  language: string | null;
  phase: DemoPhase;
}

const KEYS = {
  role: "demo_view_role",
  language: "demo_view_language",
  phase: "demo_view_phase",
} as const;

function readPreferences(): DemoPreferences {
  return {
    role: (localStorage.getItem(KEYS.role) as DemoViewRole | null),
    language: localStorage.getItem(KEYS.language),
    phase: (localStorage.getItem(KEYS.phase) as DemoPhase) || "planning",
  };
}

export function useDemoPreferences() {
  const [preferences, setPreferences] = useState<DemoPreferences>(readPreferences);

  const hasChosenRole = preferences.role !== null;

  const setRole = useCallback((role: DemoViewRole) => {
    localStorage.setItem(KEYS.role, role);
    setPreferences((prev) => ({ ...prev, role }));
  }, []);

  const setLanguage = useCallback((language: string) => {
    localStorage.setItem(KEYS.language, language);
    setPreferences((prev) => ({ ...prev, language }));
  }, []);

  const setPhase = useCallback((phase: DemoPhase) => {
    localStorage.setItem(KEYS.phase, phase);
    setPreferences((prev) => ({ ...prev, phase }));
  }, []);

  const resetPreferences = useCallback(() => {
    localStorage.removeItem(KEYS.role);
    localStorage.removeItem(KEYS.language);
    localStorage.removeItem(KEYS.phase);
    setPreferences({ role: null, language: null, phase: "planning" });
  }, []);

  return { preferences, hasChosenRole, setRole, setLanguage, setPhase, resetPreferences };
}
