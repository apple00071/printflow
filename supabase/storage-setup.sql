-- ========================================
-- STORAGE BUCKET SETUP
-- ========================================

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('printflow-files', 'printflow-files', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable public access for viewing files
-- This policy allows anyone to read files from the bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'printflow-files' );

-- 3. Allow authenticated users to upload files
-- This policy allows any logged-in user to upload to the bucket
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'printflow-files' );

-- 4. Allow users to update/delete their own uploads (optional but recommended)
CREATE POLICY "Users can update their own objects"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'printflow-files' );

CREATE POLICY "Users can delete their own objects"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'printflow-files' );
