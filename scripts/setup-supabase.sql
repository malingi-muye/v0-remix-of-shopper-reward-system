-- Create database schema for shopper reward system

-- Create managers table for authentication
CREATE TABLE IF NOT EXISTS managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'manager',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create product_skus table (one product has many SKUs)
CREATE TABLE IF NOT EXISTS product_skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku_name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  reward_amount DECIMAL(10, 2) NOT NULL,
  reward_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, sku_name)
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  target_responses INTEGER,
  active BOOLEAN DEFAULT true,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create qr_codes table
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID NOT NULL REFERENCES product_skus(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  url TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE,
  reward_amount DECIMAL(10,2),
  expires_at TIMESTAMP,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP,
  used_by TEXT,
  location JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link table to attach products to campaigns (many-to-many)
CREATE TABLE IF NOT EXISTS campaign_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(campaign_id, product_id)
);

-- Create feedback_questions table
CREATE TABLE IF NOT EXISTS feedback_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  required BOOLEAN DEFAULT false,
  options JSONB,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  sku_id UUID NOT NULL REFERENCES product_skus(id),
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  rating INTEGER NOT NULL,
  comment TEXT,
  sentiment TEXT,
  custom_answers JSONB,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create rewards table
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES feedback(id),
  customer_phone TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  reward_name TEXT,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID NOT NULL REFERENCES rewards(id),
  phone_number TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending',
  transaction_id TEXT,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_attempt_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_feedback_campaign ON feedback(campaign_id);
CREATE INDEX idx_feedback_sku ON feedback(sku_id);
CREATE INDEX idx_rewards_feedback ON rewards(feedback_id);
CREATE INDEX idx_rewards_status ON rewards(status);
CREATE INDEX idx_payment_reward ON payment_transactions(reward_id);
CREATE INDEX idx_payment_status ON payment_transactions(status);

-- Insert default manager
INSERT INTO managers (email, name, role) VALUES ('manager@store.com', 'Store Manager', 'admin')
ON CONFLICT (email) DO NOTHING;
