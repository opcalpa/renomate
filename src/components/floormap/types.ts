// Shared types for Floor Map Editor
//
// COORDINATE SYSTEM & SCALE:
// ---------------------------
// This architectural drawing tool uses a millimeter-based coordinate system internally.
// All coordinates, dimensions, and measurements are stored in millimeters (mm) for precision.
// 
// SCALE FACTOR:
// The canvas operates in pixels, and the relationship between pixels and millimeters is
// controlled by the zoom/scale factor in the ViewState:
// - Base scale: 1 pixel = 1 millimeter (at zoom = 1.0)
// - Zoomed in: zoom > 1.0 (e.g., zoom = 2.0 means 2 pixels per mm)
// - Zoomed out: zoom < 1.0 (e.g., zoom = 0.5 means 0.5 pixels per mm)
//
// DRAWING WORKFLOW:
// 1. User clicks and drags on canvas (pixel coordinates)
// 2. Canvas coordinates are converted to world coordinates (mm) using zoom and pan offset
// 3. BuildingObjects (walls, windows, doors) are stored in mm
// 4. When rendering, mm coordinates are converted back to pixels using zoom factor
//
// GRID & SNAPPING:
// Grid size is defined in mm (default 500mm = 50cm)
// Snap to grid and snap to endpoints use mm-based calculations

export type SymbolType = 
  | 'line' 
  | 'rectangle' 
  | 'triangle'
  | 'circle' 
  // Linjer (Linear elements - professional architectural standard)
  | 'inner_wall'
  | 'outer_wall'
  | 'arch_window'
  | 'door_outward'
  | 'sliding_door'
  | 'wall_opening'
  | 'half_stairs'
  // Objekt (Objects - professional architectural symbols)
  | 'spiral_stairs'
  | 'straight_stairs'
  | 'arch_bathtub'
  | 'arch_toilet'
  | 'arch_sink'
  | 'arch_stove'
  | 'arch_outlet'
  | 'arch_switch'
  | 'arch_mirror'
  // Legacy Structural
  | 'door' 
  | 'window' 
  | 'doorstep'
  | 'radiator'
  | 'curtain'
  // Kitchen
  | 'floor_cabinet' 
  | 'wall_cabinet' 
  | 'sink_cabinet'
  | 'oven'
  | 'stove'
  | 'fridge'
  | 'dishwasher'
  // Bathroom
  | 'toilet' 
  | 'shower' 
  | 'bathtub' 
  | 'sink' 
  | 'mirror'
  | 'washing_machine'
  | 'dryer'
  // Furniture
  | 'bed'
  | 'bed_single'
  | 'bed_double' 
  | 'sofa'
  | 'table'
  | 'table_round'
  | 'table_square'
  | 'table_dining'
  | 'chair' 
  | 'wardrobe'
  | 'nightstand'
  | 'desk'
  | 'carpet'
  | 'lamp'
  | 'tv'
  | 'closet';

export interface BezierCoordinates {
  start: { x: number; y: number };
  control: { x: number; y: number };
  end: { x: number; y: number };
}

// Image coordinates for background images
export interface ImageCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloorMapShape {
  id: string; // Unique persistent ID
  type: 'line' | 'rectangle' | 'wall' | 'circle' | 'polygon' | 'symbol' | 'measurement' | 'text' | 'triangle' | 'door' | 'opening' | 'room' | 'freehand' | 'bezier' | 'window_line' | 'door_line' | 'sliding_door_line' | 'image';
  // Door/window specific properties
  openingDirection?: 'left' | 'right'; // For door_line - which way the door opens
  coordinates: LineCoordinates | RectangleCoordinates | CircleCoordinates | PolygonCoordinates | SymbolCoordinates | TextCoordinates | BezierCoordinates;
  heightMM?: number; // Wall height for elevation/3D view (for walls/lines)
  thicknessMM?: number; // Wall thickness (for walls/lines)
  roomId?: string; // Database reference if this is a saved room
  planId?: string; // Reference to the floor plan this shape belongs to
  symbolType?: SymbolType; // For symbol shapes
  text?: string; // For text shapes
  textStyle?: TextStyle; // Bold/italic for text shapes
  fontSize?: number; // Font size for text shapes
  textRotation?: TextRotation; // Fixed rotation angles for text (0, 90, 180, 270)
  hasBackground?: boolean; // Background rectangle for text
  rotation?: number; // Rotation angle in degrees
  notes?: string; // Construction notes and instructions for this object
  attachedToWall?: string; // ID of wall this door/opening is attached to
  positionOnWall?: number; // Position along wall (0-1)
  parentWallId?: string; // ID of wall this elevation shape belongs to (for elevation view objects)
  
