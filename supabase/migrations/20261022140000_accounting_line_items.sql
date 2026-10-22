-- Add line-item support for quotations and invoices (MaleeHouse-style)
-- Also add bank reconciliation tracking

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS subtotal numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_pct numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_rate numeric(5,2) DEFAULT 18,
  ADD COLUMN IF NOT EXISTS gst_amount numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS terms text,
  ADD COLUMN IF NOT EXISTS internal_notes text;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS subtotal numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text;

-- Bank reconciliation records
CREATE TABLE IF NOT EXISTS public.bank_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  statement_date date NOT NULL,
  statement_balance numeric(15,2) NOT NULL,
  erp_balance numeric(15,2) NOT NULL,
  difference numeric(15,2) GENERATED ALWAYS AS (statement_balance - erp_balance) STORED,
  notes text,
  reconciled_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (account_id, statement_date)
);

ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bank_recon_branch" ON public.bank_reconciliations
  FOR ALL USING (
    branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'SUPER_ADMIN' = ANY(roles))
  );

COMMENT ON COLUMN public.quotations.items IS 'JSONB array: [{description, qty, rate, amount}]';
COMMENT ON COLUMN public.invoices.items IS 'JSONB array: [{description, qty, rate, amount}]';
