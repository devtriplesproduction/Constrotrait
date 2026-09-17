-- Migration to synchronize profiles.roles to auth.users.raw_app_meta_data->'roles'

CREATE OR REPLACE FUNCTION public.sync_profile_roles_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- We update auth.users raw_app_meta_data with the new roles array.
  -- This guarantees atomic synchronization at the database level.
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('roles', to_jsonb(NEW.roles))
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Secure the function by revoking public execute privileges
REVOKE ALL ON FUNCTION public.sync_profile_roles_to_auth() FROM PUBLIC;

-- Drop trigger if it already exists
DROP TRIGGER IF EXISTS on_profile_roles_update ON public.profiles;

-- Create the trigger for UPDATE when roles actually change
CREATE TRIGGER on_profile_roles_update
AFTER UPDATE OF roles ON public.profiles
FOR EACH ROW
WHEN (OLD.roles IS DISTINCT FROM NEW.roles)
EXECUTE FUNCTION public.sync_profile_roles_to_auth();

-- Drop trigger for INSERT if it exists
DROP TRIGGER IF EXISTS on_profile_roles_insert ON public.profiles;

-- Create the trigger for INSERT to ensure roles are correctly populated
CREATE TRIGGER on_profile_roles_insert
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_roles_to_auth();
