-- Add budget_access and files_access to project_shares and project_invitations
-- Idempotent: uses IF NOT EXISTS

ALTER TABLE public.project_shares
ADD COLUMN IF NOT EXISTS budget_access TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS files_access TEXT DEFAULT 'none';

ALTER TABLE public.project_invitations
ADD COLUMN IF NOT EXISTS budget_access TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS files_access TEXT DEFAULT 'none';
