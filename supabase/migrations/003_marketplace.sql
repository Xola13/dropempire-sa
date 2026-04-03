-- Migration 003: Marketplace listings + wholesale opportunities + customer auth

-- ============================================================
-- MARKETPLACE LISTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  marketplace TEXT NOT NULL CHECK (marketplace IN ('takealot', 'makro', 'store')),
  marketplace_sku TEXT,
  marketplace_listing_id TEXT,
  marketplace_url TEXT,
  selling_price NUMERIC(10,2),
  stock_quantity INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'rejected')),
  marketplace_fee_percent NUMERIC(5,2) DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_product_id ON marketplace_listings(product_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_marketplace ON marketplace_listings(marketplace);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);

CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- WHOLESALE OPPORTUNITIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS wholesale_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  supplier_url TEXT,
  cost_usd NUMERIC(10,2),
  cost_zar NUMERIC(10,2),
  min_order INTEGER DEFAULT 1,
  suggested_price NUMERIC(10,2),
  estimated_margin NUMERIC(5,2),
  sold_count INTEGER DEFAULT 0,
  category TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'imported', 'listed', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wholesale_opportunities_source ON wholesale_opportunities(source);
CREATE INDEX IF NOT EXISTS idx_wholesale_opportunities_status ON wholesale_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_wholesale_opportunities_estimated_margin ON wholesale_opportunities(estimated_margin DESC);

-- ============================================================
-- MARKETPLACE ORDERS SOURCE COLUMN
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'store' CHECK (order_source IN ('store', 'takealot', 'makro'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS marketplace_order_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_order_source ON orders(order_source);

-- ============================================================
-- CUSTOMER AUTH LINK
-- ============================================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS delivery_address JSONB;

CREATE INDEX IF NOT EXISTS idx_customers_auth_user_id ON customers(auth_user_id);

-- ============================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_opportunities ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS. Admin access is via service role key.
-- For marketplace_listings we allow authenticated reads (own data via service role)
CREATE POLICY "Service role manages marketplace listings" ON marketplace_listings
  USING (true);

CREATE POLICY "Service role manages wholesale opportunities" ON wholesale_opportunities
  USING (true);

-- Customers can view their own orders (auth-linked)
CREATE POLICY "Auth customers can view own orders" ON orders
  FOR SELECT USING (
    customer_email = (
      SELECT email FROM customers WHERE auth_user_id = auth.uid() LIMIT 1
    )
  );

-- Customers can update their own record
CREATE POLICY "Customers can update own record" ON customers
  FOR UPDATE USING (auth_user_id = auth.uid());

COMMENT ON TABLE marketplace_listings IS 'Products listed on Takealot/Makro seller portals';
COMMENT ON TABLE wholesale_opportunities IS 'Wholesale products found via DHgate/Alibaba scraper, pending review';
