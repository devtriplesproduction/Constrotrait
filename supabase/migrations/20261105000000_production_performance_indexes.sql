-- Migration: 20261105000000_production_performance_indexes.sql
-- Description: Production performance indexes and sequence query optimizations for high-concurrency 1000-employee workload.

-- 1. Foreign Key and Lookup Indexes on job_entry_tests
CREATE INDEX IF NOT EXISTS idx_job_entry_tests_job_entry_id 
  ON public.job_entry_tests(job_entry_id);

CREATE INDEX IF NOT EXISTS idx_job_entry_tests_test_master_id 
  ON public.job_entry_tests(test_master_id);

-- 2. Composite Indexes on Attendance for Monthly Payroll & Daily Verification
CREATE INDEX IF NOT EXISTS idx_attendance_date_emp 
  ON public.attendance(date, employee_id);

CREATE INDEX IF NOT EXISTS idx_attendance_emp_date 
  ON public.attendance(employee_id, date);

-- 3. Composite Indexes on EOD Reports for Streaks & Review Filtering
CREATE INDEX IF NOT EXISTS idx_eod_reports_emp_date 
  ON public.eod_reports(employee_id, report_date);

CREATE INDEX IF NOT EXISTS idx_eod_reports_status_report_date 
  ON public.eod_reports(status, report_date DESC);

-- 4. Composite Indexes on Leave Requests for Status & Range Lookups
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp_status 
  ON public.leave_requests(employee_id, status);

CREATE INDEX IF NOT EXISTS idx_leave_requests_date_range 
  ON public.leave_requests(start_date, end_date);

-- 5. Index on Profiles for Branch Active Employee Lookups
CREATE INDEX IF NOT EXISTS idx_profiles_branch_active 
  ON public.profiles(branch_id, is_active);

-- 6. High-Performance O(1) peek_uid_seq without sequential regex scans
CREATE OR REPLACE FUNCTION public.peek_uid_seq(p_name text, p_year int, p_branch_id uuid DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_val int;
BEGIN
  SELECT counter_value INTO v_val
  FROM public.lab_uid_counters
  WHERE counter_name = p_name 
    AND counter_year = p_year 
    AND COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(p_branch_id, '00000000-0000-0000-0000-000000000000'::uuid);

  RETURN COALESCE(v_val, 0) + 1;
END;
$$;
