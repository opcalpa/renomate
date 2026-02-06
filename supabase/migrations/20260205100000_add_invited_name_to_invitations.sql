-- Add optional invited_name column to project_invitations
ALTER TABLE project_invitations ADD COLUMN IF NOT EXISTS invited_name TEXT;
