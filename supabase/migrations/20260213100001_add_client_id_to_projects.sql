-- Add client_id column to projects table
-- This allows linking a project to a client for lead tracking

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
