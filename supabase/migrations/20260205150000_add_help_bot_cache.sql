CREATE TABLE IF NOT EXISTS help_bot_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key text UNIQUE NOT NULL,
  response text NOT NULL,
  language text NOT NULL,
  user_type text,
  created_at timestamptz DEFAULT now()
);

-- Allow edge function (service role) to read/write
ALTER TABLE help_bot_cache ENABLE ROW LEVEL SECURITY;
-- No RLS policies needed — edge function uses service role key which bypasses RLS
