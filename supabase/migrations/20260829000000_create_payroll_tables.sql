-- Migration: 20260829000000_create_payroll_tables.sql
-- Description: Creates Payroll Cycles, Snapshots, Salary Slips, and Financial Ledger tables.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- PAYROLL CYCLES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.payroll_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked', 'paid')),
  locked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  slip_status TEXT DEFAULT 'generated',
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE (month, year)
);
CREATE INDEX IF NOT EXISTS idx_payroll_cycles_month_year ON public.payroll_cycles(month, year);

-- ==========================================
-- PAYROLL SNAPSHOTS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.payroll_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.payroll_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_name TEXT,
  employee_id_external TEXT,
  department TEXT,
  designation TEXT,
  base_salary NUMERIC(12, 2) DEFAULT 0,
  days_present NUMERIC(5, 2) DEFAULT 0,
  days_field NUMERIC(5, 2) DEFAULT 0,
  days_paid_leave NUMERIC(5, 2) DEFAULT 0,
  days_unpaid_leave NUMERIC(5, 2) DEFAULT 0,
  days_absent NUMERIC(5, 2) DEFAULT 0,
  net_payable NUMERIC(12, 2) DEFAULT 0,
  basic_salary NUMERIC(12, 2) DEFAULT 0,
  hra NUMERIC(12, 2) DEFAULT 0,
  allowance NUMERIC(12, 2) DEFAULT 0,
  bonus NUMERIC(12, 2) DEFAULT 0,
  gross_salary NUMERIC(12, 2) DEFAULT 0,
  pf NUMERIC(12, 2) DEFAULT 0,
  esi NUMERIC(12, 2) DEFAULT 0,
  professional_tax NUMERIC(12, 2) DEFAULT 0,
  income_tax NUMERIC(12, 2) DEFAULT 0,
  other_deductions NUMERIC(12, 2) DEFAULT 0,
  damage_recovery NUMERIC(12, 2) DEFAULT 0,
  salary_advance_recovery NUMERIC(12, 2) DEFAULT 0,
  total_deductions NUMERIC(12, 2) DEFAULT 0,
  net_salary NUMERIC(12, 2) DEFAULT 0,
  overtime_hours NUMERIC(12, 2) DEFAULT 0,
  overtime_pay NUMERIC(12, 2) DEFAULT 0,
  is_reviewed BOOLEAN DEFAULT false,
  remarks TEXT,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE (cycle_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_payroll_snapshots_cycle_id ON public.payroll_snapshots(cycle_id);
CREATE INDEX IF NOT EXISTS idx_payroll_snapshots_employee_id ON public.payroll_snapshots(employee_id);

-- ==========================================
-- SALARY SLIPS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.salary_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.payroll_cycles(id) ON DELETE CASCADE,
  snapshot_id UUID NOT NULL REFERENCES public.payroll_snapshots(id) ON DELETE CASCADE,
  pdf_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  emailed BOOLEAN DEFAULT false,
  emailed_at TIMESTAMPTZ,
  emailed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  shared BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'generated',
  
  UNIQUE(snapshot_id)
);

-- ==========================================
-- EMPLOYEE FINANCIAL LEDGER
-- ==========================================
CREATE TABLE IF NOT EXISTS public.employee_financial_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL, 
  adjustment_category TEXT NOT NULL CHECK (adjustment_category IN ('recoverable', 'one_time')),
  original_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  suggested_installment_amount NUMERIC(12, 2),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_recovered', 'completed', 'cancelled')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- PAYROLL ADJUSTMENT APPLICATIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.payroll_adjustment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ledger_id UUID REFERENCES public.employee_financial_ledger(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.payroll_cycles(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL,
  adjustment_category TEXT NOT NULL CHECK (adjustment_category IN ('recoverable', 'one_time')),
  applied_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'applied')),
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- TRIGGERS
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_employee_financial_ledger_updated_at
    BEFORE UPDATE ON public.employee_financial_ledger
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_payroll_adjustment_apps_updated_at
    BEFORE UPDATE ON public.payroll_adjustment_applications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.payroll_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_adjustment_applications ENABLE ROW LEVEL SECURITY;

-- Admins and HR can manage all payroll data
CREATE POLICY "Admins and HR can manage all payroll data"
  ON public.payroll_cycles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
    )
  );

CREATE POLICY "Admins and HR can manage all snapshots"
  ON public.payroll_snapshots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
    )
  );

CREATE POLICY "Admins and HR can manage all salary slips"
  ON public.salary_slips FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
    )
  );

CREATE POLICY "Admins and HR can manage all financial ledgers"
  ON public.employee_financial_ledger FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
    )
  );

CREATE POLICY "Admins and HR can manage all adjustment apps"
  ON public.payroll_adjustment_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
    )
  );

-- Employees can only view their own finalised data
CREATE POLICY "Employees can view own locked snapshots"
  ON public.payroll_snapshots FOR SELECT
  USING (
    employee_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.payroll_cycles
      WHERE id = cycle_id AND status IN ('locked', 'paid')
    )
  );

CREATE POLICY "Employees can view own salary slips"
  ON public.salary_slips FOR SELECT
  USING (employee_id = auth.uid());

CREATE POLICY "Employees can view own financial ledgers"
  ON public.employee_financial_ledger FOR SELECT
  USING (employee_id = auth.uid());
