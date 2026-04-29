-- Inspections / Egenkontroller
-- Quality control checklists with photo evidence and sign-off

-- Inspection templates (reusable across projects)
CREATE TABLE IF NOT EXISTS public.inspection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inspections (filled-in checklists per project)
CREATE TABLE IF NOT EXISTS public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.inspection_templates(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'approved', 'failed', 'na')),
  items JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  inspector_name TEXT,
  inspector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  inspected_at TIMESTAMPTZ,
  approved_by_name TEXT,
  approved_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  photos JSONB DEFAULT '[]',
  created_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments on items structure:
-- items: [{ id: uuid, title: string, checked: boolean, note: string | null, photoUrl: string | null }]
-- photos: [{ id: uuid, url: string, caption: string | null }]

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inspections_project ON public.inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_inspections_room ON public.inspections(room_id);
CREATE INDEX IF NOT EXISTS idx_inspection_templates_profile ON public.inspection_templates(profile_id);

-- RLS
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_templates ENABLE ROW LEVEL SECURITY;

-- Inspections: project members can view, project owner + admin can manage
CREATE POLICY inspections_select ON public.inspections FOR SELECT
  USING (public.user_has_project_access(project_id));

CREATE POLICY inspections_insert ON public.inspections FOR INSERT
  WITH CHECK (public.user_has_project_access(project_id));

CREATE POLICY inspections_update ON public.inspections FOR UPDATE
  USING (public.user_has_project_access(project_id));

CREATE POLICY inspections_delete ON public.inspections FOR DELETE
  USING (public.user_owns_project(project_id));

-- Templates: owner can manage their own
CREATE POLICY templates_select ON public.inspection_templates FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY templates_insert ON public.inspection_templates FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY templates_update ON public.inspection_templates FOR UPDATE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY templates_delete ON public.inspection_templates FOR DELETE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Seed default templates (inserted for each user on first use, not globally)
-- Templates are created on-demand in the app, not seeded here.

COMMENT ON TABLE public.inspections IS 'Egenkontroller — quality control checklists with photo evidence';
COMMENT ON TABLE public.inspection_templates IS 'Reusable inspection templates per contractor';
COMMENT ON COLUMN public.inspections.items IS 'JSONB array: [{id, title, checked, note, photoUrl}]';
COMMENT ON COLUMN public.inspections.status IS 'pending → in_progress → approved/failed/na';
