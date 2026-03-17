-- Add "to_order" to the materials status CHECK constraint.
-- This status is used by createTasksFromQuote() when a quote is accepted
-- and material line items are converted to material records for ordering.

ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_status_check;
ALTER TABLE public.materials ADD CONSTRAINT materials_status_check
  CHECK (status IN (
    'planned',
    'to_order',
    'submitted',
    'declined',
    'approved',
    'billed',
    'paid',
    'paused',
    'new',
    'done'
  ));
