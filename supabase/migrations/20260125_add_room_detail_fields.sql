-- Migration: Add room detail fields for extended room specifications
-- This migration adds new columns and JSONB fields for comprehensive room data

DO $$
BEGIN
    -- Sökbara fält (searchable fields)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'status') THEN
        ALTER TABLE rooms ADD COLUMN status TEXT DEFAULT 'befintligt';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'ceiling_height_mm') THEN
        ALTER TABLE rooms ADD COLUMN ceiling_height_mm INTEGER DEFAULT 2400;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'priority') THEN
        ALTER TABLE rooms ADD COLUMN priority TEXT DEFAULT 'medium';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'links') THEN
        ALTER TABLE rooms ADD COLUMN links TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'notes') THEN
        ALTER TABLE rooms ADD COLUMN notes TEXT;
    END IF;

    -- Färgfält (color fields)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'color') THEN
        ALTER TABLE rooms ADD COLUMN color TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'material') THEN
        ALTER TABLE rooms ADD COLUMN material TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'wall_color') THEN
        ALTER TABLE rooms ADD COLUMN wall_color TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'ceiling_color') THEN
        ALTER TABLE rooms ADD COLUMN ceiling_color TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'trim_color') THEN
        ALTER TABLE rooms ADD COLUMN trim_color TEXT;
    END IF;

    -- JSONB för sektionsdata (section data as JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'floor_spec') THEN
        ALTER TABLE rooms ADD COLUMN floor_spec JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'ceiling_spec') THEN
        ALTER TABLE rooms ADD COLUMN ceiling_spec JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'wall_spec') THEN
        ALTER TABLE rooms ADD COLUMN wall_spec JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'joinery_spec') THEN
        ALTER TABLE rooms ADD COLUMN joinery_spec JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'electrical_spec') THEN
        ALTER TABLE rooms ADD COLUMN electrical_spec JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'heating_spec') THEN
        ALTER TABLE rooms ADD COLUMN heating_spec JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add comments for documentation (run after columns exist)
COMMENT ON COLUMN rooms.status IS 'Room status: befintligt, ska renoveras, nyproduktion';
COMMENT ON COLUMN rooms.ceiling_height_mm IS 'Ceiling height in millimeters';
COMMENT ON COLUMN rooms.priority IS 'Priority level: low, medium, high';
COMMENT ON COLUMN rooms.links IS 'External links related to the room';
COMMENT ON COLUMN rooms.notes IS 'Free-text notes about the room';
COMMENT ON COLUMN rooms.floor_spec IS 'Floor specifications (material, treatment, etc.) as JSONB';
COMMENT ON COLUMN rooms.ceiling_spec IS 'Ceiling specifications (material, color, molding) as JSONB';
COMMENT ON COLUMN rooms.wall_spec IS 'Wall specifications (treatment, colors) as JSONB';
COMMENT ON COLUMN rooms.joinery_spec IS 'Joinery specifications (doors, trim) as JSONB';
COMMENT ON COLUMN rooms.electrical_spec IS 'Electrical specifications (outlets, lighting) as JSONB';
COMMENT ON COLUMN rooms.heating_spec IS 'Heating specifications (type, details) as JSONB';
