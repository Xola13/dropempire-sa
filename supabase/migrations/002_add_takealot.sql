-- Migration 002: Add takealot supplier support + missing columns
-- Run this in Supabase SQL Editor if you already ran 001_schema.sql

-- 1. Add ai_description column if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS ai_description TEXT;

-- 2. Add supplier_product_url column if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_product_url TEXT;

-- 3. Drop the old supplier CHECK constraint and add takealot
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_supplier_check;
ALTER TABLE products ADD CONSTRAINT products_supplier_check
  CHECK (supplier IN ('aliexpress', 'cj', 'makro', 'takealot'));

-- 4. Drop old fulfillment_status constraint and add 'cancelled'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_fulfillment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_status_check
  CHECK (fulfillment_status IN ('unfulfilled', 'fulfilling', 'fulfilled', 'cancelled'));
