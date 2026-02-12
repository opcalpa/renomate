/**
 * Kitchen Object Definitions
 *
 * IKEA-style kitchen objects with clean, minimal SVG symbols.
 * These include cabinets and appliances commonly used in kitchen planning.
 *
 * Standard Swedish/IKEA dimensions:
 * - Base cabinet width: 600mm (also 300, 400, 800, 900, 1000mm variants)
 * - Base cabinet height: 870mm (+ 20mm legs = 890mm)
 * - Base cabinet depth: 600mm
 * - Counter height: 900mm
 * - Wall cabinet height: 600-800mm
 * - Wall cabinet depth: 370mm
 * - Wall cabinet mounting: 1400mm from floor
 */

import { UnifiedObjectDefinition } from '../types';

/**
 * Base Cabinet (Underskåp) - Standard 600mm
 * Floor-standing cabinet with door and handle
 */
export const BASE_CABINET: UnifiedObjectDefinition = {
  id: 'base_cabinet',
  name: 'Underskåp',
  nameKey: 'objects.kitchen.baseCabinet',
  category: 'kitchen',

  dimensions: {
    width: 600,
    height: 870,
    depth: 600,
  },

  // Floor plan view - rectangle with handle indication
  floorPlanSymbol: {
    viewBox: '0 0 60 60',
    paths: [
      // Cabinet outline
      {
        d: 'M2,2 h56 v56 h-56 z',
        fill: '#f3f4f6',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Door line (center)
      {
        d: 'M30,2 v56',
        fill: 'none',
        stroke: '#9ca3af',
        strokeWidth: 1,
      },
      // Left handle
      {
        d: 'M26,20 v20',
        fill: 'none',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Right handle
      {
        d: 'M34,20 v20',
        fill: 'none',
        stroke: '#374151',
        strokeWidth: 2,
      },
    ],
    defaultStroke: '#374151',
  },

  // Elevation view - cabinet front with doors
  elevationSymbol: {
    viewBox: '0 0 60 87',
    paths: [
      // Cabinet body
      {
        d: 'M2,2 h56 v83 h-56 z',
        fill: '#f3f4f6',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Door divider
      {
        d: 'M30,2 v83',
        fill: 'none',
        stroke: '#9ca3af',
        strokeWidth: 1,
      },
      // Left handle
      {
        d: 'M26,35 v17',
        fill: 'none',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Right handle
      {
        d: 'M34,35 v17',
        fill: 'none',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Legs
      {
        d: 'M8,85 v2 M52,85 v2',
        fill: 'none',
        stroke: '#6b7280',
        strokeWidth: 3,
      },
    ],
    defaultStroke: '#374151',
  },

  wallBehavior: {
    attachesToWall: true,
    penetratesWall: false,
    defaultElevationMM: 0, // Floor standing
    side: 'interior',
    canFlip: true,
    canRotate: true,
  },

  tags: ['kök', 'skåp', 'underskåp', 'köksskåp', 'cabinet', 'base cabinet', 'ikea'],
};

/**
 * Wall Cabinet (Överskåp) - Standard 600mm
 * Wall-mounted cabinet
 */
export const WALL_CABINET: UnifiedObjectDefinition = {
  id: 'wall_cabinet',
  name: 'Överskåp',
  nameKey: 'objects.kitchen.wallCabinet',
  category: 'kitchen',

  dimensions: {
    width: 600,
    height: 700,
    depth: 370,
  },

  // Floor plan view - narrower rectangle (shows depth)
  floorPlanSymbol: {
    viewBox: '0 0 60 37',
    paths: [
      // Cabinet outline
      {
        d: 'M2,2 h56 v33 h-56 z',
        fill: '#e5e7eb',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Door line
      {
        d: 'M30,2 v33',
        fill: 'none',
        stroke: '#9ca3af',
        strokeWidth: 1,
      },
    ],
    defaultStroke: '#374151',
  },

  // Elevation view - wall cabinet front
  elevationSymbol: {
    viewBox: '0 0 60 70',
    paths: [
      // Cabinet body
      {
        d: 'M2,2 h56 v66 h-56 z',
        fill: '#e5e7eb',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Door divider
      {
        d: 'M30,2 v66',
        fill: 'none',
        stroke: '#9ca3af',
        strokeWidth: 1,
      },
      // Left handle
      {
        d: 'M26,55 v10',
        fill: 'none',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Right handle
      {
        d: 'M34,55 v10',
        fill: 'none',
        stroke: '#374151',
        strokeWidth: 2,
      },
    ],
    defaultStroke: '#374151',
  },

  wallBehavior: {
    attachesToWall: true,
    penetratesWall: false,
    defaultElevationMM: 1400, // Standard wall cabinet height
    side: 'interior',
    canFlip: true,
    canRotate: true,
  },

  tags: ['kök', 'skåp', 'överskåp', 'väggskåp', 'wall cabinet', 'upper cabinet', 'ikea'],
};

/**
 * Tall Cabinet (Högskåp) - Full height pantry/storage
 */
export const TALL_CABINET: UnifiedObjectDefinition = {
  id: 'tall_cabinet',
  name: 'Högskåp',
  nameKey: 'objects.kitchen.tallCabinet',
  category: 'kitchen',

  dimensions: {
    width: 600,
    height: 2200,
    depth: 600,
  },

  // Floor plan view
  floorPlanSymbol: {
    viewBox: '0 0 60 60',
    paths: [
      // Cabinet outline
      {
        d: 'M2,2 h56 v56 h-56 z',
        fill: '#d1d5db',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Single door
      {
        d: 'M6,6 h48 v48 h-48 z',
        fill: 'none',
        stroke: '#9ca3af',
        strokeWidth: 1,
      },
      // Handle
      {
        d: 'M50,20 v20',
        fill: 'none',
        stroke: '#374151',
        strokeWidth: 2,
      },
    ],
    defaultStroke: '#374151',
  },

  // Elevation view - tall cabinet
  elevationSymbol: {
    viewBox: '0 0 60 220',
    paths: [
      // Cabinet body
      {
        d: 'M2,2 h56 v216 h-56 z',
        fill: '#d1d5db',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Upper door
      {
        d: 'M4,4 h52 v106 h-52 z',
        fill: 'none',
        stroke: '#9ca3af',
        strokeWidth: 1,
      },
      // Lower door
      {
        d: 'M4,112 h52 v104 h-52 z',
        fill: 'none',
        stroke: '#9ca3af',
        strokeWidth: 1,
      },
      // Upper handle
      {
        d: 'M50,95 v15',
        fill: 'none',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Lower handle
      {
        d: 'M50,115 v15',
        fill: 'none',
        stroke: '#374151',
        strokeWidth: 2,
      },
    ],
    defaultStroke: '#374151',
  },

  wallBehavior: {
    attachesToWall: true,
    penetratesWall: false,
    defaultElevationMM: 0,
    side: 'interior',
    canFlip: true,
    canRotate: true,
  },

  tags: ['kök', 'skåp', 'högskåp', 'skafferi', 'tall cabinet', 'pantry', 'ikea'],
};

/**
 * Refrigerator (Kylskåp)
 * Standard freestanding refrigerator
 */
export const REFRIGERATOR: UnifiedObjectDefinition = {
  id: 'refrigerator',
  name: 'Kylskåp',
  nameKey: 'objects.kitchen.refrigerator',
  category: 'kitchen',

  dimensions: {
    width: 600,
    height: 1850,
    depth: 650,
  },

  // Floor plan view - rectangle with snowflake symbol
  floorPlanSymbol: {
    viewBox: '0 0 60 65',
    paths: [
      // Appliance outline
      {
        d: 'M2,2 h56 v61 h-56 z',
        fill: '#f9fafb',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Snowflake symbol (simplified)
      {
        d: 'M30,20 v25 M20,32.5 h20 M23,25 l14,15 M23,40 l14,-15',
        fill: 'none',
        stroke: '#3b82f6',
        strokeWidth: 2,
      },
    ],
    defaultStroke: '#374151',
  },

  // Elevation view - fridge with freezer compartment
  elevationSymbol: {
    viewBox: '0 0 60 185',
    paths: [
      // Main body
      {
        d: 'M2,2 h56 v181 h-56 z',
        fill: '#f9fafb',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Freezer compartment (top)
      {
        d: 'M4,4 h52 v45 h-52 z',
        fill: '#e0f2fe',
        stroke: '#374151',
        strokeWidth: 1,
      },
      // Fridge compartment
      {
        d: 'M4,51 h52 v130 h-52 z',
        fill: '#f0fdf4',
        stroke: '#374151',
        strokeWidth: 1,
      },
      // Freezer handle
      {
        d: 'M50,15 v20',
        fill: 'none',
        stroke: '#6b7280',
        strokeWidth: 3,
      },
      // Fridge handle
      {
        d: 'M50,55 v30',
        fill: 'none',
        stroke: '#6b7280',
        strokeWidth: 3,
      },
      // Snowflake in freezer
      {
        d: 'M20,27 v-10 M15,22 h10 M16,18 l8,8 M16,26 l8,-8',
        fill: 'none',
        stroke: '#3b82f6',
        strokeWidth: 1.5,
      },
    ],
    defaultStroke: '#374151',
  },

  wallBehavior: {
    attachesToWall: true,
    penetratesWall: false,
    defaultElevationMM: 0,
    side: 'interior',
    canFlip: true,
    canRotate: true,
  },

  tags: ['kök', 'kyl', 'kylskåp', 'refrigerator', 'fridge', 'vitvaror', 'appliance'],
};

/**
 * Freezer (Frys)
 * Standalone freezer unit
 */
export const FREEZER: UnifiedObjectDefinition = {
  id: 'freezer',
  name: 'Frys',
  nameKey: 'objects.kitchen.freezer',
  category: 'kitchen',

  dimensions: {
    width: 600,
    height: 850,
    depth: 650,
  },

  // Floor plan view
  floorPlanSymbol: {
    viewBox: '0 0 60 65',
    paths: [
      // Appliance outline
      {
        d: 'M2,2 h56 v61 h-56 z',
        fill: '#e0f2fe',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Snowflake symbol (larger, more prominent)
      {
        d: 'M30,15 v35 M17,32.5 h26 M20,20 l20,25 M20,45 l20,-25',
        fill: 'none',
        stroke: '#3b82f6',
        strokeWidth: 2.5,
      },
    ],
    defaultStroke: '#374151',
  },

  // Elevation view - chest freezer style
  elevationSymbol: {
    viewBox: '0 0 60 85',
    paths: [
      // Main body
      {
        d: 'M2,2 h56 v81 h-56 z',
        fill: '#e0f2fe',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Door
      {
        d: 'M4,4 h52 v75 h-52 z',
        fill: '#bfdbfe',
        stroke: '#374151',
        strokeWidth: 1,
      },
      // Handle
      {
        d: 'M50,30 v25',
        fill: 'none',
        stroke: '#6b7280',
        strokeWidth: 3,
      },
      // Large snowflake
      {
        d: 'M25,42 v-20 M17,32 h16 M19,25 l12,14 M19,39 l12,-14',
        fill: 'none',
        stroke: '#2563eb',
        strokeWidth: 2,
      },
    ],
    defaultStroke: '#374151',
  },

  wallBehavior: {
    attachesToWall: true,
    penetratesWall: false,
    defaultElevationMM: 0,
    side: 'interior',
    canFlip: true,
    canRotate: true,
  },

  tags: ['kök', 'frys', 'frysskåp', 'freezer', 'vitvaror', 'appliance'],
};

/**
 * Dishwasher (Diskmaskin)
 * Built-in or freestanding dishwasher
 */
export const DISHWASHER: UnifiedObjectDefinition = {
  id: 'dishwasher',
  name: 'Diskmaskin',
  nameKey: 'objects.kitchen.dishwasher',
  category: 'kitchen',

  dimensions: {
    width: 600,
    height: 820,
    depth: 600,
  },

  // Floor plan view - rectangle with water drop symbol
  floorPlanSymbol: {
    viewBox: '0 0 60 60',
    paths: [
      // Appliance outline
      {
        d: 'M2,2 h56 v56 h-56 z',
        fill: '#f9fafb',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Water drops symbol
      {
        d: 'M22,20 q-6,12 0,18 q6,-6 0,-18 M38,20 q-6,12 0,18 q6,-6 0,-18',
        fill: '#3b82f6',
        stroke: 'none',
      },
      // Waves at bottom
      {
        d: 'M15,45 q7,-5 15,0 q7,5 15,0',
        fill: 'none',
        stroke: '#3b82f6',
        strokeWidth: 2,
      },
    ],
    defaultStroke: '#374151',
  },

  // Elevation view
  elevationSymbol: {
    viewBox: '0 0 60 82',
    paths: [
      // Main body
      {
        d: 'M2,2 h56 v78 h-56 z',
        fill: '#f9fafb',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Control panel
      {
        d: 'M4,4 h52 v12 h-52 z',
        fill: '#e5e7eb',
        stroke: '#374151',
        strokeWidth: 1,
      },
      // Display/buttons
      {
        d: 'M8,8 h20 v4 h-20 z',
        fill: '#1f2937',
        stroke: 'none',
      },
      // Door
      {
        d: 'M4,18 h52 v60 h-52 z',
        fill: '#f3f4f6',
        stroke: '#374151',
        strokeWidth: 1,
      },
      // Handle
      {
        d: 'M10,22 h40',
        fill: 'none',
        stroke: '#6b7280',
        strokeWidth: 3,
      },
      // Water drop icon on door
      {
        d: 'M30,40 q-8,15 0,22 q8,-7 0,-22',
        fill: '#3b82f6',
        stroke: 'none',
      },
    ],
    defaultStroke: '#374151',
  },

  wallBehavior: {
    attachesToWall: true,
    penetratesWall: false,
    defaultElevationMM: 0,
    side: 'interior',
    canFlip: false,
    canRotate: true,
  },

  tags: ['kök', 'disk', 'diskmaskin', 'dishwasher', 'vitvaror', 'appliance'],
};

/**
 * Oven (Ugn)
 * Built-in oven
 */
export const OVEN: UnifiedObjectDefinition = {
  id: 'oven',
  name: 'Ugn',
  nameKey: 'objects.kitchen.oven',
  category: 'kitchen',

  dimensions: {
    width: 600,
    height: 600,
    depth: 550,
  },

  // Floor plan view
  floorPlanSymbol: {
    viewBox: '0 0 60 55',
    paths: [
      // Appliance outline
      {
        d: 'M2,2 h56 v51 h-56 z',
        fill: '#1f2937',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Oven window
      {
        d: 'M10,10 h40 v35 h-40 z',
        fill: '#374151',
        stroke: '#6b7280',
        strokeWidth: 1,
      },
      // Heat symbol
      {
        d: 'M22,30 q3,-8 6,0 q3,8 6,0 q3,-8 6,0',
        fill: 'none',
        stroke: '#f97316',
        strokeWidth: 2,
      },
    ],
    defaultStroke: '#374151',
  },

  // Elevation view
  elevationSymbol: {
    viewBox: '0 0 60 60',
    paths: [
      // Main body
      {
        d: 'M2,2 h56 v56 h-56 z',
        fill: '#1f2937',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Control panel
      {
        d: 'M4,4 h52 v10 h-52 z',
        fill: '#374151',
        stroke: '#4b5563',
        strokeWidth: 1,
      },
      // Knobs
      {
        d: 'M12,9 a3,3 0 1,1 0.01,0 M30,9 a3,3 0 1,1 0.01,0 M48,9 a3,3 0 1,1 0.01,0',
        fill: '#9ca3af',
        stroke: 'none',
      },
      // Oven door with window
      {
        d: 'M4,16 h52 v40 h-52 z',
        fill: '#111827',
        stroke: '#374151',
        strokeWidth: 1,
      },
      // Window
      {
        d: 'M8,20 h44 v32 h-44 z',
        fill: '#1f2937',
        stroke: '#4b5563',
        strokeWidth: 1,
      },
      // Handle
      {
        d: 'M15,18 h30',
        fill: 'none',
        stroke: '#6b7280',
        strokeWidth: 2,
      },
      // Heat waves inside
      {
        d: 'M18,40 q4,-6 8,0 q4,6 8,0 q4,-6 8,0',
        fill: 'none',
        stroke: '#f97316',
        strokeWidth: 1.5,
      },
    ],
    defaultStroke: '#374151',
  },

  wallBehavior: {
    attachesToWall: true,
    penetratesWall: false,
    defaultElevationMM: 300, // Built into cabinet at counter height minus oven height
    side: 'interior',
    canFlip: false,
    canRotate: true,
  },

  tags: ['kök', 'ugn', 'inbyggnadsugn', 'oven', 'vitvaror', 'appliance'],
};

/**
 * Cooktop / Hob (Häll)
 * Built-in cooktop with 4 burners
 */
export const COOKTOP: UnifiedObjectDefinition = {
  id: 'cooktop',
  name: 'Häll',
  nameKey: 'objects.kitchen.cooktop',
  category: 'kitchen',

  dimensions: {
    width: 600,
    height: 50,
    depth: 520,
  },

  // Floor plan view - 4 burner circles
  floorPlanSymbol: {
    viewBox: '0 0 60 52',
    paths: [
      // Cooktop surface
      {
        d: 'M2,2 h56 v48 h-56 z',
        fill: '#1f2937',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Burner 1 (top-left, large)
      {
        d: 'M18,16 a8,8 0 1,1 0.01,0',
        fill: 'none',
        stroke: '#4b5563',
        strokeWidth: 2,
      },
      // Burner 2 (top-right, small)
      {
        d: 'M42,14 a6,6 0 1,1 0.01,0',
        fill: 'none',
        stroke: '#4b5563',
        strokeWidth: 2,
      },
      // Burner 3 (bottom-left, small)
      {
        d: 'M18,38 a6,6 0 1,1 0.01,0',
        fill: 'none',
        stroke: '#4b5563',
        strokeWidth: 2,
      },
      // Burner 4 (bottom-right, large)
      {
        d: 'M42,36 a8,8 0 1,1 0.01,0',
        fill: 'none',
        stroke: '#4b5563',
        strokeWidth: 2,
      },
    ],
    defaultStroke: '#374151',
  },

  // Elevation view (thin profile)
  elevationSymbol: {
    viewBox: '0 0 60 8',
    paths: [
      // Cooktop edge
      {
        d: 'M2,2 h56 v4 h-56 z',
        fill: '#1f2937',
        stroke: '#374151',
        strokeWidth: 1,
      },
      // Glass surface highlight
      {
        d: 'M4,3 h52',
        fill: 'none',
        stroke: '#4b5563',
        strokeWidth: 1,
      },
    ],
    defaultStroke: '#374151',
  },

  wallBehavior: {
    attachesToWall: true,
    penetratesWall: false,
    defaultElevationMM: 900, // Counter height
    side: 'interior',
    canFlip: false,
    canRotate: true,
  },

  tags: ['kök', 'häll', 'spishäll', 'induktion', 'cooktop', 'hob', 'vitvaror'],
};

/**
 * Range Hood / Extractor (Köksfläkt)
 * Wall-mounted range hood
 */
export const RANGE_HOOD: UnifiedObjectDefinition = {
  id: 'range_hood',
  name: 'Köksfläkt',
  nameKey: 'objects.kitchen.rangeHood',
  category: 'kitchen',

  dimensions: {
    width: 600,
    height: 400,
    depth: 500,
  },

  // Floor plan view - shows the hood outline
  floorPlanSymbol: {
    viewBox: '0 0 60 50',
    paths: [
      // Hood outline
      {
        d: 'M5,10 h50 v38 h-50 z',
        fill: '#e5e7eb',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Filter grilles
      {
        d: 'M10,15 h40 v8 h-40 z M10,27 h40 v8 h-40 z M10,39 h40 v6 h-40 z',
        fill: 'none',
        stroke: '#9ca3af',
        strokeWidth: 1,
      },
      // Vent duct (top)
      {
        d: 'M22,2 h16 v8 h-16 z',
        fill: '#9ca3af',
        stroke: '#374151',
        strokeWidth: 1,
      },
    ],
    defaultStroke: '#374151',
  },

  // Elevation view - hood front
  elevationSymbol: {
    viewBox: '0 0 60 45',
    paths: [
      // Main hood body
      {
        d: 'M2,15 h56 v28 h-56 z',
        fill: '#e5e7eb',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Chimney
      {
        d: 'M20,2 h20 v13 h-20 z',
        fill: '#d1d5db',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Control panel
      {
        d: 'M8,18 h44 v6 h-44 z',
        fill: '#374151',
        stroke: 'none',
      },
      // Buttons/lights
      {
        d: 'M12,21 a2,2 0 1,1 0.01,0 M22,21 a2,2 0 1,1 0.01,0 M38,21 a2,2 0 1,1 0.01,0 M48,21 a2,2 0 1,1 0.01,0',
        fill: '#9ca3af',
        stroke: 'none',
      },
      // Filter area
      {
        d: 'M6,26 h48 v14 h-48 z',
        fill: '#f3f4f6',
        stroke: '#9ca3af',
        strokeWidth: 1,
      },
      // Filter grille lines
      {
        d: 'M10,28 v10 M18,28 v10 M26,28 v10 M34,28 v10 M42,28 v10 M50,28 v10',
        fill: 'none',
        stroke: '#d1d5db',
        strokeWidth: 1,
      },
    ],
    defaultStroke: '#374151',
  },

  wallBehavior: {
    attachesToWall: true,
    penetratesWall: false,
    defaultElevationMM: 1500, // Above cooktop
    side: 'interior',
    canFlip: false,
    canRotate: true,
  },

  tags: ['kök', 'fläkt', 'köksfläkt', 'spisfläkt', 'range hood', 'extractor', 'ventilation'],
};

/**
 * Sink (Diskho)
 * Kitchen sink with single or double basin
 */
export const SINK: UnifiedObjectDefinition = {
  id: 'kitchen_sink',
  name: 'Diskho',
  nameKey: 'objects.kitchen.sink',
  category: 'kitchen',

  dimensions: {
    width: 800,
    height: 200,
    depth: 500,
  },

  // Floor plan view - sink basin
  floorPlanSymbol: {
    viewBox: '0 0 80 50',
    paths: [
      // Sink outline
      {
        d: 'M2,2 h76 v46 h-76 z',
        fill: '#e5e7eb',
        stroke: '#374151',
        strokeWidth: 2,
      },
      // Main basin
      {
        d: 'M6,6 h45 v38 h-45 z',
        fill: '#9ca3af',
        stroke: '#6b7280',
        strokeWidth: 1,
      },
      // Small basin
      {
        d: 'M55,6 h20 v38 h-20 z',
        fill: '#9ca3af',
        stroke: '#6b7280',
        strokeWidth: 1,
      },
      // Drain (main)
      {
        d: 'M28,25 a4,4 0 1,1 0.01,0',
        fill: '#4b5563',
        stroke: 'none',
      },
      // Drain (small)
      {
        d: 'M65,25 a3,3 0 1,1 0.01,0',
        fill: '#4b5563',
        stroke: 'none',
      },
      // Faucet
      {
        d: 'M40,2 v-6 h10 v6',
        fill: 'none',
        stroke: '#6b7280',
        strokeWidth: 2,
      },
    ],
    defaultStroke: '#374151',
  },

  // Elevation view - front of sink
  elevationSymbol: {
    viewBox: '0 0 80 25',
    paths: [
      // Counter surface
      {
        d: 'M0,0 h80 v4 h-80 z',
        fill: '#d1d5db',
        stroke: '#374151',
        strokeWidth: 1,
      },
      // Sink basin visible from front
      {
        d: 'M6,4 h45 v18 h-45 z',
        fill: '#9ca3af',
        stroke: '#6b7280',
        strokeWidth: 1,
      },
      // Small basin
      {
        d: 'M55,4 h20 v18 h-20 z',
        fill: '#9ca3af',
        stroke: '#6b7280',
        strokeWidth: 1,
      },
      // Faucet
      {
        d: 'M40,0 v-15 a5,5 0 0,1 10,0 v10',
        fill: 'none',
        stroke: '#6b7280',
        strokeWidth: 3,
      },
    ],
    defaultStroke: '#374151',
  },

  wallBehavior: {
    attachesToWall: true,
    penetratesWall: false,
    defaultElevationMM: 900, // Counter height
    side: 'interior',
    canFlip: true,
    canRotate: true,
  },

  tags: ['kök', 'disk', 'diskho', 'vask', 'sink', 'kitchen sink', 'vatten'],
};

/**
 * All kitchen objects
 */
export const KITCHEN_OBJECTS: UnifiedObjectDefinition[] = [
  BASE_CABINET,
  WALL_CABINET,
  TALL_CABINET,
  REFRIGERATOR,
  FREEZER,
  DISHWASHER,
  OVEN,
  COOKTOP,
  RANGE_HOOD,
  SINK,
];

export default KITCHEN_OBJECTS;
