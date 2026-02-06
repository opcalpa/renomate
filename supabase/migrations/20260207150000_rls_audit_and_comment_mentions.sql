-- RLS Audit Migration: Ensure all tables have proper Row Level Security
-- This migration creates missing tables and ensures RLS is enabled everywhere

-- 1. Create comment_mentions table if it doesn't exist (used for @mentions in comments)
CREATE TABLE IF NOT EXISTS public.comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment_id ON comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_mentioned_user_id ON comment_mentions(mentioned_user_id);

-- Enable RLS on comment_mentions
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view mentions" ON comment_mentions;
DROP POLICY IF EXISTS "Users can insert mentions" ON comment_mentions;
DROP POLICY IF EXISTS "Users can delete own mentions" ON comment_mentions;

-- Users can view mentions where they are mentioned or where they authored the comment
CREATE POLICY "Users can view mentions" ON comment_mentions FOR SELECT
  USING (
    mentioned_user_id = get_user_profile_id()
    OR comment_id IN (SELECT id FROM comments WHERE created_by_user_id = get_user_profile_id())
  );

-- Users can insert mentions when they create comments
CREATE POLICY "Users can insert mentions" ON comment_mentions FOR INSERT
  WITH CHECK (
    comment_id IN (SELECT id FROM comments WHERE created_by_user_id = get_user_profile_id())
  );

-- Users can delete their own comment mentions
CREATE POLICY "Users can delete own mentions" ON comment_mentions FOR DELETE
  USING (
    comment_id IN (SELECT id FROM comments WHERE created_by_user_id = get_user_profile_id())
  );

-- 2. Ensure RLS is enabled on all tables (idempotent)
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.floor_map_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.floor_map_shapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.help_bot_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_file_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pinterest_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;

-- 3. Add helper function comment for documentation
COMMENT ON TABLE public.comment_mentions IS 'Stores @mentions in comments for notification purposes';
