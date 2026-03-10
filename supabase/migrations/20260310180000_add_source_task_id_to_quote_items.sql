-- Track which planning task a quote item originated from.
-- Used during quote acceptance to update existing tasks instead of creating duplicates.
ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS source_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

-- Also store the source type (hours/subcontractor/material/fixed) so acceptance
-- logic knows how to merge split rows back into the original task.
ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS source_type TEXT;

COMMENT ON COLUMN public.quote_items.source_task_id IS
  'Planning task this quote item was generated from. NULL = manually added.';
COMMENT ON COLUMN public.quote_items.source_type IS
  'How this item relates to the source task: hours, subcontractor, material, fixed.';
