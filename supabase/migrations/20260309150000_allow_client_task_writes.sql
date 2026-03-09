-- Allow clients (invited homeowners) to INSERT and UPDATE tasks in their shared projects.
-- This is needed for the quote acceptance flow where accepting a quote creates tasks.

-- Drop the existing broad policy and replace with separate, more granular policies
DROP POLICY IF EXISTS "Users can manage tasks in accessible projects" ON public.tasks;

-- SELECT: project owner, shared users (any role), system admin
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT USING (
  is_system_admin()
  OR user_owns_project(project_id)
  OR user_has_project_access(project_id)
);

-- INSERT: project owner, editors/admins, AND clients (for quote acceptance)
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT WITH CHECK (
  is_system_admin()
  OR user_owns_project(project_id)
  OR project_id IN (
    SELECT ps.project_id FROM public.project_shares ps
    WHERE ps.shared_with_user_id = get_user_profile_id()
      AND ps.role IN ('editor', 'admin', 'client')
  )
);

-- UPDATE: project owner, editors/admins, AND clients (for quote acceptance status updates)
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE USING (
  is_system_admin()
  OR user_owns_project(project_id)
  OR project_id IN (
    SELECT ps.project_id FROM public.project_shares ps
    WHERE ps.shared_with_user_id = get_user_profile_id()
      AND ps.role IN ('editor', 'admin', 'client')
  )
);

-- DELETE: only project owner and editors/admins (clients cannot delete tasks)
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE USING (
  is_system_admin()
  OR user_owns_project(project_id)
  OR project_id IN (
    SELECT ps.project_id FROM public.project_shares ps
    WHERE ps.shared_with_user_id = get_user_profile_id()
      AND ps.role IN ('editor', 'admin')
  )
);
