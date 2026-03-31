-- Add country field to projects (ISO 3166-1 alpha-2 code)
-- Used to determine which local tax deduction rules apply (e.g. ROT for SE)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'SE';

-- Set existing projects to SE (all current users are Swedish market)
-- New projects will derive country from address or user locale
COMMENT ON COLUMN projects.country IS 'ISO 3166-1 alpha-2 country code. Determines applicable tax rules (e.g. ROT for SE).';
