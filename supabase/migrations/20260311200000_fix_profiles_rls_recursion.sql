-- This migration intentionally left blank.
-- The original get_visible_profile_ids() approach still caused recursion.
-- Profiles RLS fix is handled in 20260311210000 by keeping USING(true).
BEGIN;
COMMIT;
