-- Add material markup percent column to tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS material_markup_percent DECIMAL(5,2) DEFAULT 0;
