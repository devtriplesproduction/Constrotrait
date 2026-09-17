-- Migration: 20260909000005_fix_payroll_rls_branch_isolation.sql
-- Description: Enforces branch isolation for HR and BRANCH_MANAGER_ADMINISTRATIVE roles on payroll tables.

-- 1. Drop existing permissive policies
DROP POLICY IF EXISTS "Admins and HR can manage all payroll data" ON public.payroll_cycles;
DROP POLICY IF EXISTS "Admins and HR can manage all snapshots" ON public.payroll_snapshots;
DROP POLICY IF EXISTS "Admins and HR can manage all salary slips" ON public.salary_slips;
DROP POLICY IF EXISTS "Admins and HR can manage all financial ledgers" ON public.employee_financial_ledger;
DROP POLICY IF EXISTS "Admins and HR can manage all adjustment apps" ON public.payroll_adjustment_applications;

-- 2. Create strictly isolated policies for payroll_cycles
CREATE POLICY "Super Admins can manage all payroll_cycles"
  ON public.payroll_cycles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND roles @> '{"SUPER_ADMIN"}'
    )
  );

CREATE POLICY "HR and Branch Managers can manage branch payroll_cycles"
  ON public.payroll_cycles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (roles @> '{"HR"}' OR roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
      AND branch_id = payroll_cycles.branch_id
    )
  );

-- 3. Create strictly isolated policies for payroll_snapshots
CREATE POLICY "Super Admins can manage all payroll_snapshots"
  ON public.payroll_snapshots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND roles @> '{"SUPER_ADMIN"}'
    )
  );

CREATE POLICY "HR and Branch Managers can manage branch payroll_snapshots"
  ON public.payroll_snapshots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.payroll_cycles pc ON pc.id = payroll_snapshots.cycle_id
      WHERE p.id = auth.uid() 
      AND (p.roles @> '{"HR"}' OR p.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
      AND p.branch_id = pc.branch_id
    )
  );

-- 4. Create strictly isolated policies for salary_slips
CREATE POLICY "Super Admins can manage all salary_slips"
  ON public.salary_slips FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND roles @> '{"SUPER_ADMIN"}'
    )
  );

CREATE POLICY "HR and Branch Managers can manage branch salary_slips"
  ON public.salary_slips FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.payroll_cycles pc ON pc.id = salary_slips.cycle_id
      WHERE p.id = auth.uid() 
      AND (p.roles @> '{"HR"}' OR p.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
      AND p.branch_id = pc.branch_id
    )
  );

-- 5. Create strictly isolated policies for employee_financial_ledger
CREATE POLICY "Super Admins can manage all financial ledgers"
  ON public.employee_financial_ledger FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND roles @> '{"SUPER_ADMIN"}'
    )
  );

CREATE POLICY "HR and Branch Managers can manage branch financial ledgers"
  ON public.employee_financial_ledger FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      JOIN public.profiles p_emp ON p_emp.id = employee_financial_ledger.employee_id
      WHERE p_admin.id = auth.uid() 
      AND (p_admin.roles @> '{"HR"}' OR p_admin.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
      AND p_admin.branch_id = p_emp.branch_id
    )
  );

-- 6. Create strictly isolated policies for payroll_adjustment_applications
CREATE POLICY "Super Admins can manage all adjustment apps"
  ON public.payroll_adjustment_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND roles @> '{"SUPER_ADMIN"}'
    )
  );

CREATE POLICY "HR and Branch Managers can manage branch adjustment apps"
  ON public.payroll_adjustment_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      JOIN public.payroll_cycles pc ON pc.id = payroll_adjustment_applications.cycle_id
      WHERE p_admin.id = auth.uid() 
      AND (p_admin.roles @> '{"HR"}' OR p_admin.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
      AND p_admin.branch_id = pc.branch_id
    )
  );
