-- Add labor cost % for profit tracking
-- profiles.default_labor_cost_percent: builder's default cost as % of hourly rate
-- tasks.labor_cost_percent: per-task override (null = use profile default)

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_labor_cost_percent DECIMAL(5,2) DEFAULT 50;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS labor_cost_percent DECIMAL(5,2);
