-- Add zoom/pan crop fields for moodboard
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS crop_zoom DOUBLE PRECISION DEFAULT 1.0;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS crop_offset_x DOUBLE PRECISION DEFAULT 50;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS crop_offset_y DOUBLE PRECISION DEFAULT 50;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS crop_shape TEXT DEFAULT 'landscape';

COMMENT ON COLUMN public.photos.crop_zoom IS 'Zoom level for moodboard crop: 1.0 = fill, higher = zoom in';
COMMENT ON COLUMN public.photos.crop_offset_x IS 'Horizontal crop offset 0-100 (percentage)';
COMMENT ON COLUMN public.photos.crop_offset_y IS 'Vertical crop offset 0-100 (percentage)';
COMMENT ON COLUMN public.photos.crop_shape IS 'Crop shape: landscape, square, portrait, circle';
