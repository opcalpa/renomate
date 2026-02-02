-- Update user_can_manage_project to check granular permissions from project_shares
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
