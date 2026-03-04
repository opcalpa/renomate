-- Add customer_view_access column to project_shares
ALTER TABLE public.project_shares
  ADD COLUMN IF NOT EXISTS customer_view_access TEXT DEFAULT 'none';

-- Set customer_view_access = 'view' for existing client shares
UPDATE public.project_shares
  SET customer_view_access = 'view'
  WHERE role = 'client';
