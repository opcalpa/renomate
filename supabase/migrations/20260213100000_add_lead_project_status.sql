-- Add "lead" as a valid project status for the sales pipeline feature
-- This allows projects created from QuickQuote to be marked as leads
-- until a quote is accepted, at which point they become "planning" projects

-- Step 1: Drop the existing constraint
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS projects_status_check;

-- Step 2: Add new constraint with "lead" included
ALTER TABLE projects
ADD CONSTRAINT projects_status_check
CHECK (status IN ('lead', 'planning', 'in_progress', 'completed', 'on_hold'));
