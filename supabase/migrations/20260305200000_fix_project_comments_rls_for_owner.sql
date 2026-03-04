-- Fix: project-level comment RLS policies don't include project owner check.
-- user_has_project_access() only checks project_shares, so project owners
-- cannot see/insert project-level comments (entity_type='project').
-- This adds an owner check to both SELECT and INSERT policies.

-- SELECT
DROP POLICY IF EXISTS "Users can view project comments" ON comments;

CREATE POLICY "Users can view project comments"
  ON comments FOR SELECT
  USING (
    project_id IS NOT NULL
    AND (
      user_has_project_access(project_id)
      OR project_id IN (
        SELECT id FROM projects WHERE owner_id = get_user_profile_id()
      )
    )
  );

-- INSERT
DROP POLICY IF EXISTS "Users can insert project comments" ON comments;

CREATE POLICY "Users can insert project comments"
  ON comments FOR INSERT
  WITH CHECK (
    project_id IS NOT NULL
    AND (
      user_has_project_access(project_id)
      OR project_id IN (
        SELECT id FROM projects WHERE owner_id = get_user_profile_id()
      )
    )
  );
