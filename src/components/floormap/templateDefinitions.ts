/**
 * TEMPLATE SYSTEM - Save & Reuse Canvas Selections
 * 
 * Allows users to save selected shapes as reusable templates.
 * Templates can be walls, objects, or combinations.
 * When placed, they create regular editable shapes.
 * 
 * Storage: Supabase database (templates table)
 */

import { FloorMapShape } from './types';
import { supabase } from '@/integrations/supabase/client';

export interface Template {
  id: string;
  user_id: string;
  project_id?: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  
  // The shapes that make up this template (relative coordinates)
  shapes: FloorMapShape[];
  
  // Bounding box (for preview and placement)
  bounds: {
    width: number;  // in mm
    height: number; // in mm
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  
  // Metadata
  created_at: string;
  updated_at?: string;
  tags?: string[];
}

export type TemplateCategory = 
  | 'walls'
  | 'bathroom'
  | 'kitchen'
  | 'electrical'
  | 'furniture'
  | 'doors_windows'
  | 'stairs'
  | 'structural'
  | 'other';

/**
 * Calculate bounding box for a set of shapes
 */
export function calculateBounds(shapes: FloorMapShape[]): Template['bounds'] {
  if (shapes.length === 0) {
    return { width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  shapes.forEach(shape => {
    const coords = shape.coordinates as any;
    
    // WALLS: {x1, y1, x2, y2}
    if (shape.type === 'wall' && coords.x1 !== undefined) {
      minX = Math.min(minX, coords.x1, coords.x2);
      minY = Math.min(minY, coords.y1, coords.y2);
      maxX = Math.max(maxX, coords.x1, coords.x2);
      maxY = Math.max(maxY, coords.y1, coords.y2);
    }
    // ROOMS/POLYGONS: {points: [...]}
    else if ((shape.type === 'room' || shape.type === 'polygon') && coords.points) {
      coords.points.forEach((point: any) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    }
    // FREEHAND: {points: [...]} or with placementX/Y
    else if (shape.type === 'freehand' && coords.points) {
      if (shape.metadata?.placementX !== undefined && shape.metadata?.placementY !== undefined) {
        const px = shape.metadata.placementX;
        const py = shape.metadata.placementY;
        const size = 1000;
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px + size);
        maxY = Math.max(maxY, py + size);
      } else {
        coords.points.forEach((point: any) => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        });
      }
    }
    // RECTANGLES: {left, top, width, height}
    else if (shape.type === 'rectangle' && coords.left !== undefined) {
      minX = Math.min(minX, coords.left);
      minY = Math.min(minY, coords.top);
      maxX = Math.max(maxX, coords.left + coords.width);
      maxY = Math.max(maxY, coords.top + coords.height);
    }
    // CIRCLES: {cx, cy, radius}
    else if (shape.type === 'circle' && coords.cx !== undefined) {
      minX = Math.min(minX, coords.cx - coords.radius);
      minY = Math.min(minY, coords.cy - coords.radius);
      maxX = Math.max(maxX, coords.cx + coords.radius);
      maxY = Math.max(maxY, coords.cy + coords.radius);
    }
    // SYMBOLS: {x, y, width, height}
    else if (shape.type === 'symbol' && coords.x !== undefined) {
      minX = Math.min(minX, coords.x);
      minY = Math.min(minY, coords.y);
      maxX = Math.max(maxX, coords.x + (coords.width || 0));
      maxY = Math.max(maxY, coords.y + (coords.height || 0));
    }
    // TEXT: {x, y}
    else if (shape.type === 'text' && coords.x !== undefined) {
      minX = Math.min(minX, coords.x);
      minY = Math.min(minY, coords.y);
      maxX = Math.max(maxX, coords.x + 100); // Assume 100mm width for text
      maxY = Math.max(maxY, coords.y + 20); // Assume 20mm height for text
    }
  });
  
  return {
    width: maxX - minX,
    height: maxY - minY,
    minX,
    minY,
    maxX,
    maxY,
  };
}

/**
 * Normalize shapes to relative coordinates (starting from 0,0)
 */
export function normalizeShapes(shapes: FloorMapShape[]): FloorMapShape[] {
  const bounds = calculateBounds(shapes);
  const offsetX = bounds.minX;
  const offsetY = bounds.minY;
  
  // Normalizing shapes to relative coordinates
  
  return shapes.map(shape => {
    const normalized = JSON.parse(JSON.stringify(shape)); // Deep clone
    
    if (shape.type === 'wall' && shape.coordinates.points) {
      normalized.coordinates.points = shape.coordinates.points.map(p => ({
        x: p.x - offsetX,
        y: p.y - offsetY,
      }));
    } else if (shape.type === 'room' && shape.coordinates.points) {
      normalized.coordinates.points = shape.coordinates.points.map(p => ({
        x: p.x - offsetX,
        y: p.y - offsetY,
      }));
    } else if (shape.type === 'freehand' && shape.coordinates.points) {
      if (shape.metadata?.placementX !== undefined && shape.metadata?.placementY !== undefined) {
        // For library symbols/objects, adjust placement
        normalized.metadata = {
          ...shape.metadata,
          placementX: shape.metadata.placementX - offsetX,
          placementY: shape.metadata.placementY - offsetY,
        };
      } else {
        normalized.coordinates.points = shape.coordinates.points.map(p => ({
          x: p.x - offsetX,
          y: p.y - offsetY,
        }));
      }
    } else if (shape.type === 'rectangle' && shape.coordinates.x !== undefined && shape.coordinates.y !== undefined) {
      normalized.coordinates.x = shape.coordinates.x - offsetX;
      normalized.coordinates.y = shape.coordinates.y - offsetY;
    } else if (shape.type === 'circle' && shape.coordinates.x !== undefined && shape.coordinates.y !== undefined) {
      normalized.coordinates.x = shape.coordinates.x - offsetX;
      normalized.coordinates.y = shape.coordinates.y - offsetY;
    }
    
    return normalized;
  });
}

/**
 * Place template shapes at a specific position (convert relative to absolute)
 * This function recalculates bounds from the actual shapes to ensure correct placement
 */
export function placeTemplateShapes(
  template: Template | null,
  position: { x: number; y: number },
  planId: string
): FloorMapShape[] {
  if (!template || !template.shapes) {
    console.error('Invalid template or template.shapes is undefined');
    return [];
  }
  
  // Calculate actual bounds from the template shapes (in case normalization wasn't perfect)
  const actualBounds = calculateBounds(template.shapes);

  // Calculate offset needed to move shapes from their current position to the click position
  // We want the top-left corner of the bounding box to be at the click position
  const offsetX = position.x - actualBounds.minX;
  const offsetY = position.y - actualBounds.minY;
  
  return template.shapes.map(shape => {
    const placed = JSON.parse(JSON.stringify(shape)); // Deep clone
    placed.id = crypto.randomUUID(); // New unique ID
    placed.planId = planId; // Assign to current plan
    
    const coords = placed.coordinates as any;
    
    // WALLS: {x1, y1, x2, y2}
    if (shape.type === 'wall' && coords.x1 !== undefined) {
      coords.x1 += offsetX;
      coords.y1 += offsetY;
      coords.x2 += offsetX;
      coords.y2 += offsetY;
    }
    // ROOMS/POLYGONS: {points: [...]}
    else if ((shape.type === 'room' || shape.type === 'polygon') && coords.points) {
      coords.points = coords.points.map((p: any) => ({
        x: p.x + offsetX,
        y: p.y + offsetY,
      }));
    }
    // FREEHAND: {points: [...]} or with placementX/Y
    else if (shape.type === 'freehand' && coords.points) {
      if (placed.metadata?.placementX !== undefined) {
        placed.metadata.placementX += offsetX;
        placed.metadata.placementY += offsetY;
      } else {
        coords.points = coords.points.map((p: any) => ({
          x: p.x + offsetX,
          y: p.y + offsetY,
        }));
      }
    }
    // RECTANGLES: {left, top, width, height}
    else if (shape.type === 'rectangle' && coords.left !== undefined) {
      coords.left += offsetX;
      coords.top += offsetY;
    }
    // CIRCLES: {cx, cy, radius}
    else if (shape.type === 'circle' && coords.cx !== undefined) {
      coords.cx += offsetX;
      coords.cy += offsetY;
    }
    // SYMBOLS: {x, y, width, height}
    else if (shape.type === 'symbol' && coords.x !== undefined) {
      coords.x += offsetX;
      coords.y += offsetY;
    }
    // TEXT: {x, y}
    else if (shape.type === 'text' && coords.x !== undefined) {
      coords.x += offsetX;
      coords.y += offsetY;
    }
    return placed;
  });
}

/**
 * Get all templates for current user
 */
export async function getTemplates(projectId?: string): Promise<Template[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    let query = supabase
      .from('templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      if (error.code !== 'PGRST205') {
        console.error('Error loading templates:', error);
      }
      return [];
    }
    
    return data || [];
  } catch (error) {
    return [];
  }
}

