-- RLS policies for comments on quotes
-- Allow quote creator or project members to read/write comments on quotes

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quote_comments_select' AND tablename = 'comments') THEN
    CREATE POLICY "quote_comments_select"
      ON comments FOR SELECT
      USING (
        entity_type = 'quote'
        AND (
          EXISTS (
            SELECT 1 FROM quotes q
            JOIN project_shares ps ON ps.project_id = q.project_id
            WHERE q.id = comments.entity_id::uuid
              AND ps.shared_with_user_id = get_user_profile_id()
          )
          OR EXISTS (
            SELECT 1 FROM quotes q
            JOIN projects p ON p.id = q.project_id
            WHERE q.id = comments.entity_id::uuid
              AND (q.creator_id = get_user_profile_id() OR p.owner_id = get_user_profile_id())
          )
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quote_comments_insert' AND tablename = 'comments') THEN
    CREATE POLICY "quote_comments_insert"
      ON comments FOR INSERT
      WITH CHECK (
        entity_type = 'quote'
        AND created_by_user_id = get_user_profile_id()
        AND (
          EXISTS (
            SELECT 1 FROM quotes q
            JOIN project_shares ps ON ps.project_id = q.project_id
            WHERE q.id = comments.entity_id::uuid
              AND ps.shared_with_user_id = get_user_profile_id()
          )
          OR EXISTS (
            SELECT 1 FROM quotes q
            JOIN projects p ON p.id = q.project_id
            WHERE q.id = comments.entity_id::uuid
              AND (q.creator_id = get_user_profile_id() OR p.owner_id = get_user_profile_id())
          )
        )
      );
  END IF;
END $$;
