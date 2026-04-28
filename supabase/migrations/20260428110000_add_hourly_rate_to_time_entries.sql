-- Add hourly_rate to time_entries for cost tracking
-- Each entry captures the rate at time of logging (snapshot, not live reference)
-- REVERT: ALTER TABLE time_entries DROP COLUMN IF EXISTS hourly_rate;

ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2);
