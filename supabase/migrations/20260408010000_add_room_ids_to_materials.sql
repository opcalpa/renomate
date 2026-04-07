-- Add room_ids array to materials (matches tasks pattern)
ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS room_ids uuid[] DEFAULT '{}';

-- Migrate existing room_id data into room_ids array
UPDATE materials
  SET room_ids = ARRAY[room_id]
  WHERE room_id IS NOT NULL
    AND (room_ids IS NULL OR room_ids = '{}');
