/**
 * OBJECT LIBRARY DEFINITIONS
 * 
 * JSON-based architectural object library.
 * Each object is defined by primitive shapes (lines, circles, rectangles, paths).
 * 
 * All coordinates are in millimeters (mm).
 * Default bounding box: 1000x1000mm (1m x 1m).
 * 
 * This file contains DEFAULT definitions.
 * Users can override these in localStorage or database.
 */

export type ShapeType = 'line' | 'circle' | 'rect' | 'ellipse' | 'arc' | 'path';

export interface ObjectShape {
  type: ShapeType;
  // Line
  points?: number[]; // [x1, y1, x2, y2, ...]
  // Circle
  x?: number;
  y?: number;
  radius?: number;
  // Rectangle
  width?: number;
  height?: number;
  // Ellipse
  radiusX?: number;
  radiusY?: number;
  // Arc
  angle?: number;
  innerRadius?: number;
  outerRadius?: number;
  // Path
  data?: string; // SVG path data
  // Styling
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  dash?: number[]; // [dash, gap]
  opacity?: number;
}

// Asset URLs for 2D sprites and 3D models
export interface ObjectAssets {
  sprite2D?: string;        // URL to top-down PNG sprite for 2D view
  model3D?: string;         // URL to GLTF model for 3D view
  thumbnail?: string;       // URL for library preview image
}

export interface ObjectDefinition {
  id: string;
  name: string;
  category: 'bathroom' | 'kitchen' | 'furniture' | 'electrical' | 'doors' | 'windows' | 'stairs' | 'other';
  description: string;

  // Floor plan dimensions (top-down view)
  defaultWidth: number;     // mm (X in floor plan, along wall direction)
  defaultHeight: number;    // mm (Y in floor plan = depth perpendicular to wall)
  // Aliases for clarity - these map to the same values
  floorplanWidth?: number;  // mm - width when viewed from above (alias for defaultWidth)
  floorplanDepth?: number;  // mm - depth when viewed from above (alias for defaultHeight)

  // Vector shape definitions (fallback when no sprite available)
  shapes: ObjectShape[];
  tags?: string[];
  icon?: string; // Emoji or simple text representation

  // 3D properties for elevation view synchronization
  elevationHeight?: number;    // mm vertical height in elevation view (default: same as defaultHeight)
  elevationBottom?: number;    // mm from floor (default: 0 = sits on floor)
  depth?: number;              // mm perpendicular to wall (default: same as defaultHeight)
  height3D?: number;           // mm - vertical height for 3D view (alias for elevationHeight)
  elevationFromFloor?: number; // mm - bottom of object from floor (alias for elevationBottom)

  // Placement behavior
  wallMountable?: boolean;     // Can attach to wall (default: true for kitchen/bathroom, false for furniture)
  freestanding?: boolean;      // Can exist without wall attachment (default: false for kitchen, true for furniture)
  snapToWall?: boolean;        // Auto-snap when placed near wall

  // Object category for default elevation heights
  objectCategory?: 'floor_cabinet' | 'wall_cabinet' | 'countertop' | 'appliance_floor' | 'appliance_wall' | 'decoration' | 'custom';

  // Asset URLs for image/model-based rendering
  assets?: ObjectAssets;
}

// ============================================================================
// DEFAULT OBJECT LIBRARY
// ============================================================================

