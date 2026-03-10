-- Sync token ↔ invitation_token on project_invitations
-- The token column is an alias but was never auto-synced on INSERT

-- Backfill: copy invitation_token → token where token is null
UPDATE public.project_invitations
SET token = invitation_token::text
WHERE token IS NULL AND invitation_token IS NOT NULL;

-- Backfill: copy token → invitation_token where invitation_token is null
UPDATE public.project_invitations
SET invitation_token = token::uuid
WHERE invitation_token IS NULL AND token IS NOT NULL;

-- Create trigger to keep token/invitation_token in sync
CREATE OR REPLACE FUNCTION sync_invitation_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invitation_token IS NOT NULL AND NEW.token IS NULL THEN
    NEW.token := NEW.invitation_token::text;
  ELSIF NEW.token IS NOT NULL AND NEW.invitation_token IS NULL THEN
    NEW.invitation_token := NEW.token::uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_invitation_token ON public.project_invitations;
CREATE TRIGGER trg_sync_invitation_token
  BEFORE INSERT OR UPDATE ON public.project_invitations
  FOR EACH ROW
  EXECUTE FUNCTION sync_invitation_token();