/**
 * Add a new template
 */
export async function addTemplate(template: Omit<Template, 'id' | 'created_at' | 'updated_at'>): Promise<Template | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('templates')
      .insert({
        user_id: user.id,
        project_id: template.project_id,
        name: template.name,
        description: template.description,
        category: template.category,
        shapes: template.shapes as any,
        bounds: template.bounds as any,
        tags: template.tags,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding template:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error adding template:', error);
    return null;
  }
}

/**
 * Delete a template
 */
export async function deleteTemplate(templateId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', templateId);
    
    if (error) {
      console.error('Error deleting template:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting template:', error);
    return false;
  }
}

/**
 * Get template by ID
 */
export async function getTemplateById(templateId: string): Promise<Template | null> {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST205') {
        console.error('Error getting template:', error);
      }
      return null;
    }
    
    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Get templates by category
 */
export async function getTemplatesByCategory(category: TemplateCategory, projectId?: string): Promise<Template[]> {
  const templates = await getTemplates(projectId);
  return templates.filter(t => t.category === category);
}

/**
 * Get all categories with templates
 */
export async function getAllTemplateCategories(projectId?: string): Promise<TemplateCategory[]> {
  const templates = await getTemplates(projectId);
  const categories = new Set<TemplateCategory>(templates.map(t => t.category));
  return Array.from(categories);
}

