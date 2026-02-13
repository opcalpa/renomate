-- Add personal greeting field to customer intake requests
-- This allows builders to add a personal message when sending intake forms to customers

ALTER TABLE customer_intake_requests
ADD COLUMN IF NOT EXISTS greeting TEXT;

COMMENT ON COLUMN customer_intake_requests.greeting IS 'Optional personal greeting/message from the builder to the customer';
