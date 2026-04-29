-- Fix: project owners could not create inspections
-- user_has_project_access() only checks project_shares, not ownership.
-- Add user_owns_project() to all inspections policies.

DROP POLICY IF EXISTS inspections_select ON public.inspections;
CREATE POLICY inspections_select ON public.inspections FOR SELECT
  USING (public.user_owns_project(project_id) OR public.user_has_project_access(project_id));

DROP POLICY IF EXISTS inspections_insert ON public.inspections;
CREATE POLICY inspections_insert ON public.inspections FOR INSERT
  WITH CHECK (public.user_owns_project(project_id) OR public.user_has_project_access(project_id));

DROP POLICY IF EXISTS inspections_update ON public.inspections;
CREATE POLICY inspections_update ON public.inspections FOR UPDATE
  USING (public.user_owns_project(project_id) OR public.user_has_project_access(project_id));

-- Delete stays owner-only (already correct)
