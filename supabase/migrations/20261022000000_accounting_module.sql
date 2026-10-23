-- Accounting Module Migration
-- Branch-isolated financial tracking for Constrotrait LIMS

-- Projects (project-wise financial tracking)
CREATE TABLE IF NOT EXISTS public.accounting_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz DEFAULT now()
);

-- Financial accounts (cash / bank)
CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('cash', 'bank')),
  bank_name text,
  account_number text,
  ifsc text,
  opening_balance numeric(15,2) DEFAULT 0,
  current_balance numeric(15,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

-- Expense categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  requires_approval boolean DEFAULT false,
  max_amount_without_bill numeric(15,2),
  created_at timestamptz DEFAULT now()
);

-- Inward receipts (REC/2026-27/0001)
CREATE TABLE IF NOT EXISTS public.inward_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  receipt_no text NOT NULL,
  project_id uuid REFERENCES public.accounting_projects(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  amount numeric(15,2) NOT NULL,
  payment_mode text CHECK (payment_mode IN ('cash', 'bank', 'upi', 'cheque')),
  account_id uuid REFERENCES public.financial_accounts(id),
  receipt_date date DEFAULT CURRENT_DATE,
  remarks text,
  gst_amount numeric(15,2) DEFAULT 0,
  tds_amount numeric(15,2) DEFAULT 0,
  status text DEFAULT 'received' CHECK (status IN ('received', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  UNIQUE (branch_id, receipt_no)
);

-- Accounting expenses
CREATE TABLE IF NOT EXISTS public.accounting_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.accounting_projects(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.expense_categories(id),
  amount numeric(15,2) NOT NULL,
  description text,
  expense_date date DEFAULT CURRENT_DATE,
  payment_mode text,
  account_id uuid REFERENCES public.financial_accounts(id),
  vendor_name text,
  bill_number text,
  bill_attached boolean DEFAULT false,
  requires_approval boolean DEFAULT false,
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  gst_amount numeric(15,2) DEFAULT 0,
  tds_amount numeric(15,2) DEFAULT 0,
  is_reimbursement boolean DEFAULT false,
  employee_id uuid REFERENCES public.profiles(id),
  status text DEFAULT 'recorded' CHECK (status IN ('recorded', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

-- Expense payment entries
CREATE TABLE IF NOT EXISTS public.expense_payment_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid REFERENCES public.accounting_expenses(id) ON DELETE CASCADE,
  amount numeric(15,2) NOT NULL,
  account_id uuid REFERENCES public.financial_accounts(id),
  payment_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Quotations
CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  quotation_no text NOT NULL,
  project_id uuid REFERENCES public.accounting_projects(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  amount numeric(15,2) NOT NULL,
  valid_until date,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  remarks text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  UNIQUE (branch_id, quotation_no)
);

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  invoice_no text NOT NULL,
  project_id uuid REFERENCES public.accounting_projects(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  amount numeric(15,2) NOT NULL,
  gst_amount numeric(15,2) DEFAULT 0,
  tds_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) GENERATED ALWAYS AS (amount + COALESCE(gst_amount,0) - COALESCE(tds_amount,0)) STORED,
  paid_amount numeric(15,2) DEFAULT 0,
  balance_amount numeric(15,2) GENERATED ALWAYS AS (amount + COALESCE(gst_amount,0) - COALESCE(tds_amount,0) - COALESCE(paid_amount,0)) STORED,
  invoice_date date DEFAULT CURRENT_DATE,
  due_date date,
  status text DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'cancelled')),
  remarks text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  UNIQUE (branch_id, invoice_no)
);

-- Invoice payments
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric(15,2) NOT NULL,
  payment_date date DEFAULT CURRENT_DATE,
  payment_mode text,
  account_id uuid REFERENCES public.financial_accounts(id),
  receipt_id uuid REFERENCES public.inward_receipts(id),
  remarks text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

-- Audit log
CREATE TABLE IF NOT EXISTS public.accounting_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  performed_by uuid REFERENCES public.profiles(id),
  performed_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.next_receipt_no(p_branch_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fy text;
  seq int;
  result text;
BEGIN
  fy := to_char(CURRENT_DATE, 'YYYY') || '-' || to_char(CURRENT_DATE + interval '1 year', 'YY');
  IF EXTRACT(MONTH FROM CURRENT_DATE) < 4 THEN
    fy := to_char(CURRENT_DATE - interval '1 year', 'YYYY') || '-' || to_char(CURRENT_DATE, 'YY');
  END IF;
  SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_no FROM '[0-9]+$') AS int)), 0) + 1 INTO seq
  FROM public.inward_receipts
  WHERE branch_id = p_branch_id AND receipt_no LIKE 'REC/' || fy || '/%';
  result := 'REC/' || fy || '/' || LPAD(seq::text, 4, '0');
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_invoice_payment_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.invoices
  SET paid_amount = COALESCE((SELECT SUM(amount) FROM public.invoice_payments WHERE invoice_id = NEW.invoice_id), 0),
  status = CASE
    WHEN COALESCE((SELECT SUM(amount) FROM public.invoice_payments WHERE invoice_id = NEW.invoice_id), 0) >= (amount + COALESCE(gst_amount,0) - COALESCE(tds_amount,0)) THEN 'paid'
    WHEN COALESCE((SELECT SUM(amount) FROM public.invoice_payments WHERE invoice_id = NEW.invoice_id), 0) > 0 THEN 'partial'
    ELSE 'unpaid'
  END
  WHERE id = NEW.invoice_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_invoice_payments ON public.invoice_payments;
