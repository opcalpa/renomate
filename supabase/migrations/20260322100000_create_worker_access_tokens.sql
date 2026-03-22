-- Worker access tokens: token-based access for non-technical subcontractors
-- Revert: DROP TABLE IF EXISTS worker_access_tokens;

CREATE TABLE IF NOT EXISTS public.worker_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
  worker_name TEXT NOT NULL,
  worker_phone TEXT,
  worker_language TEXT NOT NULL DEFAULT 'en',
  assigned_task_ids UUID[] NOT NULL DEFAULT '{}',
  can_upload_photos BOOLEAN NOT NULL DEFAULT true,
  can_toggle_checklist BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  last_accessed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for token lookup (the hot path for worker view)
CREATE INDEX IF NOT EXISTS idx_worker_tokens_token ON public.worker_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_worker_tokens_project ON public.worker_access_tokens(project_id);

-- RLS: project members can view, project owner can manage
ALTER TABLE public.worker_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_members_can_view_worker_tokens"
  ON public.worker_access_tokens FOR SELECT
  TO authenticated
  USING (user_owns_project(project_id) OR user_has_project_access(project_id));

CREATE POLICY "project_owner_can_insert_worker_tokens"
  ON public.worker_access_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_owns_project(project_id));

CREATE POLICY "project_owner_can_update_worker_tokens"
  ON public.worker_access_tokens FOR UPDATE
  TO authenticated
  USING (user_owns_project(project_id));

CREATE POLICY "project_owner_can_delete_worker_tokens"
  ON public.worker_access_tokens FOR DELETE
  TO authenticated
  USING (user_owns_project(project_id));
