-- Migration: Add attachments column to customer_intake_requests
-- Description: Adds support for general file attachments (floor plans, certificates, etc.)
-- Created: 2026-02-12

-- =============================================================================
-- 1. ADD ATTACHMENTS COLUMN
-- =============================================================================

-- The 'images' column already exists for room photos
-- Add 'attachments' for general files (PDFs, documents, etc.)
ALTER TABLE customer_intake_requests
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN customer_intake_requests.attachments IS 'JSON array of general attachment URLs (floor plans, certificates, photos)';

-- Note: File uploads are handled via the 'intake-upload' edge function
-- which stores files in the 'project-files' bucket under the 'intake/{token}/' folder.
-- This approach allows anonymous uploads while maintaining security through token validation.
