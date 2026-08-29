-- Migration: 20260829000003_compoff_hold_and_expire.sql
-- Description: Adds HOLD and RELEASE mechanisms for comp-off credits

SET search_path = public, pg_temp;

-- 1. Update constraint to allow HOLD and RELEASE
ALTER TABLE public.comp_off_ledger DROP CONSTRAINT IF EXISTS comp_off_ledger_transaction_type_check;
ALTER TABLE public.comp_off_ledger ADD CONSTRAINT comp_off_ledger_transaction_type_check 
CHECK (transaction_type IN ('CREDIT', 'DEBIT', 'REVERSAL', 'HOLD', 'RELEASE'));

-- 2. Helper function to get balance (treating HOLD as debit, RELEASE as credit)
CREATE OR REPLACE FUNCTION public.get_comp_off_balance(p_employee_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance NUMERIC;
BEGIN
    SELECT COALESCE(
        SUM(
            CASE
                WHEN transaction_type IN ('CREDIT', 'REVERSAL', 'RELEASE') THEN hours
                WHEN transaction_type IN ('DEBIT', 'HOLD') THEN -hours
                ELSE 0
            END
        ),
        0
    )
    INTO v_balance
    FROM public.comp_off_ledger
    WHERE employee_id = p_employee_id;

    RETURN GREATEST(v_balance, 0);
END;
$$;

-- 3. New RPC to securely submit Comp-Off leaves with HOLD
CREATE OR REPLACE FUNCTION public.submit_comp_off_leave(
    p_start_date DATE,
    p_end_date DATE,
    p_is_half_day BOOLEAN,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_employee_id UUID;
    v_leave_id UUID;
    v_balance NUMERIC;
    v_leave_days NUMERIC := 0;
    v_hours_required NUMERIC := 0;
    d INTEGER;
BEGIN
    v_employee_id := auth.uid();
    IF v_employee_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_start_date > p_end_date THEN
        RAISE EXCEPTION 'End date cannot be before start date';
    END IF;

    IF p_is_half_day AND p_start_date <> p_end_date THEN
        RAISE EXCEPTION 'Half-day leave must be for a single day';
    END IF;

    IF p_is_half_day THEN
        v_hours_required := 4;
    ELSE
        FOR d IN 0..(p_end_date - p_start_date) LOOP
            IF public.is_working_day(v_employee_id, p_start_date + d) THEN
                v_leave_days := v_leave_days + 1;
            END IF;
        END LOOP;
        v_hours_required := v_leave_days * 8;
    END IF;

    IF v_hours_required <= 0 THEN
        RAISE EXCEPTION 'No working days in the selected period';
    END IF;

    -- Lock the employee profile to prevent concurrent double-spending
    PERFORM 1 FROM public.profiles WHERE id = v_employee_id FOR UPDATE;

    v_balance := public.get_comp_off_balance(v_employee_id);

    IF v_balance < v_hours_required THEN
        RAISE EXCEPTION 'Insufficient Comp-Off balance. Required: % hours, Available: % hours.', v_hours_required, v_balance;
    END IF;

    INSERT INTO public.leave_requests (
        employee_id,
        leave_type,
        start_date,
        end_date,
        is_half_day,
        reason,
        status,
        is_paid
    ) VALUES (
        v_employee_id,
        'Compensatory Off',
        p_start_date,
        p_end_date,
        p_is_half_day,
        p_reason,
        'Pending First Level',
        true
    ) RETURNING id INTO v_leave_id;

    INSERT INTO public.comp_off_ledger (
        employee_id,
        transaction_type,
        hours,
        reference_id
    ) VALUES (
        v_employee_id,
        'HOLD',
        v_hours_required,
        v_leave_id
    );

    RETURN v_leave_id;
END;
$$;

-- 4. Update approve_comp_off_leave to insert RELEASE + DEBIT
CREATE OR REPLACE FUNCTION public.approve_comp_off_leave(
    p_leave_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_leave public.leave_requests%ROWTYPE;
    v_caller public.profiles%ROWTYPE;
    v_employee public.profiles%ROWTYPE;
    v_hours_to_debit NUMERIC := 0;
    v_hold_hours NUMERIC := 0;
BEGIN
    SELECT * INTO v_caller FROM public.profiles WHERE id = auth.uid();
    IF NOT FOUND THEN RAISE EXCEPTION 'Unauthorized'; END IF;

    SELECT * INTO v_leave FROM public.leave_requests WHERE id = p_leave_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Leave not found'; END IF;

    IF v_leave.status <> 'Pending HR' THEN
        RAISE EXCEPTION 'Leave is not pending HR approval';
    END IF;

    SELECT * INTO v_employee FROM public.profiles WHERE id = v_leave.employee_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Employee profile not found'; END IF;

    IF v_caller.roles @> ARRAY['SUPER_ADMIN']::user_role[] THEN
        NULL;
    ELSIF v_caller.roles @> ARRAY['HR']::user_role[] THEN
        IF v_caller.branch_id IS NULL OR v_employee.branch_id IS NULL OR v_caller.branch_id <> v_employee.branch_id THEN
            RAISE EXCEPTION 'Unauthorized: cross-branch HR approval is not permitted';
        END IF;
    ELSE
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF v_leave.leave_type = 'Compensatory Off' THEN
        -- Find existing HOLD
        SELECT COALESCE(SUM(hours), 0) INTO v_hold_hours 
        FROM public.comp_off_ledger 
        WHERE reference_id = p_leave_id AND transaction_type = 'HOLD';

        -- If there was a HOLD, release it
        IF v_hold_hours > 0 THEN
            INSERT INTO public.comp_off_ledger (employee_id, transaction_type, hours, reference_id)
            VALUES (v_leave.employee_id, 'RELEASE', v_hold_hours, p_leave_id);
            v_hours_to_debit := v_hold_hours;
        ELSE
            -- Backwards compatibility if no HOLD was created
            IF v_leave.is_half_day THEN
                v_hours_to_debit := 4;
            ELSE
                DECLARE d INTEGER; v_leave_days NUMERIC := 0;
                BEGIN
                    FOR d IN 0..(v_leave.end_date - v_leave.start_date) LOOP
                        IF public.is_working_day(v_leave.employee_id, v_leave.start_date + d) THEN
                            v_leave_days := v_leave_days + 1;
                        END IF;
                    END LOOP;
                    v_hours_to_debit := v_leave_days * 8;
                END;
            END IF;
            
            -- Legacy check
            IF public.get_comp_off_balance(v_leave.employee_id) < v_hours_to_debit THEN
                RAISE EXCEPTION 'Insufficient Comp-Off balance';
            END IF;
        END IF;

        IF v_hours_to_debit > 0 THEN
            INSERT INTO public.comp_off_ledger (employee_id, transaction_type, hours, reference_id)
            VALUES (v_leave.employee_id, 'DEBIT', v_hours_to_debit, p_leave_id);
        END IF;
    END IF;

    UPDATE public.leave_requests
    SET status = 'Approved', hr_approver_id = v_caller.id, updated_at = now()
    WHERE id = v_leave.id;
END;
$$;

-- 5. Update reject_leave to RELEASE held credits
CREATE OR REPLACE FUNCTION public.reject_leave(
    p_leave_id UUID,
    p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_leave public.leave_requests%ROWTYPE;
    v_employee public.profiles%ROWTYPE;
    v_caller public.profiles%ROWTYPE;
    v_hold_hours NUMERIC := 0;
BEGIN
    SELECT * INTO v_caller FROM public.profiles WHERE id = auth.uid();
    IF NOT FOUND THEN RAISE EXCEPTION 'Unauthorized'; END IF;

    SELECT * INTO v_leave FROM public.leave_requests WHERE id = p_leave_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Leave not found'; END IF;

    IF v_leave.status NOT IN ('Pending First Level', 'Pending HR') THEN
        RAISE EXCEPTION 'Leave cannot be rejected in its current state';
    END IF;

    SELECT * INTO v_employee FROM public.profiles WHERE id = v_leave.employee_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Employee profile not found'; END IF;

    IF v_caller.id = v_employee.id THEN RAISE EXCEPTION 'Cannot reject your own leave'; END IF;

    IF v_caller.roles @> ARRAY['SUPER_ADMIN']::user_role[] THEN
        NULL;
    ELSIF v_caller.roles @> ARRAY['HR']::user_role[] OR v_caller.roles @> ARRAY['BRANCH_MANAGER_ADMINISTRATIVE']::user_role[] THEN
        IF v_caller.branch_id IS NULL OR v_employee.branch_id IS NULL OR v_caller.branch_id <> v_employee.branch_id THEN
            RAISE EXCEPTION 'Unauthorized: cross-branch rejection is not permitted';
        END IF;
    ELSIF v_employee.reporting_manager_id = v_caller.id THEN
        NULL;
    ELSE
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE public.leave_requests
    SET status = 'Rejected', rejection_reason = p_reason, updated_at = now()
    WHERE id = v_leave.id;

    IF v_leave.leave_type = 'Compensatory Off' THEN
        SELECT COALESCE(SUM(hours), 0) INTO v_hold_hours 
        FROM public.comp_off_ledger 
        WHERE reference_id = p_leave_id AND transaction_type = 'HOLD';

        IF v_hold_hours > 0 THEN
            INSERT INTO public.comp_off_ledger (employee_id, transaction_type, hours, reference_id)
            VALUES (v_leave.employee_id, 'RELEASE', v_hold_hours, p_leave_id);
        END IF;
    END IF;
END;
$$;

-- 6. Update cancel_comp_off_leave (if it was approved, DEBIT was applied, we use REVERSAL. If pending, we'd use RELEASE but usually it's only for approved ones. Let's make it robust).
CREATE OR REPLACE FUNCTION public.cancel_comp_off_leave(
    p_leave_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_leave public.leave_requests%ROWTYPE;
    v_caller public.profiles%ROWTYPE;
    v_employee public.profiles%ROWTYPE;
    v_debit public.comp_off_ledger%ROWTYPE;
BEGIN
    SELECT * INTO v_caller FROM public.profiles WHERE id = auth.uid();
    IF NOT FOUND THEN RAISE EXCEPTION 'Unauthorized'; END IF;

    SELECT * INTO v_leave FROM public.leave_requests WHERE id = p_leave_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Leave not found'; END IF;

    IF v_leave.status <> 'Approved' THEN
        RAISE EXCEPTION 'Only approved leaves can be cancelled';
    END IF;

    SELECT * INTO v_employee FROM public.profiles WHERE id = v_leave.employee_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Employee profile not found'; END IF;

    IF v_caller.roles @> ARRAY['SUPER_ADMIN']::user_role[] THEN
        NULL;
    ELSIF v_caller.roles @> ARRAY['HR']::user_role[] THEN
        IF v_caller.branch_id IS NULL OR v_employee.branch_id IS NULL OR v_caller.branch_id <> v_employee.branch_id THEN
            RAISE EXCEPTION 'Unauthorized: cross-branch cancellation is not permitted';
        END IF;
    ELSE
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE public.leave_requests
    SET status = 'Cancelled', updated_at = now()
    WHERE id = v_leave.id;

    IF v_leave.leave_type = 'Compensatory Off' THEN
        SELECT * INTO v_debit
        FROM public.comp_off_ledger
        WHERE reference_id = p_leave_id AND transaction_type = 'DEBIT' LIMIT 1;

        IF FOUND THEN
            INSERT INTO public.comp_off_ledger (employee_id, transaction_type, hours, reference_id)
            VALUES (v_leave.employee_id, 'REVERSAL', v_debit.hours, p_leave_id);
        END IF;
    END IF;
END;
$$;

-- 7. New RPC to auto-expire >72h pending Comp-Off leaves
CREATE OR REPLACE FUNCTION public.expire_pending_comp_off_leaves()
RETURNS TABLE (expired_leave_id UUID, employee_id UUID, hours_released NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record RECORD;
    v_hold_hours NUMERIC;
BEGIN
    FOR v_record IN 
        SELECT id, employee_id 
        FROM public.leave_requests
        WHERE leave_type = 'Compensatory Off'
          AND status IN ('Pending First Level', 'Pending HR')
          AND created_at < NOW() - INTERVAL '72 hours'
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE public.leave_requests
        SET status = 'Expired',
            rejection_reason = 'Auto-expired after 72 hours',
            updated_at = NOW()
        WHERE id = v_record.id;

        SELECT COALESCE(SUM(hours), 0) INTO v_hold_hours 
        FROM public.comp_off_ledger 
        WHERE reference_id = v_record.id AND transaction_type = 'HOLD';

        IF v_hold_hours > 0 THEN
            INSERT INTO public.comp_off_ledger (employee_id, transaction_type, hours, reference_id)
            VALUES (v_record.employee_id, 'RELEASE', v_hold_hours, v_record.id);
        END IF;

        expired_leave_id := v_record.id;
        employee_id := v_record.employee_id;
        hours_released := v_hold_hours;
        RETURN NEXT;
    END LOOP;
END;
$$;
