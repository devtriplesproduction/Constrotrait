-- Migration: 20260827000000_create_leave_management.sql
-- Description: Creates Leave Requests, Comp-Off Ledger, and Medical Certificates bucket.

-- ==========================================
-- LEAVE REQUESTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL CHECK (leave_type IN ('Sick Leave', 'Casual Leave', 'Unpaid Leave', 'Compensatory Off')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_half_day BOOLEAN NOT NULL DEFAULT false,
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pending First Level', 'Pending HR', 'Approved', 'Rejected', 'Cancelled')) DEFAULT 'Pending First Level',
    medical_certificate_url TEXT,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    certificate_verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    first_level_approver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    hr_approver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT chk_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS leave_requests_employee_id_idx ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS leave_requests_status_idx ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS leave_requests_start_date_idx ON public.leave_requests(start_date);

-- ==========================================
-- COMP-OFF LEDGER TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.comp_off_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT', 'REVERSAL')),
    hours NUMERIC NOT NULL CHECK (hours > 0),
    reference_id UUID NOT NULL, -- references eod_reports(id) or leave_requests(id)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure idempotent credits (only 1 credit per EOD report)
CREATE UNIQUE INDEX uq_comp_off_credit ON public.comp_off_ledger (employee_id, reference_id) WHERE transaction_type = 'CREDIT';

CREATE INDEX IF NOT EXISTS comp_off_ledger_employee_id_idx ON public.comp_off_ledger(employee_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comp_off_ledger ENABLE ROW LEVEL SECURITY;

-- Leave Requests Policies

-- Employees can view their own leaves
CREATE POLICY "Users can view their own leaves" 
ON public.leave_requests FOR SELECT 
USING (auth.uid() = employee_id);

-- Employees can insert their own leaves
CREATE POLICY "Users can insert their own leaves" 
ON public.leave_requests FOR INSERT 
WITH CHECK (auth.uid() = employee_id);

-- HR and SUPER_ADMIN can view all leaves
CREATE POLICY "HR and Super Admins can view all leaves" 
ON public.leave_requests FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
  )
);

-- HR and SUPER_ADMIN can update leaves (final approval/rejection)
CREATE POLICY "HR and Super Admins can update leaves" 
ON public.leave_requests FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
  )
);

-- Branch Managers can view and update (first level) leaves for their branch employees
CREATE POLICY "Branch Managers can view branch leaves" 
ON public.leave_requests FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles approver
    JOIN public.profiles emp ON emp.id = leave_requests.employee_id
    WHERE approver.id = auth.uid() 
    AND approver.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}'
    AND approver.branch_id = emp.branch_id
  )
);

CREATE POLICY "Branch Managers can update branch leaves" 
ON public.leave_requests FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles approver
    JOIN public.profiles emp ON emp.id = leave_requests.employee_id
    WHERE approver.id = auth.uid() 
    AND approver.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}'
    AND approver.branch_id = emp.branch_id
  )
);

-- Comp-Off Ledger Policies

-- Employees can view their own ledger
CREATE POLICY "Users can view their own comp-off ledger" 
ON public.comp_off_ledger FOR SELECT 
USING (auth.uid() = employee_id);

-- HR and SUPER_ADMIN can view all ledgers
CREATE POLICY "HR and Super Admins can view all comp-off ledgers" 
ON public.comp_off_ledger FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
  )
);

-- Branch Managers can view ledgers for their branch
CREATE POLICY "Branch Managers can view branch comp-off ledgers" 
ON public.comp_off_ledger FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles approver
    JOIN public.profiles emp ON emp.id = comp_off_ledger.employee_id
    WHERE approver.id = auth.uid() 
    AND approver.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}'
    AND approver.branch_id = emp.branch_id
  )
);

-- Ledger modifications are STRICTLY via server-side secure operations (Service Role / RPC).
-- No INSERT/UPDATE/DELETE from authenticated users directly.

-- ==========================================
-- STORAGE BUCKET FOR MEDICAL CERTIFICATES
-- ==========================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medical_certificates', 'medical_certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Employees can upload their own certificates
CREATE POLICY "Authenticated users can upload medical certificates"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'medical_certificates' 
  AND auth.uid() = owner
);

-- Employees can view their own certificates
CREATE POLICY "Users can view their own medical certificates"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'medical_certificates' 
  AND auth.uid() = owner
);

-- HR and Super Admins can view all certificates
CREATE POLICY "HR and Super Admins can view all medical certificates"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'medical_certificates' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
  )
);
