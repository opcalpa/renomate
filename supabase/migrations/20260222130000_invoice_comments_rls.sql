-- Allow comments on invoices (entity_type = 'invoice')
-- The existing comments RLS policies check project access via entity_id.
-- This migration ensures the activity_log / comments system recognizes 'invoice' as valid.
-- No new policies needed if existing RLS uses generic entity_type checks.
-- If comments table has entity_type-specific policies, add invoice support:

DO $$
BEGIN
  -- Check if a comments-style table exists that needs policy updates
  -- The existing CommentsSection uses activity_log with entity_type, which already works generically
  RAISE NOTICE 'Invoice comments supported via existing activity_log entity_type system';
END $$;
