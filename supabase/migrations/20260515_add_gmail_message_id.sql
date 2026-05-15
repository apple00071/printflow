-- Add gmail_message_id to orders table to prevent duplicate imports
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gmail_message_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_gmail_message_id ON orders(gmail_message_id);
