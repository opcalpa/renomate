-- Add project_id column to comments for project-level (general) comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Add entity_id and entity_type columns for generic entity comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS entity_type TEXT;

-- Index for efficient feed queries
CREATE INDEX IF NOT EXISTS comments_project_id_idx ON comments(project_id);
CREATE INDEX IF NOT EXISTS comments_entity_id_idx ON comments(entity_id);
CREATE INDEX IF NOT EXISTS comments_entity_type_idx ON comments(entity_type);

-- Drop existing constraint - we'll let the app handle validation
-- since multiple target types are now supported
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_target_check;

-- RLS policies for project-level comments
CREATE POLICY "Users can view project comments"
  ON comments FOR SELECT
  USING (
    project_id IS NOT NULL
    AND user_has_project_access(project_id)
  );

CREATE POLICY "Users can insert project comments"
  ON comments FOR INSERT
  WITH CHECK (
    project_id IS NOT NULL
    AND user_has_project_access(project_id)
  );
