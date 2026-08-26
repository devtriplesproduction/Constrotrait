-- Drop the old insert policy
DROP POLICY IF EXISTS "Authorized roles can insert holidays" ON public.holidays;

-- Recreate policy with updated HR logic (HR branch_id must match their profile branch_id)
CREATE POLICY "Authorized roles can insert holidays"
ON public.holidays FOR INSERT
WITH CHECK (
    (
        (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
    )
    OR
    (
        (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['HR']
        AND branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
        AND department IS NOT NULL
    )
    OR
    (
        (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['BRANCH_MANAGER_ADMINISTRATIVE']
        AND branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
    )
);
