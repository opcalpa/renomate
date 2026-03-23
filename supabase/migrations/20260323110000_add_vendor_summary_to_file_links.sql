-- Add vendor_name and ai_summary to task_file_links for Smart tolk results
-- Revert: ALTER TABLE task_file_links DROP COLUMN IF EXISTS vendor_name, DROP COLUMN IF EXISTS ai_summary;

ALTER TABLE public.task_file_links ADD COLUMN IF NOT EXISTS vendor_name TEXT;
ALTER TABLE public.task_file_links ADD COLUMN IF NOT EXISTS ai_summary TEXT;
