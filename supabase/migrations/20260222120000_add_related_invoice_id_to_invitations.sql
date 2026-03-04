-- Add related_invoice_id to project_invitations for invoice sharing
ALTER TABLE public.project_invitations
  ADD COLUMN IF NOT EXISTS related_invoice_id UUID REFERENCES invoices(id);

CREATE INDEX IF NOT EXISTS idx_project_invitations_related_invoice_id
  ON public.project_invitations(related_invoice_id);
