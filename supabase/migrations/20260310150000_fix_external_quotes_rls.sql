-- Fix RLS policies for external_quotes and external_quote_assignments.
-- Previous migration used auth.uid() directly, but this project uses
-- profile-based helper functions (user_owns_project, user_has_project_access, get_user_profile_id).

-- ============================================================
-- external_quotes — drop old policies, create correct ones
-- ============================================================

DROP POLICY IF EXISTS "external_quotes_select" ON external_quotes;
DROP POLICY IF EXISTS "external_quotes_insert" ON external_quotes;
DROP POLICY IF EXISTS "external_quotes_update" ON external_quotes;
DROP POLICY IF EXISTS "external_quotes_delete" ON external_quotes;

CREATE POLICY "external_quotes_select" ON external_quotes
  FOR SELECT USING (
    is_system_admin()
    OR user_owns_project(project_id)
    OR user_has_project_access(project_id)
  );

CREATE POLICY "external_quotes_insert" ON external_quotes
  FOR INSERT WITH CHECK (
    is_system_admin()
    OR user_owns_project(project_id)
    OR project_id IN (
      SELECT ps.project_id FROM public.project_shares ps
      WHERE ps.shared_with_user_id = get_user_profile_id()
        AND ps.role IN ('editor', 'admin', 'client')
    )
  );

CREATE POLICY "external_quotes_update" ON external_quotes
  FOR UPDATE USING (
    is_system_admin()
    OR user_owns_project(project_id)
    OR project_id IN (
      SELECT ps.project_id FROM public.project_shares ps
      WHERE ps.shared_with_user_id = get_user_profile_id()
        AND ps.role IN ('editor', 'admin', 'client')
    )
  );

CREATE POLICY "external_quotes_delete" ON external_quotes
  FOR DELETE USING (
    is_system_admin()
    OR user_owns_project(project_id)
    OR project_id IN (
      SELECT ps.project_id FROM public.project_shares ps
      WHERE ps.shared_with_user_id = get_user_profile_id()
        AND ps.role IN ('editor', 'admin')
    )
  );

-- ============================================================
-- external_quote_assignments — drop old policies, create correct ones
-- ============================================================

DROP POLICY IF EXISTS "eqa_select" ON external_quote_assignments;
DROP POLICY IF EXISTS "eqa_insert" ON external_quote_assignments;
DROP POLICY IF EXISTS "eqa_update" ON external_quote_assignments;
DROP POLICY IF EXISTS "eqa_delete" ON external_quote_assignments;

-- Use a subquery through external_quotes → project_id
CREATE POLICY "eqa_select" ON external_quote_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM external_quotes eq
      WHERE eq.id = external_quote_assignments.external_quote_id
        AND (
          is_system_admin()
          OR user_owns_project(eq.project_id)
          OR user_has_project_access(eq.project_id)
        )
    )
  );

CREATE POLICY "eqa_insert" ON external_quote_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM external_quotes eq
      WHERE eq.id = external_quote_assignments.external_quote_id
        AND (
          is_system_admin()
          OR user_owns_project(eq.project_id)
          OR eq.project_id IN (
            SELECT ps.project_id FROM public.project_shares ps
            WHERE ps.shared_with_user_id = get_user_profile_id()
              AND ps.role IN ('editor', 'admin', 'client')
          )
        )
    )
  );

CREATE POLICY "eqa_update" ON external_quote_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM external_quotes eq
      WHERE eq.id = external_quote_assignments.external_quote_id
        AND (
          is_system_admin()
          OR user_owns_project(eq.project_id)
          OR eq.project_id IN (
            SELECT ps.project_id FROM public.project_shares ps
            WHERE ps.shared_with_user_id = get_user_profile_id()
              AND ps.role IN ('editor', 'admin', 'client')
          )
        )
    )
  );

CREATE POLICY "eqa_delete" ON external_quote_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM external_quotes eq
      WHERE eq.id = external_quote_assignments.external_quote_id
        AND (
          is_system_admin()
          OR user_owns_project(eq.project_id)
          OR eq.project_id IN (
            SELECT ps.project_id FROM public.project_shares ps
            WHERE ps.shared_with_user_id = get_user_profile_id()
              AND ps.role IN ('editor', 'admin')
          )
        )
    )
  );
