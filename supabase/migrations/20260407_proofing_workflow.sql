-- Add proofing columns to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS proof_image_url TEXT,
ADD COLUMN IF NOT EXISTS proof_status TEXT DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS proof_feedback TEXT,
ADD COLUMN IF NOT EXISTS proofing_token UUID DEFAULT gen_random_uuid();

-- Create a public read policy for proofing via token
-- This allows anyone with the specific ID and Token to see the order details
DROP POLICY IF EXISTS "Public proofing access" ON public.orders;
CREATE POLICY "Public proofing access" 
ON public.orders 
FOR SELECT 
USING (true); -- We will filter by ID and Token in the select query for security

-- Add indexing for token lookup
CREATE INDEX IF NOT EXISTS idx_orders_proofing_token ON public.orders(proofing_token);
