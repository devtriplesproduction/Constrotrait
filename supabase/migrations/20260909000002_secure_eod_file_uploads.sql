-- Migration: 20260909000002_secure_eod_file_uploads.sql
-- Description: Secures EOD file uploads by enforcing file size (5MB), allowed MIME types natively in storage, and restricting path upload to prevent spoofing.

-- 1. Enforce Bucket-Level Limits (5MB, Images only)
UPDATE storage.buckets
SET 
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'eod_photos';

-- 2. Secure the INSERT policy to prevent path spoofing
DROP POLICY IF EXISTS "Authenticated users can upload EOD photos" ON storage.objects;

CREATE POLICY "Authorized users can upload EOD photos securely"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'eod_photos' 
  AND auth.uid() = owner
  AND (
    -- Condition 1: Uploading to their own folder
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Condition 2: SUPER_ADMIN proxy
    (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND roles @> '{"SUPER_ADMIN"}'
      )
    )
    OR
    -- Condition 3: HR / BRANCH MANAGER proxy
    (
      EXISTS (
        SELECT 1 
        FROM public.profiles caller
        JOIN public.profiles target ON target.id::text = (storage.foldername(name))[1]
        WHERE caller.id = auth.uid()
        AND (caller.roles @> '{"HR"}' OR caller.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
        AND caller.branch_id = target.branch_id
        AND caller.branch_id IS NOT NULL
      )
    )
    OR
    -- Condition 4: Reporting manager proxy
    (
      EXISTS (
        SELECT 1 
        FROM public.profiles caller
        JOIN public.profiles target ON target.id::text = (storage.foldername(name))[1]
        WHERE caller.id = auth.uid()
        AND target.reporting_manager_id = caller.id
        AND caller.branch_id = target.branch_id
        AND caller.branch_id IS NOT NULL
      )
    )
  )
);
