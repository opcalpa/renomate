-- User preferred measurement system: metric (mm/cm/m/m²) or imperial (in/ft/sq ft)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS measurement_system TEXT DEFAULT 'metric'
  CHECK (measurement_system IN ('metric', 'imperial'));
