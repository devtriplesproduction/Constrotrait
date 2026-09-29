-- Migration to add new profile fields and create salary_hikes table for advanced EmployeeProfileModal

-- 1. Add new columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS dob DATE,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS salary NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS experience NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'full-time';

-- 2. Create salary_hikes table
CREATE TABLE IF NOT EXISTS public.salary_hikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    previous_salary NUMERIC NOT NULL,
    new_salary NUMERIC NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS for salary_hikes
ALTER TABLE public.salary_hikes ENABLE ROW LEVEL SECURITY;

-- Admins and HR can read all salary hikes
CREATE POLICY "Admins and HR can read all salary hikes"
ON public.salary_hikes FOR SELECT
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN', 'HR']
);

-- Admins and HR can insert salary hikes
CREATE POLICY "Admins and HR can insert salary hikes"
ON public.salary_hikes FOR INSERT
WITH CHECK (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN', 'HR']
);

-- Users can read their own salary hikes
CREATE POLICY "Users can read own salary hikes"
ON public.salary_hikes FOR SELECT
USING (auth.uid() = employee_id);
