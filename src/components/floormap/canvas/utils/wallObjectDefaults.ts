/**
 * Wall Object Category Defaults
 *
 * Predefined dimensions and installation heights for common object categories.
 * These defaults are used when placing objects in the floorplan/elevation views.
 *
 * All measurements are in millimeters (mm).
 */

import { WallObjectCategory } from '../../types';

/**
 * Default dimensions and elevation for each object category.
 */
export interface ObjectCategoryDefaults {
  elevationBottom: number;   // mm from floor (default installation height)
  defaultWidth: number;      // mm (along wall direction)
  defaultHeight: number;     // mm (vertical in elevation view)
  defaultDepth: number;      // mm (perpendicular to wall, into room)
}

/**
 * Category defaults based on standard construction practices.
 *
 * Floor cabinets: Standard kitchen base cabinet height is 720mm on 150mm plinth
 * Wall cabinets: Typically installed 1400mm from floor (above countertop + backsplash)
 * Countertop: Standard height 850mm from floor
 * Windows: Typical sill height 900mm from floor
 * Doors: Start at floor level, standard height 2100mm
 */
export const OBJECT_CATEGORY_DEFAULTS: Record<WallObjectCategory, ObjectCategoryDefaults> = {
  floor_cabinet: {
    elevationBottom: 0,      // Sits on floor (or plinth)
    defaultWidth: 600,       // Standard 60cm cabinet width
    defaultHeight: 720,      // Standard base cabinet height
    defaultDepth: 560,       // Standard depth for countertop overhang
  },
  wall_cabinet: {
    elevationBottom: 1400,   // Above countertop (850mm) + backsplash (~550mm)
    defaultWidth: 600,       // Standard 60cm cabinet width
    defaultHeight: 720,      // Standard wall cabinet height
    defaultDepth: 350,       // Shallower than base cabinets
  },
  countertop: {
    elevationBottom: 850,    // Standard countertop height
    defaultWidth: 600,       // Standard depth
    defaultHeight: 40,       // Typical countertop thickness
    defaultDepth: 600,       // Standard counter depth
  },
  appliance_floor: {
    elevationBottom: 0,      // Sits on floor
    defaultWidth: 600,       // Standard appliance width
    defaultHeight: 850,      // Standard height (matches countertop)
    defaultDepth: 600,       // Standard depth
  },
  appliance_wall: {
    elevationBottom: 1000,   // Typically above countertop
    defaultWidth: 600,       // Standard microwave/wall oven width
    defaultHeight: 400,      // Variable height
    defaultDepth: 400,       // Shallower for wall mounting
  },
  window: {
    elevationBottom: 900,    // Typical window sill height
    defaultWidth: 1200,      // Standard window width
    defaultHeight: 1200,     // Standard window height
    defaultDepth: 200,       // Wall thickness + frame
  },
  door: {
    elevationBottom: 0,      // Starts at floor level
    defaultWidth: 900,       // Standard door width (90cm)
    defaultHeight: 2100,     // Standard door height
    defaultDepth: 100,       // Door thickness + frame
  },
  decoration: {
    elevationBottom: 1200,   // Eye level for artwork
    defaultWidth: 400,       // Variable
    defaultHeight: 400,      // Variable
    defaultDepth: 50,        // Minimal depth for wall-mounted items
  },
  custom: {
    elevationBottom: 0,      // User-defined
    defaultWidth: 500,       // Default medium size
    defaultHeight: 500,      // Default medium size
    defaultDepth: 500,       // Default medium size
  },
};

/**
 * Get default dimensions for an object category.
 * Falls back to 'custom' defaults if category is not found.
 */
export function getDefaultsForCategory(category: WallObjectCategory | undefined): ObjectCategoryDefaults {
  if (!category || !(category in OBJECT_CATEGORY_DEFAULTS)) {
    return OBJECT_CATEGORY_DEFAULTS.custom;
  }
  return OBJECT_CATEGORY_DEFAULTS[category];
}

/**
 * Get the default elevation (height from floor) for a category.
 * Useful when placing new objects.
 */
export function getDefaultElevation(category: WallObjectCategory | undefined): number {
  return getDefaultsForCategory(category).elevationBottom;
}

/**
 * Get human-readable category names for UI display.
 * Uses Swedish labels to match the app's primary language.
 */
export const CATEGORY_LABELS: Record<WallObjectCategory, { sv: string; en: string }> = {
  floor_cabinet: { sv: 'Bänkskåp', en: 'Floor Cabinet' },
  wall_cabinet: { sv: 'Väggskåp', en: 'Wall Cabinet' },
  countertop: { sv: 'Bänkskiva', en: 'Countertop' },
  appliance_floor: { sv: 'Golvapparat', en: 'Floor Appliance' },
  appliance_wall: { sv: 'Väggapparat', en: 'Wall Appliance' },
  window: { sv: 'Fönster', en: 'Window' },
  door: { sv: 'Dörr', en: 'Door' },
  decoration: { sv: 'Dekoration', en: 'Decoration' },
  custom: { sv: 'Anpassad', en: 'Custom' },
};

/**
 * Get the category label in the specified language.
 */
export function getCategoryLabel(category: WallObjectCategory, lang: 'sv' | 'en' = 'sv'): string {
  const labels = CATEGORY_LABELS[category];
  return labels ? labels[lang] : category;
}

/**
 * Infer object category from symbol type.
 * Maps common symbol types to their appropriate categories.
 */
export function inferCategoryFromSymbolType(symbolType: string | undefined): WallObjectCategory {
  if (!symbolType) return 'custom';

  const typeMap: Record<string, WallObjectCategory> = {
    // Kitchen
    floor_cabinet: 'floor_cabinet',
    wall_cabinet: 'wall_cabinet',
    sink_cabinet: 'floor_cabinet',
    oven: 'appliance_floor',
    stove: 'floor_cabinet', // Cooktop sits in countertop
    fridge: 'appliance_floor',
    dishwasher: 'appliance_floor',

    // Bathroom
    toilet: 'floor_cabinet', // Sits on floor
    shower: 'custom',
    bathtub: 'appliance_floor',
    sink: 'floor_cabinet', // Vanity cabinet
    mirror: 'decoration',
    washing_machine: 'appliance_floor',
    dryer: 'appliance_floor',

    // Furniture
    bed: 'custom',
    bed_single: 'custom',
    bed_double: 'custom',
    sofa: 'custom',
    table: 'custom',
    chair: 'custom',
    wardrobe: 'floor_cabinet',
    nightstand: 'floor_cabinet',
    desk: 'floor_cabinet',

    // Structural
    door: 'door',
    window: 'window',
    arch_window: 'window',
    door_outward: 'door',
    sliding_door: 'door',
  };

  return typeMap[symbolType] || 'custom';
}
