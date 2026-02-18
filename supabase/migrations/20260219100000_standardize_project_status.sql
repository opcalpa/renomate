-- Standardize project status values
-- project_type = what the project IS (renovation, demo, etc.)
-- status       = where the project IS in its lifecycle
--
-- Valid statuses: planning, quote_created, quote_sent, active, on_hold, completed, cancelled

-- 1. Existing projects with NULL status → active (they are already being worked on)
UPDATE projects
SET status = 'active'
WHERE status IS NULL;

-- 2. Lead-type projects that still have status='lead' → planning
--    (they were created via QuickQuote but never activated)
UPDATE projects
SET status = 'planning'
WHERE status = 'lead';

-- 3. Set default for new projects
ALTER TABLE projects
ALTER COLUMN status SET DEFAULT 'planning';
