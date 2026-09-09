-- Migration: 20260909000001_secure_eod_photo_storage.sql
-- Description: Secures EOD photo storage by replacing the global HR access policy with branch-isolated access, granting access only to HR, BRANCH_MANAGER_ADMINISTRATIVE, or reporting managers who belong to the same branch as the uploading employee, while keeping SUPER_ADMIN access global.

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "HR and Super Admins can view all EOD photos" ON storage.objects;

-- Create the new, securely derived branch-isolated policy
CREATE POLICY "Authorized users can view EOD photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'eod_photos' 
  AND (
    -- Condition 1: SUPER_ADMIN can view all photos
    (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND roles @> '{"SUPER_ADMIN"}'
      )
    )
    OR
    -- Condition 2: HR or BRANCH_MANAGER_ADMINISTRATIVE can view if they belong to the same branch as the photo owner
    (
      EXISTS (
        SELECT 1 
        FROM public.profiles requester
        JOIN public.profiles photo_owner ON photo_owner.id = storage.objects.owner
        WHERE requester.id = auth.uid() 
        AND (requester.roles @> '{"HR"}' OR requester.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
        AND requester.branch_id = photo_owner.branch_id
        AND requester.branch_id IS NOT NULL
      )
    )
    OR
    -- Condition 3: Reporting manager can view if they manage the owner and share the same branch
    (
      EXISTS (
        SELECT 1 
        FROM public.profiles requester
        JOIN public.profiles photo_owner ON photo_owner.id = storage.objects.owner
        WHERE requester.id = auth.uid()
        AND photo_owner.reporting_manager_id = requester.id
        AND requester.branch_id = photo_owner.branch_id
        AND requester.branch_id IS NOT NULL
      )
    )
  )
);
