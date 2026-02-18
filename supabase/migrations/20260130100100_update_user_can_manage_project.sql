-- Update user_can_manage_project to check granular permissions from project_shares
-- Drop the old function first to allow parameter rename (CASCADE removes dependent policies)
DROP FUNCTION IF EXISTS public.user_can_manage_project(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.user_can_manage_project(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_uuid AND owner_id = get_user_profile_id()
  ) OR EXISTS (
    SELECT 1 FROM public.project_shares
    WHERE project_id = project_uuid
    AND shared_with_user_id = get_user_profile_id()
    AND (
      tasks_access = 'edit' OR overview_access = 'edit'
      OR space_planner_access = 'edit' OR teams_access IN ('view','invite')
    )
  );
$$;

-- Recreate policies that were dropped by CASCADE
CREATE POLICY "Users can manage shapes in accessible projects"
ON public.floor_map_shapes
FOR ALL
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE owner_id = get_user_profile_id()
    OR user_can_manage_project(id)
  )
);

CREATE POLICY "Users can manage plans in accessible projects"
ON public.floor_map_plans
FOR ALL
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE owner_id = get_user_profile_id()
    OR user_can_manage_project(id)
  )
);
