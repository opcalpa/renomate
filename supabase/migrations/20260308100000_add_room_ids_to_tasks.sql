-- Add room_ids array to tasks for multi-room assignment during planning.
-- room_id (single FK) is kept for backward compatibility and set to the first room.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS room_ids TEXT[] DEFAULT '{}';

-- Backfill: copy existing room_id into room_ids array
UPDATE tasks SET room_ids = ARRAY[room_id] WHERE room_id IS NOT NULL AND (room_ids IS NULL OR room_ids = '{}');
