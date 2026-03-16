-- Fix trigger functions that call get_user_profile_id() but have search_path = ''
-- With empty search_path, unqualified function calls fail with "does not exist"
-- Setting to 'public' allows them to find the helper functions

ALTER FUNCTION public.log_material_activity SET search_path = 'public';
ALTER FUNCTION public.log_task_activity SET search_path = 'public';
ALTER FUNCTION public.log_room_activity SET search_path = 'public';
ALTER FUNCTION public.log_floor_plan_activity SET search_path = 'public';
ALTER FUNCTION public.log_project_share_activity SET search_path = 'public';
ALTER FUNCTION public.log_quote_activity SET search_path = 'public';
ALTER FUNCTION public.handle_invoice_activity_log SET search_path = 'public';
ALTER FUNCTION public.resolve_project_id_from_entity SET search_path = 'public';
