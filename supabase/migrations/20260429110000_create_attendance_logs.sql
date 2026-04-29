-- Personalliggare — attendance tracking for construction sites
-- Workers check in/out via QR code. Required by Swedish tax law (personalliggare).

CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  worker_name TEXT NOT NULL,
  worker_personnummer TEXT,
  worker_phone TEXT,
  worker_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  check_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out TIMESTAMPTZ,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    CASE WHEN check_out IS NOT NULL
      THEN EXTRACT(EPOCH FROM (check_out - check_in)) / 60
      ELSE NULL
    END
  ) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_project ON public.attendance_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_attendance_checkin ON public.attendance_logs(check_in);

-- RLS
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendance_select ON public.attendance_logs FOR SELECT
  USING (public.user_has_project_access(project_id));

CREATE POLICY attendance_insert ON public.attendance_logs FOR INSERT
  WITH CHECK (true);  -- Anyone with the QR link can check in

CREATE POLICY attendance_update ON public.attendance_logs FOR UPDATE
  USING (public.user_has_project_access(project_id));

CREATE POLICY attendance_delete ON public.attendance_logs FOR DELETE
  USING (public.user_owns_project(project_id));

COMMENT ON TABLE public.attendance_logs IS 'Personalliggare — worker check-in/out logs per project';
COMMENT ON COLUMN public.attendance_logs.duration_minutes IS 'Auto-calculated from check_in and check_out';
