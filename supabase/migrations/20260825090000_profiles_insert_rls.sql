-- Add INSERT policy for profiles to support onboarding

CREATE POLICY "Managers and HR can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (
  -- Must have one of the authorized roles
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['HR', 'BRANCH_MANAGER_ADMINISTRATIVE', 'SUPER_ADMIN']
  AND
  (
    -- Super Admins can insert any profile
    (auth.jwt() -> 'app_metadata' -> 'roles') ? 'SUPER_ADMIN' 
    OR 
    (
      -- HR and Branch Managers can only insert into their own branch
      branch_id = public.get_user_branch_id() 
      AND 
      -- Non-Super Admins cannot create Super Admins
      NOT ('SUPER_ADMIN' = ANY(roles))
    )
  )
);