/**
 * Export templates as JSON
 */
export async function exportTemplatesAsJSON(projectId?: string): Promise<string> {
  const templates = await getTemplates(projectId);
  return JSON.stringify(templates, null, 2);
}

/**
 * Import templates from JSON
 */
export async function importTemplatesFromJSON(json: string, projectId?: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const imported = JSON.parse(json);
    if (!Array.isArray(imported)) {
      return { success: false, count: 0, error: 'Invalid JSON format (not an array)' };
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, count: 0, error: 'User not authenticated' };
    }
    
    let successCount = 0;
    for (const template of imported) {
      const result = await addTemplate({
        user_id: user.id,
        project_id: projectId,
        name: template.name,
        description: template.description,
        category: template.category,
        shapes: template.shapes,
        bounds: template.bounds,
        tags: template.tags,
      });
      
      if (result) {
        successCount++;
      }
    }
    
    return { success: true, count: successCount };
  } catch (error) {
    return { success: false, count: 0, error: (error as Error).message };
  }
}

/**
 * TEMPLATE COORDINATE SYSTEM
 * 
 * Canvas coordinate system: 1 canvas unit = 10 mm in real world
 * Therefore: To get 900mm on canvas, we need coordinate value of 90
 * 
 * SCALE_FACTOR converts real-world mm to canvas units
 * Formula: canvas_units = real_mm / SCALE_FACTOR
 * 
 * Standard measurements (in real mm → canvas units):
 * - Door width: 900mm → 90 units
 * - Window width: 1200mm → 120 units  
 * - Wall thickness: 150mm → 15 units
 * - Room height: 2400mm → 240 units
 */
const TEMPLATE_SCALE_FACTOR = 10; // 1 canvas unit = 10mm

/**
 * Helper function to convert mm to canvas units
 */
const mm = (value: number) => value / TEMPLATE_SCALE_FACTOR;

/**
 * Default architectural templates
 * These are pre-defined templates available to all users
 * ALL COORDINATES ARE IN MILLIMETERS (mm)
 * Centered around origin (0,0) for easy placement
 */
