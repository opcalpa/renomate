import { create } from "zustand";
import type { GroupByOption } from "./types";
import {
  DEFAULT_PIXELS_PER_DAY,
  MIN_PIXELS_PER_DAY,
  MAX_PIXELS_PER_DAY,
} from "./utils";

interface DragState {
  mode: "move" | "resize-left" | "resize-right";
  taskId: string;
  startX: number;
  startY: number;
  origStartDate: string;
  origFinishDate: string;
}

interface TimelineStoreState {
  // Pan & zoom
  panX: number;
  panY: number;
  pixelsPerDay: number;

  // Interaction
  dragState: DragState | null;
  hoveredTaskId: string | null;
  hoverPosition: { x: number; y: number } | null;
  selectedTaskId: string | null;

  // Filters & grouping
  groupBy: GroupByOption;
  selectedAssignee: string;
  collapsedGroups: Set<string>;

  // Visibility toggles
  showTasks: boolean;
  showPhases: boolean;
  showMilestones: boolean;
  colorBy: "status" | "category" | "priority";

  // Actions
  setPan: (panX: number, panY: number) => void;
  setZoom: (pixelsPerDay: number, anchorX?: number) => void;
  startDrag: (drag: DragState) => void;
  updateDrag: (updates: Partial<DragState>) => void;
  endDrag: () => void;
  setHover: (taskId: string, position: { x: number; y: number }) => void;
  clearHover: () => void;
  setSelectedTaskId: (taskId: string | null) => void;
  setGroupBy: (groupBy: GroupByOption) => void;
  setSelectedAssignee: (assignee: string) => void;
  toggleGroup: (groupId: string) => void;
  setShowTasks: (v: boolean) => void;
  setShowPhases: (v: boolean) => void;
  setShowMilestones: (v: boolean) => void;
  setColorBy: (v: "status" | "category" | "priority") => void;
}

export const useTimelineStore = create<TimelineStoreState>((set, get) => ({
  panX: 0,
  panY: 0,
  pixelsPerDay: DEFAULT_PIXELS_PER_DAY,

  dragState: null,
  hoveredTaskId: null,
  hoverPosition: null,
  selectedTaskId: null,

  groupBy: "none",
  selectedAssignee: "all",
  collapsedGroups: new Set<string>(),

  showTasks: true,
  showPhases: true,
  showMilestones: true,
  colorBy: "status",

  setPan: (panX, panY) => set({ panX, panY }),

  setZoom: (newPixelsPerDay, anchorX) => {
    const clamped = Math.max(
      MIN_PIXELS_PER_DAY,
      Math.min(MAX_PIXELS_PER_DAY, newPixelsPerDay)
    );
    const state = get();
    if (anchorX !== undefined) {
      // Maintain the world-position under the anchor point
      const worldX = (anchorX - state.panX) / state.pixelsPerDay;
      const newPanX = anchorX - worldX * clamped;
      set({ pixelsPerDay: clamped, panX: newPanX });
    } else {
      set({ pixelsPerDay: clamped });
    }
  },

  startDrag: (drag) => set({ dragState: drag }),
  updateDrag: (updates) => {
    const current = get().dragState;
    if (current) {
      set({ dragState: { ...current, ...updates } });
    }
  },
  endDrag: () => set({ dragState: null }),

  setHover: (taskId, position) =>
    set({ hoveredTaskId: taskId, hoverPosition: position }),
  clearHover: () => set({ hoveredTaskId: null, hoverPosition: null }),

  setSelectedTaskId: (taskId) => set({ selectedTaskId: taskId }),

  setGroupBy: (groupBy) => set({ groupBy }),
  setSelectedAssignee: (assignee) => set({ selectedAssignee: assignee }),

  setShowTasks: (v) => set({ showTasks: v }),
  setShowPhases: (v) => set({ showPhases: v }),
  setShowMilestones: (v) => set({ showMilestones: v }),
  setColorBy: (v) => set({ colorBy: v }),

  toggleGroup: (groupId) => {
    const { collapsedGroups } = get();
    const next = new Set(collapsedGroups);
    if (next.has(groupId)) {
      next.delete(groupId);
    } else {
      next.add(groupId);
    }
    set({ collapsedGroups: next });
  },
}));
