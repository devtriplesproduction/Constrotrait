-- Migration: 20261105180000_performance_optimization_indexes.sql
-- Description: Add missing indexes on critical foreign keys, lookup columns, and order fields
-- to resolve severe latency and query execution timeouts across job entries, tests, assignments,
-- invoices, and quotations.

-- 1. job_entry_tests foreign keys and lookup indexes
CREATE INDEX IF NOT EXISTS idx_job_entry_tests_job_entry_id ON public.job_entry_tests(job_entry_id);
CREATE INDEX IF NOT EXISTS idx_job_entry_tests_test_master_id ON public.job_entry_tests(test_master_id);
CREATE INDEX IF NOT EXISTS idx_job_entry_tests_date_of_testing ON public.job_entry_tests(date_of_testing);
CREATE INDEX IF NOT EXISTS idx_job_entry_tests_uid_label ON public.job_entry_tests(uid_label);
CREATE INDEX IF NOT EXISTS idx_job_entry_tests_created_at ON public.job_entry_tests(created_at DESC);

-- 2. job_entries foreign keys, lookup, and sorting indexes
CREATE INDEX IF NOT EXISTS idx_job_entries_client_id ON public.job_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_job_entries_uid_label ON public.job_entries(uid_label);
CREATE INDEX IF NOT EXISTS idx_job_entries_created_at ON public.job_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_entries_branch_is_nabl ON public.job_entries(branch_id, is_nabl);

-- 3. job_assignments foreign keys and status/due date indexes
CREATE INDEX IF NOT EXISTS idx_job_assignments_test_id ON public.job_assignments(job_entry_test_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_assigned_to ON public.job_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_job_assignments_team_id ON public.job_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_status ON public.job_assignments(status);
CREATE INDEX IF NOT EXISTS idx_job_assignments_created_at ON public.job_assignments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_assignments_due_date ON public.job_assignments(due_date);

-- 4. invoices foreign keys and status indexes
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_inward_id ON public.invoices(inward_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

-- 5. inward_receipts foreign keys and date indexes
CREATE INDEX IF NOT EXISTS idx_inward_receipts_client_id ON public.inward_receipts(client_id);
CREATE INDEX IF NOT EXISTS idx_inward_receipts_created_at ON public.inward_receipts(created_at DESC);

-- 6. invoice_payments junction indexes
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON public.invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_receipt_id ON public.invoice_payments(receipt_id);

-- 7. quotations foreign keys and date indexes
CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON public.quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON public.quotations(created_at DESC);

-- 8. delivery_challans client relation index
CREATE INDEX IF NOT EXISTS idx_delivery_challans_client_id ON public.delivery_challans(client_id);

-- 9. lab_uid_counters composite lookup index
CREATE INDEX IF NOT EXISTS idx_lab_uid_counters_lookup ON public.lab_uid_counters(counter_name, counter_year, branch_id);

-- 10. team_members junction index
CREATE INDEX IF NOT EXISTS idx_team_members_emp_team ON public.team_members(employee_id, team_id);

-- 11. Optimize peek_uid_seq to perform O(1) lookup in lab_uid_counters before expensive table scan fallbacks
CREATE OR REPLACE FUNCTION public.peek_uid_seq(p_name text, p_year integer, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    DECLARE
      v_val int;
      v_max_saved int := 0;
      v_effective_branch uuid := p_branch_id;
    BEGIN
      IF v_effective_branch IS NULL THEN
        SELECT id INTO v_effective_branch FROM public.branches WHERE code = 'CMTS-01' LIMIT 1;
      END IF;

      -- O(1) fast lookup if already initialized in lab_uid_counters
      SELECT counter_value INTO v_val
      FROM public.lab_uid_counters
      WHERE counter_name = p_name
        AND counter_year = p_year
        AND branch_id IS NOT DISTINCT FROM v_effective_branch;

      IF v_val IS NOT NULL THEN
        RETURN v_val + 1;
      END IF;

      -- Fallback only when not initialized yet
      IF p_name = 'UID_NABL' THEN
        SELECT COALESCE(MAX(uid), 0) INTO v_max_saved
        FROM public.job_entries
        WHERE is_nabl = true
          AND (v_effective_branch IS NULL OR branch_id = v_effective_branch);
      ELSIF p_name LIKE 'SAMPLE_%' THEN
        SELECT COALESCE(MAX(
          CAST(SUBSTRING(t.additional_details_values->>'sample_code_no' FROM '/([0-9]+)(?:-[I|V|X]+)?$') AS int)
        ), 0) INTO v_max_saved
        FROM public.job_entry_tests t
        JOIN public.job_entries j ON t.job_entry_id = j.id
        WHERE (v_effective_branch IS NULL OR j.branch_id = v_effective_branch);
      END IF;

      v_val := v_max_saved;
      INSERT INTO public.lab_uid_counters (counter_name, counter_year, counter_value, branch_id)
      VALUES (p_name, p_year, v_val, v_effective_branch)
      ON CONFLICT (counter_name, counter_year, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid))
      DO UPDATE SET counter_value = GREATEST(public.lab_uid_counters.counter_value, EXCLUDED.counter_value);

      RETURN COALESCE(v_val, 0) + 1;
    END;
$function$;

