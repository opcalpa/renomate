-- Fix photos and notes RLS: replace public-read with project access checks
-- Both tables use linked_to_type ('project','room','task') + linked_to_id
-- We need a helper function to resolve the project_id from any linked entity.

-- Helper: resolve project_id from a linked entity
CREATE OR REPLACE FUNCTION resolve_project_id_from_entity(
  p_linked_to_type TEXT,
  p_linked_to_id UUID
) RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT CASE p_linked_to_type
    WHEN 'project' THEN p_linked_to_id
    WHEN 'room'    THEN (SELECT project_id FROM rooms WHERE id = p_linked_to_id)
    WHEN 'task'    THEN (SELECT project_id FROM tasks WHERE id = p_linked_to_id)
  END;
$$;

-- ============================================================
-- PHOTOS: Replace overly permissive SELECT policy
-- ============================================================

DROP POLICY IF EXISTS "Users can view photos in accessible entities" ON photos;

CREATE POLICY "Users can view photos in accessible projects"
  ON photos FOR SELECT
  USING (
    is_system_admin()
    OR user_owns_project(resolve_project_id_from_entity(linked_to_type, linked_to_id))
    OR user_has_project_access(resolve_project_id_from_entity(linked_to_type, linked_to_id))
    OR is_public_demo_project(resolve_project_id_from_entity(linked_to_type, linked_to_id))
  );

-- ============================================================
-- NOTES: Replace overly permissive SELECT policy
-- ============================================================

DROP POLICY IF EXISTS "Users can view notes in accessible entities" ON notes;

CREATE POLICY "Users can view notes in accessible projects"
  ON notes FOR SELECT
  USING (
    is_system_admin()
    OR user_owns_project(resolve_project_id_from_entity(linked_to_type, linked_to_id))
    OR user_has_project_access(resolve_project_id_from_entity(linked_to_type, linked_to_id))
    OR is_public_demo_project(resolve_project_id_from_entity(linked_to_type, linked_to_id))
  );

-- ============================================================
-- MATERIALS: Fix SELECT to also cover project_id directly
-- (existing policy only checks task_id, missing standalone materials)
-- ============================================================

DROP POLICY IF EXISTS "Users can view materials in accessible projects" ON materials;

CREATE POLICY "Users can view materials in accessible projects"
  ON materials FOR SELECT
  USING (
    is_system_admin()
    -- Direct project_id check (covers standalone materials without task_id)
    OR user_owns_project(project_id)
    OR user_has_project_access(project_id)
    -- Fallback via task_id for legacy rows where project_id may be NULL
    OR task_id IN (
      SELECT id FROM tasks WHERE
        user_owns_project(project_id) OR user_has_project_access(project_id)
    )
  );

-- ============================================================
-- Performance: Add indexes for entity lookups
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_photos_linked ON photos (linked_to_type, linked_to_id);
CREATE INDEX IF NOT EXISTS idx_notes_linked ON notes (linked_to_type, linked_to_id);
