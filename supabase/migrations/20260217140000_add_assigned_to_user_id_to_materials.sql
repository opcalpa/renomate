-- Add missing columns to materials table used by PurchaseRequestsTab

-- assigned_to_user_id: Team member responsible for this material/purchase order
ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- description: Additional details about the material
ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.materials.assigned_to_user_id IS 'Team member responsible for this material/purchase order';
COMMENT ON COLUMN public.materials.description IS 'Additional details about the material';
