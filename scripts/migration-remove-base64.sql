-- Migration: Remove base64 code column from qr_codes table
-- This migration removes the 'code' column that stored base64 QR images
-- QR images will now be generated on-demand using the URL

BEGIN;

-- Check if column exists before dropping (PostgreSQL safe approach)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'qr_codes' AND column_name = 'code'
  ) THEN
    ALTER TABLE qr_codes DROP COLUMN code;
  END IF;
END $$;

-- Verify table structure
-- Table should now have: id, url, token_hash, is_used, used_at, location, sku_id, campaign_id, batch_number, created_at, updated_at

COMMIT;
