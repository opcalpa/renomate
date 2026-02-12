-- Add is_resolved column to comments table for Google Docs-style thread resolution
-- This allows marking comment threads as "done" without deleting them

ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT FALSE;

-- Create index for faster queries on resolved status
CREATE INDEX IF NOT EXISTS idx_comments_is_resolved ON comments(is_resolved) WHERE is_resolved = true;

-- Add comment
COMMENT ON COLUMN comments.is_resolved IS 'Whether this comment thread is marked as resolved/done';
