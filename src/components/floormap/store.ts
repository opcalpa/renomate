import { create } from 'zustand';
import { FloorMapShape, FloorMapPlan, ViewMode, Tool, GridSettings, ViewState, SymbolType, ScaleSettings, ScalePreset, GridPreset } from './types';
import { Unit, Scale, getDefaultGridInterval } from './utils/formatting';

// Scale presets: 1px = X mm
const SCALE_PRESETS: Record<ScalePreset, ScaleSettings> = {
  architectural: { pixelsPerMm: 0.5, name: 'Architectural 1:20', description: 'Professional building plans' }, // 1px = 2mm (1:20 scale)
  detailed: { pixelsPerMm: 0.2, name: 'Detailed 1:50', description: 'For small rooms/details' }, // 1px = 5mm (1:50 scale)
  standard: { pixelsPerMm: 0.1, name: 'Standard 1:100', description: 'Default for most apartments/houses' }, // 1px = 10mm (1:100 scale)
  overview: { pixelsPerMm: 0.02, name: 'Overview 1:500', description: 'For larger floor plans or gardens' }, // 1px = 50mm (1:500 scale)
};

// Grid size presets
const GRID_PRESETS: Record<GridPreset, number> = {
  fine: 50, // 50mm grid
  standard: 100, // 100mm grid
  coarse: 500, // 500mm grid
};

// ============================================================================
// PROJECT SETTINGS - Centralized Canvas Environment Configuration
// ============================================================================
export interface ProjectSettings {
  // Visual scale - affects rendering density, NOT coordinates
  scale: Scale;
  
  // Display unit preference - affects labels, NOT storage
  unit: Unit;
  
  // Grid interval in millimeters
  gridInterval: number;
  
  // Grid visibility
  gridVisible: boolean;
  
  // Snap to grid enabled
  snapEnabled: boolean;
  
  // Additional workspace preferences
  showDimensions: boolean; // Auto-show dimension labels
  showAreaLabels: boolean; // Auto-show area labels for rooms
  
  // Canvas dimensions (in meters) - NEW
  canvasWidthMeters: number; // Working area width
  canvasHeightMeters: number; // Working area height
  canvasMarginMeters: number; // Margin outside grid area
}

// Default project settings
const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  scale: '1:100',
  unit: 'mm',
  gridInterval: 100, // 10cm default - smooth for furniture, walls snap well
  gridVisible: true,
  snapEnabled: true,
  showDimensions: true,
  showAreaLabels: true,
  canvasWidthMeters: 30, // 30m × 30m working area (optimal for apartments/houses)
  canvasHeightMeters: 30,
  canvasMarginMeters: 0, // No margin - grid covers entire canvas
};

interface FloorMapStore {
  // Project context
  currentProjectId: string | null;

  // Plans
  plans: FloorMapPlan[];
  currentPlanId: string | null;

  // Shapes
  shapes: FloorMapShape[];
  selectedShapeId: string | null;
  selectedShapeIds: string[]; // For multi-select
  pendingSymbolType: SymbolType | null;
  
  // Library symbols - NEW
  pendingLibrarySymbol: string | null; // ArchSymbolType from SymbolLibrary
  pendingObjectId: string | null; // ObjectDefinition ID from ObjectLibrary
  pendingTemplateId: string | null; // Template ID from Template Gallery

  // History for Undo/Redo
  history: FloorMapShape[][];
  historyIndex: number;

  // Drawing state
  isDrawing: boolean;
  isPanning: boolean;
  currentDrawingPoints: { x: number; y: number }[];

  // View
  viewMode: ViewMode;
  activeTool: Tool;
  recentTools: Tool[];
  viewState: ViewState;
  gridSettings: GridSettings;
  scaleSettings: ScaleSettings;
  
  // Project Settings (NEW - Centralized workspace configuration)
  projectSettings: ProjectSettings;
  
  // Actions - Plans
  setCurrentProjectId: (id: string | null) => void;
  setPlans: (plans: FloorMapPlan[]) => void;
  addPlan: (plan: FloorMapPlan) => void;
  updatePlan: (id: string, updates: Partial<FloorMapPlan>) => void;
  deletePlan: (id: string) => void;
  setCurrentPlanId: (id: string | null) => void;
  
