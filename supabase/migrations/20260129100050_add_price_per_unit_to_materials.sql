-- Add price_per_unit column to materials
-- This column stores the price per unit of the material
-- The existing 'cost' column will remain as total cost

ALTER TABLE materials ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(12, 2);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_materials_project_id ON materials(project_id);
CREATE INDEX IF NOT EXISTS idx_materials_room_id ON materials(room_id);
