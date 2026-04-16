-- Migration: Add tenant ID prefix for custom order identifiers
-- This allows each tenant to have a unique prefix (e.g., AG, PF) for their orders.

-- 1. Add prefix column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS id_prefix TEXT;

-- 2. Set default prefixes for existing tenants based on their name
UPDATE tenants 
SET id_prefix = UPPER(SUBSTRING(name FROM 1 FOR 3))
WHERE id_prefix IS NULL;

-- 3. Ensure friendly_id exists on orders table
-- (Research indicates it exists, but adding IF NOT EXISTS for safety)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS friendly_id TEXT;

-- 4. Create an index for faster lookups by friendly_id
CREATE INDEX IF NOT EXISTS idx_orders_friendly_id ON orders(friendly_id);

-- 5. Add simple, continuous order ID generation function
CREATE OR REPLACE FUNCTION generate_simple_order_id(p_tenant_id UUID, p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  v_counter INTEGER;
BEGIN
  INSERT INTO document_counters (tenant_id, prefix, period, last_number)
  VALUES (p_tenant_id, UPPER(p_prefix), 'GLOBAL', 1)
  ON CONFLICT (tenant_id, prefix, period)
  DO UPDATE SET
    last_number = document_counters.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO v_counter;

  RETURN UPPER(p_prefix) || '-' || LPAD(v_counter::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
