-- Drop the old overloaded version of the function that only took one argument.
DROP FUNCTION IF EXISTS public.verify_medical_certificate(UUID);