  // Visual properties
  color?: string; // Fill color
  strokeColor?: string; // Stroke/border color
  strokeWidth?: number; // Stroke width in pixels
  opacity?: number; // 0-1

  // Layering
  zIndex?: number; // Z-index for layering (higher = on top)

  // View mode - which canvas view this shape belongs to
  shapeViewMode?: 'floor' | 'elevation' | 'both'; // Default: 'floor' for backward compatibility

  // Selection state
  selected?: boolean;
  
  // Room-specific properties
  name?: string; // Room name displayed on canvas
  area?: number; // Area in square meters (for rooms)

  // Image-specific properties (for background images)
  imageUrl?: string; // Public URL from Supabase storage
  imageOpacity?: number; // 0-1, default 0.5
  locked?: boolean; // Prevent accidental movement

  // Material properties (for walls, elevation shapes, etc.)
  material?: string; // Material type (e.g., 'gips', 'betong', 'tra')
  materialSpec?: string; // Material specification/details
  treatment?: string; // Surface treatment (e.g., 'malat', 'tapetserat')
  treatmentColor?: string; // Color/finish for treatment (e.g., NCS code)
  manufacturer?: string; // Product manufacturer
  productCode?: string; // Product code/article number

  metadata?: {
    lengthMM?: number;
    widthMM?: number;
    areaMM?: number;
    radiusMM?: number;
    perimeterMM?: number;
    // Elevation symbol metadata
    symbolType?: string; // Type from ElevationSymbolLibrary
    category?: string; // Symbol category
    typicalHeightFromFloor?: number; // Typical installation height in mm
    materialNotes?: string; // Material/finish notes
    // Allow additional properties
    [key: string]: unknown;
  };
}

export interface FloorMapPlan {
  id: string;
  projectId: string;
  name: string;
  isDefault: boolean;
  viewSettings: ViewSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ViewSettings {
  cameraX: number;
  cameraY: number;
  zoom: number;
  rotation?: number;
  mode: ViewMode;
}

export interface LineCoordinates {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RectangleCoordinates {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CircleCoordinates {
  cx: number;
  cy: number;
  radius: number;
}

export interface PolygonCoordinates {
  points: { x: number; y: number }[];
}

export interface SymbolCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextCoordinates {
  x: number;
  y: number;
  width?: number;  // Box width for resizable text
  height?: number; // Box height for resizable text
}

export interface TextStyle {
  isBold?: boolean;
  isItalic?: boolean;
}

export type TextRotation = 0 | 90 | 180 | 270;

export type FontSizePreset = 'small' | 'medium' | 'large' | 'xlarge';

export const FONT_SIZE_PRESETS: Record<FontSizePreset, number> = {
  small: 12,
  medium: 16,
  large: 24,
  xlarge: 36,
};

export type ViewMode = 'floor' | 'elevation' | '3d';
export type Tool = 'select' | 'freehand' | 'wall' | 'room' | 'eraser' | 'rectangle' | 'circle' | 'triangle' | 'polygon' | 'symbol' | 'object' | 'measure' | 'text' | 'pan' | 'door' | 'opening' | 'scissors' | 'glue' | 'bezier' | 'window_line' | 'door_line' | 'sliding_door_line';
export type Unit = 'mm' | 'cm' | 'm' | 'inch';

export interface GridSettings {
  show: boolean;
  snap: boolean;
  size: number; // in mm
  unit: Unit; // Display unit
}

export interface ScaleSettings {
  pixelsPerMm: number; // How many pixels represent 1mm
  name: string; // Display name
  description: string; // Description for UI
}

export type ScalePreset = 'architectural' | 'detailed' | 'standard' | 'overview';
export type GridPreset = 'fine' | 'standard' | 'coarse';

export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}
