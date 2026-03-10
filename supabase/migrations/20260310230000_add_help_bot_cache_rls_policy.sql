-- Add RLS policy for help_bot_cache table
-- This table is only written by edge functions (service role, bypasses RLS).
-- Allow authenticated users to read cached responses.

CREATE POLICY "Authenticated users can read help bot cache"
  ON public.help_bot_cache
  FOR SELECT
  TO authenticated
  USING (true);
