-- 20261023130000_inward_proforma_and_previous_invoice.sql
-- Add proforma invoice support, inward link, and previous invoice tracking

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_type text DEFAULT 'tax_invoice',
  ADD COLUMN IF NOT EXISTS inward_id uuid REFERENCES public.job_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS previous_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS previous_balance_amount numeric(15,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_invoices_inward_id ON public.invoices(inward_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON public.invoices(invoice_type);

-- Robust trigger for invoice payments (handles INSERT, UPDATE, DELETE safely)
CREATE OR REPLACE FUNCTION public.sync_invoice_payment_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_id uuid;
  v_total_paid numeric(15,2);
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF v_invoice_id IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM public.invoice_payments
    WHERE invoice_id = v_invoice_id;

    UPDATE public.invoices
    SET paid_amount = v_total_paid,
    status = CASE
      WHEN v_total_paid >= (amount + COALESCE(gst_amount,0) - COALESCE(tds_amount,0)) THEN 'paid'
      WHEN v_total_paid > 0 THEN 'partial'
      ELSE 'unpaid'
    END
    WHERE id = v_invoice_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_invoice_payments ON public.invoice_payments;
CREATE TRIGGER trg_sync_invoice_payments
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment_totals();
