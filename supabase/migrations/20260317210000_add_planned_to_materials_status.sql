-- Add "planned" as a valid material status.
-- Materials in planning phase are created with status "planned" so they:
--   1. Appear in TaskEditDialog (which filters by status = 'planned')
--   2. Are excluded from actual spend tracking (spend = non-planned materials)

ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_status_check;

ALTER TABLE public.materials
  ADD CONSTRAINT materials_status_check
  CHECK (status IN ('planned', 'submitted', 'declined', 'approved', 'billed', 'paid', 'paused', 'new', 'done'));
