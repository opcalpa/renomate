-- Extend storage policies to handle material-photos paths
-- Path format: material-photos/{material_id}/filename

-- Update function to handle both projects/ and material-photos/ paths
CREATE OR REPLACE FUNCTION public.user_can_manage_project_files(file_path TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_entity_id UUID;
  v_path_parts TEXT[];
BEGIN
  v_path_parts := string_to_array(file_path, '/');

  -- Handle projects/{project_id}/... paths
  IF array_length(v_path_parts, 1) >= 3 AND v_path_parts[1] = 'projects' THEN
    BEGIN
      v_project_id := v_path_parts[2]::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN FALSE;
    END;

  -- Handle material-photos/{material_id}/... paths
  ELSIF array_length(v_path_parts, 1) >= 2 AND v_path_parts[1] = 'material-photos' THEN
    BEGIN
      v_entity_id := v_path_parts[2]::UUID;
      -- Look up project_id from materials table
      SELECT project_id INTO v_project_id FROM public.materials WHERE id = v_entity_id;
      IF v_project_id IS NULL THEN
        RETURN FALSE;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN FALSE;
    END;

  -- Handle task-photos/{task_id}/... paths
  ELSIF array_length(v_path_parts, 1) >= 2 AND v_path_parts[1] = 'task-photos' THEN
    BEGIN
      v_entity_id := v_path_parts[2]::UUID;
      SELECT project_id INTO v_project_id FROM public.tasks WHERE id = v_entity_id;
      IF v_project_id IS NULL THEN
        RETURN FALSE;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN FALSE;
    END;

  -- Handle room-photos/{room_id}/... paths
  ELSIF array_length(v_path_parts, 1) >= 2 AND v_path_parts[1] = 'room-photos' THEN
    BEGIN
      v_entity_id := v_path_parts[2]::UUID;
      SELECT project_id INTO v_project_id FROM public.rooms WHERE id = v_entity_id;
      IF v_project_id IS NULL THEN
        RETURN FALSE;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN FALSE;
    END;

  ELSE
    RETURN FALSE;
  END IF;

  -- Check if user is owner or has files_access = 'edit'
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = v_project_id AND owner_id = get_user_profile_id()
  ) OR EXISTS (
    SELECT 1 FROM public.project_shares
    WHERE project_id = v_project_id
    AND shared_with_user_id = get_user_profile_id()
    AND files_access = 'edit'
  );
END;
$$;

-- Update view function similarly
CREATE OR REPLACE FUNCTION public.user_can_view_project_files(file_path TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_entity_id UUID;
  v_path_parts TEXT[];
BEGIN
  v_path_parts := string_to_array(file_path, '/');

  -- Handle projects/{project_id}/... paths
  IF array_length(v_path_parts, 1) >= 3 AND v_path_parts[1] = 'projects' THEN
    BEGIN
      v_project_id := v_path_parts[2]::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN FALSE;
    END;

  -- Handle material-photos/{material_id}/... paths
  ELSIF array_length(v_path_parts, 1) >= 2 AND v_path_parts[1] = 'material-photos' THEN
    BEGIN
      v_entity_id := v_path_parts[2]::UUID;
      SELECT project_id INTO v_project_id FROM public.materials WHERE id = v_entity_id;
      IF v_project_id IS NULL THEN
        RETURN FALSE;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN FALSE;
    END;

  -- Handle task-photos/{task_id}/... paths
  ELSIF array_length(v_path_parts, 1) >= 2 AND v_path_parts[1] = 'task-photos' THEN
    BEGIN
      v_entity_id := v_path_parts[2]::UUID;
      SELECT project_id INTO v_project_id FROM public.tasks WHERE id = v_entity_id;
      IF v_project_id IS NULL THEN
        RETURN FALSE;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN FALSE;
    END;

  -- Handle room-photos/{room_id}/... paths
  ELSIF array_length(v_path_parts, 1) >= 2 AND v_path_parts[1] = 'room-photos' THEN
    BEGIN
      v_entity_id := v_path_parts[2]::UUID;
      SELECT project_id INTO v_project_id FROM public.rooms WHERE id = v_entity_id;
      IF v_project_id IS NULL THEN
        RETURN FALSE;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN FALSE;
    END;

  ELSE
    RETURN FALSE;
  END IF;

  -- Check if user is owner, has any files access, or it's a public demo project
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = v_project_id AND (
      owner_id = get_user_profile_id()
      OR project_type = 'public_demo'
    )
  ) OR EXISTS (
    SELECT 1 FROM public.project_shares
    WHERE project_id = v_project_id
    AND shared_with_user_id = get_user_profile_id()
    AND files_access IN ('view', 'edit')
  );
END;
$$;
