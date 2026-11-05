-- Fix foreign keys for job_assignments and team_members to reference public.profiles
-- Enables PostgREST schema cache to recognize relationships for joins

ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_employee_id_fkey;
ALTER TABLE public.team_members 
  ADD CONSTRAINT team_members_employee_id_fkey 
  FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.job_assignments DROP CONSTRAINT IF EXISTS job_assignments_assigned_to_fkey;
ALTER TABLE public.job_assignments 
  ADD CONSTRAINT job_assignments_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.job_assignments DROP CONSTRAINT IF EXISTS job_assignments_assigned_by_fkey;
ALTER TABLE public.job_assignments 
  ADD CONSTRAINT job_assignments_assigned_by_fkey 
  FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
