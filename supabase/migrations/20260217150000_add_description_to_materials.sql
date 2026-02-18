-- Add description column to materials table
ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.materials.description IS 'Additional details about the material';
