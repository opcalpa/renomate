-- Add project_id column to comments for project-level (general) comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Index for efficient feed queries
CREATE INDEX IF NOT EXISTS comments_project_id_idx ON comments(project_id);

-- Drop existing constraint and recreate to allow project_id as a valid target
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_target_check;

ALTER TABLE comments ADD CONSTRAINT comments_target_check CHECK (
  (
    (task_id IS NOT NULL)::int +
    (material_id IS NOT NULL)::int +
    (entity_id IS NOT NULL)::int +
    (drawing_object_id IS NOT NULL)::int +
    (project_id IS NOT NULL)::int
  ) = 1
);

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
