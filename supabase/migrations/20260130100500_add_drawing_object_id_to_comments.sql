-- Add drawing_object_id column to comments if it doesn't exist
ALTER TABLE comments ADD COLUMN IF NOT EXISTS drawing_object_id UUID REFERENCES floor_map_shapes(id) ON DELETE CASCADE;

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS comments_drawing_object_id_idx ON comments(drawing_object_id);
