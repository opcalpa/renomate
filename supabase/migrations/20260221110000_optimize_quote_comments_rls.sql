-- Optimize quote comments RLS policies to prevent statement timeouts
-- Root cause: double EXISTS with JOINs + entity_id::uuid cast prevents index use

-- 1. Add composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_comments_entity_id_created_at
  ON comments(entity_id, created_at);

-- 2. Add composite index for project_shares lookups in RLS
CREATE INDEX IF NOT EXISTS idx_project_shares_project_user
  ON project_shares(project_id, shared_with_user_id);

-- 3. Replace expensive SELECT RLS policy with a single optimized query
DROP POLICY IF EXISTS "quote_comments_select" ON comments;

CREATE POLICY "quote_comments_select"
  ON comments FOR SELECT
  USING (
    entity_type = 'quote'
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

-- 4. Replace expensive INSERT RLS policy with same optimization
DROP POLICY IF EXISTS "quote_comments_insert" ON comments;

CREATE POLICY "quote_comments_insert"
  ON comments FOR INSERT
  WITH CHECK (
    entity_type = 'quote'
    AND created_by_user_id = get_user_profile_id()
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
