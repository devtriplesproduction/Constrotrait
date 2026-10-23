-- 20261023160000_inward_expenses_and_ledgers.sql
-- Inward expenses, company expenses, and ledger tracking

-- 1. Add inward_id and expense_type to accounting_expenses
ALTER TABLE public.accounting_expenses
  ADD COLUMN IF NOT EXISTS inward_id uuid REFERENCES public.job_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expense_type text DEFAULT 'company' CHECK (expense_type IN ('inward', 'company'));

CREATE INDEX IF NOT EXISTS idx_accounting_expenses_inward_id ON public.accounting_expenses(inward_id);
CREATE INDEX IF NOT EXISTS idx_accounting_expenses_type ON public.accounting_expenses(expense_type);

-- 2. Add inward_id to inward_receipts
ALTER TABLE public.inward_receipts
  ADD COLUMN IF NOT EXISTS inward_id uuid REFERENCES public.job_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inward_receipts_inward_id ON public.inward_receipts(inward_id);

-- 3. Populate default Inward and Company expense categories
INSERT INTO public.expense_categories (branch_id, name, requires_approval, max_amount_without_bill, scope)
SELECT NULL, name, requires_approval, max_amount_without_bill, scope
FROM (VALUES
  ('Sampling & Field Logistics', false, null::numeric, 'general'),
  ('Testing Consumables & Chemicals', false, null, 'general'),
  ('External Lab Testing', true, null, 'general'),
  ('Site Equipment & Vehicle Hire', false, null, 'site'),
  ('Sample Freight & Courier', false, null, 'general'),
  ('Office Stationery & Supplies', false, null, 'general'),
  ('Software & IT Subscriptions', false, null, 'general'),
  ('Tea & Pantry Refreshments', false, null, 'branch'),
  ('Office Maintenance & Repairs', false, null, 'branch'),
  ('Legal & Accounting Charges', true, null, 'general')
) AS v(name, requires_approval, max_amount_without_bill, scope)
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec WHERE ec.name = v.name AND ec.branch_id IS NULL
);

-- 4. Explicit grants for authenticated and service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_expenses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inward_receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inward_receipts TO service_role;
