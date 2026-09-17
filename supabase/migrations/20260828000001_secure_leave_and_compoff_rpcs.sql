-- Migration: 20260828000001_secure_leave_and_compoff_rpcs.sql
-- Description: Adds secure RPCs for Leave Management and Comp-Off idempotency

-- 1. Sync EOD Comp-Off
CREATE OR REPLACE FUNCTION public.sync_eod_comp_off(
    p_employee_id UUID,
    p_eod_id UUID,
    p_credit_hours NUMERIC
) RETURNS VOID AS $$
BEGIN
    IF p_credit_hours > 0 THEN
        INSERT INTO public.comp_off_ledger (employee_id, transaction_type, hours, reference_id)
        VALUES (p_employee_id, 'CREDIT', p_credit_hours, p_eod_id)
        ON CONFLICT (employee_id, reference_id) WHERE transaction_type = 'CREDIT'
        DO UPDATE SET hours = EXCLUDED.hours, created_at = now();
    ELSE
        -- Delete the credit if hours is adjusted to 0 (e.g. from 10h down to 8h)
        DELETE FROM public.comp_off_ledger 
        WHERE employee_id = p_employee_id 
          AND reference_id = p_eod_id 
          AND transaction_type = 'CREDIT';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Approve Comp-Off Leave securely and atomically
CREATE OR REPLACE FUNCTION public.approve_comp_off_leave(
    p_leave_id UUID,
    p_approver_id UUID,
    p_hours_to_debit NUMERIC
) RETURNS VOID AS $$
DECLARE
    v_leave RECORD;
    v_balance NUMERIC;
BEGIN
    SELECT * INTO v_leave FROM public.leave_requests WHERE id = p_leave_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Leave not found'; END IF;
    IF v_leave.status != 'Pending HR' THEN RAISE EXCEPTION 'Leave is not pending HR approval'; END IF;

    -- Calculate balance
    SELECT COALESCE(SUM(CASE WHEN transaction_type IN ('CREDIT', 'REVERSAL') THEN hours ELSE -hours END), 0)
    INTO v_balance
    FROM public.comp_off_ledger
    WHERE employee_id = v_leave.employee_id;

    IF v_balance < p_hours_to_debit THEN
        RAISE EXCEPTION 'Insufficient Comp-Off balance';
    END IF;

    UPDATE public.leave_requests 
    SET status = 'Approved', hr_approver_id = p_approver_id, updated_at = now()
    WHERE id = p_leave_id;

    IF p_hours_to_debit > 0 THEN
        INSERT INTO public.comp_off_ledger (employee_id, transaction_type, hours, reference_id)
        VALUES (v_leave.employee_id, 'DEBIT', p_hours_to_debit, p_leave_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Cancel Comp-Off Leave securely and atomically
CREATE OR REPLACE FUNCTION public.cancel_comp_off_leave(
    p_leave_id UUID
) RETURNS VOID AS $$
DECLARE
    v_leave RECORD;
    v_debit RECORD;
BEGIN
    SELECT * INTO v_leave FROM public.leave_requests WHERE id = p_leave_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Leave not found'; END IF;
    IF v_leave.status != 'Approved' THEN RAISE EXCEPTION 'Only approved leaves can be cancelled'; END IF;

    UPDATE public.leave_requests 
    SET status = 'Cancelled', updated_at = now()
    WHERE id = p_leave_id;

    IF v_leave.leave_type = 'Compensatory Off' THEN
        SELECT * INTO v_debit FROM public.comp_off_ledger WHERE reference_id = p_leave_id AND transaction_type = 'DEBIT' LIMIT 1;
        IF FOUND THEN
            INSERT INTO public.comp_off_ledger (employee_id, transaction_type, hours, reference_id)
            VALUES (v_leave.employee_id, 'REVERSAL', v_debit.hours, p_leave_id);
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
