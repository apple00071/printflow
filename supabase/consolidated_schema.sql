-- =====================================================================
-- PRINTFLOW COMPLETE CONSOLIDATED DATABASE SCHEMA
-- Fully Idempotent: Works on brand new OR partially migrated databases
-- Run this script in the Supabase SQL Editor.
-- =====================================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Custom Enum Types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('ADMIN', 'WORKER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('RECEIVED', 'DESIGNING', 'PRINTING', 'READY', 'DELIVERED');
    END IF;
END$$;

-- 2. Tenants Table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    business_type TEXT,
    city TEXT,
    state TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    upi_id TEXT,
    bank_details TEXT,
    gst_number TEXT,
    gst_state TEXT,
    gst_state_name TEXT,
    id_prefix TEXT,
    plan TEXT NOT NULL DEFAULT 'FREE',
    plan_status TEXT NOT NULL DEFAULT 'ACTIVE',
    orders_this_month INT DEFAULT 0,
    razorpay_sub_id TEXT,
    language TEXT DEFAULT 'en',
    onboarding_complete BOOLEAN DEFAULT FALSE,
    last_invoice_number INT DEFAULT 0,
    last_invoice_month TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all tenant columns exist if table was previously created
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS id_prefix TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS last_invoice_number INT DEFAULT 0;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS last_invoice_month TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'FREE';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'ACTIVE';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS orders_this_month INT DEFAULT 0;

-- 3. Profiles Table (Auth Users Extension)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role user_role DEFAULT 'WORKER' NOT NULL,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all profiles columns exist if table was previously created
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

-- Helper function to fetch current tenant id from context
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles 
  WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    gstin TEXT,
    state TEXT,
    state_name TEXT,
    is_gst_client BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all customers columns exist if table was previously created
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS state_name TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_gst_client BOOLEAN DEFAULT FALSE;
ALTER TABLE public.customers ALTER COLUMN phone DROP NOT NULL;

-- Composite uniqueness per tenant (allows multiple NULLs for walk-ins without phone)
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_phone_key;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_tenant_phone_key;
ALTER TABLE public.customers ADD CONSTRAINT customers_tenant_phone_key UNIQUE (tenant_id, phone);

-- 5. Inventory Table
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity NUMERIC(15, 2) NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'Units',
    low_stock_limit NUMERIC(15, 2) DEFAULT 0,
    last_restocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
    material_units_per_order NUMERIC(15, 4) DEFAULT 1,
    total_material_deducted NUMERIC(15, 4) DEFAULT 0,
    friendly_id TEXT,
    job_type TEXT NOT NULL,
    quantity VARCHAR(255) NOT NULL,
    paper_type TEXT,
    size TEXT,
    printing_side TEXT,
    lamination TEXT,
    instructions TEXT,
    file_url TEXT,
    status order_status DEFAULT 'RECEIVED' NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    advance_paid NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    balance_due NUMERIC(12, 2) GENERATED ALWAYS AS (total_amount - advance_paid) STORED,
    delivery_date TIMESTAMPTZ,
    actual_delivery_date TIMESTAMPTZ,
    printing_date TIMESTAMPTZ,
    gst_type TEXT DEFAULT 'NONE',
    gst_rate NUMERIC(5, 2) DEFAULT 0,
    cgst NUMERIC(10, 2) DEFAULT 0,
    sgst NUMERIC(10, 2) DEFAULT 0,
    igst NUMERIC(10, 2) DEFAULT 0,
    taxable_amount NUMERIC(10, 2),
    total_with_gst NUMERIC(10, 2),
    invoice_number TEXT,
    invoice_date TIMESTAMPTZ,
    is_inter_state BOOLEAN DEFAULT FALSE,
    hsn_code TEXT,
    challan_number TEXT,
    challan_date TIMESTAMPTZ,
    proof_image_url TEXT,
    proof_status TEXT DEFAULT 'PENDING',
    proof_feedback TEXT,
    proofing_token UUID DEFAULT gen_random_uuid(),
    gmail_message_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all orders columns exist even if orders table was previously created
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS material_units_per_order NUMERIC(15, 4) DEFAULT 1;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_material_deducted NUMERIC(15, 4) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS friendly_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS printing_side TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS lamination TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS printing_date TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gst_type TEXT DEFAULT 'NONE';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cgst NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sgst NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS igst NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(10, 2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_with_gst NUMERIC(10, 2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_inter_state BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS hsn_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS challan_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS challan_date TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS proof_image_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS proof_status TEXT DEFAULT 'PENDING';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS proof_feedback TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS proofing_token UUID DEFAULT gen_random_uuid();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gmail_message_id TEXT;
ALTER TABLE public.orders ALTER COLUMN quantity TYPE VARCHAR(255);

-- Unique index for non-null challan numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_challan_number_unique
  ON public.orders(challan_number)
  WHERE challan_number IS NOT NULL;

-- 7. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    method TEXT NOT NULL,
    paid_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 8. Quotations Table
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    job_type TEXT NOT NULL,
    quantity VARCHAR(255) NOT NULL,
    paper_type TEXT,
    size TEXT,
    printing_side TEXT,
    lamination TEXT,
    instructions TEXT,
    taxable_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_with_gst NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gst_type TEXT NOT NULL DEFAULT 'NONE',
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    cgst NUMERIC(12, 2) NOT NULL DEFAULT 0,
    sgst NUMERIC(12, 2) NOT NULL DEFAULT 0,
    igst NUMERIC(12, 2) NOT NULL DEFAULT 0,
    quotation_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'CONVERTED')),
    valid_until TIMESTAMPTZ,
    printing_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS printing_date TIMESTAMPTZ;
ALTER TABLE public.quotations ALTER COLUMN quantity TYPE VARCHAR(255);

-- 9. Document Counters Table
CREATE TABLE IF NOT EXISTS public.document_counters (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    prefix TEXT NOT NULL,
    period TEXT NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, prefix, period)
);

