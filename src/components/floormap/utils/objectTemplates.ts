/**
 * Object Templates System
 * 
 * Provides a flexible template-based object creation system where users can
 * customize default object designs without code changes.
 */

import { supabase } from '@/integrations/supabase/client';
import { FloorMapPlan, FloorMapShape } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

// Template plan name constant
export const TEMPLATE_PLAN_NAME = 'Object Templates';

// Template object IDs (consistent across projects)
export const TEMPLATE_IDS = {
  // Linjer
  inner_wall: 'template_inner_wall',
  outer_wall: 'template_outer_wall',
  arch_window: 'template_arch_window',
  door_outward: 'template_door_outward',
  sliding_door: 'template_sliding_door',
  wall_opening: 'template_wall_opening',
  half_stairs: 'template_half_stairs',
  
  // Objekt
  spiral_stairs: 'template_spiral_stairs',
  straight_stairs: 'template_straight_stairs',
  arch_bathtub: 'template_arch_bathtub',
  arch_toilet: 'template_arch_toilet',
  arch_sink: 'template_arch_sink',
  arch_stove: 'template_arch_stove',
  arch_outlet: 'template_arch_outlet',
  arch_switch: 'template_arch_switch',
  arch_mirror: 'template_arch_mirror',
} as const;

// In-memory cache for template objects (per project)
const templateCache = new Map<string, Map<string, FloorMapShape>>();

/**
 * Get or create the Object Templates plan for a project
 */
export const getOrCreateTemplatePlan = async (
  projectId: string
): Promise<FloorMapPlan | null> => {
  try {
    // Check if template plan already exists
    const { data: existing, error: fetchError } = await supabase
      .from('floor_map_plans')
      .select('*')
      .eq('project_id', projectId)
      .eq('name', TEMPLATE_PLAN_NAME)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching template plan:', fetchError);
      return null;
    }

    if (existing) {
      return {
        id: existing.id,
        projectId: existing.project_id,
        name: existing.name,
        isDefault: existing.is_default,
        viewSettings: existing.view_settings,
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      };
    }

    // Create new template plan
    const { data: created, error: createError } = await supabase
      .from('floor_map_plans')
      .insert({
        project_id: projectId,
        name: TEMPLATE_PLAN_NAME,
        is_default: false,
        view_settings: {
          cameraX: 0,
          cameraY: 0,
          zoom: 1,
          mode: 'floor' as const,
        },
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating template plan:', createError);
      return null;
    }

    const newPlan: FloorMapPlan = {
      id: created.id,
      projectId: created.project_id,
      name: created.name,
      isDefault: created.is_default,
      viewSettings: created.view_settings,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    };

    // Initialize with default template objects
    await initializeDefaultTemplates(newPlan.id, projectId);

    return newPlan;
  } catch (error) {
    console.error('Error in getOrCreateTemplatePlan:', error);
    return null;
  }
};

/**
 * Initialize default template objects in the template plan
 */
