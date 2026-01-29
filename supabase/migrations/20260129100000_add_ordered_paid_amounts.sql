-- Add ordered_amount to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ordered_amount numeric DEFAULT 0;

-- Add ordered_amount and paid_amount to materials table
ALTER TABLE materials ADD COLUMN IF NOT EXISTS ordered_amount numeric DEFAULT 0;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0;
