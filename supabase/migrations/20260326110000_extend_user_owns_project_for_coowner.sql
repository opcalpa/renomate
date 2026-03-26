-- Extend user_owns_project() to also return true for co_owner shares
-- This gives co-owners the same RLS access as project owners everywhere
-- the function is used, without modifying any individual policies.
--
-- Revert: CREATE OR REPLACE FUNCTION public.user_owns_project(project_id uuid)
-- RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
-- AS $$ SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = project_id
-- AND owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)); $$;

CREATE OR REPLACE FUNCTION public.user_owns_project(project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Original owner check
    SELECT 1 FROM public.projects
    WHERE id = project_id
    AND owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  )
  OR EXISTS (
    -- Co-owner check via project_shares
    SELECT 1 FROM public.project_shares
    WHERE project_shares.project_id = $1
    AND shared_with_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    AND role_type = 'co_owner'
  );
$$;
