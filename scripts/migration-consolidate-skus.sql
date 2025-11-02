-- Migration: Consolidate product SKUs into single table
-- Keep product_skus (already in use), remove products_skus if it exists

BEGIN;

-- Drop the duplicate products_skus table if it exists
DROP TABLE IF EXISTS products_skus CASCADE;

-- Ensure product_skus table has all required columns and indexes
CREATE TABLE IF NOT EXISTS product_skus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  weight varchar(50) NOT NULL,
  price numeric(10, 2) NOT NULL,
  reward_amount numeric(10, 2) NOT NULL,
  reward_description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(product_id, weight)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_skus_product_id ON product_skus(product_id);
CREATE INDEX IF NOT EXISTS idx_product_skus_is_active ON product_skus(is_active);

-- Enable RLS
ALTER TABLE product_skus ENABLE ROW LEVEL SECURITY;

-- Create policies for read access
CREATE POLICY "product_skus_select" ON product_skus FOR SELECT
  USING (true);

COMMIT;
