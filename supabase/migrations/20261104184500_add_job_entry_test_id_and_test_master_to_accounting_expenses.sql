-- Migration: 20261104184500_add_job_entry_test_id_and_test_master_to_accounting_expenses.sql
-- Add job_entry_test_id and test_master_id to accounting_expenses for test-specific direct expense allocation
-- Expand expense_type CHECK constraint to support 'test' and 'inhouse'

ALTER TABLE public.accounting_expenses
  ADD COLUMN IF NOT EXISTS job_entry_test_id uuid REFERENCES public.job_entry_tests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS test_master_id uuid REFERENCES public.test_master(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_accounting_expenses_job_entry_test_id ON public.accounting_expenses(job_entry_test_id);
CREATE INDEX IF NOT EXISTS idx_accounting_expenses_test_master_id ON public.accounting_expenses(test_master_id);

ALTER TABLE public.accounting_expenses
  DROP CONSTRAINT IF EXISTS accounting_expenses_expense_type_check;

ALTER TABLE public.accounting_expenses
  ADD CONSTRAINT accounting_expenses_expense_type_check
  CHECK (expense_type = ANY (ARRAY['inward'::text, 'company'::text, 'test'::text, 'inhouse'::text]));

