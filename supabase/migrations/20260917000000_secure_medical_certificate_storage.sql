-- Secure medical certificate storage and standardize the application bucket.
-- Canonical bucket: medical-certificates (private).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-certificates',
  'medical-certificates',
  false,
  5242880,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[];

DROP POLICY IF EXISTS "Authenticated users can upload to medical-certificates bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own medical-certificates" ON storage.objects;
DROP POLICY IF EXISTS "HR and Super Admins can view all medical-certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own medical-certificates" ON storage.objects;
DROP POLICY IF EXISTS "HR and Super Admins can delete medical-certificates" ON storage.objects;

CREATE POLICY "Authenticated users can upload to medical-certificates bucket"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'medical-certificates'
  AND auth.uid() = owner
);

CREATE POLICY "Users can view their own medical-certificates"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'medical-certificates'
  AND auth.uid() = owner
);

CREATE POLICY "HR and Super Admins can view all medical-certificates"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'medical-certificates'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
  )
);

CREATE POLICY "Users can delete their own medical-certificates"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'medical-certificates'
  AND auth.uid() = owner
);

CREATE POLICY "HR and Super Admins can delete medical-certificates"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'medical-certificates'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
  )
);
