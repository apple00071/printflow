-- Fix customer uniqueness and make phone optional in multi-tenancy environment
-- Historically, phone was globally unique and NOT NULL.
-- Now it should be unique within a tenant AND allow multiple NULL values (no phone).

BEGIN;

-- 1. Convert empty strings to NULL to avoid constraint violation during change
-- Some existing data might have '' which would conflict after we allow nulls.
UPDATE customers SET phone = NULL WHERE phone = '';

-- 2. Drop NOT NULL constraint on phone
ALTER TABLE customers ALTER COLUMN phone DROP NOT NULL;

-- 3. Update the unique constraint to be tenant-scoped if not already handled
-- Drop original global constraint
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_phone_key;

-- Drop newly added constraint if we're re-running this migration
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_tenant_phone_key;

-- Add composite uniqueness constraint (tenant_id, phone)
-- Postgres allows multiple records with NULL values in a UNIQUE column.
ALTER TABLE customers ADD CONSTRAINT customers_tenant_phone_key UNIQUE (tenant_id, phone);

COMMIT;
