-- Add markup_percent to materials table for per-item markup during planning.
-- This replaces the per-row markup_percent that was stored inside tasks.material_items JSONB.
ALTER TABLE materials ADD COLUMN IF NOT EXISTS markup_percent DECIMAL(5, 2) DEFAULT NULL;

COMMENT ON COLUMN materials.markup_percent IS 'Per-item markup percentage (null = use task-level material_markup_percent)';
