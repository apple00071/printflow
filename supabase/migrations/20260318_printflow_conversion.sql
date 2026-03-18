-- 1. New Tables

-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  business_type TEXT,
  city          TEXT,
  state         TEXT,
  phone         TEXT,
  email         TEXT,
  logo_url      TEXT,
  upi_id        TEXT,
  bank_details  TEXT,
  gst_number    TEXT,
  gst_state     TEXT,
  gst_state_name TEXT,
  plan          TEXT NOT NULL DEFAULT 'FREE',
  plan_status   TEXT NOT NULL DEFAULT 'ACTIVE',
  orders_this_month INT DEFAULT 0,
  razorpay_sub_id TEXT,
  language      TEXT DEFAULT 'en',
  onboarding_complete BOOLEAN DEFAULT FALSE,
  last_invoice_number INT DEFAULT 0,
  last_invoice_month  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- GST rates per tenant
CREATE TABLE IF NOT EXISTS gst_rates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  rate        NUMERIC(5,2) NOT NULL,
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add columns to existing tables

-- Add tenant_id to all existing tables
ALTER TABLE orders    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE payments  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE price_table ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE profiles    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Add GST columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gst_type       TEXT DEFAULT 'NONE';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gst_rate       NUMERIC(5,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cgst           NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sgst           NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS igst           NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_with_gst NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_date   TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_inter_state BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS hsn_code       TEXT;

-- Add GST columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gstin        TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state        TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state_name   TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_gst_client BOOLEAN DEFAULT FALSE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_tenant    ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant  ON payments(tenant_id);

-- 3. Supabase RLS Policies

-- Enable RLS on all tables
ALTER TABLE tenants     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_rates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles 
  WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Remove existing broad policies (from original schema)
DROP POLICY IF EXISTS "Admin full access" ON profiles;
DROP POLICY IF EXISTS "Full access for customers" ON customers;
DROP POLICY IF EXISTS "Full access for orders" ON orders;
DROP POLICY IF EXISTS "Full access for payments" ON payments;
DROP POLICY IF EXISTS "Public read for price table" ON price_table;

-- New multi-tenant isolation policies
CREATE POLICY "tenant_isolation_orders" ON orders
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation_customers" ON customers
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation_payments" ON payments
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation_price_table" ON price_table
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_isolation_gst_rates" ON gst_rates
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE POLICY "own_profile_only" ON profiles
  FOR ALL USING (id = auth.uid());

CREATE POLICY "own_tenant_only" ON tenants
  FOR ALL USING (id = get_tenant_id());

-- Worker assigned orders (refined)
DROP POLICY IF EXISTS "worker_assigned_orders" ON orders;
CREATE POLICY "worker_assigned_orders" ON orders
  FOR SELECT USING (
    tenant_id = get_tenant_id() AND (
      assigned_to_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'ADMIN'
      )
    )
  );

-- 4. Helper Functions (RPCs)

-- Create generate_invoice_number function
CREATE OR REPLACE FUNCTION generate_invoice_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_month TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_counter INT;
  v_invoice_number TEXT;
BEGIN
  IF (SELECT last_invoice_month FROM tenants 
      WHERE id = p_tenant_id) != v_month OR (SELECT last_invoice_month FROM tenants WHERE id = p_tenant_id) IS NULL THEN
    UPDATE tenants SET 
      last_invoice_number = 1,
      last_invoice_month = v_month
    WHERE id = p_tenant_id;
    v_counter := 1;
  ELSE
    UPDATE tenants SET 
      last_invoice_number = last_invoice_number + 1
    WHERE id = p_tenant_id
    RETURNING last_invoice_number INTO v_counter;
  END IF;
  v_invoice_number := v_month || '-' || LPAD(v_counter::TEXT, 3, '0');
  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- 5. pg_cron for monthly reset
-- Note: Make sure pg_cron is enabled in Supabase extensions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'reset-monthly-orders',
            '0 0 1 * *',
            $cron$ UPDATE tenants SET orders_this_month = 0 $cron$
        );
    END IF;
END$$;
-- 6. Storage Buckets
-- Note: This requires the 'storage' extension to be enabled
INSERT INTO storage.buckets (id, name, public) 
VALUES ('printflow-files', 'printflow-files', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for storage
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'printflow-files');
CREATE POLICY "Tenant Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'printflow-files');
