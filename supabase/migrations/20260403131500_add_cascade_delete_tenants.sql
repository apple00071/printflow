-- Add ON DELETE CASCADE to tenant_id foreign keys to allow tenant deletion
-- This migration updates tables added in previous migrations that were missing the CASCADE rule.

BEGIN;

-- Profiles: Update profiles_tenant_id_fkey to CASCADE
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_tenant_id_fkey;

ALTER TABLE profiles
ADD CONSTRAINT profiles_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES tenants(id) 
  ON DELETE CASCADE;

-- Orders: Update orders_tenant_id_fkey to CASCADE
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_tenant_id_fkey;

ALTER TABLE orders
ADD CONSTRAINT orders_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES tenants(id) 
  ON DELETE CASCADE;

-- Customers: Update customers_tenant_id_fkey to CASCADE
ALTER TABLE customers 
DROP CONSTRAINT IF EXISTS customers_tenant_id_fkey;

ALTER TABLE customers
ADD CONSTRAINT customers_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES tenants(id) 
  ON DELETE CASCADE;

-- Payments: Update payments_tenant_id_fkey to CASCADE
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS payments_tenant_id_fkey;

ALTER TABLE payments
ADD CONSTRAINT payments_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES tenants(id) 
  ON DELETE CASCADE;

-- Price Table: Update price_table_tenant_id_fkey to CASCADE
ALTER TABLE price_table 
DROP CONSTRAINT IF EXISTS price_table_tenant_id_fkey;

ALTER TABLE price_table
ADD CONSTRAINT price_table_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES tenants(id) 
  ON DELETE CASCADE;

COMMIT;