export const DEFAULT_OBJECT_LIBRARY: ObjectDefinition[] = [
  // ============================================================================
  // BATHROOM OBJECTS
  // ============================================================================
  {
    id: 'toilet_standard',
    name: 'Toalett (Standard)',
    category: 'bathroom',
    description: 'Standard golvstående toalett med cistern',
    defaultWidth: 500,
    defaultHeight: 700,
    icon: '🚽',
    // 3D properties
    elevationHeight: 400,    // Toilet height from floor
    elevationBottom: 0,      // Sits on floor
    depth: 700,              // Depth from wall
    wallMountable: true,
    freestanding: false,     // Must be against wall
    objectCategory: 'floor_cabinet',
    shapes: [
      // Bowl (ellipse)
      {
        type: 'ellipse',
        x: 250,
        y: 400,
        radiusX: 200,
        radiusY: 250,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
      // Tank (rectangle)
      {
        type: 'rect',
        x: 100,
        y: 50,
        width: 300,
        height: 200,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
      // Seat (ellipse, smaller)
      {
        type: 'ellipse',
        x: 250,
        y: 350,
        radiusX: 150,
        radiusY: 180,
        stroke: '#000000',
        strokeWidth: 1,
        fill: 'transparent',
        opacity: 0.5,
      },
    ],
    tags: ['wc', 'bathroom', 'toilet', 'sanitär'],
  },
  {
    id: 'sink_single',
    name: 'Handfat (Enkelt)',
    category: 'bathroom',
    description: 'Enkelt handfat med blandare',
    defaultWidth: 600,
    defaultHeight: 500,
    icon: '🚰',
    // 3D properties
    elevationHeight: 200,    // Basin height
    elevationBottom: 850,    // Standard sink height from floor
    depth: 500,
    wallMountable: true,
    freestanding: false,
    objectCategory: 'floor_cabinet',
    shapes: [
      // Basin (ellipse)
      {
        type: 'ellipse',
        x: 300,
        y: 250,
        radiusX: 250,
        radiusY: 200,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
      // Faucet (simple line)
      {
        type: 'line',
        points: [300, 100, 300, 200],
        stroke: '#000000',
        strokeWidth: 3,
      },
      // Faucet head (circle)
      {
        type: 'circle',
        x: 300,
        y: 200,
        radius: 15,
        stroke: '#000000',
        strokeWidth: 2,
        fill: '#000000',
      },
    ],
    tags: ['sink', 'handfat', 'bathroom', 'sanitär'],
  },
  {
    id: 'bathtub_standard',
    name: 'Badkar (Standard)',
    category: 'bathroom',
    description: 'Standard rektangulärt badkar',
    defaultWidth: 1700,
    defaultHeight: 700,
    icon: '🛁',
    // 3D properties
    elevationHeight: 550,    // Bathtub rim height
    elevationBottom: 0,      // Sits on floor
    depth: 700,
    wallMountable: true,
    freestanding: false,     // Usually against wall
    objectCategory: 'appliance_floor',
    shapes: [
      // Outer rectangle
      {
        type: 'rect',
        x: 0,
        y: 0,
        width: 1700,
        height: 700,
        stroke: '#000000',
        strokeWidth: 3,
        fill: 'transparent',
      },
      // Inner rectangle (water area)
      {
        type: 'rect',
        x: 100,
        y: 100,
        width: 1500,
        height: 500,
        stroke: '#000000',
        strokeWidth: 1,
        fill: 'transparent',
        opacity: 0.5,
      },
      // Drain (small circle)
      {
        type: 'circle',
        x: 850,
        y: 350,
        radius: 20,
        stroke: '#000000',
        strokeWidth: 2,
        fill: '#000000',
      },
    ],
    tags: ['bathtub', 'badkar', 'bathroom', 'sanitär'],
  },
  {
    id: 'shower_square',
    name: 'Dusch (Fyrkantig)',
    category: 'bathroom',
    description: 'Fyrkantig duschkabin',
    defaultWidth: 900,
    defaultHeight: 900,
    icon: '🚿',
    // 3D properties
    elevationHeight: 2100,   // Full height shower enclosure
    elevationBottom: 0,      // Starts at floor
    depth: 900,
    wallMountable: true,
    freestanding: false,
    objectCategory: 'custom',
    shapes: [
      // Shower tray (square)
      {
        type: 'rect',
        x: 0,
        y: 0,
        width: 900,
        height: 900,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
      // Drain (center)
      {
        type: 'circle',
        x: 450,
        y: 450,
        radius: 25,
        stroke: '#000000',
        strokeWidth: 2,
        fill: '#000000',
      },
      // Shower head (top corner)
      {
        type: 'circle',
        x: 750,
        y: 150,
        radius: 40,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
      // Cross inside shower head
      {
        type: 'line',
        points: [730, 150, 770, 150],
        stroke: '#000000',
        strokeWidth: 1,
      },
      {
        type: 'line',
        points: [750, 130, 750, 170],
        stroke: '#000000',
        strokeWidth: 1,
      },
    ],
    tags: ['shower', 'dusch', 'bathroom', 'sanitär'],
  },

  // ============================================================================
  // KITCHEN OBJECTS
  // ============================================================================
  {
    id: 'stove_4burner',
    name: 'Spis (4 plattor)',
    category: 'kitchen',
    description: 'Spis med 4 kokplattor',
    defaultWidth: 600,
    defaultHeight: 600,
    icon: '🍳',
    // 3D properties
    elevationHeight: 50,     // Cooktop is thin, sits on countertop
    elevationBottom: 850,    // At countertop height
    depth: 600,
    wallMountable: true,
    freestanding: false,
    objectCategory: 'countertop',
    shapes: [
      // Stove body (rectangle)
      {
        type: 'rect',
        x: 0,
        y: 0,
        width: 600,
        height: 600,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
      // Top-left burner
      {
        type: 'circle',
        x: 150,
        y: 150,
        radius: 80,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
      // Top-right burner
      {
        type: 'circle',
        x: 450,
        y: 150,
        radius: 80,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
      // Bottom-left burner
      {
        type: 'circle',
        x: 150,
        y: 450,
        radius: 80,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
      // Bottom-right burner
      {
        type: 'circle',
        x: 450,
        y: 450,
        radius: 80,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
    ],
    tags: ['stove', 'spis', 'kitchen', 'kök'],
  },
  {
    id: 'sink_kitchen',
    name: 'Diskho (Kök)',
    category: 'kitchen',
    description: 'Köks diskho med blandare',
    defaultWidth: 800,
    defaultHeight: 500,
    icon: '🚰',
    // 3D properties
    elevationHeight: 200,    // Sink basin depth
    elevationBottom: 850,    // Countertop height
    depth: 500,
    wallMountable: true,
    freestanding: false,
    objectCategory: 'countertop',
    shapes: [
      // Main basin (rectangle with rounded corners approximation)
      {
        type: 'rect',
        x: 50,
        y: 50,
        width: 700,
        height: 400,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
      // Inner basin
      {
        type: 'rect',
        x: 100,
        y: 100,
        width: 600,
        height: 300,
        stroke: '#000000',
        strokeWidth: 1,
        fill: 'transparent',
        opacity: 0.5,
      },
      // Faucet
      {
        type: 'line',
        points: [400, 0, 400, 100],
        stroke: '#000000',
        strokeWidth: 3,
      },
      {
        type: 'circle',
        x: 400,
        y: 100,
        radius: 15,
        stroke: '#000000',
        strokeWidth: 2,
        fill: '#000000',
      },
    ],
    tags: ['sink', 'diskho', 'kitchen', 'kök'],
  },
  {
    id: 'refrigerator',
    name: 'Kylskåp',
    category: 'kitchen',
    description: 'Standard kylskåp',
    defaultWidth: 600,
    defaultHeight: 600,
    icon: '🧊',
    // 3D properties
    elevationHeight: 1800,   // Full height refrigerator
    elevationBottom: 0,      // Sits on floor
    depth: 600,
    wallMountable: true,
    freestanding: false,
    objectCategory: 'appliance_floor',
    shapes: [
      // Outer body
      {
        type: 'rect',
        x: 0,
        y: 0,
        width: 600,
        height: 600,
        stroke: '#000000',
        strokeWidth: 3,
        fill: 'transparent',
      },
      // Door divider (horizontal line for freezer/fridge sections)
      {
        type: 'line',
        points: [0, 200, 600, 200],
        stroke: '#000000',
        strokeWidth: 2,
      },
      // Handle (top section)
      {
        type: 'line',
        points: [550, 80, 550, 150],
        stroke: '#000000',
        strokeWidth: 4,
      },
      // Handle (bottom section)
      {
        type: 'line',
        points: [550, 280, 550, 520],
        stroke: '#000000',
        strokeWidth: 4,
      },
    ],
    tags: ['refrigerator', 'kylskåp', 'kitchen', 'kök'],
  },

  // ============================================================================
  // ELECTRICAL OBJECTS
  // Swedish standard: outlets at 200mm, switches at 1000mm from floor
  // ============================================================================
  {
    id: 'outlet_single',
    name: 'Eluttag (Enkelt)',
    category: 'electrical',
    description: 'Standard vägguttag 230V, enkelt',
    defaultWidth: 80,
    defaultHeight: 80,
    icon: '⚡',
    // 3D properties
    elevationHeight: 80,     // Outlet face height
    elevationBottom: 200,    // Swedish standard: 200mm from floor
    depth: 50,
    wallMountable: true,
    freestanding: false,
    objectCategory: 'electrical_outlet',
    shapes: [
      // Outer frame
      {
        type: 'rect',
        x: 5,
        y: 5,
        width: 70,
        height: 70,
        stroke: '#374151',
        strokeWidth: 2,
        fill: '#f3f4f6',
      },
      // Inner circle (socket)
      {
        type: 'circle',
        x: 40,
        y: 40,
        radius: 25,
        stroke: '#374151',
        strokeWidth: 1.5,
        fill: '#ffffff',
      },
      // Two holes (live/neutral)
      {
        type: 'circle',
        x: 30,
        y: 40,
        radius: 4,
        stroke: '#374151',
        strokeWidth: 1,
        fill: '#374151',
      },
      {
        type: 'circle',
        x: 50,
        y: 40,
        radius: 4,
        stroke: '#374151',
        strokeWidth: 1,
        fill: '#374151',
      },
    ],
    tags: ['outlet', 'eluttag', 'electrical', 'el', 'vägguttag'],
  },
  {
    id: 'outlet_double',
    name: 'Eluttag (Dubbelt)',
    category: 'electrical',
    description: 'Dubbelt vägguttag 230V',
    defaultWidth: 150,
    defaultHeight: 80,
    icon: '⚡⚡',
    // 3D properties
    elevationHeight: 80,     // Outlet face height
    elevationBottom: 200,    // Swedish standard: 200mm from floor
    depth: 50,
    wallMountable: true,
    freestanding: false,
    objectCategory: 'electrical_outlet',
    shapes: [
      // Outer frame
      {
        type: 'rect',
        x: 5,
        y: 5,
        width: 140,
        height: 70,
        stroke: '#374151',
        strokeWidth: 2,
        fill: '#f3f4f6',
      },
      // Left socket circle
      {
        type: 'circle',
        x: 40,
        y: 40,
        radius: 25,
        stroke: '#374151',
        strokeWidth: 1.5,
        fill: '#ffffff',
      },
      // Left holes
      {
        type: 'circle',
        x: 30,
        y: 40,
        radius: 4,
        stroke: '#374151',
        strokeWidth: 1,
        fill: '#374151',
      },
      {
        type: 'circle',
        x: 50,
        y: 40,
        radius: 4,
        stroke: '#374151',
        strokeWidth: 1,
        fill: '#374151',
      },
      // Right socket circle
      {
        type: 'circle',
        x: 110,
        y: 40,
        radius: 25,
        stroke: '#374151',
        strokeWidth: 1.5,
        fill: '#ffffff',
      },
      // Right holes
      {
        type: 'circle',
        x: 100,
        y: 40,
        radius: 4,
        stroke: '#374151',
        strokeWidth: 1,
        fill: '#374151',
      },
      {
        type: 'circle',
        x: 120,
        y: 40,
        radius: 4,
        stroke: '#374151',
        strokeWidth: 1,
        fill: '#374151',
      },
    ],
    tags: ['outlet', 'eluttag', 'electrical', 'el', 'dubbelt', 'vägguttag'],
  },
  {
    id: 'outlet_kitchen',
    name: 'Eluttag (Kök/Bänk)',
    category: 'electrical',
    description: 'Eluttag vid köks-bänk, 1100mm höjd',
    defaultWidth: 80,
    defaultHeight: 80,
    icon: '⚡',
    // 3D properties
    elevationHeight: 80,
    elevationBottom: 1100,   // Kitchen countertop height + margin
    depth: 50,
    wallMountable: true,
    freestanding: false,
    objectCategory: 'electrical_outlet',
    shapes: [
      // Same as single outlet
      {
        type: 'rect',
        x: 5,
        y: 5,
        width: 70,
        height: 70,
        stroke: '#374151',
        strokeWidth: 2,
        fill: '#f3f4f6',
      },
      {
        type: 'circle',
        x: 40,
        y: 40,
        radius: 25,
        stroke: '#374151',
        strokeWidth: 1.5,
        fill: '#ffffff',
      },
      {
        type: 'circle',
        x: 30,
        y: 40,
        radius: 4,
        stroke: '#374151',
        strokeWidth: 1,
        fill: '#374151',
      },
      {
        type: 'circle',
        x: 50,
        y: 40,
        radius: 4,
        stroke: '#374151',
        strokeWidth: 1,
        fill: '#374151',
      },
    ],
    tags: ['outlet', 'eluttag', 'electrical', 'el', 'kök', 'bänk'],
  },
  {
    id: 'light_switch',
    name: 'Strömbrytare',
    category: 'electrical',
    description: 'Standard ljusströmbrytare',
    defaultWidth: 80,
    defaultHeight: 80,
    icon: '🔘',
    // 3D properties
    elevationHeight: 80,     // Switch face height
    elevationBottom: 1000,   // Swedish standard: 1000mm from floor
    depth: 50,
    wallMountable: true,
    freestanding: false,
    objectCategory: 'electrical_switch',
    shapes: [
      // Outer frame
      {
        type: 'rect',
        x: 5,
        y: 5,
        width: 70,
        height: 70,
        stroke: '#374151',
        strokeWidth: 2,
        fill: '#f3f4f6',
      },
      // Inner switch area
      {
        type: 'rect',
        x: 20,
        y: 15,
        width: 40,
        height: 50,
        stroke: '#374151',
        strokeWidth: 1.5,
        fill: '#ffffff',
      },
      // Switch toggle (vertical line)
      {
        type: 'line',
        points: [40, 25, 40, 55],
        stroke: '#374151',
        strokeWidth: 3,
      },
    ],
    tags: ['switch', 'strömbrytare', 'ljusknapp', 'electrical', 'el'],
  },
  {
    id: 'dimmer_switch',
    name: 'Dimmer',
    category: 'electrical',
    description: 'Dimmer för ljusstyrka',
    defaultWidth: 80,
    defaultHeight: 80,
    icon: '🔆',
    // 3D properties
    elevationHeight: 80,
    elevationBottom: 1000,   // Swedish standard: 1000mm from floor
    depth: 50,
    wallMountable: true,
    freestanding: false,
    objectCategory: 'electrical_switch',
    shapes: [
      // Outer frame
      {
        type: 'rect',
        x: 5,
        y: 5,
        width: 70,
        height: 70,
        stroke: '#374151',
        strokeWidth: 2,
        fill: '#f3f4f6',
      },
      // Dimmer knob (circle)
      {
        type: 'circle',
        x: 40,
        y: 40,
        radius: 22,
        stroke: '#374151',
        strokeWidth: 1.5,
        fill: '#ffffff',
      },
      // Knob indicator
      {
        type: 'line',
        points: [40, 25, 40, 40],
        stroke: '#374151',
        strokeWidth: 2,
      },
    ],
    tags: ['dimmer', 'ljusstyrka', 'electrical', 'el'],
  },
  {
    id: 'ceiling_light',
    name: 'Taklampa',
    category: 'electrical',
    description: 'Taklampa eller ljuskälla',
    defaultWidth: 200,
    defaultHeight: 200,
    icon: '💡',
    // 3D properties - ceiling mounted, not wall-relative
    elevationHeight: 100,
    elevationBottom: 2300,   // Near ceiling
    depth: 100,
    wallMountable: false,
    freestanding: true,      // Ceiling mounted, not wall attached
    objectCategory: 'decoration',
    shapes: [
      // Center circle
      {
        type: 'circle',
        x: 100,
        y: 100,
        radius: 30,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
      // Rays (4 lines)
      {
        type: 'line',
        points: [100, 50, 100, 70],
        stroke: '#000000',
        strokeWidth: 2,
      },
      {
        type: 'line',
        points: [100, 130, 100, 150],
        stroke: '#000000',
        strokeWidth: 2,
      },
      {
        type: 'line',
        points: [50, 100, 70, 100],
        stroke: '#000000',
        strokeWidth: 2,
      },
      {
        type: 'line',
        points: [130, 100, 150, 100],
        stroke: '#000000',
        strokeWidth: 2,
      },
    ],
    tags: ['light', 'lampa', 'taklampa', 'electrical', 'el'],
  },

  // ============================================================================
  // FURNITURE
  // ============================================================================
  {
    id: 'bed_double',
    name: 'Dubbelsäng',
    category: 'furniture',
    description: 'Dubbelsäng 140-160cm bred',
    defaultWidth: 1600,
    defaultHeight: 2000,
    icon: '🛏️',
    // 3D properties - freestanding furniture
    elevationHeight: 500,    // Bed height including mattress
    elevationBottom: 0,
    depth: 2000,
    wallMountable: false,
    freestanding: true,      // Can be placed anywhere in room
    objectCategory: 'custom',
    shapes: [
      // Mattress (main rectangle)
      {
        type: 'rect',
        x: 0,
        y: 200,
        width: 1600,
        height: 1800,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
      // Headboard (thick line at top)
      {
        type: 'line',
        points: [0, 200, 1600, 200],
        stroke: '#000000',
        strokeWidth: 8,
      },
      // Pillows (two ellipses)
      {
        type: 'ellipse',
        x: 400,
        y: 400,
        radiusX: 250,
        radiusY: 150,
        stroke: '#000000',
        strokeWidth: 1,
        fill: 'transparent',
        opacity: 0.5,
      },
      {
        type: 'ellipse',
        x: 1200,
        y: 400,
        radiusX: 250,
        radiusY: 150,
        stroke: '#000000',
        strokeWidth: 1,
        fill: 'transparent',
        opacity: 0.5,
      },
    ],
    tags: ['bed', 'säng', 'dubbelsäng', 'furniture', 'möbel'],
  },
  {
    id: 'sofa_3seat',
    name: 'Soffa (3-sits)',
    category: 'furniture',
    description: 'Tresitssoffa',
    defaultWidth: 2100,
    defaultHeight: 900,
    icon: '🛋️',
    // 3D properties - can be against wall or freestanding
    elevationHeight: 850,    // Sofa back height
    elevationBottom: 0,
    depth: 900,
    wallMountable: true,
    freestanding: true,      // Can be placed anywhere
    objectCategory: 'custom',
    shapes: [
      // Main body
      {
        type: 'rect',
        x: 100,
        y: 100,
        width: 1900,
        height: 700,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
      // Backrest (thicker line)
      {
        type: 'line',
        points: [100, 100, 2000, 100],
        stroke: '#000000',
        strokeWidth: 6,
      },
      // Armrest left
      {
        type: 'rect',
        x: 0,
        y: 100,
        width: 100,
        height: 700,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
      // Armrest right
      {
        type: 'rect',
        x: 2000,
        y: 100,
        width: 100,
        height: 700,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
    ],
    tags: ['sofa', 'soffa', 'furniture', 'möbel'],
  },
  {
    id: 'table_round',
    name: 'Runt Bord',
    category: 'furniture',
    description: 'Runt matbord',
    defaultWidth: 1200,
    defaultHeight: 1200,
    icon: '🍽️',
    // 3D properties - freestanding dining table
    elevationHeight: 750,    // Standard table height
    elevationBottom: 0,
    depth: 1200,
    wallMountable: false,
    freestanding: true,      // Placed in room center
    objectCategory: 'custom',
    shapes: [
      // Table top (circle)
      {
        type: 'circle',
        x: 600,
        y: 600,
        radius: 550,
        stroke: '#000000',
        strokeWidth: 3,
        fill: 'transparent',
      },
      // Center mark (small circle)
      {
        type: 'circle',
        x: 600,
        y: 600,
        radius: 20,
        stroke: '#000000',
        strokeWidth: 1,
        fill: '#000000',
      },
    ],
    tags: ['table', 'bord', 'matbord', 'furniture', 'möbel'],
  },
  {
    id: 'chair',
    name: 'Stol',
    category: 'furniture',
    description: 'Standard stol',
    defaultWidth: 500,
    defaultHeight: 500,
    icon: '🪑',
    // 3D properties - freestanding chair
    elevationHeight: 850,    // Chair back height
    elevationBottom: 0,
    depth: 500,
    wallMountable: false,
    freestanding: true,
    objectCategory: 'custom',
    shapes: [
      // Seat (rectangle)
      {
        type: 'rect',
        x: 50,
        y: 50,
        width: 400,
        height: 400,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
      // Backrest (line at top)
      {
        type: 'line',
        points: [50, 50, 450, 50],
        stroke: '#000000',
        strokeWidth: 5,
      },
    ],
    tags: ['chair', 'stol', 'furniture', 'möbel'],
  },

  // ============================================================================
  // DOORS
  // ============================================================================
  {
    id: 'door_swing',
    name: 'Dörr (Gångjärn)',
    category: 'doors',
    description: 'Standard dörr med gångjärn och svängbåge',
    defaultWidth: 900,
    defaultHeight: 200,
    icon: '🚪',
    // 3D properties - door
    elevationHeight: 2100,   // Standard door height
    elevationBottom: 0,      // Starts at floor
    depth: 100,
    wallMountable: true,
    freestanding: false,
    objectCategory: 'custom',
    shapes: [
      // Door frame (thick line)
      {
        type: 'line',
        points: [0, 0, 900, 0],
        stroke: '#000000',
        strokeWidth: 4,
      },
      // Door panel (diagonal from hinge)
      {
        type: 'line',
        points: [0, 0, 900, 900],
        stroke: '#000000',
        strokeWidth: 2,
      },
      // Swing arc (90 degrees)
      {
        type: 'path',
        data: 'M 0 0 Q 450 0 900 900',
        stroke: '#000000',
        strokeWidth: 1,
        fill: 'transparent',
      },
    ],
    tags: ['door', 'dörr', 'gångjärn'],
  },
  {
    id: 'door_sliding',
    name: 'Skjutdörr',
    category: 'doors',
    description: 'Dörr som skjuts i sidled',
    defaultWidth: 900,
    defaultHeight: 200,
    icon: '🚪',
    // 3D properties - sliding door
    elevationHeight: 2100,
    elevationBottom: 0,
    depth: 50,
    wallMountable: true,
    freestanding: false,
    objectCategory: 'custom',
    shapes: [
      // Track (dashed line)
      {
        type: 'line',
        points: [0, 0, 900, 0],
        stroke: '#000000',
        strokeWidth: 2,
        dash: [10, 5],
      },
      // Door panel (rectangle)
      {
        type: 'rect',
        x: 200,
        y: 0,
        width: 700,
        height: 100,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
      // Arrow showing direction
      {
        type: 'line',
        points: [100, 50, 50, 50],
        stroke: '#666666',
        strokeWidth: 1,
      },
      {
        type: 'line',
        points: [50, 50, 80, 35],
        stroke: '#666666',
        strokeWidth: 1,
      },
      {
        type: 'line',
        points: [50, 50, 80, 65],
        stroke: '#666666',
        strokeWidth: 1,
      },
    ],
    tags: ['door', 'dörr', 'skjutdörr', 'sliding'],
  },

  // ============================================================================
  // WINDOWS
  // ============================================================================
  {
    id: 'window_standard',
    name: 'Fönster (Standard)',
    category: 'windows',
    description: 'Standard fönster med karm',
    defaultWidth: 1200,
    defaultHeight: 150,
    icon: '🪟',
    // 3D properties - window
    elevationHeight: 1200,   // Standard window height
    elevationBottom: 900,    // Window sill height
    depth: 150,
    wallMountable: true,
    freestanding: false,
    objectCategory: 'custom',
    shapes: [
      // Outer frame (top)
      {
        type: 'line',
        points: [0, 0, 1200, 0],
        stroke: '#000000',
        strokeWidth: 3,
      },
      // Outer frame (bottom)
      {
        type: 'line',
        points: [0, 150, 1200, 150],
        stroke: '#000000',
        strokeWidth: 3,
      },
      // Glass (middle line)
      {
        type: 'line',
        points: [0, 75, 1200, 75],
        stroke: '#000000',
        strokeWidth: 1,
      },
      // Divider (center vertical)
      {
        type: 'line',
        points: [600, 0, 600, 150],
        stroke: '#000000',
        strokeWidth: 1,
      },
    ],
    tags: ['window', 'fönster'],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get object definition by ID
 */
export function getObjectDefinition(id: string): ObjectDefinition | undefined {
  return DEFAULT_OBJECT_LIBRARY.find(obj => obj.id === id);
}

/**
 * Get all objects by category
 */
export function getObjectsByCategory(category: ObjectDefinition['category']): ObjectDefinition[] {
  return DEFAULT_OBJECT_LIBRARY.filter(obj => obj.category === category);
}

/**
 * Search objects by name or tags
 */
export function searchObjects(query: string): ObjectDefinition[] {
  const lowerQuery = query.toLowerCase();
  return DEFAULT_OBJECT_LIBRARY.filter(obj => 
    obj.name.toLowerCase().includes(lowerQuery) ||
    obj.description.toLowerCase().includes(lowerQuery) ||
    obj.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get all categories
 */
export function getAllCategories(): ObjectDefinition['category'][] {
  return ['bathroom', 'kitchen', 'furniture', 'electrical', 'doors', 'windows', 'stairs', 'other'];
}

/**
 * Export library as JSON (for backup/sharing)
 */
export function exportLibraryAsJSON(library: ObjectDefinition[]): string {
  return JSON.stringify(library, null, 2);
}

/**
 * Import library from JSON
 */
export function importLibraryFromJSON(json: string): ObjectDefinition[] {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    throw new Error('Invalid JSON format');
  } catch (error) {
    console.error('Failed to import library:', error);
    return [];
  }
}
