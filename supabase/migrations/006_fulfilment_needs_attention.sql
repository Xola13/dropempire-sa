-- Migration 006: let an order be flagged when part of it could not be ordered automatically.
-- Safe to re-run. Apply BEFORE deploying the code that writes 'needs_attention'.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_fulfillment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_status_check
  CHECK (fulfillment_status IN ('unfulfilled', 'fulfilling', 'fulfilled', 'cancelled', 'needs_attention'));
