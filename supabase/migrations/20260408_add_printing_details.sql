-- Add technical printing fields to orders table
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS printing_side TEXT,
  ADD COLUMN IF NOT EXISTS lamination TEXT;
