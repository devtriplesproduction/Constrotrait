-- Migration: 20260824000003_secure_birthday_rpc.sql
-- Description: Removes the broad Branch Manager profiles access and introduces a secure, restricted RPC for birthdays.

-- Remove the overly broad Branch Manager profile access
DROP POLICY IF EXISTS "Branch Managers can view all profiles" ON public.profiles;

-- Create a secure RPC to fetch today's birthdays, exposing only the minimum required data
CREATE OR REPLACE FUNCTION public.get_today_birthdays()
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT
) AS $$
DECLARE
  v_caller_uid UUID;
BEGIN
  v_caller_uid := auth.uid();
  
  -- 1. Security Check: Ensure caller is authenticated
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Security Check: Ensure caller has one of the authorized roles
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = v_caller_uid
    AND (
      public.profiles.roles @> '{"SUPER_ADMIN"}' OR 
      public.profiles.roles @> '{"HR"}' OR
      public.profiles.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}'
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Insufficient permissions to view birthdays';
  END IF;

  -- 3. Fetch and return matching active employees
  RETURN QUERY
  SELECT 
    p.id, 
    p.first_name, 
    p.last_name
  FROM public.profiles p
  WHERE p.dob IS NOT NULL
    AND p.is_active = true
    AND p.status != 'terminated'
    AND extract(month from p.dob) = extract(month from current_date)
    AND extract(day from p.dob) = extract(day from current_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enforce explicit permissions
REVOKE EXECUTE ON FUNCTION public.get_today_birthdays() FROM public;
GRANT EXECUTE ON FUNCTION public.get_today_birthdays() TO authenticated;
