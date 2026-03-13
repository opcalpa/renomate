-- Fix: project_invitations.related_invoice_id lacks ON DELETE clause (defaults to RESTRICT),
-- which blocks project deletion when cascading through invoices.
-- Revert SQL: ALTER TABLE project_invitations DROP CONSTRAINT IF EXISTS project_invitations_related_invoice_id_fkey;
--             ALTER TABLE project_invitations ADD CONSTRAINT project_invitations_related_invoice_id_fkey
--               FOREIGN KEY (related_invoice_id) REFERENCES invoices(id);

ALTER TABLE public.project_invitations
  DROP CONSTRAINT IF EXISTS project_invitations_related_invoice_id_fkey;

ALTER TABLE public.project_invitations
  ADD CONSTRAINT project_invitations_related_invoice_id_fkey
  FOREIGN KEY (related_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
