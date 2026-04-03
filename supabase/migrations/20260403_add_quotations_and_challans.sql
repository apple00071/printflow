-- Add database support for quotations and delivery challans (DC)
-- This migration aligns the checked-in schema with the existing app code.

-- 1. Extend orders with fields already used by the app
ALTER TABLE orders ADD COLUMN IF NOT EXISTS printing_side TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lamination TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS finishing TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS challan_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS challan_date TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_challan_number_unique
  ON orders(challan_number)
  WHERE challan_number IS NOT NULL;

-- 2. Quotation status enum is optional in the app, so keep status as TEXT
-- for easier rollout and backwards compatibility.
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  job_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  paper_type TEXT,
  size TEXT,
  printing_side TEXT,
  lamination TEXT,
  finishing TEXT,
  instructions TEXT,
  taxable_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_with_gst NUMERIC(12, 2) NOT NULL DEFAULT 0,
  gst_type TEXT NOT NULL DEFAULT 'NONE',
  gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  cgst NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sgst NUMERIC(12, 2) NOT NULL DEFAULT 0,
  igst NUMERIC(12, 2) NOT NULL DEFAULT 0,
  quotation_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT quotations_status_check
    CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'CONVERTED'))
);

CREATE INDEX IF NOT EXISTS idx_quotations_tenant_created_at
  ON quotations(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotations_customer
  ON quotations(customer_id);

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_quotations" ON quotations;
CREATE POLICY "tenant_isolation_quotations" ON quotations
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

-- 3. Generic document counters for QTN/DC generation
CREATE TABLE IF NOT EXISTS document_counters (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  prefix TEXT NOT NULL,
  period TEXT NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, prefix, period)
);

ALTER TABLE document_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_document_counters" ON document_counters;
CREATE POLICY "tenant_isolation_document_counters" ON document_counters
  FOR ALL USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

CREATE OR REPLACE FUNCTION generate_document_number(p_tenant_id UUID, p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  v_period TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_counter INTEGER;
BEGIN
  INSERT INTO document_counters (tenant_id, prefix, period, last_number)
  VALUES (p_tenant_id, UPPER(p_prefix), v_period, 1)
  ON CONFLICT (tenant_id, prefix, period)
  DO UPDATE SET
    last_number = document_counters.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO v_counter;

  RETURN UPPER(p_prefix) || '-' || v_period || '-' || LPAD(v_counter::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Keep quotation timestamps fresh
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quotations_set_updated_at ON quotations;
CREATE TRIGGER quotations_set_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
