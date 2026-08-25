-- Rename column
ALTER TABLE public.profiles RENAME COLUMN role TO roles;

-- Cast to array and set default
ALTER TABLE public.profiles 
  ALTER COLUMN roles TYPE public.user_role[] USING ARRAY[roles]::public.user_role[],
  ALTER COLUMN roles SET DEFAULT '{}'::public.user_role[];

-- Drop old RLS policy that used a single string check
DROP POLICY IF EXISTS "Super Admins and HR can view all profiles" ON public.profiles;

-- Create new RLS policy using JSONB containment to check if 'SUPER_ADMIN' or 'HR' is in the roles array
CREATE POLICY "Super Admins and HR can view all profiles"
ON public.profiles FOR SELECT
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN', 'HR']
);
