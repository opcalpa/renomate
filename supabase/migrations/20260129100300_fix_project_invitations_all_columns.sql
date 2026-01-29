-- Ensure all columns required by TeamManagement.tsx exist on project_invitations
-- This is idempotent: uses IF NOT EXISTS

ALTER TABLE public.project_invitations
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS token TEXT,
ADD COLUMN IF NOT EXISTS timeline_access TEXT DEFAULT 'view',
ADD COLUMN IF NOT EXISTS tasks_access TEXT DEFAULT 'view',
ADD COLUMN IF NOT EXISTS tasks_scope TEXT DEFAULT 'assigned',
ADD COLUMN IF NOT EXISTS space_planner_access TEXT DEFAULT 'view',
ADD COLUMN IF NOT EXISTS purchases_access TEXT DEFAULT 'view',
ADD COLUMN IF NOT EXISTS purchases_scope TEXT DEFAULT 'assigned',
ADD COLUMN IF NOT EXISTS overview_access TEXT DEFAULT 'view',
ADD COLUMN IF NOT EXISTS teams_access TEXT DEFAULT 'none';
