-- Add currency column to projects table
-- Default to SEK (Swedish Krona) as primary currency

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SEK';

COMMENT ON COLUMN projects.currency IS 'Project currency code (e.g., SEK, EUR, USD)';
