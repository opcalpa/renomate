-- Fix: entity_id on comments is UUID but photo comments use "photo:path" format.
-- PostgREST fails with 400 when filtering entity_id = 'photo:...' because it
-- cannot cast the string to UUID.
--
-- Solution: change entity_id from UUID to TEXT.
-- Must drop ALL policies that reference entity_id, change type, then recreate.

BEGIN;

-- 1. Drop ALL policies that reference entity_id on comments
DROP POLICY IF EXISTS "Users can view comments" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can view professional messages" ON comments;
DROP POLICY IF EXISTS "Users can send professional messages" ON comments;
DROP POLICY IF EXISTS "quote_comments_select" ON comments;
DROP POLICY IF EXISTS "quote_comments_insert" ON comments;

-- 2. Change column type
ALTER TABLE comments ALTER COLUMN entity_id TYPE TEXT USING entity_id::TEXT;

-- 3. Recreate: "Users can view comments" (unchanged logic, entity_id is now TEXT)
CREATE POLICY "Users can view comments"
ON public.comments FOR SELECT
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

-- 4. Recreate: "Users can create comments" (unchanged)
CREATE POLICY "Users can create comments"
ON public.comments FOR INSERT
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

-- 5. Recreate: professional message policies (safe UUID guard for TEXT column)
CREATE POLICY "Users can view professional messages"
  ON comments FOR SELECT
  USING (
    entity_type = 'professional_message'
    AND (
      created_by_user_id = auth.uid()
      OR (
        entity_id IS NOT NULL
        AND entity_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND entity_id::uuid IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can send professional messages"
  ON comments FOR INSERT
  WITH CHECK (
    entity_type = 'professional_message'
    AND created_by_user_id = auth.uid()
  );

-- 6. Recreate: quote comment policies (safe UUID guard before cast)
CREATE POLICY "quote_comments_select"
  ON comments FOR SELECT
  USING (
    entity_type = 'quote'
    AND entity_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1 FROM quotes q
      LEFT JOIN project_shares ps
        ON ps.project_id = q.project_id
        AND ps.shared_with_user_id = get_user_profile_id()
      LEFT JOIN projects p
        ON p.id = q.project_id
      WHERE q.id = comments.entity_id::uuid
        AND (
          ps.id IS NOT NULL
          OR q.creator_id = get_user_profile_id()
          OR p.owner_id = get_user_profile_id()
        )
    )
  );

CREATE POLICY "quote_comments_insert"
  ON comments FOR INSERT
  WITH CHECK (
    entity_type = 'quote'
    AND created_by_user_id = get_user_profile_id()
    AND entity_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1 FROM quotes q
      LEFT JOIN project_shares ps
        ON ps.project_id = q.project_id
        AND ps.shared_with_user_id = get_user_profile_id()
      LEFT JOIN projects p
        ON p.id = q.project_id
      WHERE q.id = comments.entity_id::uuid
        AND (
          ps.id IS NOT NULL
          OR q.creator_id = get_user_profile_id()
          OR p.owner_id = get_user_profile_id()
        )
    )
  );

COMMIT;
