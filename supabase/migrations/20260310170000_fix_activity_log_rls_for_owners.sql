-- Fix activity_log RLS: allow project OWNERS to view activity.
-- Previous policy only used user_has_project_access() which checks project_shares
-- but not projects.owner_id — so project owners were denied.

DROP POLICY IF EXISTS "Users can view activity for their projects" ON public.activity_log;

CREATE POLICY "Users can view activity for their projects"
  ON activity_log FOR SELECT
  USING (
    is_system_admin()
    OR user_has_project_access(project_id)
    OR project_id IN (
      SELECT id FROM public.projects
      WHERE owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    )
  );
