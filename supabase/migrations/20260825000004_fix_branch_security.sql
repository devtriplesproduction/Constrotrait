-- 1. Fix Branch Management RLS (SUPER_ADMIN only)
DROP POLICY IF EXISTS "Super Admins and HR can insert branches" ON public.branches;
DROP POLICY IF EXISTS "Super Admins and HR can update branches" ON public.branches;

CREATE POLICY "Super Admins can insert branches"
ON public.branches FOR INSERT
WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']);

CREATE POLICY "Super Admins can update branches"
ON public.branches FOR UPDATE
USING ((auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']);

-- 2. Undo incorrect historical backfill
DO $$
DECLARE
  v_wai_branch_id UUID;
BEGIN
  SELECT id INTO v_wai_branch_id FROM public.branches WHERE code = 'WAI-01' LIMIT 1;
  IF v_wai_branch_id IS NOT NULL THEN
    UPDATE public.profiles
    SET branch_id = NULL
    WHERE branch_id = v_wai_branch_id;
  END IF;
END $$;

-- 3. Secure get_user_branch_id() helper
CREATE OR REPLACE FUNCTION public.get_user_branch_id()
RETURNS UUID AS $$
DECLARE
  v_branch_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT branch_id INTO v_branch_id
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN v_branch_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Revoke public access to prevent unauthorized manual execution
REVOKE ALL ON FUNCTION public.get_user_branch_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_branch_id() TO authenticated;

-- 4. Update profiles RLS
DROP POLICY IF EXISTS "HR and Branch Managers can view profiles in their branch" ON public.profiles;

CREATE POLICY "HR and Branch Managers can view profiles in their branch"
ON public.profiles FOR SELECT
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['HR', 'BRANCH_MANAGER_ADMINISTRATIVE', 'ADMIN_INWARD_CRE']
  AND
  (
    branch_id = public.get_user_branch_id()
  )
);

-- 5. Update attendance RLS
DROP POLICY IF EXISTS "Managers can view attendance in their branch" ON public.attendance;

CREATE POLICY "Managers can view attendance in their branch"
ON public.attendance FOR SELECT
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
  OR
  (
    (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['HR', 'BRANCH_MANAGER_ADMINISTRATIVE']
    AND branch_id = public.get_user_branch_id()
  )
);

-- 6. Update eod_reports RLS
DROP POLICY IF EXISTS "Managers can view EODs in their branch" ON public.eod_reports;

CREATE POLICY "Managers can view EODs in their branch"
ON public.eod_reports FOR SELECT
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
  OR
  (
    (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['HR', 'BRANCH_MANAGER_ADMINISTRATIVE']
    AND branch_id = public.get_user_branch_id()
  )
);

