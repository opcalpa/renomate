-- Add system admin bypass to RLS policies
-- System admins (is_system_admin = true) can read/write all project data,
-- which is needed for editing demo projects they don't own.

-- Helper: check if current user is a system admin
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_system_admin FROM public.profiles WHERE user_id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- PROJECTS: allow system admins to view and update any project
-- ============================================================

DROP POLICY IF EXISTS "Users can view projects they own or have access to" ON public.projects;
CREATE POLICY "Users can view projects they own or have access to" ON public.projects
FOR SELECT USING (
  is_system_admin()
  OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR id IN (SELECT project_id FROM public.project_shares WHERE shared_with_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Project owners can update their projects" ON public.projects;
CREATE POLICY "Project owners can update their projects" ON public.projects
FOR UPDATE USING (
  is_system_admin()
  OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- ============================================================
-- TASKS: allow system admins to view and manage tasks
-- ============================================================

DROP POLICY IF EXISTS "Users can view tasks in accessible projects" ON public.tasks;
CREATE POLICY "Users can view tasks in accessible projects" ON public.tasks
FOR SELECT USING (
  is_system_admin()
  OR project_id IN (
    SELECT id FROM public.projects WHERE
      owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      OR id IN (SELECT project_id FROM public.project_shares WHERE shared_with_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  )
);

DROP POLICY IF EXISTS "Users can manage tasks in accessible projects" ON public.tasks;
CREATE POLICY "Users can manage tasks in accessible projects" ON public.tasks
FOR ALL USING (
  is_system_admin()
  OR project_id IN (
    SELECT id FROM public.projects WHERE
      owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      OR id IN (SELECT project_id FROM public.project_shares WHERE shared_with_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND role IN ('editor', 'admin'))
  )
);

-- ============================================================
-- ROOMS: allow system admins to view and manage rooms
-- ============================================================

DROP POLICY IF EXISTS "Users can view rooms in accessible projects" ON public.rooms;
CREATE POLICY "Users can view rooms in accessible projects" ON public.rooms
FOR SELECT USING (
  is_system_admin()
  OR project_id IN (
    SELECT id FROM public.projects WHERE
      owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      OR id IN (SELECT project_id FROM public.project_shares WHERE shared_with_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  )
);

DROP POLICY IF EXISTS "Users can manage rooms in accessible projects" ON public.rooms;
CREATE POLICY "Users can manage rooms in accessible projects" ON public.rooms
FOR ALL USING (
  is_system_admin()
  OR project_id IN (
    SELECT id FROM public.projects WHERE
      owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      OR id IN (SELECT project_id FROM public.project_shares WHERE shared_with_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND role IN ('editor', 'admin'))
  )
);

-- ============================================================
-- MATERIALS: allow system admins to view and manage materials
-- ============================================================

DROP POLICY IF EXISTS "Users can view materials in accessible projects" ON public.materials;
CREATE POLICY "Users can view materials in accessible projects" ON public.materials
FOR SELECT USING (
  is_system_admin()
  OR task_id IN (
    SELECT id FROM public.tasks WHERE project_id IN (
      SELECT id FROM public.projects WHERE
        owner_id = get_user_profile_id()
        OR user_has_project_access(id)
    )
  )
);

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
          AND role IN ('editor', 'admin')
        )
    )
  )
);
