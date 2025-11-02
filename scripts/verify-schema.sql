-- Drop all related tables in correct order
DROP TABLE IF EXISTS qr_codes;
DROP TABLE IF EXISTS campaign_products CASCADE;
DROP TABLE IF EXISTS products_skus CASCADE;
DROP TABLE IF EXISTS product_skus CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Create Products Table
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Product SKUs Table
CREATE TABLE product_skus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  weight VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  reward_amount DECIMAL(10,2) NOT NULL,
  reward_description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create QR Codes Table
CREATE TABLE qr_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku_id UUID NOT NULL REFERENCES product_skus(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  url TEXT NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by VARCHAR(255),
  location JSONB,
  batch_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_qr_codes_sku_id ON qr_codes(sku_id);
CREATE INDEX idx_qr_codes_is_used ON qr_codes(is_used);
CREATE INDEX idx_product_skus_product_id ON product_skus(product_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_product_skus_updated_at ON product_skus;

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_skus_updated_at
    BEFORE UPDATE ON product_skus
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();