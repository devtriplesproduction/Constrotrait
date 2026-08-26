-- Migration: 20260826000000_leave_management.sql
-- Description: Adds reporting_manager_id to profiles, creates holidays, leave_requests, and comp_off_ledger tables, and creates the sick_leave_certificates bucket.

-- ==========================================
-- 1. ADD REPORTING MANAGER TO PROFILES
-- ==========================================
ALTER TABLE public.profiles
ADD COLUMN reporting_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_reporting_manager_id ON public.profiles(reporting_manager_id);

-- ==========================================
-- 2. HOLIDAYS TABLE
-- ==========================================
CREATE TABLE public.holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    department TEXT, -- NULL means applies to all departments
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE, -- NULL means applies to all branches
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_holidays_date ON public.holidays(date);
CREATE INDEX idx_holidays_branch_id ON public.holidays(branch_id);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active holidays"
ON public.holidays FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "HR and Super Admins can insert holidays"
ON public.holidays FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
    )
);

CREATE POLICY "HR and Super Admins can update holidays"
ON public.holidays FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
    )
);

CREATE POLICY "HR and Super Admins can delete holidays"
ON public.holidays FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
    )
);

-- ==========================================
-- 3. LEAVE REQUESTS TABLE
-- ==========================================
CREATE TYPE public.leave_type_enum AS ENUM (
    'SICK_LEAVE', 
    'CASUAL_LEAVE', 
    'UNPAID_LEAVE', 
    'COMPENSATORY_OFF'
);

CREATE TYPE public.leave_status_enum AS ENUM (
    'PENDING', 
    'APPROVED', 
    'REJECTED', 
    'CANCELLED'
);

CREATE TABLE public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    leave_type public.leave_type_enum NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_half_day BOOLEAN DEFAULT false,
    reason TEXT NOT NULL,
    status public.leave_status_enum NOT NULL DEFAULT 'PENDING',
    certificate_url TEXT,
    is_paid BOOLEAN, -- Sick leave specifics
    first_approver_id UUID REFERENCES public.profiles(id),
    first_approval_status public.leave_status_enum DEFAULT 'PENDING',
    first_approval_date TIMESTAMPTZ,
    final_approver_id UUID REFERENCES public.profiles(id),
    final_approval_status public.leave_status_enum DEFAULT 'PENDING',
    final_approval_date TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    CONSTRAINT valid_leave_dates CHECK (start_date <= end_date)
);

CREATE INDEX idx_leave_requests_employee_id ON public.leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Employee can view their own leave requests
CREATE POLICY "Users can view their own leave requests"
ON public.leave_requests FOR SELECT
USING (auth.uid() = employee_id);

-- HR, Super Admins, and Branch Managers can view leave requests (branch scoping should be done in service/RPC)
CREATE POLICY "Managers and Admins can view leave requests"
ON public.leave_requests FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}' OR roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
    )
);

-- Employee can insert their own leave requests
CREATE POLICY "Users can insert their own leave requests"
ON public.leave_requests FOR INSERT
WITH CHECK (auth.uid() = employee_id);

-- Only HR, Super Admin, Branch Manager, or Reporting Manager can update leave requests (approval/rejection)
CREATE POLICY "Managers and Admins can update leave requests"
ON public.leave_requests FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}' OR roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
    ) OR 
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = leave_requests.employee_id AND p.reporting_manager_id = auth.uid()
    )
);

-- ==========================================
-- 4. COMP-OFF LEDGER TABLE
-- ==========================================
CREATE TYPE public.comp_off_transaction_type AS ENUM (
    'CREDIT', 
    'DEBIT', 
    'REVERSAL'
);

CREATE TABLE public.comp_off_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    transaction_type public.comp_off_transaction_type NOT NULL,
    amount_hours NUMERIC NOT NULL CHECK (amount_hours > 0),
    reference_eod_id UUID REFERENCES public.eod_reports(id),
    reference_leave_id UUID REFERENCES public.leave_requests(id),
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_comp_off_ledger_employee_id ON public.comp_off_ledger(employee_id);

ALTER TABLE public.comp_off_ledger ENABLE ROW LEVEL SECURITY;

-- Employee can view their own ledger
CREATE POLICY "Users can view their own comp_off_ledger"
ON public.comp_off_ledger FOR SELECT
USING (auth.uid() = employee_id);

-- Admins/HR/Branch Managers can view
CREATE POLICY "Managers and Admins can view comp_off_ledger"
ON public.comp_off_ledger FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}' OR roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
    )
);

-- Insertions strictly managed via RPC/Service-role. No direct client INSERT/UPDATE/DELETE.
-- (No INSERT/UPDATE/DELETE policies, ensuring strict server-side logic)

-- ==========================================
-- 5. STORAGE BUCKET FOR SICK LEAVE CERTIFICATES
-- ==========================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sick_leave_certificates', 'sick_leave_certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Employees can upload their own certificates
CREATE POLICY "Authenticated users can upload sick_leave_certificates"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'sick_leave_certificates' 
  AND auth.uid() = owner
);

-- Employees can view their own certificates
CREATE POLICY "Users can view their own sick_leave_certificates"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'sick_leave_certificates' 
  AND auth.uid() = owner
);

-- HR, Super Admins, Branch Managers can view all certificates
CREATE POLICY "Managers and Admins can view sick_leave_certificates"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'sick_leave_certificates' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}' OR roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
  )
);
