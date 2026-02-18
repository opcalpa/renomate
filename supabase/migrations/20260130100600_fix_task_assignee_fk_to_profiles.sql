-- Change assigned_to_stakeholder_id FK from stakeholders(id) to profiles(id)
-- so that project team members (profiles) can be assigned directly.

-- First, ensure the column exists (it may have been added via dashboard or not at all)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS assigned_to_stakeholder_id UUID;

-- Drop the old FK if it exists
ALTER TABLE public.tasks
DROP CONSTRAINT IF EXISTS tasks_assigned_to_stakeholder_id_fkey;

-- Null out any values that don't exist in profiles
UPDATE public.tasks
SET assigned_to_stakeholder_id = NULL
WHERE assigned_to_stakeholder_id IS NOT NULL
  AND assigned_to_stakeholder_id NOT IN (SELECT id FROM public.profiles);

-- Add new FK referencing profiles
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_assigned_to_stakeholder_id_fkey
FOREIGN KEY (assigned_to_stakeholder_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;