const initializeDefaultTemplates = async (
  templatePlanId: string,
  projectId: string
): Promise<void> => {
  const pixelsPerMeter = 100; // Standard 1:100 scale
  const pos = { x: 0, y: 0 }; // Center position for templates
  
  const templates: FloorMapShape[] = [];
  
  // Helper to create template shapes with UUID for id and template_id for identification
  const createTemplate = (
    templateId: string,
    name: string,
    coordinates: { points: { x: number; y: number }[] },
    strokeWidth = 2
  ): FloorMapShape & { templateId: string } => ({
    id: uuidv4(), // Use UUID for database id
    templateId, // Use template string for identification
    type: 'freehand',
    coordinates,
    planId: templatePlanId,
    name,
    strokeColor: '#000000',
    color: '#000000',
    strokeWidth,
  });

  // LINJER - Create simple default templates
  let xOffset = -500;
  const yOffset = 0;
  const spacing = 150;

  // Innervägg
  templates.push(createTemplate(
    TEMPLATE_IDS.inner_wall,
    'Innervägg Template',
    {
      points: [
        { x: xOffset, y: yOffset },
        { x: xOffset + 100, y: yOffset }
      ]
    }
  ));
  xOffset += spacing;

  // Yttervägg (dual line)
  templates.push(createTemplate(
    TEMPLATE_IDS.outer_wall,
    'Yttervägg Template',
    {
      points: [
        { x: xOffset, y: yOffset - 3 },
        { x: xOffset + 100, y: yOffset - 3 },
        { x: xOffset + 100, y: yOffset + 3 },
        { x: xOffset, y: yOffset + 3 },
        { x: xOffset, y: yOffset - 3 }
      ]
    }
  ));
  xOffset += spacing;

  // Fönster
  templates.push(createTemplate(
    TEMPLATE_IDS.arch_window,
    'Fönster Template',
    {
      points: [
        { x: xOffset, y: yOffset - 20 },
        { x: xOffset + 80, y: yOffset - 20 },
        { x: xOffset + 80, y: yOffset + 20 },
        { x: xOffset, y: yOffset + 20 },
        { x: xOffset, y: yOffset - 20 }
      ]
    }
  ));
  xOffset += spacing;

  // Dörr (utåt)
  templates.push(createTemplate(
    TEMPLATE_IDS.door_outward,
    'Dörr Template',
    {
      points: [
        { x: xOffset, y: yOffset },
        { x: xOffset + 80, y: yOffset },
        { x: xOffset + 80, y: yOffset - 80 },
        { x: xOffset, y: yOffset }
      ]
    }
  ));
  xOffset += spacing;

  // Skjutdörr
  templates.push(createTemplate(
    TEMPLATE_IDS.sliding_door,
    'Skjutdörr Template',
    {
      points: [
        { x: xOffset, y: yOffset - 40 },
        { x: xOffset + 80, y: yOffset - 40 },
        { x: xOffset + 80, y: yOffset + 40 },
        { x: xOffset, y: yOffset + 40 },
        { x: xOffset, y: yOffset - 40 }
      ]
    }
  ));
  xOffset += spacing;

  // Väggöppning
  templates.push(createTemplate(
    TEMPLATE_IDS.wall_opening,
    'Väggöppning Template',
    {
      points: [
        { x: xOffset, y: yOffset },
        { x: xOffset + 100, y: yOffset }
      ]
    },
    1
  ));
  xOffset += spacing;

  // Halvtrappa
  templates.push(createTemplate(
    TEMPLATE_IDS.half_stairs,
    'Halvtrappa Template',
    {
      points: [
        { x: xOffset, y: yOffset },
        { x: xOffset, y: yOffset - 30 },
        { x: xOffset + 30, y: yOffset - 30 },
        { x: xOffset + 30, y: yOffset - 60 },
        { x: xOffset + 60, y: yOffset - 60 },
        { x: xOffset + 60, y: yOffset },
        { x: xOffset, y: yOffset }
      ]
    }
  ));

  // OBJEKT - Create more complex default templates
  xOffset = -500;
  const yObjectOffset = 200;

  // Spiraltrappa
  const spiralPoints = [];
  for (let i = 0; i <= 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    spiralPoints.push({
      x: xOffset + Math.cos(angle) * 50,
      y: yObjectOffset + Math.sin(angle) * 50
    });
  }
  templates.push(createTemplate(
    TEMPLATE_IDS.spiral_stairs,
    'Spiraltrappa Template',
    { points: spiralPoints }
  ));
  xOffset += spacing;

  // Trappa (rak)
  templates.push(createTemplate(
    TEMPLATE_IDS.straight_stairs,
    'Trappa Template',
    {
      points: [
        { x: xOffset, y: yObjectOffset - 60 },
        { x: xOffset + 80, y: yObjectOffset - 60 },
        { x: xOffset + 80, y: yObjectOffset + 60 },
        { x: xOffset, y: yObjectOffset + 60 },
        { x: xOffset, y: yObjectOffset - 60 }
      ]
    }
  ));
  xOffset += spacing;

  // Badkar
  templates.push(createTemplate(
    TEMPLATE_IDS.arch_bathtub,
    'Badkar Template',
    {
      points: [
        { x: xOffset, y: yObjectOffset - 60 },
        { x: xOffset, y: yObjectOffset + 40 },
        { x: xOffset + 10, y: yObjectOffset + 50 },
        { x: xOffset + 50, y: yObjectOffset + 50 },
        { x: xOffset + 60, y: yObjectOffset + 40 },
        { x: xOffset + 60, y: yObjectOffset - 60 },
        { x: xOffset, y: yObjectOffset - 60 }
      ]
    }
  ));
  xOffset += spacing;

  // Toalett
  const toiletPoints = [];
  for (let i = 0; i <= 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    toiletPoints.push({
      x: xOffset + Math.cos(angle) * 25,
      y: yObjectOffset + Math.sin(angle) * 30
    });
  }
  templates.push(createTemplate(
    TEMPLATE_IDS.arch_toilet,
    'Toalett Template',
    { points: toiletPoints }
  ));
  xOffset += spacing;

  // Handfat
  templates.push(createTemplate(
    TEMPLATE_IDS.arch_sink,
    'Handfat Template',
    {
      points: [
        { x: xOffset, y: yObjectOffset - 30 },
        { x: xOffset + 50, y: yObjectOffset - 30 },
        { x: xOffset + 50, y: yObjectOffset + 30 },
        { x: xOffset, y: yObjectOffset + 30 },
        { x: xOffset, y: yObjectOffset - 30 }
      ]
    }
  ));
  xOffset += spacing;

  // Spis
  templates.push(createTemplate(
    TEMPLATE_IDS.arch_stove,
    'Spis Template',
    {
      points: [
        { x: xOffset, y: yObjectOffset - 40 },
        { x: xOffset + 60, y: yObjectOffset - 40 },
        { x: xOffset + 60, y: yObjectOffset + 40 },
        { x: xOffset, y: yObjectOffset + 40 },
        { x: xOffset, y: yObjectOffset - 40 }
      ]
    }
  ));
  xOffset += spacing;

  // Eluttag
  const outletPoints = [];
  for (let i = 0; i <= 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    outletPoints.push({
      x: xOffset + Math.cos(angle) * 15,
      y: yObjectOffset + Math.sin(angle) * 15
    });
  }
  templates.push(createTemplate(
    TEMPLATE_IDS.arch_outlet,
    'Eluttag Template',
    { points: outletPoints }
  ));
  xOffset += spacing;

  // Lampknapp
  templates.push(createTemplate(
    TEMPLATE_IDS.arch_switch,
    'Lampknapp Template',
    {
      points: [
        { x: xOffset, y: yObjectOffset - 15 },
        { x: xOffset + 20, y: yObjectOffset - 15 },
        { x: xOffset + 20, y: yObjectOffset + 15 },
        { x: xOffset, y: yObjectOffset + 15 },
        { x: xOffset, y: yObjectOffset - 15 }
      ]
    }
  ));
  xOffset += spacing;

  // Spegel
  templates.push(createTemplate(
    TEMPLATE_IDS.arch_mirror,
    'Spegel Template',
    {
      points: [
        { x: xOffset, y: yObjectOffset - 50 },
        { x: xOffset + 50, y: yObjectOffset - 50 },
        { x: xOffset + 50, y: yObjectOffset + 50 },
        { x: xOffset, y: yObjectOffset + 50 },
        { x: xOffset, y: yObjectOffset - 50 }
      ]
    }
  ));

  // Save all templates to database
  try {
    const shapesToInsert = templates.map((shape: any) => ({
      id: shape.id, // UUID
      template_id: shape.templateId, // Template string identifier
      plan_id: templatePlanId,
      type: shape.type,
      coordinates: shape.coordinates,
      stroke_color: shape.strokeColor,
      fill_color: shape.color,
      stroke_width: shape.strokeWidth,
      name: shape.name,
      // Add required fields that might be missing
      rotation: 0,
      opacity: 1,
    }));

    const { data, error } = await supabase
      .from('floor_map_shapes')
      .insert(shapesToInsert)
      .select();

    if (error) {
      console.error('Error saving template shapes:', error);
      // Try inserting one by one as fallback
      for (const shape of shapesToInsert) {
        await supabase
          .from('floor_map_shapes')
          .insert([shape]);
      }
    }
  } catch (error) {
    console.error('Error initializing templates:', error);
  }
};

