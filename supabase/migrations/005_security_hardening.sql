-- Migration 005: security hardening + production constraints/indexes
--
-- WHY THIS EXISTS
-- The app talks to Postgres exclusively through the service-role key on the server
-- (which bypasses RLS). The browser only ever uses the anon key for Supabase *Auth*.
-- Yet earlier migrations created policies like `FOR SELECT USING (true)` on orders and
-- customers, and `USING (true)` (all commands!) on marketplace_listings and
-- wholesale_opportunities. Because the anon key is public (it ships to every browser),
-- anyone could read every order/customer or modify marketplace data straight through
-- Supabase's REST API. This migration closes that.
--
-- Safe to re-run.

-- ============================================================
-- 1. Drop over-permissive policies
-- ============================================================
DROP POLICY IF EXISTS "Anyone can create orders"                       ON orders;
DROP POLICY IF EXISTS "Customers can view own orders"                  ON orders;
DROP POLICY IF EXISTS "Auth customers can view own orders"             ON orders;
DROP POLICY IF EXISTS "Anyone can create customers"                    ON customers;
DROP POLICY IF EXISTS "Customers can view own record"                  ON customers;
DROP POLICY IF EXISTS "Customers can update own record"                ON customers;
DROP POLICY IF EXISTS "Service role manages marketplace listings"      ON marketplace_listings;
DROP POLICY IF EXISTS "Service role manages wholesale opportunities"   ON wholesale_opportunities;

-- ============================================================
-- 2. RLS on every table (no policy + RLS enabled = deny for anon/authenticated)
-- ============================================================
ALTER TABLE customers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily         ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_opportunities ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Privileges (defence in depth: even if a permissive policy is added later,
--    these roles have no table access)
-- ============================================================
REVOKE ALL ON customers, orders, supplier_orders, agent_logs, analytics_daily,
              marketplace_listings, wholesale_opportunities
  FROM anon, authenticated;

-- Products: shoppers may read published rows, but never cost/margin/supplier internals.
-- Keep this column list in sync with lib/products/public.ts.
REVOKE ALL ON products FROM anon, authenticated;
GRANT SELECT (
  id, slug, name, description, ai_description, images, category, tags,
  selling_price, compare_at_price, supplier, supplier_shipping_days,
  stock_status, orders_count, is_published, seo_title, seo_description,
  bullet_points, faqs, created_at, updated_at
) ON products TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view published products" ON products;
CREATE POLICY "Public can view published products" ON products
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

-- Tables created in the future should not be exposed by default either.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

-- ============================================================
-- 4. Functions: not callable through the public API, fixed search_path
-- ============================================================
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION increment_product_orders_count(UUID) FROM PUBLIC, anon, authenticated;
  ALTER FUNCTION increment_product_orders_count(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION get_revenue_summary(INTEGER) FROM PUBLIC, anon, authenticated;
  ALTER FUNCTION get_revenue_summary(INTEGER) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION update_updated_at_column() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- ============================================================
-- 5. Fix schema/code mismatches that made order fulfilment fail
-- ============================================================
-- Yoco charges are claimed via payment_status = 'processing' to prevent double charging.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded'));

-- The fulfilment agent writes supplier = 'takealot' | 'game' | ..., status = 'needs_manual_order'
-- and a `notes` column; the original constraints rejected all of these, so those inserts failed.
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE supplier_orders DROP CONSTRAINT IF EXISTS supplier_orders_supplier_check;
ALTER TABLE supplier_orders ADD CONSTRAINT supplier_orders_supplier_check
  CHECK (supplier IN ('aliexpress','cj','makro','takealot','game','bidorbuy','hivve','gumtree','manual'));

ALTER TABLE supplier_orders DROP CONSTRAINT IF EXISTS supplier_orders_status_check;
ALTER TABLE supplier_orders ADD CONSTRAINT supplier_orders_status_check
  CHECK (status IN ('placed','confirmed','shipped','delivered','cancelled','needs_manual_order'));

-- ============================================================
-- 6. Data integrity (NOT VALID = enforced for new/updated rows without
--    failing the migration on any legacy rows)
-- ============================================================
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_amounts_nonnegative;
ALTER TABLE orders ADD CONSTRAINT orders_amounts_nonnegative
  CHECK (subtotal >= 0 AND shipping_cost >= 0 AND total >= 0) NOT VALID;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_prices_sane;
ALTER TABLE products ADD CONSTRAINT products_prices_sane
  CHECK (selling_price > 0 AND cost_price >= 0) NOT VALID;

-- Normalise emails (only where it cannot collide with an existing lower-case row).
UPDATE orders SET customer_email = lower(customer_email) WHERE customer_email <> lower(customer_email);
UPDATE customers c SET email = lower(email)
  WHERE email <> lower(email)
    AND NOT EXISTS (SELECT 1 FROM customers d WHERE d.email = lower(c.email));

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_email_lowercase;
ALTER TABLE customers ADD CONSTRAINT customers_email_lowercase CHECK (email = lower(email)) NOT VALID;

-- Idempotency / race protection
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_marketplace_order_id
  ON orders (marketplace_order_id) WHERE marketplace_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_payment_reference
  ON orders (payment_reference) WHERE payment_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_auth_user_id
  ON customers (auth_user_id) WHERE auth_user_id IS NOT NULL;

-- ============================================================
-- 7. Indexes for catalogue traffic and the recovery sweep
-- ============================================================
-- `ilike '%term%'` search cannot use a btree; trigram makes it index-assisted.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING gin (name extensions.gin_trgm_ops);

-- Partial indexes: the storefront only ever reads published products.
CREATE INDEX IF NOT EXISTS idx_products_pub_created ON products (created_at DESC) WHERE is_published;
CREATE INDEX IF NOT EXISTS idx_products_pub_popular ON products (orders_count DESC) WHERE is_published;
CREATE INDEX IF NOT EXISTS idx_products_pub_price   ON products (selling_price)     WHERE is_published;

-- Cron sweeps for paid-but-unfulfilled / stuck orders.
CREATE INDEX IF NOT EXISTS idx_orders_fulfilment_sweep
  ON orders (fulfillment_status, updated_at) WHERE payment_status = 'paid';

-- agent_logs grows without bound; prune from a scheduled job, e.g.:
--   DELETE FROM agent_logs WHERE created_at < now() - interval '90 days';
