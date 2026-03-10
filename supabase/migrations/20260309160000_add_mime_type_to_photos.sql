-- Add mime_type column to photos table to distinguish images from documents
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Backfill: existing photos are all images
UPDATE public.photos SET mime_type = 'image/jpeg' WHERE mime_type IS NULL;
