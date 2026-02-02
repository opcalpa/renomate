-- Allow comments with entity_type = 'professional_message' without project_id
-- These are direct messages between users and professional profiles.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can view professional messages'
      AND tablename = 'comments'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can view professional messages"
        ON comments FOR SELECT
        USING (
          entity_type = 'professional_message'
          AND (
            created_by_user_id = auth.uid()
            OR entity_id::uuid IN (SELECT id FROM profiles WHERE user_id = auth.uid())
          )
        )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can send professional messages'
      AND tablename = 'comments'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can send professional messages"
        ON comments FOR INSERT
        WITH CHECK (
          entity_type = 'professional_message'
          AND created_by_user_id = auth.uid()
        )
    $policy$;
  END IF;
END $$;