export const DEFAULT_TEMPLATES: Omit<Template, 'id' | 'user_id' | 'created_at'>[] = [
  // ============================================================================
  // BATHROOM TEMPLATES
  // ============================================================================

  // WC / TOALETT - 400mm × 600mm
  {
    name: 'WC / Toalett',
    description: 'WC-stol med cistern och skål',
    category: 'bathroom',
    tags: ['wc', 'toalett', 'badrum', 'sanitet'],
    shapes: [
      // Cistern (rektangel) - 200mm × 150mm, centrerad
      {
        id: 'wc-cistern',
        type: 'rectangle',
        coordinates: { left: mm(-100), top: mm(-75), width: mm(200), height: mm(150) },
        strokeColor: '#333333',
        strokeWidth: 2,
        color: 'transparent',
        name: 'Cistern',
      } as FloorMapShape,
      // Skål (cirkel) - 150mm radie, placerad framför cistern
      {
        id: 'wc-bowl',
        type: 'circle',
        coordinates: { cx: 0, cy: mm(75), radius: mm(150) },
        strokeColor: '#333333',
        strokeWidth: 2,
        color: 'transparent',
        name: 'Skål',
      } as FloorMapShape,
    ],
    bounds: { width: mm(300), height: mm(300), minX: mm(-150), minY: mm(-75), maxX: mm(150), maxY: mm(225) },
  },

  // HANDFAT - 600mm × 450mm
  {
    name: 'Handfat',
    description: 'Handfat med blandare och underskåp',
    category: 'bathroom',
    tags: ['handfat', 'laval', 'badrum', 'sanitet'],
    shapes: [
      // Underskåp (rektangel) - 600mm bred × 200mm hög
      {
        id: 'sink-cabinet',
        type: 'rectangle',
        coordinates: { left: mm(-300), top: mm(50), width: mm(600), height: mm(200) },
        strokeColor: '#333333',
        strokeWidth: 2,
        color: 'transparent',
        name: 'Underskåp',
      } as FloorMapShape,
      // Handfatsskål (cirkel) - 150mm radie
      {
        id: 'sink-bowl',
        type: 'circle',
        coordinates: { cx: 0, cy: mm(-50), radius: mm(150) },
        strokeColor: '#333333',
        strokeWidth: 2,
        color: 'transparent',
        name: 'Handfatsskål',
      } as FloorMapShape,
      // Blandare (liten cirkel) - 20mm radie
      {
        id: 'sink-faucet',
        type: 'circle',
        coordinates: { cx: 0, cy: mm(-150), radius: mm(20) },
        strokeColor: '#666666',
        strokeWidth: 1,
        color: 'transparent',
        name: 'Blandare',
      } as FloorMapShape,
    ],
    bounds: { width: mm(600), height: mm(400), minX: mm(-300), minY: mm(-170), maxX: mm(300), maxY: mm(250) },
  },

  // DUSCHHÖRNA - 900mm × 900mm
  {
    name: 'Duschhörna',
    description: 'Kvadratisk duschhörna med glasdörrar',
    category: 'bathroom',
    tags: ['dusch', 'hörna', 'badrum', 'glas'],
    shapes: [
      // Duschväggar (fyrkant) - 900mm × 900mm
      {
        id: 'shower-wall-top',
        type: 'wall',
        coordinates: { x1: mm(-450), y1: mm(-450), x2: mm(450), y2: mm(-450) },
        strokeColor: '#333333',
        strokeWidth: 3,
        color: 'transparent',
        name: 'Övre duschvägg',
      } as FloorMapShape,
      {
        id: 'shower-wall-right',
        type: 'wall',
        coordinates: { x1: mm(450), y1: mm(-450), x2: mm(450), y2: mm(450) },
        strokeColor: '#333333',
        strokeWidth: 3,
        color: 'transparent',
        name: 'Höger duschvägg',
      } as FloorMapShape,
      {
        id: 'shower-wall-bottom',
        type: 'wall',
        coordinates: { x1: mm(450), y1: mm(450), x2: mm(-450), y2: mm(450) },
        strokeColor: '#333333',
        strokeWidth: 3,
        color: 'transparent',
        name: 'Nedre duschvägg',
      } as FloorMapShape,
      // Glasdörr (streckad linje) - 800mm öppning
      {
        id: 'shower-glass-door',
        type: 'wall',
        coordinates: { x1: mm(-400), y1: mm(-450), x2: mm(-400), y2: mm(450) },
        strokeColor: '#999999',
        strokeWidth: 2,
        color: 'transparent',
        name: 'Glasdörr',
      } as FloorMapShape,
    ],
    bounds: { width: mm(900), height: mm(900), minX: mm(-450), minY: mm(-450), maxX: mm(450), maxY: mm(450) },
  },

  // BADKAR - 1700mm × 750mm
  {
    name: 'Badkar',
    description: 'Standard badkar med avrinning',
    category: 'bathroom',
    tags: ['badkar', 'badrum', 'avrinning'],
    shapes: [
      // Badkarkropp (rektangel) - 1700mm × 750mm
      {
        id: 'bathtub-body',
        type: 'rectangle',
        coordinates: { left: mm(-850), top: mm(-375), width: mm(1700), height: mm(750) },
        strokeColor: '#333333',
        strokeWidth: 3,
        color: 'transparent',
        name: 'Badkarkropp',
      } as FloorMapShape,
      // Avrinningsområde (mindre rektangel) - 200mm × 100mm
      {
        id: 'bathtub-drain',
        type: 'rectangle',
        coordinates: { left: mm(-100), top: mm(-50), width: mm(200), height: mm(100) },
        strokeColor: '#666666',
        strokeWidth: 1,
        color: 'transparent',
        name: 'Avrinningsområde',
      } as FloorMapShape,
    ],
    bounds: { width: mm(1700), height: mm(750), minX: mm(-850), minY: mm(-375), maxX: mm(850), maxY: mm(375) },
  },

  // ============================================================================
  // KITCHEN TEMPLATES
  // ============================================================================

  // SPIS - 600mm × 650mm
  {
    name: 'Spis',
    description: 'Kökspis med 4 plattor och ugn',
    category: 'kitchen',
    tags: ['spis', 'kök', 'ugn', 'plattor'],
    shapes: [
      // Spiskropp (rektangel) - 600mm × 650mm
      {
        id: 'stove-body',
        type: 'rectangle',
        coordinates: { left: mm(-300), top: mm(-325), width: mm(600), height: mm(650) },
        strokeColor: '#333333',
        strokeWidth: 3,
        color: 'transparent',
        name: 'Spiskropp',
      } as FloorMapShape,
      // Plattor (4 cirklar) - 100mm radie vardera
      {
        id: 'burner-1',
        type: 'circle',
        coordinates: { cx: mm(-150), cy: mm(-150), radius: mm(100) },
        strokeColor: '#666666',
        strokeWidth: 1,
        color: 'transparent',
        name: 'Platta 1',
      } as FloorMapShape,
      {
        id: 'burner-2',
        type: 'circle',
        coordinates: { cx: mm(150), cy: mm(-150), radius: mm(100) },
        strokeColor: '#666666',
        strokeWidth: 1,
        color: 'transparent',
        name: 'Platta 2',
      } as FloorMapShape,
      {
        id: 'burner-3',
        type: 'circle',
        coordinates: { cx: mm(-150), cy: mm(50), radius: mm(100) },
        strokeColor: '#666666',
        strokeWidth: 1,
        color: 'transparent',
        name: 'Platta 3',
      } as FloorMapShape,
      {
        id: 'burner-4',
        type: 'circle',
        coordinates: { cx: mm(150), cy: mm(50), radius: mm(100) },
        strokeColor: '#666666',
        strokeWidth: 1,
        color: 'transparent',
        name: 'Platta 4',
      } as FloorMapShape,
      // Ugnslucka (rektangel) - 500mm × 300mm
      {
        id: 'oven-door',
        type: 'rectangle',
        coordinates: { left: mm(-250), top: mm(100), width: mm(500), height: mm(300) },
        strokeColor: '#666666',
        strokeWidth: 2,
        color: 'transparent',
        name: 'Ugnslucka',
      } as FloorMapShape,
    ],
    bounds: { width: mm(600), height: mm(650), minX: mm(-300), minY: mm(-325), maxX: mm(300), maxY: mm(325) },
  },

  // DISKHO - 600mm × 600mm
  {
    name: 'Diskho',
    description: 'Köksdiskho med vask och blandare',
    category: 'kitchen',
    tags: ['diskho', 'vask', 'kök', 'blandare'],
    shapes: [
      // Diskhoskåp (rektangel) - 600mm × 600mm
      {
        id: 'sink-cabinet-body',
        type: 'rectangle',
        coordinates: { left: mm(-300), top: mm(-300), width: mm(600), height: mm(600) },
        strokeColor: '#333333',
        strokeWidth: 3,
        color: 'transparent',
        name: 'Diskhoskåp',
      } as FloorMapShape,
      // Vask (cirkel) - 200mm radie
      {
        id: 'kitchen-sink',
        type: 'circle',
        coordinates: { cx: 0, cy: mm(-100), radius: mm(200) },
        strokeColor: '#333333',
        strokeWidth: 2,
        color: 'transparent',
        name: 'Vask',
      } as FloorMapShape,
      // Blandare (liten cirkel) - 15mm radie
      {
        id: 'kitchen-faucet',
        type: 'circle',
        coordinates: { cx: 0, cy: mm(-250), radius: mm(15) },
        strokeColor: '#666666',
        strokeWidth: 1,
        color: 'transparent',
        name: 'Blandare',
      } as FloorMapShape,
    ],
    bounds: { width: mm(600), height: mm(600), minX: mm(-300), minY: mm(-300), maxX: mm(300), maxY: mm(300) },
  },

  // KYLSKÅP - 600mm × 1800mm
  {
    name: 'Kyl/Frys',
    description: 'Kombinerat kylskåp och frys',
    category: 'kitchen',
    tags: ['kylskåp', 'frys', 'kök', 'kyl'],
    shapes: [
      // Kylskåpskropp (rektangel) - 600mm × 1800mm
      {
        id: 'fridge-body',
        type: 'rectangle',
        coordinates: { left: mm(-300), top: mm(-900), width: mm(600), height: mm(1800) },
        strokeColor: '#333333',
        strokeWidth: 3,
        color: 'transparent',
        name: 'Kylskåpskropp',
      } as FloorMapShape,
      // Dörren (rektangel) - 550mm × 1700mm
      {
        id: 'fridge-door',
        type: 'rectangle',
        coordinates: { left: mm(-275), top: mm(-875), width: mm(550), height: mm(1700) },
        strokeColor: '#666666',
        strokeWidth: 2,
        color: 'transparent',
        name: 'Kylskåpsdörr',
      } as FloorMapShape,
      // Frysdel (liten rektangel upptill) - 500mm × 300mm
      {
        id: 'freezer-section',
        type: 'rectangle',
        coordinates: { left: mm(-250), top: mm(-850), width: mm(500), height: mm(300) },
        strokeColor: '#999999',
        strokeWidth: 1,
        color: 'transparent',
        name: 'Frysdel',
      } as FloorMapShape,
    ],
    bounds: { width: mm(600), height: mm(1800), minX: mm(-300), minY: mm(-900), maxX: mm(300), maxY: mm(900) },
  },

  // ============================================================================
  // BEDROOM TEMPLATES
  // ============================================================================

  // SÄNG 180cm - 1800mm × 2000mm
  {
    name: 'Säng 180cm',
    description: 'Dubbelbädd 180cm bred med huvudända',
    category: 'bedroom',
    tags: ['säng', 'dubbelbädd', '180cm', 'sovrum'],
    shapes: [
      // Sängram (rektangel) - 1800mm × 2000mm
      {
        id: 'bed-frame',
        type: 'rectangle',
        coordinates: { left: mm(-900), top: mm(-1000), width: mm(1800), height: mm(2000) },
        strokeColor: '#333333',
        strokeWidth: 3,
        color: 'transparent',
        name: 'Sängram',
      } as FloorMapShape,
      // Madrass (mindre rektangel) - 1750mm × 1950mm
      {
        id: 'bed-mattress',
        type: 'rectangle',
        coordinates: { left: mm(-875), top: mm(-975), width: mm(1750), height: mm(1950) },
        strokeColor: '#666666',
        strokeWidth: 1,
        color: 'transparent',
        name: 'Madrass',
      } as FloorMapShape,
      // Huvudända (tjock linje) - 1800mm bred
      {
        id: 'bed-headboard',
        type: 'wall',
        coordinates: { x1: mm(-900), y1: mm(-1000), x2: mm(900), y2: mm(-1000) },
        strokeColor: '#333333',
        strokeWidth: 6,
        color: 'transparent',
        name: 'Huvudända',
      } as FloorMapShape,
    ],
    bounds: { width: mm(1800), height: mm(2000), minX: mm(-900), minY: mm(-1000), maxX: mm(900), maxY: mm(1000) },
  },

  // ============================================================================
  // LIVING ROOM TEMPLATES
  // ============================================================================

  // SOFFA 3-SITS - 2400mm × 900mm
  {
    name: 'Soffa 3-sits',
    description: '3-sits soffa för vardagsrum',
    category: 'livingroom',
    tags: ['soffa', '3-sits', 'vardagsrum', 'möbel'],
    shapes: [
      // Soffkropp (rektangel) - 2400mm × 900mm
      {
        id: 'sofa-body',
        type: 'rectangle',
        coordinates: { left: mm(-1200), top: mm(-450), width: mm(2400), height: mm(900) },
        strokeColor: '#333333',
        strokeWidth: 3,
        color: 'transparent',
        name: 'Soffkropp',
      } as FloorMapShape,
      // Ryggstöd (linje upptill) - 2400mm bred
      {
        id: 'sofa-back',
        type: 'wall',
        coordinates: { x1: mm(-1200), y1: mm(-450), x2: mm(1200), y2: mm(-450) },
        strokeColor: '#333333',
        strokeWidth: 4,
        color: 'transparent',
        name: 'Ryggstöd',
      } as FloorMapShape,
      // Armstöd (vertikala linjer) - 100mm breda
      {
        id: 'sofa-arm-left',
        type: 'wall',
        coordinates: { x1: mm(-1200), y1: mm(-450), x2: mm(-1200), y2: mm(450) },
        strokeColor: '#333333',
        strokeWidth: 4,
        color: 'transparent',
        name: 'Vänster armstöd',
      } as FloorMapShape,
      {
        id: 'sofa-arm-right',
        type: 'wall',
        coordinates: { x1: mm(1200), y1: mm(-450), x2: mm(1200), y2: mm(450) },
        strokeColor: '#333333',
        strokeWidth: 4,
        color: 'transparent',
        name: 'Höger armstöd',
      } as FloorMapShape,
    ],
    bounds: { width: mm(2400), height: mm(900), minX: mm(-1200), minY: mm(-450), maxX: mm(1200), maxY: mm(450) },
  },

  // ============================================================================
  // ARCHITECTURE TEMPLATES
  // ============================================================================

  // INNERDÖRR 90° SLAG - 900mm × 900mm
  {
    name: 'Innerdörr 90° slag',
    description: 'Innerdörr med 90-graders öppning',
    category: 'architecture',
    tags: ['dörr', 'innerdörr', '90-graders', 'slag'],
    shapes: [
      // Dörrblad (vertikal linje) - 900mm hög
      {
        id: 'interior-door-blade',
        type: 'wall',
        coordinates: { x1: 0, y1: 0, x2: 0, y2: mm(900) },
        strokeColor: '#333333',
        strokeWidth: 4,
        color: 'transparent',
        name: 'Dörrblad',
      } as FloorMapShape,
      // Svängbåge (90° arc) - 900mm radie
      {
        id: 'interior-door-arc',
        type: 'freehand',
        coordinates: {
          points: Array.from({ length: 20 }, (_, i) => {
            const angle = (i / 19) * (Math.PI / 2); // 90 grader
            const radius = mm(900);
            return {
              x: Math.cos(angle) * radius,
              y: Math.sin(angle) * radius,
            };
          }),
        },
        strokeColor: '#666666',
        strokeWidth: 1,
        color: 'transparent',
        name: 'Svängbåge',
      } as FloorMapShape,
    ],
    bounds: { width: mm(900), height: mm(900), minX: 0, minY: 0, maxX: mm(900), maxY: mm(900) },
  },

  // FÖNSTER - 1200mm × 150mm
  {
    name: 'Fönster',
    description: 'Standard fönster med karm och glas',
    category: 'architecture',
    tags: ['fönster', '1200mm', 'glas'],
    shapes: [
      // Fönsterkarm (topp) - 1200mm bred
      {
        id: 'window-frame-top',
        type: 'wall',
        coordinates: { x1: mm(-600), y1: mm(-75), x2: mm(600), y2: mm(-75) },
        strokeColor: '#333333',
        strokeWidth: 3,
        color: 'transparent',
        name: 'Övre karm',
      } as FloorMapShape,
      // Fönsterkarm (botten) - 1200mm bred
      {
        id: 'window-frame-bottom',
        type: 'wall',
        coordinates: { x1: mm(-600), y1: mm(75), x2: mm(600), y2: mm(75) },
        strokeColor: '#333333',
        strokeWidth: 3,
        color: 'transparent',
        name: 'Nedre karm',
      } as FloorMapShape,
      // Mittpost (vertikal) - delar fönstret i två
      {
        id: 'window-muntin',
        type: 'wall',
        coordinates: { x1: 0, y1: mm(-75), x2: 0, y2: mm(75) },
        strokeColor: '#666666',
        strokeWidth: 2,
        color: 'transparent',
        name: 'Mittpost',
      } as FloorMapShape,
    ],
    bounds: { width: mm(1200), height: mm(150), minX: mm(-600), minY: mm(-75), maxX: mm(600), maxY: mm(75) },
  },

  // ============================================================================
  // ELECTRICAL TEMPLATES
  // ============================================================================

  // ELUTTAG - 70mm × 120mm
  {
    name: 'Eluttag',
    description: 'Vägguttag för elektricitet',
    category: 'electrical',
    tags: ['eluttag', 'uttag', 'elektricitet', 'vägg'],
    shapes: [
      // Uttagslåda (rektangel) - 70mm × 120mm
      {
        id: 'outlet-box',
        type: 'rectangle',
        coordinates: { left: mm(-35), top: mm(-60), width: mm(70), height: mm(120) },
        strokeColor: '#333333',
        strokeWidth: 2,
        color: 'transparent',
        name: 'Uttagslåda',
      } as FloorMapShape,
      // Uttagsöppningar (två små rektanglar)
      {
        id: 'outlet-hole-1',
        type: 'rectangle',
        coordinates: { left: mm(-15), top: mm(-40), width: mm(30), height: mm(15) },
        strokeColor: '#666666',
        strokeWidth: 1,
        color: 'transparent',
        name: 'Uttagsöppning 1',
      } as FloorMapShape,
      {
        id: 'outlet-hole-2',
        type: 'rectangle',
        coordinates: { left: mm(-15), top: mm(5), width: mm(30), height: mm(15) },
        strokeColor: '#666666',
        strokeWidth: 1,
        color: 'transparent',
        name: 'Uttagsöppning 2',
      } as FloorMapShape,
    ],
    bounds: { width: mm(70), height: mm(120), minX: mm(-35), minY: mm(-60), maxX: mm(35), maxY: mm(60) },
  },

  // STRÖMBRYTARE - 70mm × 120mm
  {
    name: 'Strömbrytare',
    description: 'Väggmonterad strömbrytare',
    category: 'electrical',
    tags: ['strömbrytare', 'brytare', 'elektricitet', 'vägg'],
    shapes: [
      // Brytarkropp (rektangel) - 70mm × 120mm
      {
        id: 'switch-box',
        type: 'rectangle',
        coordinates: { left: mm(-35), top: mm(-60), width: mm(70), height: mm(120) },
        strokeColor: '#333333',
        strokeWidth: 2,
        color: 'transparent',
        name: 'Brytarkropp',
      } as FloorMapShape,
      // Brytarplatta (mindre rektangel) - 60mm × 110mm
      {
        id: 'switch-plate',
        type: 'rectangle',
        coordinates: { left: mm(-30), top: mm(-55), width: mm(60), height: mm(110) },
        strokeColor: '#666666',
        strokeWidth: 1,
        color: 'transparent',
        name: 'Brytarplatta',
      } as FloorMapShape,
      // Brytare (liten rektangel) - 20mm × 40mm
      {
        id: 'switch-toggle',
        type: 'rectangle',
        coordinates: { left: mm(-10), top: mm(-20), width: mm(20), height: mm(40) },
        strokeColor: '#999999',
        strokeWidth: 1,
        color: 'transparent',
        name: 'Brytare',
      } as FloorMapShape,
    ],
    bounds: { width: mm(70), height: mm(120), minX: mm(-35), minY: mm(-60), maxX: mm(35), maxY: mm(60) },
  },
];
