-- Add crop/position fields for moodboard
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS crop_position TEXT DEFAULT 'center';
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS fit_mode TEXT DEFAULT 'cover';

COMMENT ON COLUMN public.photos.crop_position IS 'object-position for moodboard: center, top, bottom, left, right, top-left, top-right, bottom-left, bottom-right';
COMMENT ON COLUMN public.photos.fit_mode IS 'object-fit for moodboard: cover (cropped) or contain (full image)';
