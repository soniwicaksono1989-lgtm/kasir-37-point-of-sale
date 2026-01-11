-- Create storage bucket for branding (logo)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true);

-- Create policy for authenticated users to upload
CREATE POLICY "Authenticated users can upload branding"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'branding');

-- Create policy for authenticated users to update
CREATE POLICY "Authenticated users can update branding"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'branding');

-- Create policy for public to view branding
CREATE POLICY "Public can view branding"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'branding');

-- Create policy for authenticated users to delete branding
CREATE POLICY "Authenticated users can delete branding"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'branding');