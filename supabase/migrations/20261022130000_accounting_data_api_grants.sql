-- Explicit Data API grants for accounting tables
-- Required from Oct 30 2026: new tables in public no longer receive automatic grants.
-- Without these, supabase-js / PostgREST return permission denied.

-- authenticated: full CRUD (RLS still enforces branch/role rules)
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

-- service_role: full access (bypasses RLS)
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

-- anon: no direct access (accounting is authenticated-only).

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.next_receipt_no(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_financial_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_payments_for_notification(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_invoice_payment_totals() TO authenticated;

GRANT EXECUTE ON FUNCTION public.next_receipt_no(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_project_financial_balance(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pending_payments_for_notification(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_invoice_payment_totals() TO service_role;
