-- Add supplier_id to materials (same supplier registry as tasks)
ALTER TABLE materials ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

-- Migrate existing vendor_name values to suppliers table where possible
-- (one-time data migration: creates suppliers from existing vendor_name values)
DO $$
DECLARE
  rec RECORD;
  sup_id UUID;
  prof_id UUID;
BEGIN
  FOR rec IN
    SELECT DISTINCT m.vendor_name, p.owner_id
    FROM materials m
    JOIN projects p ON p.id = m.project_id
    WHERE m.vendor_name IS NOT NULL AND m.vendor_name != '' AND m.supplier_id IS NULL
  LOOP
    -- Get profile id for the project owner
    SELECT id INTO prof_id FROM profiles WHERE user_id = rec.owner_id LIMIT 1;
    IF prof_id IS NULL THEN CONTINUE; END IF;

    -- Find or create supplier
    SELECT id INTO sup_id FROM suppliers WHERE profile_id = prof_id AND name = rec.vendor_name LIMIT 1;
    IF sup_id IS NULL THEN
      INSERT INTO suppliers (profile_id, name) VALUES (prof_id, rec.vendor_name) RETURNING id INTO sup_id;
    END IF;

    -- Link materials to the supplier
    UPDATE materials SET supplier_id = sup_id
    WHERE vendor_name = rec.vendor_name AND supplier_id IS NULL
      AND project_id IN (SELECT id FROM projects WHERE owner_id = rec.owner_id);
  END LOOP;
END $$;
