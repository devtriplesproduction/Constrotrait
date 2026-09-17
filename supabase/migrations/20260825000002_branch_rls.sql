-- 1. Helper function (if needed for complex scenarios, though direct JWT is used here)
CREATE OR REPLACE FUNCTION get_user_branch_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'branch_id')::uuid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Update Profiles RLS
DROP POLICY IF EXISTS "Branch Managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super Admins and HR can view all profiles" ON public.profiles;

CREATE POLICY "Super Admins can view all profiles"
ON public.profiles FOR SELECT
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
);

CREATE POLICY "HR and Branch Managers can view profiles in their branch"
ON public.profiles FOR SELECT
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['HR', 'BRANCH_MANAGER_ADMINISTRATIVE', 'ADMIN_INWARD_CRE']
  AND
  (
    branch_id = (auth.jwt() -> 'app_metadata' ->> 'branch_id')::uuid
  )
);

-- 3. Ensure users can still read their own
-- (Existing policy "Users can view own profile" should remain)

-- 4. Update Attendance RLS to use branch_id
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

CREATE POLICY "Managers can view attendance in their branch"
ON public.attendance FOR SELECT
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
  OR
  (
    (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['HR', 'BRANCH_MANAGER_ADMINISTRATIVE']
    AND branch_id = (auth.jwt() -> 'app_metadata' ->> 'branch_id')::uuid
  )
);

-- 5. Update EOD RLS
ALTER TABLE public.eod_reports ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
CREATE POLICY "Managers can view EODs in their branch"
ON public.eod_reports FOR SELECT
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
  OR
  (
    (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['HR', 'BRANCH_MANAGER_ADMINISTRATIVE']
    AND branch_id = (auth.jwt() -> 'app_metadata' ->> 'branch_id')::uuid
  )
);
