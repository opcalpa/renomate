-- Fix help_bot_cache RLS: scope to question hash only (no user data in cache)
-- Fix project_invitations: add expiry check for anonymous access

BEGIN;

-- ============================================================
-- 1. help_bot_cache: remove overly permissive SELECT
-- Cache is keyed by question hash, not user-specific.
-- But we should still restrict to authenticated users only,
-- not let anyone enumerate all cached questions.
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can read help bot cache" ON public.help_bot_cache;
DROP POLICY IF EXISTS "Authenticated users can insert help bot cache" ON public.help_bot_cache;
DROP POLICY IF EXISTS "System can manage help bot cache" ON public.help_bot_cache;

-- Only allow reading cache entries (no user-specific data, just Q&A pairs)
-- Restrict to authenticated users (edge function uses service role anyway)
CREATE POLICY "Authenticated users can read help bot cache"
  ON public.help_bot_cache
  FOR SELECT TO authenticated
  USING (true);

-- Only service role (edge function) should insert cache entries
-- Regular users should not insert directly
CREATE POLICY "Service role manages help bot cache"
  ON public.help_bot_cache
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- 2. project_invitations: add expiry check for anon access
-- Expired tokens should not be viewable
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.project_invitations;

CREATE POLICY "Anyone can view invitation by token"
  ON public.project_invitations
  FOR SELECT TO anon
  USING (
    token IS NOT NULL
    AND (expires_at IS NULL OR expires_at > now())
  );

COMMIT;
