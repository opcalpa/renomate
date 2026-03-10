-- Fix: Change entity_document_counts view from SECURITY DEFINER to SECURITY INVOKER
-- so that RLS policies are evaluated as the querying user, not the view creator.

DROP VIEW IF EXISTS public.entity_document_counts;

CREATE VIEW public.entity_document_counts
WITH (security_invoker = on)
AS
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
