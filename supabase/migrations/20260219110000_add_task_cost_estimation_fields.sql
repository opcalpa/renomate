-- Add cost estimation fields for the planning/quoting workflow.
-- These allow contractors to price tasks as own labor or subcontractor work.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_cost_type TEXT DEFAULT 'own_labor';
  -- 'own_labor' | 'subcontractor'

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(8,2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subcontractor_cost DECIMAL(12,2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS markup_percent DECIMAL(5,2) DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS material_estimate DECIMAL(12,2);

COMMENT ON COLUMN tasks.task_cost_type IS 'own_labor = hours×rate, subcontractor = UE cost + markup';
COMMENT ON COLUMN tasks.estimated_hours IS 'Estimated work hours (own labor)';
COMMENT ON COLUMN tasks.hourly_rate IS 'Hourly rate in project currency (own labor)';
COMMENT ON COLUMN tasks.subcontractor_cost IS 'Subcontractor quote/price (subcontractor type)';
COMMENT ON COLUMN tasks.markup_percent IS 'Markup percentage on subcontractor cost';
COMMENT ON COLUMN tasks.material_estimate IS 'Estimated material cost for this task';
