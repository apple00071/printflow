-- ========================================
-- PUBLIC PORTAL PERMISSIONS
-- ========================================

-- 1. Allow public to see tenant basics by slug (for logo/name on intake page)
DROP POLICY IF EXISTS "public_read_tenant_basics" ON public.tenants;
CREATE POLICY "public_read_tenant_basics" ON public.tenants
  FOR SELECT USING (true); -- We only select specific fields in the query

-- 2. Allow public to create customers (but not read all customers)
DROP POLICY IF EXISTS "public_create_customers" ON public.customers;
CREATE POLICY "public_create_customers" ON public.customers
  FOR INSERT WITH CHECK (true);

-- 3. Allow public to create orders
DROP POLICY IF EXISTS "public_create_orders" ON public.orders;
CREATE POLICY "public_create_orders" ON public.orders
  FOR INSERT WITH CHECK (true);

-- 4. Storage permissions for intake uploads
-- Ensure public can upload to the 'intake' folder in printflow-files
DROP POLICY IF EXISTS "Public Intake Upload" ON storage.objects;
CREATE POLICY "Public Intake Upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'printflow-files' AND (storage.foldername(name))[1] = 'intake');
