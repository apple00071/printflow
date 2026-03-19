-- Add SaaS columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS orders_this_month INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_invoice_number INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_invoice_month TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS razorpay_sub_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Add tenant_id to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Update existing profiles to have null tenant_id for now
UPDATE profiles SET tenant_id = NULL WHERE tenant_id IS NOT NULL AND tenant_id NOT IN (SELECT id FROM tenants);
