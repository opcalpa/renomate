-- Add organization number to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_number TEXT;

-- Add free text field to quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS free_text TEXT;