  // Actions - Shapes
  setShapes: (shapes: FloorMapShape[]) => void;
  addShape: (shape: FloorMapShape) => void;
  updateShape: (id: string, updates: Partial<FloorMapShape>) => void;
  updateShapes: (updates: Array<{ id: string; updates: Partial<FloorMapShape> }>) => void;
  deleteShape: (id: string) => void;
  deleteShapes: (ids: string[]) => void;
  setSelectedShapeId: (id: string | null) => void;
  setSelectedShapeIds: (ids: string[]) => void;
  setPendingSymbolType: (type: SymbolType | null) => void;
  clearSelection: () => void;
  
  // Actions - Library symbols (NEW)
  setPendingLibrarySymbol: (symbolType: string | null) => void;
  setPendingObjectId: (objectId: string | null) => void;
  setPendingTemplateId: (templateId: string | null) => void;
  
  // Actions - Drawing state
  setIsDrawing: (isDrawing: boolean) => void;
  setIsPanning: (isPanning: boolean) => void;
  setCurrentDrawingPoints: (points: { x: number; y: number }[]) => void;
  addDrawingPoint: (point: { x: number; y: number }) => void;
  
  // Actions - History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveToHistory: () => void;
  
  // Actions - View
  setViewMode: (mode: ViewMode) => void;
  setActiveTool: (tool: Tool) => void;
  setViewState: (state: Partial<ViewState>) => void;
  setGridSettings: (settings: Partial<GridSettings>) => void;
  setScaleSettings: (settings: Partial<ScaleSettings>) => void;
  setScalePreset: (preset: ScalePreset) => void;
  setGridPreset: (preset: GridPreset) => void;
  applyViewSettings: (settings: Partial<ViewState & { mode: ViewMode }>) => void;
  
  // Actions - Project Settings (NEW)
  setProjectSettings: (settings: Partial<ProjectSettings>) => void;
  setScale: (scale: Scale) => void;
  setUnit: (unit: Unit) => void;
  setGridInterval: (interval: number) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  toggleDimensions: () => void;
  toggleAreaLabels: () => void;
  setCanvasSize: (widthMeters: number, heightMeters: number) => void;
  setCanvasMargin: (marginMeters: number) => void;
  
  // Getters
  getSelectedShape: () => FloorMapShape | null;
  getCurrentPlan: () => FloorMapPlan | null;
}

