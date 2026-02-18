-- Consolidate task statuses:
-- done → completed
-- doing → in_progress
-- blocked → on_hold
-- discovery → ideas

-- First drop the old constraint
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Update existing values
UPDATE public.tasks SET status = 'completed' WHERE status = 'done';
UPDATE public.tasks SET status = 'in_progress' WHERE status = 'doing';
UPDATE public.tasks SET status = 'on_hold' WHERE status = 'blocked';
UPDATE public.tasks SET status = 'ideas' WHERE status = 'discovery';

-- Add new constraint with updated values
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_status_check
CHECK (status IN ('ideas', 'to_do', 'on_hold', 'in_progress', 'completed', 'scrapped'));
