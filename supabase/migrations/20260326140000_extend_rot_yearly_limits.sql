-- Extend rot_yearly_limits with subsidy percentage, combined ROT+RUT cap,
-- and support for split periods (e.g. 2025: 30% jan-may, 50% jun-dec).
-- Revert: ALTER TABLE rot_yearly_limits DROP COLUMN IF EXISTS subsidy_percent, DROP COLUMN IF EXISTS combined_rot_rut_limit, DROP COLUMN IF EXISTS valid_from, DROP COLUMN IF EXISTS valid_until, DROP COLUMN IF EXISTS source_url, DROP COLUMN IF EXISTS notes;
--         DELETE FROM rot_yearly_limits WHERE year = 2025 AND subsidy_percent = 50;

-- Drop PK constraint temporarily to allow multiple rows per year (split periods)
ALTER TABLE rot_yearly_limits DROP CONSTRAINT IF EXISTS rot_yearly_limits_pkey;

-- Add new columns
ALTER TABLE rot_yearly_limits ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE rot_yearly_limits ADD COLUMN IF NOT EXISTS subsidy_percent numeric NOT NULL DEFAULT 30;
ALTER TABLE rot_yearly_limits ADD COLUMN IF NOT EXISTS combined_rot_rut_limit numeric NOT NULL DEFAULT 75000;
ALTER TABLE rot_yearly_limits ADD COLUMN IF NOT EXISTS valid_from date DEFAULT NULL;
ALTER TABLE rot_yearly_limits ADD COLUMN IF NOT EXISTS valid_until date DEFAULT NULL;
ALTER TABLE rot_yearly_limits ADD COLUMN IF NOT EXISTS source_url text DEFAULT NULL;
ALTER TABLE rot_yearly_limits ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL;

-- New PK on id
ALTER TABLE rot_yearly_limits ADD PRIMARY KEY (id);

-- Update existing rows with correct subsidy percent
UPDATE rot_yearly_limits SET subsidy_percent = 30, combined_rot_rut_limit = 75000,
  valid_from = make_date(year, 1, 1), valid_until = make_date(year, 12, 31),
  source_url = 'https://skatteverket.se/rotochrut',
  notes = 'Standard ROT 30%'
WHERE subsidy_percent = 30;

-- 2025 split: the standard 30% row covers jan 1 - may 11
UPDATE rot_yearly_limits SET
  valid_from = '2025-01-01', valid_until = '2025-05-11',
  notes = 'Standard ROT 30% (före tillfällig höjning)'
WHERE year = 2025 AND subsidy_percent = 30;

-- 2025 split: add 50% row for may 12 - dec 31
INSERT INTO rot_yearly_limits (year, max_amount_per_person, subsidy_percent, combined_rot_rut_limit, valid_from, valid_until, source_url, notes)
VALUES (2025, 50000, 50, 75000, '2025-05-12', '2025-12-31',
  'https://skatteverket.se/omoss/pressochmedia/nyheter/2025/nyheter/rotavdragethojstill50procent.5.6e1dd38d196873bc1e11af.html',
  'Tillfällig höjning till 50% (12 maj – 31 dec 2025)')
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN rot_yearly_limits.subsidy_percent IS 'Percentage of labor cost that qualifies for ROT deduction (e.g. 30 or 50)';
COMMENT ON COLUMN rot_yearly_limits.combined_rot_rut_limit IS 'Combined yearly ROT+RUT cap per person (75000 as of 2024-2026)';
COMMENT ON COLUMN rot_yearly_limits.valid_from IS 'Start date for this rate period (supports split years)';
COMMENT ON COLUMN rot_yearly_limits.valid_until IS 'End date for this rate period';
COMMENT ON COLUMN rot_yearly_limits.source_url IS 'Skatteverket source URL for transparency';
COMMENT ON COLUMN rot_yearly_limits.notes IS 'Human-readable description of this rate period';
