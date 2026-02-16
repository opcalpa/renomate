-- Add missing columns and aliases to project_invitations
-- The frontend expects different column names than what exists

-- Add email as alias for invited_email (if not exists)
ALTER TABLE public.project_invitations
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add phone as alias for invited_phone (if not exists)
ALTER TABLE public.project_invitations
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add token as alias for invitation_token (if not exists)
ALTER TABLE public.project_invitations
ADD COLUMN IF NOT EXISTS token TEXT;

-- Add role column (if not exists)
ALTER TABLE public.project_invitations
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'viewer';

-- Add invited_name column (if not exists)
ALTER TABLE public.project_invitations
ADD COLUMN IF NOT EXISTS invited_name TEXT;

-- Add permission columns (if not exists) - these might already exist from earlier migration
ALTER TABLE public.project_invitations
ADD COLUMN IF NOT EXISTS timeline_access TEXT DEFAULT 'view',
ADD COLUMN IF NOT EXISTS tasks_access TEXT DEFAULT 'view',
ADD COLUMN IF NOT EXISTS tasks_scope TEXT DEFAULT 'assigned',
ADD COLUMN IF NOT EXISTS space_planner_access TEXT DEFAULT 'view',
ADD COLUMN IF NOT EXISTS purchases_access TEXT DEFAULT 'view',
ADD COLUMN IF NOT EXISTS purchases_scope TEXT DEFAULT 'assigned',
ADD COLUMN IF NOT EXISTS overview_access TEXT DEFAULT 'view',
ADD COLUMN IF NOT EXISTS teams_access TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS budget_access TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS files_access TEXT DEFAULT 'none';

-- Sync existing data: copy invited_email to email where email is null
UPDATE public.project_invitations
SET email = invited_email
WHERE email IS NULL AND invited_email IS NOT NULL;

-- Sync phone
UPDATE public.project_invitations
SET phone = invited_phone
WHERE phone IS NULL AND invited_phone IS NOT NULL;

-- Sync token
UPDATE public.project_invitations
SET token = invitation_token
WHERE token IS NULL AND invitation_token IS NOT NULL;

-- Create trigger to keep email/invited_email in sync
CREATE OR REPLACE FUNCTION sync_invitation_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.invited_email IS NULL THEN
    NEW.invited_email := NEW.email;
  ELSIF NEW.invited_email IS NOT NULL AND NEW.email IS NULL THEN
    NEW.email := NEW.invited_email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_invitation_email ON public.project_invitations;
CREATE TRIGGER trg_sync_invitation_email
  BEFORE INSERT OR UPDATE ON public.project_invitations
  FOR EACH ROW
  EXECUTE FUNCTION sync_invitation_email();
