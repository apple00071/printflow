-- Add printing_date column and remove finishing column from orders and quotations
-- This migration updates the schema to reflect the new workflow requirements.

BEGIN;

-- 1. Orders Table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS printing_date TIMESTAMPTZ;
ALTER TABLE orders DROP COLUMN IF EXISTS finishing;

-- 2. Quotations Table
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS printing_date TIMESTAMPTZ;
ALTER TABLE quotations DROP COLUMN IF EXISTS finishing;

COMMIT;
