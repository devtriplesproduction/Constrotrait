-- Add Row Level Security for the 'medical-certificates' bucket

-- Employees can upload their own certificates
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
