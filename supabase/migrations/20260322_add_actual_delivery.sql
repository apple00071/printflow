-- Migration: Add actual_delivery_date to orders table
-- Run this in your Supabase SQL Editor

ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMPTZ;

-- Optional: Add a comment for clarity
COMMENT ON COLUMN orders.actual_delivery_date IS 'The actual date the order was delivered to the customer, used for performance tracking.';
