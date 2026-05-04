-- Fix: entity_id-based comments (e.g. photo comments) return 500
--
-- Root cause: SELECT/INSERT policies only match task_id or material_id.
-- Comments with entity_id + project_id are blocked by RLS.
--
-- Fix: add entity_id path that checks project_id ownership/access.

-- SELECT
DROP POLICY IF EXISTS "Users can view comments" ON comments;

CREATE POLICY "Users can view comments"
ON public.comments
FOR SELECT
USING (
  (task_id IS NOT NULL AND task_id IN (
    SELECT t.id FROM tasks t
    WHERE user_owns_project(t.project_id)
       OR user_has_project_access(t.project_id)
  ))
  OR
  (material_id IS NOT NULL AND material_id IN (
    SELECT m.id FROM materials m
    WHERE user_owns_project(m.project_id)
       OR user_has_project_access(m.project_id)
  ))
  OR
  (entity_id IS NOT NULL AND project_id IS NOT NULL AND (
    user_owns_project(project_id)
    OR user_has_project_access(project_id)
  ))
  OR
  (project_id IS NOT NULL AND task_id IS NULL AND material_id IS NULL AND entity_id IS NULL AND (
    user_owns_project(project_id)
    OR user_has_project_access(project_id)
  ))
);

-- INSERT (add entity_id path)
DROP POLICY IF EXISTS "Users can create comments" ON comments;

CREATE POLICY "Users can create comments"
ON public.comments
FOR INSERT
WITH CHECK (
  (task_id IS NOT NULL AND task_id IN (
    SELECT t.id FROM tasks t
    WHERE user_owns_project(t.project_id)
       OR user_has_project_access(t.project_id)
  ))
  OR
  (material_id IS NOT NULL AND material_id IN (
    SELECT m.id FROM materials m
    WHERE user_owns_project(m.project_id)
       OR user_has_project_access(m.project_id)
  ))
  OR
  (project_id IS NOT NULL AND (
    user_owns_project(project_id)
    OR user_has_project_access(project_id)
  ))
);
