-- Consolidate task statuses:
-- done → completed
-- doing → in_progress
-- blocked → on_hold
-- discovery → ideas

UPDATE public.tasks SET status = 'completed' WHERE status = 'done';
UPDATE public.tasks SET status = 'in_progress' WHERE status = 'doing';
UPDATE public.tasks SET status = 'on_hold' WHERE status = 'blocked';
UPDATE public.tasks SET status = 'ideas' WHERE status = 'discovery';
