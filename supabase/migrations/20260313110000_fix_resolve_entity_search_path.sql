-- Fix resolve_project_id_from_entity: search_path was set to '' but function
-- references rooms/tasks without schema prefix, causing "relation does not exist".
-- This broke photos/notes SELECT policies for all users.
-- Revert: re-run the original CREATE OR REPLACE without the schema-qualified names.

CREATE OR REPLACE FUNCTION public.resolve_project_id_from_entity(
  p_linked_to_type TEXT,
  p_linked_to_id UUID
) RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE p_linked_to_type
    WHEN 'project' THEN p_linked_to_id
    WHEN 'room'    THEN (SELECT project_id FROM public.rooms WHERE id = p_linked_to_id)
    WHEN 'task'    THEN (SELECT project_id FROM public.tasks WHERE id = p_linked_to_id)
    WHEN 'material' THEN (SELECT project_id FROM public.materials WHERE id = p_linked_to_id)
  END;
$$;
