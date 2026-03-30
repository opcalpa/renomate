-- Cover image zoom level (100 = no zoom, 200 = 2x zoom, etc.)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cover_image_zoom INTEGER DEFAULT 100;
