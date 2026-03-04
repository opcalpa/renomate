-- Update project status CHECK constraint to match the new lifecycle statuses.
-- Old constraint allowed: 'lead', 'planning', 'in_progress', 'completed', 'on_hold'
-- New statuses: planning, quote_created, quote_sent, active, on_hold, completed, cancelled

-- Step 1: Drop old constraint FIRST (must happen before UPDATEs because
-- some rows may already contain 'active' which is not in the old constraint)
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Step 2: Migrate legacy status values to their new equivalents
UPDATE projects SET status = 'active' WHERE status = 'in_progress';
UPDATE projects SET status = 'planning' WHERE status = 'lead';
UPDATE projects SET status = 'active' WHERE status IS NULL;

-- Step 3: Add new constraint
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('planning', 'quote_created', 'quote_sent', 'active', 'on_hold', 'completed', 'cancelled'));
