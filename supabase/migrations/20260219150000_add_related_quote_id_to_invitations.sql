-- Add a nullable related_quote_id column to project_invitations
-- This links an invitation to a specific quote so InvitationResponse
-- can redirect the customer to the quote page after acceptance.
ALTER TABLE project_invitations
  ADD COLUMN IF NOT EXISTS related_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;
