import { FloorMapShape, FloorMapPlan } from "../types";

const STORAGE_PREFIX = "floormap_";
const SHAPES_KEY = (planId: string) => `${STORAGE_PREFIX}shapes_${planId}`;
const PLANS_KEY = (projectId: string) => `${STORAGE_PREFIX}plans_${projectId}`;

/**
 * Save shapes to localStorage as offline backup
 */
export const saveShapesToLocalStorage = (planId: string, shapes: FloorMapShape[]): void => {
  try {
    localStorage.setItem(SHAPES_KEY(planId), JSON.stringify(shapes));
    localStorage.setItem(`${SHAPES_KEY(planId)}_timestamp`, Date.now().toString());
  } catch (error) {
    console.error("Failed to save shapes to localStorage:", error);
  }
};

/**
 * Load shapes from localStorage
 */
export const loadShapesFromLocalStorage = (planId: string): FloorMapShape[] | null => {
  try {
    const data = localStorage.getItem(SHAPES_KEY(planId));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Failed to load shapes from localStorage:", error);
    return null;
  }
};

/**
 * Save plans to localStorage as offline backup
 */
export const savePlansToLocalStorage = (projectId: string, plans: FloorMapPlan[]): void => {
  try {
    localStorage.setItem(PLANS_KEY(projectId), JSON.stringify(plans));
    localStorage.setItem(`${PLANS_KEY(projectId)}_timestamp`, Date.now().toString());
  } catch (error) {
    console.error("Failed to save plans to localStorage:", error);
  }
};

/**
 * Load plans from localStorage
 */
export const loadPlansFromLocalStorage = (projectId: string): FloorMapPlan[] | null => {
  try {
    const data = localStorage.getItem(PLANS_KEY(projectId));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Failed to load plans from localStorage:", error);
    return null;
  }
};

/**
 * Clear all localStorage data for a project
 */
export const clearLocalStorageForProject = (projectId: string): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(`${STORAGE_PREFIX}`) && key.includes(projectId)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error("Failed to clear localStorage:", error);
  }
};

/**
 * Get last sync timestamp for shapes
 */
export const getShapesLastSyncTime = (planId: string): number | null => {
  try {
    const timestamp = localStorage.getItem(`${SHAPES_KEY(planId)}_timestamp`);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    return null;
  }
};

/**
 * Check if online
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};
