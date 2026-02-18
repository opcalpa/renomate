-- Extend task_file_links to support linking files to materials
-- Also add invoice-specific fields to tasks table

-- 1. Add material_id column to task_file_links
ALTER TABLE public.task_file_links
ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE;

-- 2. Drop the old constraint that required task_id OR room_id
ALTER TABLE public.task_file_links
DROP CONSTRAINT IF EXISTS chk_task_or_room;

-- 3. Add new constraint that allows task_id, room_id, OR material_id
ALTER TABLE public.task_file_links
ADD CONSTRAINT chk_entity_link
CHECK (task_id IS NOT NULL OR room_id IS NOT NULL OR material_id IS NOT NULL);

-- 4. Create index for material_id lookups
CREATE INDEX IF NOT EXISTS idx_task_file_links_material_id
  ON public.task_file_links (material_id)
  WHERE material_id IS NOT NULL;

-- 5. Add invoice-specific fields to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS ocr_number TEXT,
ADD COLUMN IF NOT EXISTS invoice_due_date DATE;

-- 6. Create a view for easy document count lookups per entity
CREATE OR REPLACE VIEW public.entity_document_counts AS
SELECT
  'task' as entity_type,
  task_id as entity_id,
  COUNT(*) as document_count
FROM public.task_file_links
WHERE task_id IS NOT NULL
GROUP BY task_id
UNION ALL
SELECT
  'material' as entity_type,
  material_id as entity_id,
  COUNT(*) as document_count
FROM public.task_file_links
WHERE material_id IS NOT NULL
GROUP BY material_id
UNION ALL
SELECT
  'room' as entity_type,
  room_id as entity_id,
  COUNT(*) as document_count
FROM public.task_file_links
WHERE room_id IS NOT NULL
GROUP BY room_id;

-- Comment for documentation
COMMENT ON TABLE public.task_file_links IS 'Links project files to tasks, rooms, and/or materials. At least one entity reference is required.';
COMMENT ON COLUMN public.tasks.invoice_number IS 'Invoice number for task-related invoices';
COMMENT ON COLUMN public.tasks.ocr_number IS 'OCR/payment reference number for invoices';
COMMENT ON COLUMN public.tasks.invoice_due_date IS 'Due date for task-related invoices';
