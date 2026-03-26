-- Per-person ROT allocation on materials/invoices.
-- A single invoice can split ROT across multiple personnummer.
-- Revert: DROP TABLE IF EXISTS material_rot_allocations;

CREATE TABLE IF NOT EXISTS material_rot_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  rot_person_id uuid NOT NULL REFERENCES project_rot_persons(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rot_alloc_material ON material_rot_allocations(material_id);
CREATE INDEX IF NOT EXISTS idx_rot_alloc_person ON material_rot_allocations(rot_person_id);

-- RLS
ALTER TABLE material_rot_allocations ENABLE ROW LEVEL SECURITY;

-- Read: anyone who can access the material's project
CREATE POLICY "Project members can read ROT allocations"
  ON material_rot_allocations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = material_id
      AND (user_has_project_access(m.project_id) OR user_owns_project(m.project_id))
    )
  );

-- Write: project owner or co-owner
CREATE POLICY "Project owners can manage ROT allocations"
  ON material_rot_allocations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = material_id
      AND (user_has_project_access(m.project_id) OR user_owns_project(m.project_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = material_id
      AND (user_has_project_access(m.project_id) OR user_owns_project(m.project_id))
    )
  );

COMMENT ON TABLE material_rot_allocations IS 'Per-person ROT allocation on invoices/payments. One material can split ROT across multiple persons.';
COMMENT ON COLUMN material_rot_allocations.amount IS 'ROT deduction amount allocated to this person for this payment';
