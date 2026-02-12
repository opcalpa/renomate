-- Add room_id to task_file_links to allow linking files to both tasks and rooms
-- A file can be linked to a task, a room, or both

-- Add room_id column (optional)
ALTER TABLE public.task_file_links
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;

-- Make task_id optional so files can be linked to just a room
ALTER TABLE public.task_file_links
ALTER COLUMN task_id DROP NOT NULL;

-- Add index for room lookups
CREATE INDEX IF NOT EXISTS idx_task_file_links_room_id
  ON public.task_file_links (room_id);

-- Add constraint to ensure at least one of task_id or room_id is set
ALTER TABLE public.task_file_links
ADD CONSTRAINT chk_task_or_room
CHECK (task_id IS NOT NULL OR room_id IS NOT NULL);

-- Rename table to reflect broader use (optional, keeping old name for compatibility)
-- COMMENT ON TABLE public.task_file_links IS 'Links project files to tasks and/or rooms';
