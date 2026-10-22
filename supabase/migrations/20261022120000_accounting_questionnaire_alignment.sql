-- Accounting module questionnaire alignment updates
-- Adds missing fields, corrects approval threshold, seeds categories and bank accounts

-- Receipts: party type (client / government), payment modes include NEFT/RTGS, cancel reason, paid-through person
ALTER TABLE public.inward_receipts
  ADD COLUMN IF NOT EXISTS party_type text CHECK (party_type IN ('client', 'government', 'other')),
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS paid_through_person text,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.profiles(id);

-- Expand payment_mode check
ALTER TABLE public.inward_receipts DROP CONSTRAINT IF EXISTS inward_receipts_payment_mode_check;
ALTER TABLE public.inward_receipts
  ADD CONSTRAINT inward_receipts_payment_mode_check
  CHECK (payment_mode IN ('cash', 'bank', 'upi', 'cheque', 'neft', 'rtgs'));

-- Expenses: site, department, paid-through person, cancel reason, general vs project
ALTER TABLE public.accounting_expenses
  ADD COLUMN IF NOT EXISTS site_name text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS paid_through_person text,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS is_general_expense boolean DEFAULT false;

-- Expense categories: scope
ALTER TABLE public.expense_categories
  ADD COLUMN IF NOT EXISTS scope text DEFAULT 'general' CHECK (scope IN ('general', 'site', 'department', 'branch'));

-- Seed default expense categories
INSERT INTO public.expense_categories (branch_id, name, requires_approval, max_amount_without_bill, scope)
SELECT NULL, name, requires_approval, max_amount_without_bill, scope
FROM (VALUES
  ('Subcontractor', true, null::numeric, 'general'),
  ('Consultant', true, null, 'general'),
  ('Electricity', false, null, 'branch'),
  ('Rent', false, null, 'branch'),
  ('Salaries', false, null, 'branch'),
  ('Travel', true, 500, 'general'),
  ('Site Expenses', false, null, 'site'),
  ('Department Expenses', false, null, 'department')
) AS v(name, requires_approval, max_amount_without_bill, scope)
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec WHERE ec.name = v.name AND ec.branch_id IS NULL
);

-- Project financial balance function
CREATE OR REPLACE FUNCTION public.get_project_financial_balance(p_project_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((
    SELECT SUM(amount) FROM public.inward_receipts
    WHERE project_id = p_project_id AND status = 'received'
  ), 0)
  -
  COALESCE((
    SELECT SUM(amount) FROM public.accounting_expenses
    WHERE project_id = p_project_id AND status = 'recorded' AND approval_status IN ('approved', 'pending')
  ), 0);
$$;

-- Weekly pending payments helper
CREATE OR REPLACE FUNCTION public.get_pending_payments_for_notification(p_branch_id uuid)
RETURNS TABLE (
  invoice_id uuid,
  invoice_no text,
  client_id uuid,
  balance_amount numeric,
  due_date date,
  status text
)
LANGUAGE sql
STABLE
AS $$
  SELECT i.id, i.invoice_no, i.client_id, i.balance_amount, i.due_date, i.status
  FROM public.invoices i
  WHERE i.branch_id = p_branch_id
    AND i.status IN ('unpaid', 'partial')
    AND i.balance_amount > 0;
$$;
