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

export interface ObjectDefinition {
  id: string;
  name: string;
  category: 'bathroom' | 'kitchen' | 'furniture' | 'electrical' | 'doors' | 'windows' | 'stairs' | 'other';
  description: string;
  defaultWidth: number; // mm
  defaultHeight: number; // mm
  shapes: ObjectShape[];
  tags?: string[];
  icon?: string; // Emoji or simple text representation
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
  // ============================================================================
  {
    id: 'outlet_standard',
    name: 'Eluttag (Standard)',
    category: 'electrical',
    description: 'Standard vägguttag 230V',
    defaultWidth: 100,
    defaultHeight: 100,
    icon: '⚡',
    shapes: [
      // Outer circle
      {
        type: 'circle',
        x: 50,
        y: 50,
        radius: 40,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
      // Two holes (circles)
      {
        type: 'circle',
        x: 35,
        y: 50,
        radius: 8,
        stroke: '#000000',
        strokeWidth: 1,
        fill: '#000000',
      },
      {
        type: 'circle',
        x: 65,
        y: 50,
        radius: 8,
        stroke: '#000000',
        strokeWidth: 1,
        fill: '#000000',
      },
    ],
    tags: ['outlet', 'eluttag', 'electrical', 'el'],
  },
  {
    id: 'light_switch',
    name: 'Ljusströmbrytare',
    category: 'electrical',
    description: 'Standard ljusströmbrytare',
    defaultWidth: 100,
    defaultHeight: 100,
    icon: '💡',
    shapes: [
      // Outer rectangle
      {
        type: 'rect',
        x: 20,
        y: 20,
        width: 60,
        height: 60,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      },
      // Switch (small vertical line)
      {
        type: 'line',
        points: [50, 35, 50, 65],
        stroke: '#000000',
        strokeWidth: 3,
      },
    ],
    tags: ['switch', 'strömbrytare', 'ljusknapp', 'electrical', 'el'],
  },
  {
    id: 'ceiling_light',
    name: 'Taklampa',
    category: 'electrical',
    description: 'Taklampa eller ljuskälla',
    defaultWidth: 200,
    defaultHeight: 200,
    icon: '💡',
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
