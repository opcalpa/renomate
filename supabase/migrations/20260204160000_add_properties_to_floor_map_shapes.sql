-- Add properties column to floor_map_shapes if it doesn't exist
-- This column stores visual properties like fill color, stroke, opacity, etc.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'floor_map_shapes'
    AND column_name = 'properties'
  ) THEN
    ALTER TABLE public.floor_map_shapes
    ADD COLUMN properties JSONB DEFAULT NULL;
  END IF;
END $$;
