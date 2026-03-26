-- ROT deduction system: yearly limits, project ROT persons, and payment tracking
-- Revert: DROP TABLE IF EXISTS project_rot_persons; DROP TABLE IF EXISTS rot_yearly_limits; ALTER TABLE materials DROP COLUMN IF EXISTS rot_amount, DROP COLUMN IF EXISTS paid_date;

-- 1. System table: ROT yearly limits per person
CREATE TABLE IF NOT EXISTS rot_yearly_limits (
  year integer PRIMARY KEY,
  max_amount_per_person numeric NOT NULL DEFAULT 50000,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed current and recent years
INSERT INTO rot_yearly_limits (year, max_amount_per_person) VALUES
  (2024, 50000),
  (2025, 50000),
  (2026, 50000)
ON CONFLICT (year) DO NOTHING;

-- RLS: anyone authenticated can read, only admins can write
ALTER TABLE rot_yearly_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ROT limits"
  ON rot_yearly_limits FOR SELECT
  TO authenticated
  USING (true);

-- 2. Project ROT persons (partners without accounts)
CREATE TABLE IF NOT EXISTS project_rot_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  personnummer text, -- stored for ROT identification, same pattern as profiles.personnummer
  custom_yearly_limit numeric, -- NULL = use system default from rot_yearly_limits
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL, -- linked if person has an account
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_rot_persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can read ROT persons"
  ON project_rot_persons FOR SELECT
  TO authenticated
  USING (user_has_project_access(project_id));

CREATE POLICY "Project members can manage ROT persons"
  ON project_rot_persons FOR ALL
  TO authenticated
  USING (user_has_project_access(project_id))
  WITH CHECK (user_has_project_access(project_id));

-- 3. Add ROT amount and paid_date to materials (purchases/invoices)
ALTER TABLE materials ADD COLUMN IF NOT EXISTS rot_amount numeric DEFAULT NULL;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS paid_date date DEFAULT NULL;

COMMENT ON COLUMN materials.rot_amount IS 'ROT deduction amount on this payment/invoice';
COMMENT ON COLUMN materials.paid_date IS 'Date payment was made — determines ROT year';

COMMENT ON TABLE rot_yearly_limits IS 'System table: max ROT deduction per person per year (Skatteverket rules)';
COMMENT ON TABLE project_rot_persons IS 'ROT-eligible persons on a project: account holders (via profile_id) or partners (name + personnummer)';
