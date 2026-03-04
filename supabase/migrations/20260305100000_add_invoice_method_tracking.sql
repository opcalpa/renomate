-- Track which method was used on each invoice
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoicing_method TEXT;
-- Values: 'percent_of_project', 'completed_work', NULL (legacy/manual)

-- Link invoice line items back to source tasks
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS source_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_items_source_task_id ON public.invoice_items(source_task_id);

-- Track invoicing per task (for completed work method)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS invoiced_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoiced_percent NUMERIC(5,2) DEFAULT 0;
