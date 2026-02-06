import { useCallback, useMemo } from "react";

const STORAGE_KEY_PREFIX = "hotspot-dismissed-";

// Predefined hotspot IDs for type safety
export const HOTSPOT_IDS = {
  CREATE_PROJECT: "create-project",
  CANVAS_TAB: "canvas-tab",
  INVITE_TEAM: "invite-team",
  FIRST_TASK: "first-task",
  DEMO_PROJECT: "demo-project",
} as const;

export type HotspotId = (typeof HOTSPOT_IDS)[keyof typeof HOTSPOT_IDS];

/**
 * Hook for managing hotspot visibility state
 */
export function useHotspots() {
  const dismissHotspot = useCallback((id: string) => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, "true");
  }, []);

  const isHotspotDismissed = useCallback((id: string): boolean => {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`) === "true";
  }, []);

  const resetHotspot = useCallback((id: string) => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${id}`);
  }, []);

  const resetAllHotspots = useCallback(() => {
    Object.values(HOTSPOT_IDS).forEach((id) => {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${id}`);
    });
  }, []);

  const getDismissedHotspots = useCallback((): string[] => {
    const dismissed: string[] = [];
    Object.values(HOTSPOT_IDS).forEach((id) => {
      if (localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`) === "true") {
        dismissed.push(id);
      }
    });
    return dismissed;
  }, []);

  return useMemo(
    () => ({
      dismissHotspot,
      isHotspotDismissed,
      resetHotspot,
      resetAllHotspots,
      getDismissedHotspots,
      HOTSPOT_IDS,
    }),
    [dismissHotspot, isHotspotDismissed, resetHotspot, resetAllHotspots, getDismissedHotspots]
  );
}
