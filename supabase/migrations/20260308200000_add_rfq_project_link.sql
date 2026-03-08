-- Link a builder's project back to the homeowner's RFQ project it was created from.
-- This enables the full RFQ → Quote → Approval loop.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS source_rfq_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Index for quick lookup: "which builder projects were created from this RFQ?"
CREATE INDEX IF NOT EXISTS idx_projects_source_rfq ON projects(source_rfq_project_id)
  WHERE source_rfq_project_id IS NOT NULL;

-- Add role_type to project_invitations for RFQ builder invitations
ALTER TABLE project_invitations
  ADD COLUMN IF NOT EXISTS role_type TEXT;

COMMENT ON COLUMN project_invitations.role_type IS
  'Role hint: contractor, client, rfq_builder, other';
