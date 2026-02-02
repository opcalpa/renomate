-- Add permissions_snapshot JSONB column to project_invitations
ALTER TABLE project_invitations ADD COLUMN IF NOT EXISTS permissions_snapshot JSONB;
