-- Allow Branch Managers to read profiles for the Birthday feature
-- Note: PostgreSQL RLS applies at the row level, not the column level.
-- By granting SELECT access to support the BirthdayNotifier component, 
-- Branch Managers receive SELECT access to all columns on the profiles table, 
-- including sensitive fields (salary, personal_email, etc.), for all users.
-- To restrict this in the future, a dedicated SECURITY DEFINER view or RPC should be used.

DROP POLICY IF EXISTS "Branch Managers can view all profiles" ON public.profiles;

CREATE POLICY "Branch Managers can view all profiles"
ON public.profiles FOR SELECT
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['BRANCH_MANAGER_ADMINISTRATIVE']
);
