-- Add checklists JSONB column to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS checklists JSONB DEFAULT '[]';
