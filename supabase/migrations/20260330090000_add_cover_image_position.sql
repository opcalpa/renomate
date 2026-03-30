-- Cover image vertical position (0-100%, where 50 = center)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cover_image_position INTEGER DEFAULT 50;
