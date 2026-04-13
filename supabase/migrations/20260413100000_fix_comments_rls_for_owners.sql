-- Fix: task/material comments return 500 for project owners
--
-- Root cause: "Users can view comments" policy only uses user_has_project_access()
-- which only checks project_shares — not project ownership. Project owners without
-- a project_shares row cannot see task/material comments.
--
-- Fix: add user_owns_project() check alongside user_has_project_access()
-- Same fix applied to INSERT policy.
--
-- Revert:
--   DROP POLICY IF EXISTS "Users can view comments" ON comments;
--   CREATE POLICY "Users can view comments" ON comments FOR SELECT USING (
--     (task_id IS NOT NULL AND task_id IN (SELECT t.id FROM tasks t WHERE user_has_project_access(t.project_id)))
--     OR (material_id IS NOT NULL AND material_id IN (SELECT m.id FROM materials m WHERE user_has_project_access(m.project_id)))
--   );

-- SELECT: task/material comments
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
);

-- INSERT: task/material comments
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