-- 10. GST Rates Table
CREATE TABLE IF NOT EXISTS public.gst_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    rate NUMERIC(5, 2) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gst_rates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 11. Price Table
CREATE TABLE IF NOT EXISTS public.price_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    paper_type TEXT,
    min_qty INTEGER NOT NULL,
    max_qty INTEGER NOT NULL,
    price_per_unit NUMERIC(12, 2) NOT NULL
);

ALTER TABLE public.price_table ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 12. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    spent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT,
    payment_method TEXT DEFAULT 'CASH',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Team Invitations Table
CREATE TABLE IF NOT EXISTS public.team_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'WORKER' CHECK (role IN ('ADMIN', 'WORKER')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED')),
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ
);

-- =====================================================================
-- PERFORMANCE INDEXES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON public.inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON public.orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_friendly_id ON public.orders(friendly_id);
CREATE INDEX IF NOT EXISTS idx_orders_proofing_token ON public.orders(proofing_token);
CREATE INDEX IF NOT EXISTS idx_orders_gmail_message_id ON public.orders(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_quotations_tenant_created ON public.quotations(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON public.quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON public.expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_spent_at ON public.expenses(spent_at);
CREATE INDEX IF NOT EXISTS idx_team_invitations_tenant ON public.team_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON public.team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires ON public.team_invitations(expires_at);

-- =====================================================================
-- DATABASE FUNCTIONS & STORED PROCEDURES
-- =====================================================================

-- Auto updated_at timestamp handler
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profile auto-creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email), 
    COALESCE(NEW.raw_user_meta_data->>'name', 'New Worker'), 
    'WORKER'
  )
  ON CONFLICT (id) DO UPDATE 
  SET username = EXCLUDED.username, name = EXCLUDED.name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate sequential monthly invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_month TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_counter INT;
  v_invoice_number TEXT;
BEGIN
  IF (SELECT last_invoice_month FROM public.tenants WHERE id = p_tenant_id) != v_month 
     OR (SELECT last_invoice_month FROM public.tenants WHERE id = p_tenant_id) IS NULL THEN
    UPDATE public.tenants SET 
      last_invoice_number = 1,
      last_invoice_month = v_month
    WHERE id = p_tenant_id;
    v_counter := 1;
  ELSE
    UPDATE public.tenants SET 
      last_invoice_number = last_invoice_number + 1
    WHERE id = p_tenant_id
    RETURNING last_invoice_number INTO v_counter;
  END IF;
  v_invoice_number := v_month || '-' || LPAD(v_counter::TEXT, 3, '0');
  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate continuous friendly order IDs (e.g. APG-001)
