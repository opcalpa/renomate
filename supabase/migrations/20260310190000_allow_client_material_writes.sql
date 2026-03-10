-- Allow clients (homeowners) to INSERT/UPDATE materials in their shared projects.
-- Needed for quote acceptance flow where material rows become materials records.

DROP POLICY IF EXISTS "Editors can manage materials in accessible projects" ON public.materials;

CREATE POLICY "Editors can manage materials in accessible projects" ON public.materials
FOR ALL USING (
  is_system_admin()
  OR task_id IN (
    SELECT id FROM public.tasks WHERE project_id IN (
      SELECT id FROM public.projects WHERE
        owner_id = get_user_profile_id()
        OR id IN (
          SELECT project_id FROM public.project_shares
          WHERE shared_with_user_id = get_user_profile_id()
          AND role IN ('editor', 'admin', 'client')
        )
    )
  )
  -- Also allow via direct project_id (standalone materials without task_id)
  OR (project_id IS NOT NULL AND (
    user_owns_project(project_id)
    OR project_id IN (
      SELECT project_id FROM public.project_shares
      WHERE shared_with_user_id = get_user_profile_id()
      AND role IN ('editor', 'admin', 'client')
    )
  ))
);
