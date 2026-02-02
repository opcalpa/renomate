-- Create task_file_links table for linking project files to tasks
CREATE TABLE IF NOT EXISTS public.task_file_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'other' CHECK (file_type IN ('invoice', 'receipt', 'contract', 'other')),
  file_size BIGINT,
  mime_type TEXT,
  linked_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index: a file can only be linked once to a task
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_file_links_task_path
  ON public.task_file_links (task_id, file_path);

-- Lookup indexes
CREATE INDEX IF NOT EXISTS idx_task_file_links_task_id
  ON public.task_file_links (task_id);

CREATE INDEX IF NOT EXISTS idx_task_file_links_project_id
  ON public.task_file_links (project_id);

-- RLS
ALTER TABLE public.task_file_links ENABLE ROW LEVEL SECURITY;

-- View: project owner or shared users can see linked files
CREATE POLICY "Users can view task file links in accessible projects"
  ON public.task_file_links FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR id IN (
          SELECT project_id FROM public.project_shares
          WHERE shared_with_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        )
    )
  );

-- Insert/Update/Delete: project owner or shared users can manage
CREATE POLICY "Users can manage task file links in accessible projects"
  ON public.task_file_links FOR ALL
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR id IN (
          SELECT project_id FROM public.project_shares
          WHERE shared_with_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        )
    )
  );
