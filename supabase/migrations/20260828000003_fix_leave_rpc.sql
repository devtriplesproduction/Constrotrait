-- Migration: 20260828000003_fix_leave_rpc.sql
-- Description: Fixes approve_comp_off_leave to only debit if the leave type is Compensatory Off

CREATE OR REPLACE FUNCTION public.approve_comp_off_leave(p_leave_id UUID) 
RETURNS VOID AS $$
DECLARE
    v_leave RECORD;
    v_balance NUMERIC;
    v_hours_to_debit NUMERIC;
    v_caller_uid UUID;
    v_leave_days NUMERIC;
BEGIN
    v_caller_uid := auth.uid();
    
    SELECT * INTO v_leave FROM public.leave_requests WHERE id = p_leave_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Leave not found'; END IF;
    IF v_leave.status != 'Pending HR' THEN RAISE EXCEPTION 'Leave is not pending HR approval'; END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_caller_uid AND (roles @> '{"HR"}' OR roles @> '{"SUPER_ADMIN"}')) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    v_hours_to_debit := 0;

    -- calculate debit only for Comp-Off
    IF v_leave.leave_type = 'Compensatory Off' THEN
        IF v_leave.is_half_day THEN
            v_hours_to_debit := 4;
        ELSE
            v_leave_days := 0;
            FOR d IN 0..(v_leave.end_date - v_leave.start_date) LOOP
                IF public.is_working_day(v_leave.employee_id, v_leave.start_date + d) THEN
                    v_leave_days := v_leave_days + 1;
                END IF;
            END LOOP;
            v_hours_to_debit := v_leave_days * 8;
        END IF;

        IF v_hours_to_debit > 0 THEN
            SELECT COALESCE(SUM(CASE WHEN transaction_type IN ('CREDIT', 'REVERSAL') THEN hours ELSE -hours END), 0)
            INTO v_balance FROM public.comp_off_ledger WHERE employee_id = v_leave.employee_id;

            IF v_balance < v_hours_to_debit THEN
                RAISE EXCEPTION 'Insufficient Comp-Off balance';
            END IF;

            INSERT INTO public.comp_off_ledger (employee_id, transaction_type, hours, reference_id)
            VALUES (v_leave.employee_id, 'DEBIT', v_hours_to_debit, p_leave_id);
        END IF;
    END IF;

    UPDATE public.leave_requests 
    SET status = 'Approved', hr_approver_id = v_caller_uid, updated_at = now()
    WHERE id = p_leave_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
