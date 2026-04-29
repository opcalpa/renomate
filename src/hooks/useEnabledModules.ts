import { useCallback, useMemo } from "react";
import { usePersistedPreference } from "./usePersistedPreference";
import {
  modulesForTab,
  modulesForSection,
  modulesForRoute,
  modulesForRegion,
  defaultModulesForProfile,
  type ProfileSize,
} from "@/lib/modules";

const STORAGE_KEY = "enabled_modules";

/**
 * Hook for reading and toggling feature modules.
 *
 * Modules are persisted in localStorage + synced to profiles.ui_preferences.
 * `null` means "never configured" → use defaults for the profile type + region.
 *
 * @param profileSize - User's profile type (solo/small/company/homeowner)
 * @param region - ISO country code (e.g. "SE") or null for universal-only
 */
export function useEnabledModules(profileSize: ProfileSize = "small", region: string | null = null) {
  const defaults = useMemo(() => defaultModulesForProfile(profileSize, region), [profileSize, region]);
  const [stored, setStored] = usePersistedPreference<string[] | null>(STORAGE_KEY, null);

  /** Active module ids — defaults until user explicitly configures */
  const enabledModules = useMemo(() => stored ?? defaults, [stored, defaults]);

  /** Whether the user has ever configured modules (for onboarding gate) */
  const isConfigured = stored !== null;

  /** Check if a specific module is enabled */
  const isModuleEnabled = useCallback(
    (moduleId: string) => enabledModules.includes(moduleId),
    [enabledModules],
  );

  /** Check if a project tab should be visible (tabs not controlled by any module are always visible) */
  const isTabEnabled = useCallback(
    (tabId: string) => {
      const controlling = modulesForTab(tabId);
      if (controlling.length === 0) return true; // not module-gated
      return controlling.some((id) => enabledModules.includes(id));
    },
    [enabledModules],
  );

  /** Check if a start-page section should be visible */
  const isSectionEnabled = useCallback(
    (sectionId: string) => {
      const controlling = modulesForSection(sectionId);
      if (controlling.length === 0) return true;
      return controlling.some((id) => enabledModules.includes(id));
    },
    [enabledModules],
  );

  /** Check if a route should be accessible */
  const isRouteEnabled = useCallback(
    (route: string) => {
      const controlling = modulesForRoute(route);
      if (controlling.length === 0) return true;
      return controlling.some((id) => enabledModules.includes(id));
    },
    [enabledModules],
  );

  /** Toggle a single module on/off */
  const toggleModule = useCallback(
    (moduleId: string) => {
      setStored((prev) => {
        const current = prev ?? defaults;
        return current.includes(moduleId)
          ? current.filter((id) => id !== moduleId)
          : [...current, moduleId];
      });
    },
    [defaults, setStored],
  );

  /** Set modules explicitly (used by onboarding) */
  const setModules = useCallback(
    (moduleIds: string[]) => setStored(moduleIds),
    [setStored],
  );

  /** Reset to defaults for current profile type + region */
  const resetToDefaults = useCallback(
    () => setStored(null),
    [setStored],
  );

  /** Modules visible for this region (for settings UI) */
  const allModules = useMemo(() => modulesForRegion(region), [region]);

  return {
    enabledModules,
    isConfigured,
    isModuleEnabled,
    isTabEnabled,
    isSectionEnabled,
    isRouteEnabled,
    toggleModule,
    setModules,
    resetToDefaults,
    allModules,
  };
}
