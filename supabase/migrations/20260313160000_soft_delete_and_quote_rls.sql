-- ============================================================================
-- Soft delete for projects + fix quote INSERT RLS gap
-- ============================================================================
-- REVERT SQL (run manually if needed):
--   ALTER TABLE public.projects DROP COLUMN IF EXISTS deleted_at;
--   DROP POLICY IF EXISTS "Users can view projects they own or have access to" ON public.projects;
--   CREATE POLICY "Users can view projects they own or have access to" ON public.projects
--     FOR SELECT USING (
--       is_system_admin()
--       OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
--       OR id IN (SELECT project_id FROM public.project_shares WHERE shared_with_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
--     );
--   DROP POLICY IF EXISTS "Anyone can view public demo project" ON public.projects;
--   CREATE POLICY "Anyone can view public demo project" ON public.projects
--     FOR SELECT USING (project_type = 'public_demo');
--   DROP POLICY IF EXISTS "Creator can view own quotes" ON quotes;
--   DROP POLICY IF EXISTS "Creator can update own quotes" ON quotes;
--   DROP POLICY IF EXISTS "Creator can delete own quotes" ON quotes;
--   DROP POLICY IF EXISTS "Users can create quotes in accessible projects" ON quotes;
--   CREATE POLICY "Creator can manage own quotes" ON quotes FOR ALL
--     USING (creator_id = get_user_profile_id());
-- ============================================================================

-- 1. Add deleted_at column for soft delete
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON public.projects(deleted_at);

-- 2. Update projects SELECT policy to exclude soft-deleted projects
DROP POLICY IF EXISTS "Users can view projects they own or have access to" ON public.projects;
CREATE POLICY "Users can view projects they own or have access to" ON public.projects
FOR SELECT USING (
  deleted_at IS NULL
  AND (
    is_system_admin()
    OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR id IN (SELECT project_id FROM public.project_shares WHERE shared_with_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  )
);

-- Also filter soft-deleted projects from public demo policy
DROP POLICY IF EXISTS "Anyone can view public demo project" ON public.projects;
CREATE POLICY "Anyone can view public demo project" ON public.projects
FOR SELECT USING (
  deleted_at IS NULL AND project_type = 'public_demo'
);

-- 3. Fix quote INSERT RLS: split FOR ALL into separate policies, add project access check to INSERT
DROP POLICY IF EXISTS "Creator can manage own quotes" ON quotes;

CREATE POLICY "Creator can view own quotes" ON quotes
FOR SELECT USING (creator_id = get_user_profile_id());

CREATE POLICY "Creator can update own quotes" ON quotes
FOR UPDATE USING (creator_id = get_user_profile_id());

CREATE POLICY "Creator can delete own quotes" ON quotes
FOR DELETE USING (creator_id = get_user_profile_id());

-- INSERT: must be creator AND must own the project (not just have access)
CREATE POLICY "Users can create quotes in own projects" ON quotes
FOR INSERT WITH CHECK (
  creator_id = get_user_profile_id()
  AND user_owns_project(project_id)
);
