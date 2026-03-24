-- Allow file links to exist without a task/room/material entity
-- This enables storing AI-extracted metadata (vendor, date, amount) on files
-- that haven't been linked to a specific entity yet.
-- Revert: ALTER TABLE public.task_file_links ADD CONSTRAINT chk_entity_link CHECK (task_id IS NOT NULL OR room_id IS NOT NULL OR material_id IS NOT NULL);

ALTER TABLE public.task_file_links DROP CONSTRAINT IF EXISTS chk_entity_link;
