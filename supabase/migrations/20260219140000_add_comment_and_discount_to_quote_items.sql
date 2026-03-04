-- Add comment and discount fields to quote_items
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0;

-- Recreate total_price generated column with discount formula
ALTER TABLE quote_items DROP COLUMN IF EXISTS total_price;
ALTER TABLE quote_items ADD COLUMN total_price NUMERIC(12,2)
  GENERATED ALWAYS AS (quantity * unit_price * (1 - COALESCE(discount_percent, 0) / 100.0)) STORED;
