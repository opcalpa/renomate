-- Add missing columns to project_shares that TeamManagement.tsx expects
-- These are used for displaying team member details

ALTER TABLE public.project_shares
ADD COLUMN IF NOT EXISTS role_type TEXT,
ADD COLUMN IF NOT EXISTS contractor_category TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.project_shares.role_type IS 'Type of team member: contractor, client, or other';
COMMENT ON COLUMN public.project_shares.contractor_category IS 'Contractor specialty if role_type is contractor';
COMMENT ON COLUMN public.project_shares.phone IS 'Contact phone number for team member';
COMMENT ON COLUMN public.project_shares.company IS 'Company name if applicable';
COMMENT ON COLUMN public.project_shares.notes IS 'Additional notes about the team member';
