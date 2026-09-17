-- Migration: 20260916000003_create_employee_documents_bucket.sql
-- Description: Creates the employee-documents storage bucket and RLS policies

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'employee-documents',
    'employee-documents',
    false, -- Private bucket
    5242880, -- 5MB limit
    '{
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp"
    }'
) ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Remove existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Authorized users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can delete documents" ON storage.objects;

-- Insert policy (upload)
CREATE POLICY "Authorized users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'employee-documents'
    AND (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.roles @> '{"SUPER_ADMIN"}'
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.roles @> '{"HR"}' OR p.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
            AND p.branch_id IS NOT NULL
            AND split_part(name, '/', 1) = 'onboarding'
            AND split_part(name, '/', 2) = p.branch_id::text
        )
    )
);

-- Select policy (download/view)
CREATE POLICY "Authorized users can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'employee-documents'
    AND (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.roles @> '{"SUPER_ADMIN"}'
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.roles @> '{"HR"}' OR p.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
            AND (
                split_part(name, '/', 2) = p.branch_id::text
            )
        )
    )
);

-- Update policy
CREATE POLICY "Authorized users can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'employee-documents'
    AND (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.roles @> '{"SUPER_ADMIN"}')
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.roles @> '{"HR"}' OR p.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}') AND split_part(name, '/', 2) = p.branch_id::text)
    )
)
WITH CHECK (
    bucket_id = 'employee-documents'
    AND (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.roles @> '{"SUPER_ADMIN"}')
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.roles @> '{"HR"}' OR p.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}') AND split_part(name, '/', 2) = p.branch_id::text)
    )
);

-- Delete policy
CREATE POLICY "Authorized users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'employee-documents'
    AND (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.roles @> '{"SUPER_ADMIN"}')
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.roles @> '{"HR"}' OR p.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}') AND split_part(name, '/', 2) = p.branch_id::text)
    )
);