CREATE TRIGGER trg_sync_invoice_payments
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment_totals();

ALTER TABLE public.accounting_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inward_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_payment_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounting_branch_isolation" ON public.accounting_projects
  FOR ALL USING (
    branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'SUPER_ADMIN' = ANY(roles))
  );
CREATE POLICY "financial_accounts_branch" ON public.financial_accounts
  FOR ALL USING (
    branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'SUPER_ADMIN' = ANY(roles))
  );
CREATE POLICY "expense_categories_branch" ON public.expense_categories
  FOR ALL USING (
    branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'SUPER_ADMIN' = ANY(roles))
  );
CREATE POLICY "inward_receipts_branch" ON public.inward_receipts
  FOR ALL USING (
    branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'SUPER_ADMIN' = ANY(roles))
  );
CREATE POLICY "accounting_expenses_branch" ON public.accounting_expenses
  FOR ALL USING (
    branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'SUPER_ADMIN' = ANY(roles))
  );
CREATE POLICY "quotations_branch" ON public.quotations
  FOR ALL USING (
    branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'SUPER_ADMIN' = ANY(roles))
  );
CREATE POLICY "invoices_branch" ON public.invoices
  FOR ALL USING (
    branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'SUPER_ADMIN' = ANY(roles))
  );
CREATE POLICY "invoice_payments_branch" ON public.invoice_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_payments.invoice_id
        AND (i.branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
             OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'SUPER_ADMIN' = ANY(roles)))
    )
  );
CREATE POLICY "audit_log_branch" ON public.accounting_audit_log
  FOR ALL USING (
    branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'SUPER_ADMIN' = ANY(roles))
  );

CREATE INDEX IF NOT EXISTS idx_accounting_projects_branch ON public.accounting_projects(branch_id);
CREATE INDEX IF NOT EXISTS idx_inward_receipts_branch ON public.inward_receipts(branch_id);
CREATE INDEX IF NOT EXISTS idx_accounting_expenses_branch ON public.accounting_expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_branch ON public.invoices(branch_id);
CREATE INDEX IF NOT EXISTS idx_quotations_branch ON public.quotations(branch_id);

-- Explicit Data API grants (required from Oct 30 2026)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inward_receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_payment_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_audit_log TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_projects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inward_receipts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_expenses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_payment_entries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_payments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_audit_log TO service_role;

GRANT EXECUTE ON FUNCTION public.next_receipt_no(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_invoice_payment_totals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_receipt_no(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_invoice_payment_totals() TO service_role;