/**
 * Load template objects for a project (with caching)
 */
export const loadTemplates = async (
  projectId: string
): Promise<Map<string, FloorMapShape> | null> => {
  // Check cache first
  if (templateCache.has(projectId)) {
    return templateCache.get(projectId)!;
  }

  try {
    // Get or create template plan
    const templatePlan = await getOrCreateTemplatePlan(projectId);
    if (!templatePlan) {
      console.error('Failed to get template plan');
      return null;
    }

    // Load template shapes
    const { data, error } = await supabase
      .from('floor_map_shapes')
      .select('*')
      .eq('plan_id', templatePlan.id);

    if (error) {
      console.error('Error loading templates:', error);
      return null;
    }

    // Convert to Map for fast lookup (keyed by template_id)
    const templatesMap = new Map<string, FloorMapShape>();
    (data || []).forEach((dbShape: any) => {
      const shape: FloorMapShape = {
        id: dbShape.id,
        type: dbShape.type,
        coordinates: dbShape.coordinates,
        planId: dbShape.plan_id,
        strokeColor: dbShape.stroke_color,
        color: dbShape.fill_color,
        strokeWidth: dbShape.stroke_width,
        name: dbShape.name,
      };
      // Use template_id as the key for lookup
      const templateId = dbShape.template_id || dbShape.id;
      templatesMap.set(templateId, shape);
    });

    // Cache for future use
    templateCache.set(projectId, templatesMap);

    return templatesMap;
  } catch (error) {
    console.error('Error in loadTemplates:', error);
    return null;
  }
};

