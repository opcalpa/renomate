ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_created_task_room BOOLEAN DEFAULT FALSE;
