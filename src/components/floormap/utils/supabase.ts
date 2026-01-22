import { supabase } from '@/integrations/supabase/client';
import { FloorMapShape, LineCoordinates, RectangleCoordinates } from '../types';
import { toast } from 'sonner';

/**
 * Load shapes from Supabase (legacy - for projects without plans)
 * @deprecated Use loadShapesForPlan from plans.ts instead
 */
export const loadShapesFromDB = async (projectId: string): Promise<FloorMapShape[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from('floor_map_shapes')
      .select('*')
      .eq('project_id', projectId)
      .eq('view_mode', 'floor')
      .is('plan_id', null); // Only load legacy shapes without plan_id

    if (error) throw error;

    return (data || []).map((dbShape: any) => ({
      id: dbShape.id,
      type: dbShape.shape_type,
      coordinates: dbShape.shape_data?.points || [],
      heightMM: dbShape.shape_data?.heightMM,
      roomId: dbShape.room_id,
      planId: dbShape.plan_id,
      symbolType: dbShape.shape_data?.symbolType,
      metadata: dbShape.shape_data?.metadata,
    }));
  } catch (error) {
    console.error('Error loading shapes:', error);
    toast.error('Failed to load floor plan');
    return [];
  }
};

/**
 * Save shapes to Supabase with retry logic (legacy - for projects without plans)
 * @deprecated Use saveShapesForPlan from plans.ts instead
 */
export const saveShapesToDB = async (
  projectId: string,
  shapes: FloorMapShape[],
  retryCount = 0
): Promise<boolean> => {
  const MAX_RETRIES = 3;

  try {
    // Delete existing legacy shapes for this project (where plan_id is null)
    const { error: deleteError } = await (supabase as any)
      .from('floor_map_shapes')
      .delete()
      .eq('project_id', projectId)
      .is('plan_id', null); // Only delete legacy shapes without plan_id

    if (deleteError) throw deleteError;

    // Insert new shapes if any exist
    if (shapes.length > 0) {
      const shapesToInsert = shapes.map((shape) => ({
        id: shape.id,
        project_id: projectId,
        shape_type: shape.type,
        shape_data: {
          points: shape.coordinates,
          heightMM: shape.heightMM,
          symbolType: shape.symbolType,
          metadata: shape.metadata,
        },
        room_id: shape.roomId || null,
        plan_id: shape.planId || null,
      }));

      const { error: insertError } = await (supabase as any)
        .from('floor_map_shapes')
        .insert(shapesToInsert);

      if (insertError) throw insertError;
    }

    toast.success('Floor plan saved');
    return true;
  } catch (error) {
    console.error('Error saving shapes:', error);

    // Retry logic
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying save (${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)));
      return saveShapesToDB(projectId, shapes, retryCount + 1);
    }

    toast.error('Failed to save floor plan. Please try again.');
    return false;
  }
};

/**
 * Delete a shape from Supabase
 */
export const deleteShapeFromDB = async (shapeId: string): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from('floor_map_shapes')
      .delete()
      .eq('id', shapeId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting shape:', error);
    return false;
  }
};