/**
 * Get a template object and create a copy for placement
 */
export const getTemplateForPlacement = async (
  projectId: string,
  templateId: string,
  targetPlanId: string,
  position: { x: number; y: number }
): Promise<FloorMapShape | null> => {
  try {
    // Load templates (uses cache if available)
    let templates = await loadTemplates(projectId);
    
    // If no templates found, try to reinitialize
    if (!templates || templates.size === 0) {
      toast.info('Initierar templates första gången...');
      const success = await reinitializeTemplates(projectId);
      if (success) {
        templates = await loadTemplates(projectId);
      }
    }
    
    if (!templates || templates.size === 0) {
      toast.error('Kunde inte ladda object templates');
      return null;
    }

    const template = templates.get(templateId);
    if (!template) {
      toast.error(`Template '${templateId}' hittades inte`);
      return null;
    }

    // Create a copy of the template with new ID and position
    const coords = template.coordinates as any;
    if (!coords || !coords.points || coords.points.length === 0) {
      console.error('Invalid template coordinates');
      return null;
    }

    // Calculate template bounds
    const xs = coords.points.map((p: { x: number }) => p.x);
    const ys = coords.points.map((p: { y: number }) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Offset all points to new position
    const offsetPoints = coords.points.map((p: { x: number; y: number }) => ({
      x: p.x - centerX + position.x,
      y: p.y - centerY + position.y,
    }));

    // Create new shape
    const newShape: FloorMapShape = {
      ...template,
      id: uuidv4(),
      planId: targetPlanId,
      coordinates: {
        points: offsetPoints,
      },
    };

    return newShape;
  } catch (error) {
    console.error('Error getting template for placement:', error);
    return null;
  }
};

/**
 * Clear template cache (useful when templates are edited)
 */
export const clearTemplateCache = (projectId: string): void => {
  templateCache.delete(projectId);
};

/**
 * Get the template plan ID for a project
 */
export const getTemplatePlanId = async (projectId: string): Promise<string | null> => {
  const plan = await getOrCreateTemplatePlan(projectId);
  return plan?.id || null;
};

/**
 * Force reinitialize templates (useful if templates are missing or corrupted)
 */
export const reinitializeTemplates = async (projectId: string): Promise<boolean> => {
  try {
    // Clear cache
    clearTemplateCache(projectId);
    
    // Get or create template plan
    const templatePlan = await getOrCreateTemplatePlan(projectId);
    if (!templatePlan) {
      console.error('Failed to get template plan');
      return false;
    }
    
    // Delete existing templates
    const { error: deleteError } = await supabase
      .from('floor_map_shapes')
      .delete()
      .eq('plan_id', templatePlan.id);
    
    if (deleteError) {
      console.error('Error deleting old templates:', deleteError);
    }
    
    // Reinitialize
    await initializeDefaultTemplates(templatePlan.id, projectId);

    // Reload templates to verify
    clearTemplateCache(projectId); // Clear cache before reloading
    const templates = await loadTemplates(projectId);
    const success = templates && templates.size > 0;

    if (success) {
      toast.success(`Templates återställda! (${templates!.size} templates)`);
    } else {
      console.error('Failed to reinitialize templates');
      toast.error('Kunde inte återställa templates');
    }

    return success;
  } catch (error) {
    console.error('Error reinitializing templates:', error);
    return false;
  }
};
