-- Fix all public functions to set search_path = '' for security
-- This prevents search_path manipulation attacks

ALTER FUNCTION public.get_intake_request_by_token SET search_path = '';
ALTER FUNCTION public.handle_invoice_activity_log SET search_path = '';
ALTER FUNCTION public.handle_invoices_updated_at SET search_path = '';
ALTER FUNCTION public.handle_new_quote_clears_rejected SET search_path = '';
ALTER FUNCTION public.handle_quote_status_project_sync SET search_path = '';
ALTER FUNCTION public.is_public_demo_project SET search_path = '';
ALTER FUNCTION public.is_system_admin SET search_path = '';
ALTER FUNCTION public.log_floor_plan_activity SET search_path = '';
ALTER FUNCTION public.log_material_activity SET search_path = '';
ALTER FUNCTION public.log_project_share_activity SET search_path = '';
ALTER FUNCTION public.log_quote_activity SET search_path = '';
ALTER FUNCTION public.log_room_activity SET search_path = '';
ALTER FUNCTION public.log_task_activity SET search_path = '';
ALTER FUNCTION public.resolve_project_id_from_entity SET search_path = '';
ALTER FUNCTION public.seed_demo_project_for_user SET search_path = '';
ALTER FUNCTION public.set_invoice_number SET search_path = '';
ALTER FUNCTION public.set_quote_number SET search_path = '';
ALTER FUNCTION public.sync_invitation_email SET search_path = '';
ALTER FUNCTION public.sync_invitation_token SET search_path = '';
ALTER FUNCTION public.update_clients_updated_at SET search_path = '';
ALTER FUNCTION public.update_quotes_updated_at SET search_path = '';
ALTER FUNCTION public.update_updated_at_column SET search_path = '';
