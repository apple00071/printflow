-- Migration: Add tenant ID prefix for custom order identifiers
-- This consolidated script ensures all necessary tables and columns exist.

-- 1. Create document_counters table if it doesn't exist
CREATE TABLE IF NOT EXISTS document_counters (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  prefix TEXT NOT NULL,
  period TEXT NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, prefix, period)
);

-- 2. Enable RLS and setup policy
ALTER TABLE document_counters ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_document_counters' AND tablename = 'document_counters') THEN
        CREATE POLICY "tenant_isolation_document_counters" ON document_counters
          FOR ALL USING (tenant_id = get_tenant_id())
          WITH CHECK (tenant_id = get_tenant_id());
    END IF;
END $$;

-- 3. Add prefix column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS id_prefix TEXT;

-- 4. Set default prefixes for existing tenants based on their name
UPDATE tenants 
SET id_prefix = UPPER(SUBSTRING(name FROM 1 FOR 3))
WHERE id_prefix IS NULL;

-- 5. Ensure friendly_id exists on orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS friendly_id TEXT;

-- 6. Create an index for faster lookups by friendly_id
CREATE INDEX IF NOT EXISTS idx_orders_friendly_id ON orders(friendly_id);

-- 7. Add simple, continuous order ID generation function
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
