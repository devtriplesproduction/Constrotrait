-- Create ENUM for roles
CREATE TYPE public.user_role AS ENUM (
  'SUPER_ADMIN',
  'BRANCH_MANAGER_ADMINISTRATIVE',
  'HR',
  'QUALITY_MANAGER',
  'TECHNICAL_MANAGER',
  'ADMIN_INWARD_CRE',
  'ACCOUNTANT',
  'TEST_ENGINEER',
  'LAB_ANALYST',
  'LAB_ASSISTANT',
  'SAMPLER',
  'MARKETING_EXECUTIVE',
  'DIGITAL_MARKETING'
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role public.user_role NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone_number TEXT,
    employee_id TEXT UNIQUE,
    department TEXT,
    designation TEXT,
    joining_date DATE,
    status TEXT DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Super Admins and HR can read all profiles via JWT claims to avoid recursive RLS
CREATE POLICY "Super Admins and HR can view all profiles"
ON public.profiles FOR SELECT
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'HR')
);