CREATE OR REPLACE FUNCTION public.generate_simple_order_id(p_tenant_id UUID, p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  v_counter INTEGER;
BEGIN
  INSERT INTO public.document_counters (tenant_id, prefix, period, last_number)
  VALUES (p_tenant_id, UPPER(p_prefix), 'GLOBAL', 1)
  ON CONFLICT (tenant_id, prefix, period)
  DO UPDATE SET
    last_number = document_counters.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO v_counter;

  RETURN UPPER(p_prefix) || '-' || LPAD(v_counter::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate generic document numbers for quotations and challans
CREATE OR REPLACE FUNCTION public.generate_document_number(p_tenant_id UUID, p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  v_period TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_counter INTEGER;
BEGIN
  INSERT INTO public.document_counters (tenant_id, prefix, period, last_number)
  VALUES (p_tenant_id, UPPER(p_prefix), v_period, 1)
  ON CONFLICT (tenant_id, prefix, period)
  DO UPDATE SET
    last_number = document_counters.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO v_counter;

  RETURN UPPER(p_prefix) || '-' || v_period || '-' || LPAD(v_counter::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulk rename friendly order IDs when tenant prefix changes
CREATE OR REPLACE FUNCTION public.sync_order_prefixes(p_tenant_id UUID, p_new_prefix TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.orders
  SET friendly_id = UPPER(p_new_prefix) || 
    CASE 
      WHEN friendly_id LIKE '%-%' THEN SUBSTRING(friendly_id FROM POSITION('-' IN friendly_id))
      ELSE '-' || friendly_id
    END
  WHERE tenant_id = p_tenant_id
    AND friendly_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safe auto inventory deduction on order creation
CREATE OR REPLACE FUNCTION public.auto_deduct_inventory()
RETURNS TRIGGER AS $$
DECLARE
    v_qty_numeric NUMERIC;
BEGIN
    IF (NEW.inventory_id IS NOT NULL AND NEW.quantity IS NOT NULL AND NEW.quantity != '') THEN
        IF (NEW.quantity ~ '^[0-9.]+$') THEN
            v_qty_numeric := NEW.quantity::NUMERIC;
            IF (v_qty_numeric > 0) THEN
                UPDATE public.inventory
                SET 
                    quantity = quantity - (v_qty_numeric * NEW.material_units_per_order),
                    updated_at = NOW()
                WHERE id = NEW.inventory_id;
                
                NEW.total_material_deducted := (v_qty_numeric * NEW.material_units_per_order);
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- TRIGGERS
-- =====================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_team_invitations_updated_at ON public.team_invitations;
CREATE TRIGGER handle_team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS quotations_set_updated_at ON public.quotations;
CREATE TRIGGER quotations_set_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_auto_deduct_inventory ON public.orders;
CREATE TRIGGER trigger_auto_deduct_inventory
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.auto_deduct_inventory();

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Tenants Policies
DROP POLICY IF EXISTS "own_tenant_only" ON public.tenants;
CREATE POLICY "own_tenant_only" ON public.tenants FOR ALL USING (id = get_tenant_id());

DROP POLICY IF EXISTS "public_read_tenant_basics" ON public.tenants;
CREATE POLICY "public_read_tenant_basics" ON public.tenants FOR SELECT USING (true);

-- Profiles Policies
DROP POLICY IF EXISTS "own_profile_only" ON public.profiles;
CREATE POLICY "own_profile_only" ON public.profiles FOR ALL USING (id = auth.uid());

-- Customers Policies
DROP POLICY IF EXISTS "tenant_isolation_customers" ON public.customers;
CREATE POLICY "tenant_isolation_customers" ON public.customers FOR ALL USING (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "public_create_customers" ON public.customers;
CREATE POLICY "public_create_customers" ON public.customers FOR INSERT WITH CHECK (true);

-- Orders Policies
DROP POLICY IF EXISTS "tenant_isolation_orders" ON public.orders;
CREATE POLICY "tenant_isolation_orders" ON public.orders FOR ALL USING (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "public_create_orders" ON public.orders;
CREATE POLICY "public_create_orders" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public proofing access" ON public.orders;
CREATE POLICY "Public proofing access" ON public.orders FOR SELECT USING (true);

-- Payments Policies
DROP POLICY IF EXISTS "tenant_isolation_payments" ON public.payments;
CREATE POLICY "tenant_isolation_payments" ON public.payments FOR ALL USING (tenant_id = get_tenant_id());

-- Quotations Policies
DROP POLICY IF EXISTS "tenant_isolation_quotations" ON public.quotations;
CREATE POLICY "tenant_isolation_quotations" ON public.quotations FOR ALL USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());

-- Inventory Policies
DROP POLICY IF EXISTS "tenant_isolation_inventory" ON public.inventory;
CREATE POLICY "tenant_isolation_inventory" ON public.inventory FOR ALL USING (tenant_id = get_tenant_id());

-- Expenses Policies
DROP POLICY IF EXISTS "tenant_isolation_expenses" ON public.expenses;
CREATE POLICY "tenant_isolation_expenses" ON public.expenses FOR ALL USING (tenant_id = get_tenant_id());

-- Document Counters Policies
DROP POLICY IF EXISTS "tenant_isolation_document_counters" ON public.document_counters;
CREATE POLICY "tenant_isolation_document_counters" ON public.document_counters FOR ALL USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());

-- GST Rates & Price Table Policies
DROP POLICY IF EXISTS "tenant_isolation_gst_rates" ON public.gst_rates;
CREATE POLICY "tenant_isolation_gst_rates" ON public.gst_rates FOR ALL USING (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "tenant_isolation_price_table" ON public.price_table;
CREATE POLICY "tenant_isolation_price_table" ON public.price_table FOR ALL USING (tenant_id = get_tenant_id());

-- Team Invitations Policies
DROP POLICY IF EXISTS "Tenant users can view invitations for their tenant" ON public.team_invitations;
CREATE POLICY "Tenant users can view invitations for their tenant" ON public.team_invitations FOR SELECT USING (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "Tenant admins can manage invitations" ON public.team_invitations;
CREATE POLICY "Tenant admins can manage invitations" ON public.team_invitations FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public) VALUES ('printflow-files', 'printflow-files', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'printflow-files');

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'printflow-files');

DROP POLICY IF EXISTS "Public Intake Upload" ON storage.objects;
CREATE POLICY "Public Intake Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'printflow-files' AND (storage.foldername(name))[1] = 'intake');

DROP POLICY IF EXISTS "Users can update their own objects" ON storage.objects;
CREATE POLICY "Users can update their own objects" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'printflow-files');

DROP POLICY IF EXISTS "Users can delete their own objects" ON storage.objects;
CREATE POLICY "Users can delete their own objects" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'printflow-files');
