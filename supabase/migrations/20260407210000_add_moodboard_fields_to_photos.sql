-- Add moodboard display fields to photos table
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS display_size TEXT DEFAULT 'md';
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

COMMENT ON COLUMN public.photos.display_size IS 'Moodboard display size: sm, md, lg';
COMMENT ON COLUMN public.photos.sort_order IS 'Sort order for moodboard layout';
