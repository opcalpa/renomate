-- Create Comments System for Tasks and Materials
-- With @mention support

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Either task_id OR material_id can be set
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE
);

-- Create comment_mentions table
CREATE TABLE IF NOT EXISTS public.comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  mentioned_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(comment_id, mentioned_user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS comments_task_id_idx ON public.comments(task_id);
CREATE INDEX IF NOT EXISTS comments_material_id_idx ON public.comments(material_id);
CREATE INDEX IF NOT EXISTS comments_created_by_idx ON public.comments(created_by_user_id);
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS comment_mentions_comment_idx ON public.comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS comment_mentions_user_idx ON public.comment_mentions(mentioned_user_id);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;

-- RLS policies for comments
CREATE POLICY "Users can view comments"
ON public.comments
FOR SELECT
USING (
  (task_id IS NOT NULL AND task_id IN (
    SELECT t.id FROM tasks t
    WHERE user_has_project_access(t.project_id)
  ))
  OR
  (material_id IS NOT NULL AND material_id IN (
    SELECT m.id FROM materials m
    WHERE user_has_project_access(m.project_id)
  ))
);

CREATE POLICY "Users can create comments"
ON public.comments
FOR INSERT
WITH CHECK (
  (task_id IS NOT NULL AND task_id IN (
    SELECT t.id FROM tasks t
    WHERE user_has_project_access(t.project_id)
  ))
  OR
  (material_id IS NOT NULL AND material_id IN (
    SELECT m.id FROM materials m
    WHERE user_has_project_access(m.project_id)
  ))
);

CREATE POLICY "Users can update own comments"
ON public.comments
FOR UPDATE
USING (
  created_by_user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own comments"
ON public.comments
FOR DELETE
USING (
  created_by_user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- RLS policies for mentions
CREATE POLICY "Users can view mentions"
ON public.comment_mentions
FOR SELECT
USING (
  comment_id IN (
    SELECT id FROM comments WHERE user_has_project_access(
      COALESCE(
        (SELECT project_id FROM tasks WHERE id = comments.task_id),
        (SELECT project_id FROM materials WHERE id = comments.material_id)
      )
    )
  )
);

CREATE POLICY "Users can create mentions"
ON public.comment_mentions
FOR INSERT
WITH CHECK (
  comment_id IN (
    SELECT id FROM comments
    WHERE created_by_user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete mentions"
ON public.comment_mentions
FOR DELETE
USING (
  comment_id IN (
    SELECT id FROM comments
    WHERE created_by_user_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
);

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
