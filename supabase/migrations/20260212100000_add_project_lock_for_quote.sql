-- Add project lock columns for quote workflow
-- When a quote is sent, the project is locked to prevent changes

-- Add lock columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS locked_for_quote boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_at timestamptz,
ADD COLUMN IF NOT EXISTS locked_by_quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_locked_by_quote_id ON projects(locked_by_quote_id) WHERE locked_by_quote_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN projects.locked_for_quote IS 'Whether the project is locked because a quote has been sent';
COMMENT ON COLUMN projects.locked_at IS 'When the project was locked';
COMMENT ON COLUMN projects.locked_by_quote_id IS 'The quote that caused the lock (for unlocking when quote status changes)';
