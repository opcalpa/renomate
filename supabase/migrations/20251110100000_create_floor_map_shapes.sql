-- Create floor_map_shapes table
-- This table stores all shapes/objects drawn on floor plans

CREATE TABLE IF NOT EXISTS public.floor_map_shapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  shape_type TEXT NOT NULL,
  shape_data JSONB NOT NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.floor_map_shapes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view shapes in accessible projects"
ON public.floor_map_shapes
FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE owner_id = get_user_profile_id()
    OR user_has_project_access(id)
  )
);

CREATE POLICY "Users can manage shapes in accessible projects"
ON public.floor_map_shapes
FOR ALL
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE owner_id = get_user_profile_id()
    OR user_can_manage_project(id)
  )
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_floor_map_shapes_project_id ON public.floor_map_shapes(project_id);

-- Add trigger for updated_at
CREATE TRIGGER update_floor_map_shapes_updated_at
BEFORE UPDATE ON public.floor_map_shapes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
