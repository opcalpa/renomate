-- Add missing columns that the frontend expects

-- Materials: price_total and exclude_from_budget
ALTER TABLE materials ADD COLUMN IF NOT EXISTS price_total DECIMAL(12, 2);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS exclude_from_budget BOOLEAN DEFAULT false;

-- Comments: images column for attached images
ALTER TABLE comments ADD COLUMN IF NOT EXISTS images TEXT[];

-- Tasks: cost_centers array (in addition to cost_center singular)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cost_centers TEXT[];

-- Create stakeholders table (project team members/contacts - legacy table)
-- This might be deprecated in favor of project_shares, but some queries still reference it
CREATE TABLE IF NOT EXISTS public.stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  contractor_category TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;

-- RLS policies for stakeholders
CREATE POLICY "Users can view stakeholders in accessible projects"
ON public.stakeholders FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_has_project_access(id)
  )
  OR is_public_demo_project(project_id)
);

CREATE POLICY "Users can manage stakeholders in their projects"
ON public.stakeholders FOR ALL
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_can_manage_project(id)
  )
);

-- Index
CREATE INDEX IF NOT EXISTS idx_stakeholders_project_id ON public.stakeholders(project_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_stakeholders_updated_at ON public.stakeholders;
CREATE TRIGGER update_stakeholders_updated_at
  BEFORE UPDATE ON public.stakeholders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
