-- Pinterest Integration: Store user OAuth tokens
-- Migration: 20260126_add_pinterest_integration.sql

-- Create table for storing Pinterest OAuth tokens per user
CREATE TABLE IF NOT EXISTS pinterest_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  pinterest_user_id TEXT,
  pinterest_username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE pinterest_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own tokens
CREATE POLICY "Users can view own pinterest tokens"
  ON pinterest_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pinterest tokens"
  ON pinterest_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pinterest tokens"
  ON pinterest_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pinterest tokens"
  ON pinterest_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pinterest_tokens_user_id ON pinterest_tokens(user_id);

-- Add source field to photos table to track where the photo came from
ALTER TABLE photos ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upload';
ALTER TABLE photos ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS pinterest_pin_id TEXT;

-- Comment for documentation
COMMENT ON TABLE pinterest_tokens IS 'Stores Pinterest OAuth tokens for user integration';
COMMENT ON COLUMN photos.source IS 'Source of the photo: upload, pinterest, url';
COMMENT ON COLUMN photos.source_url IS 'Original source URL if imported from external service';
COMMENT ON COLUMN photos.pinterest_pin_id IS 'Pinterest pin ID if imported from Pinterest';
