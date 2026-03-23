-- Cache translated task content for worker views
-- Revert: DROP TABLE IF EXISTS task_translations;

CREATE TABLE IF NOT EXISTS public.task_translations (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  title TEXT,
  description TEXT,
  checklists JSONB,
  translated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, language)
);

CREATE INDEX IF NOT EXISTS idx_task_translations_task ON public.task_translations(task_id);

-- RLS: authenticated users can read translations for their projects
ALTER TABLE public.task_translations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read translations for tasks they have access to
CREATE POLICY "users_can_read_task_translations"
  ON public.task_translations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_translations.task_id
      AND (
        user_owns_project(t.project_id)
        OR user_has_project_access(t.project_id)
      )
    )
  );

-- Service role handles inserts/updates via edge functions
-- No INSERT/UPDATE policy for authenticated — only service role writes