export const useFloorMapStore = create<FloorMapStore>((set, get) => ({
  // Initial state
  currentProjectId: null,
  plans: [],
  currentPlanId: null,
  shapes: [],
  selectedShapeId: null,
  selectedShapeIds: [],
  pendingSymbolType: null,
  pendingLibrarySymbol: null, // NEW: For architectural symbol placement
  pendingObjectId: null, // NEW: For object library placement
  pendingTemplateId: null, // NEW: For template gallery placement
  history: [[]],
  historyIndex: 0,
  isDrawing: false,
  isPanning: false,
  currentDrawingPoints: [],
  viewMode: 'floor',
  activeTool: 'select',
  recentTools: ['wall', 'door', 'select'], // Default recent tools
  viewState: {
    zoom: 1,
    panX: 0,
    panY: 0,
  },
  gridSettings: {
    show: true,
    snap: true,
    size: 500, // 500mm = 50cm grid
    unit: 'mm', // Default unit
  },
  scaleSettings: {
    pixelsPerMm: 0.1, // 0.1 pixels = 1mm (1:100 scale, 100px = 1m)
    name: 'Standard',
    description: 'Default for most apartments/houses',
  },
  
  // Project Settings (NEW - Centralized configuration)
  projectSettings: DEFAULT_PROJECT_SETTINGS,
  
  // Plan Actions
  setCurrentProjectId: (id) => set({ currentProjectId: id }),
  
  setPlans: (plans) => set({ plans }),
  
  addPlan: (plan) => set((state) => ({
    plans: [...state.plans, plan],
  })),
  
  updatePlan: (id, updates) => set((state) => ({
    plans: state.plans.map((plan) =>
      plan.id === id ? { ...plan, ...updates } : plan
    ),
  })),
  
  deletePlan: (id) => set((state) => ({
    plans: state.plans.filter((plan) => plan.id !== id),
    currentPlanId: state.currentPlanId === id ? null : state.currentPlanId,
  })),
  
  setCurrentPlanId: (id) => set({ currentPlanId: id }),
  
  // Actions
  setShapes: (shapes) => set((state) => {
    // When loading shapes from DB, reset history
    const newHistory = [JSON.parse(JSON.stringify(shapes))];
    return {
      shapes,
      history: newHistory,
      historyIndex: 0,
    };
  }),
  
  addShape: (shape) => set((state) => {
    const newShapes = [...state.shapes, shape];
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newShapes)));
    return {
      shapes: newShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    };
  }),
  
  updateShape: (id, updates) => set((state) => {
    const newShapes = state.shapes.map((shape) =>
      shape.id === id ? { ...shape, ...updates } : shape
    );
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newShapes)));
    return {
      shapes: newShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    };
  }),

  updateShapes: (updates) => set((state) => {
    const updateMap = new Map(updates.map(u => [u.id, u.updates]));
    const newShapes = state.shapes.map((shape) => {
      const shapeUpdates = updateMap.get(shape.id);
      return shapeUpdates ? { ...shape, ...shapeUpdates } : shape;
    });
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newShapes)));
    return {
      shapes: newShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    };
  }),
  
  deleteShape: (id) => set((state) => {
    const newShapes = state.shapes.filter((shape) => shape.id !== id);
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newShapes)));
    return {
      shapes: newShapes,
      selectedShapeId: state.selectedShapeId === id ? null : state.selectedShapeId,
      selectedShapeIds: state.selectedShapeIds.filter(sid => sid !== id),
      history: newHistory,
      historyIndex: newHistory.length - 1,
    };
  }),

  deleteShapes: (ids) => set((state) => {
    const idsSet = new Set(ids);
    const newShapes = state.shapes.filter((shape) => !idsSet.has(shape.id));
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newShapes)));
    return {
      shapes: newShapes,
      selectedShapeId: idsSet.has(state.selectedShapeId!) ? null : state.selectedShapeId,
      selectedShapeIds: state.selectedShapeIds.filter(sid => !idsSet.has(sid)),
      history: newHistory,
      historyIndex: newHistory.length - 1,
    };
  }),
  
  setSelectedShapeId: (id) => set({ 
    selectedShapeId: id, 
    // Only update selectedShapeIds if we're selecting a single item
    // Don't overwrite multi-select!
    selectedShapeIds: id ? [id] : [] 
  }),
  
  setSelectedShapeIds: (ids) => set({ 
    selectedShapeIds: ids,
    // Set selectedShapeId to first item for compatibility
    selectedShapeId: ids.length > 0 ? ids[0] : null
  }),

  clearSelection: () => set({ selectedShapeId: null, selectedShapeIds: [] }),
  
  setPendingSymbolType: (type) => set({ pendingSymbolType: type }),
  
  // Library symbol actions (NEW)
  setPendingLibrarySymbol: (symbolType) => set({ 
    pendingLibrarySymbol: symbolType,
    pendingObjectId: null, // Clear object ID when setting symbol
    activeTool: symbolType ? 'symbol' : 'select' // Auto-switch to symbol placement mode
  }),
  
  // Object library actions (NEW)
  setPendingObjectId: (objectId) => set({ 
    pendingObjectId: objectId,
    pendingLibrarySymbol: null, // Clear symbol when setting object
    pendingTemplateId: null, // Clear template when setting object
    activeTool: objectId ? 'object' : 'select' // Auto-switch to object placement mode
  }),
  
  // Template gallery actions (NEW)
  setPendingTemplateId: (templateId) => set({ 
    pendingTemplateId: templateId,
    pendingLibrarySymbol: null, // Clear symbol when setting template
    pendingObjectId: null, // Clear object when setting template
    activeTool: templateId ? 'select' : 'select' // Keep select tool for template placement
  }),

  // Drawing state actions
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  
  setIsPanning: (isPanning) => set({ isPanning }),
  
  setCurrentDrawingPoints: (points) => set({ currentDrawingPoints: points }),
  
  addDrawingPoint: (point) => set((state) => ({
    currentDrawingPoints: [...state.currentDrawingPoints, point]
  })),
  
  setViewMode: (mode) => set({ viewMode: mode }),
  
  setActiveTool: (tool) => set((state) => {
    // Update recent tools - add to front and remove duplicates
    const newRecentTools = [tool, ...state.recentTools.filter(t => t !== tool)].slice(0, 5);
    return { 
      activeTool: tool,
      recentTools: newRecentTools
    };
  }),
  
  setViewState: (state) => set((prev) => ({
    viewState: { ...prev.viewState, ...state },
  })),
  
  setGridSettings: (settings) => set((prev) => ({
    gridSettings: { ...prev.gridSettings, ...settings },
  })),

  setScaleSettings: (settings) => set((prev) => ({
    scaleSettings: { ...prev.scaleSettings, ...settings },
  })),

  setScalePreset: (preset) => set(() => ({
    scaleSettings: SCALE_PRESETS[preset],
  })),

  setGridPreset: (preset) => set((prev) => ({
    gridSettings: { ...prev.gridSettings, size: GRID_PRESETS[preset] },
  })),
  
  applyViewSettings: (settings) => set((state) => {
    const newState: any = {};
    
    if (settings.zoom !== undefined || settings.panX !== undefined || settings.panY !== undefined) {
      newState.viewState = {
        ...state.viewState,
        ...(settings.zoom !== undefined && { zoom: settings.zoom }),
        ...(settings.panX !== undefined && { panX: settings.panX }),
        ...(settings.panY !== undefined && { panY: settings.panY }),
      };
    }
    
    if (settings.mode !== undefined) {
      newState.viewMode = settings.mode;
    }
    
    return newState;
  }),
  
  // History Actions
  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      const newShapes = JSON.parse(JSON.stringify(state.history[newIndex]));
      return {
        shapes: newShapes,
        historyIndex: newIndex,
        selectedShapeId: null,
        selectedShapeIds: [],
      };
    }
    return state;
  }),
  
  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      const newShapes = JSON.parse(JSON.stringify(state.history[newIndex]));
      return {
        shapes: newShapes,
        historyIndex: newIndex,
        selectedShapeId: null,
        selectedShapeIds: [],
      };
    }
    return state;
  }),
  
  canUndo: () => {
    const state = get();
    return state.historyIndex > 0;
  },
  
  canRedo: () => {
    const state = get();
    return state.historyIndex < state.history.length - 1;
  },
  
  saveToHistory: () => set((state) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(state.shapes)));
    return {
      history: newHistory,
      historyIndex: newHistory.length - 1,
    };
  }),
  
  // Getters
  getSelectedShape: () => {
    const state = get();
    return state.shapes.find((s) => s.id === state.selectedShapeId) || null;
  },
  
  getCurrentPlan: () => {
    const state = get();
    return state.plans.find((p) => p.id === state.currentPlanId) || null;
  },
  
  // ============================================================================
  // PROJECT SETTINGS ACTIONS (NEW)
  // ============================================================================
  
  setProjectSettings: (settings) => set((state) => ({
    projectSettings: { ...state.projectSettings, ...settings },
  })),
  
  setScale: (scale) => set((state) => {
    const newGridInterval = getDefaultGridInterval(scale);
    return {
      projectSettings: {
        ...state.projectSettings,
        scale,
        gridInterval: newGridInterval, // Auto-adjust grid to scale
      },
    };
  }),
  
  setUnit: (unit) => set((state) => ({
    projectSettings: { ...state.projectSettings, unit },
  })),
  
  setGridInterval: (gridInterval) => set((state) => ({
    projectSettings: { ...state.projectSettings, gridInterval },
  })),
  
  toggleGrid: () => set((state) => ({
    projectSettings: {
      ...state.projectSettings,
      gridVisible: !state.projectSettings.gridVisible,
    },
  })),
  
  toggleSnap: () => set((state) => ({
    projectSettings: {
      ...state.projectSettings,
      snapEnabled: !state.projectSettings.snapEnabled,
    },
  })),
  
  toggleDimensions: () => set((state) => ({
    projectSettings: {
      ...state.projectSettings,
      showDimensions: !state.projectSettings.showDimensions,
    },
  })),
  
  toggleAreaLabels: () => set((state) => ({
    projectSettings: {
      ...state.projectSettings,
      showAreaLabels: !state.projectSettings.showAreaLabels,
    },
  })),
  
  setCanvasSize: (widthMeters, heightMeters) => set((state) => ({
    projectSettings: {
      ...state.projectSettings,
      canvasWidthMeters: widthMeters,
      canvasHeightMeters: heightMeters,
    },
  })),
  
  setCanvasMargin: (marginMeters) => set((state) => ({
    projectSettings: {
      ...state.projectSettings,
      canvasMarginMeters: marginMeters,
    },
  })),
}));
