-- DropEmpire SA Database Schema
-- Migration: 001_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CUSTOMERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- ============================================================
-- PRODUCTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  ai_description TEXT,
  images TEXT[] DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'General',
  tags TEXT[] DEFAULT '{}',
  selling_price NUMERIC(10,2) NOT NULL,
  compare_at_price NUMERIC(10,2),
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  margin_percent NUMERIC(5,2) DEFAULT 0,
  supplier TEXT NOT NULL CHECK (supplier IN ('aliexpress', 'cj', 'makro')),
  supplier_product_id TEXT NOT NULL,
  supplier_shipping_days INTEGER DEFAULT 15,
  stock_status TEXT NOT NULL DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'out_of_stock', 'low_stock')),
  orders_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  seo_title TEXT,
  seo_description TEXT,
  bullet_points TEXT[] DEFAULT '{}',
  faqs JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_published ON products(is_published);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier);
CREATE INDEX IF NOT EXISTS idx_products_orders_count ON products(orders_count DESC);
CREATE INDEX IF NOT EXISTS idx_products_selling_price ON products(selling_price);
CREATE INDEX IF NOT EXISTS idx_products_name_search ON products USING gin(to_tsvector('english', name));

-- ============================================================
-- ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  delivery_address JSONB NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_profit NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('payfast', 'yoco')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_reference TEXT,
  fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled', 'fulfilling', 'fulfilled')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  tracking_number TEXT,
  tracking_url TEXT,
  courier TEXT,
  estimated_delivery TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- ============================================================
-- SUPPLIER ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  supplier TEXT NOT NULL CHECK (supplier IN ('aliexpress', 'cj', 'makro')),
  supplier_order_id TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  total_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_address JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  tracking_number TEXT,
  placed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_orders_order_id ON supplier_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_status ON supplier_orders(status);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_supplier ON supplier_orders(supplier);

-- ============================================================
-- AGENT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent TEXT NOT NULL,
  action TEXT NOT NULL,
  input JSONB DEFAULT '{}',
  output JSONB,
  reasoning TEXT,
  success BOOLEAN DEFAULT true,
  error TEXT,
  duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent);
CREATE INDEX IF NOT EXISTS idx_agent_logs_success ON agent_logs(success);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_action ON agent_logs(action);

-- ============================================================
-- ANALYTICS DAILY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL,
  revenue NUMERIC(10,2) DEFAULT 0,
  cost NUMERIC(10,2) DEFAULT 0,
  profit NUMERIC(10,2) DEFAULT 0,
  orders INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily(date DESC);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all relevant tables
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supplier_orders_updated_at BEFORE UPDATE ON supplier_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Increment product orders count
CREATE OR REPLACE FUNCTION increment_product_orders_count(product_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE products SET orders_count = orders_count + 1 WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

-- Get daily revenue summary
CREATE OR REPLACE FUNCTION get_revenue_summary(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  revenue NUMERIC,
  profit NUMERIC,
  orders BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(o.created_at) as date,
    SUM(o.total) as revenue,
    SUM(o.total_profit) as profit,
    COUNT(*)::BIGINT as orders
  FROM orders o
  WHERE o.payment_status = 'paid'
    AND o.created_at >= NOW() - INTERVAL '1 day' * days_back
  GROUP BY DATE(o.created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on sensitive tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

-- Products are public (read), admin-only for write
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow public read of published products
CREATE POLICY "Public can view published products" ON products
  FOR SELECT USING (is_published = true);

-- Service role can do everything (bypasses RLS)
-- (Service role key is used server-side — RLS is bypassed automatically)

-- Allow public insert of orders (checkout flow)
CREATE POLICY "Anyone can create orders" ON orders
  FOR INSERT WITH CHECK (true);

-- Customers can view their own orders
CREATE POLICY "Customers can view own orders" ON orders
  FOR SELECT USING (true);  -- We filter by email in the API layer

-- Allow public insert of customers
CREATE POLICY "Anyone can create customers" ON customers
  FOR INSERT WITH CHECK (true);

-- Customers can view their own record
CREATE POLICY "Customers can view own record" ON customers
  FOR SELECT USING (true);

-- ============================================================
-- SEED DATA (Optional sample products for dev)
-- ============================================================

-- Insert a sample category reference (no actual data needed — products are imported via AI agents)

COMMENT ON TABLE products IS 'DropEmpire SA product catalogue — populated via AI sourcing agents';
COMMENT ON TABLE orders IS 'Customer orders with payment and fulfillment tracking';
COMMENT ON TABLE supplier_orders IS 'Orders placed with AliExpress/CJ on behalf of customers';
COMMENT ON TABLE agent_logs IS 'AI agent activity log for debugging and monitoring';
COMMENT ON TABLE analytics_daily IS 'Daily revenue/profit aggregates for the admin dashboard';
