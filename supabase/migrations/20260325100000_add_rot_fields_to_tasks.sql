-- Add ROT deduction fields to tasks table
-- Used to store ROT eligibility and amounts extracted from quotes
-- Revert: ALTER TABLE tasks DROP COLUMN IF EXISTS rot_eligible, DROP COLUMN IF EXISTS rot_amount;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rot_eligible boolean DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rot_amount numeric DEFAULT NULL;

COMMENT ON COLUMN tasks.rot_eligible IS 'Whether this task qualifies for ROT tax deduction (labor only)';
COMMENT ON COLUMN tasks.rot_amount IS 'ROT deduction amount in SEK for this task';
