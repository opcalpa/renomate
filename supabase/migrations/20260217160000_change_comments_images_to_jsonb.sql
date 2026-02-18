-- Change comments.images from TEXT[] to JSONB to store image objects
-- Format: [{ "id": "...", "url": "...", "filename": "..." }, ...]

-- First drop the existing column if it exists with wrong type
ALTER TABLE public.comments DROP COLUMN IF EXISTS images;

-- Add it back as JSONB
ALTER TABLE public.comments ADD COLUMN images JSONB;

COMMENT ON COLUMN public.comments.images IS 'Array of image objects: [{ id, url, filename }]';
