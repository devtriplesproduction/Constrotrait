-- Migration: 20260910000003_update_leave_workflow.sql
-- Description: Consolidates leave submission, updates approval workflow matrix

-- 1. Update existing leaves to 'Pending Level'
UPDATE public.leave_requests 
SET status = 'Pending Level' 
WHERE status IN ('Pending First Level', 'Pending HR');

-- 2. Update Constraints
ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS chk_leave_requests_status;
ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_status_check;

ALTER TABLE public.leave_requests ADD CONSTRAINT leave_requests_status_check 
  CHECK (status IN ('Pending Level', 'Approved', 'Rejected', 'Cancelled'));

-- 3. Replace submit_comp_off_leave and normal insert with unified submit_leave
CREATE OR REPLACE FUNCTION public.submit_leave(
    p_leave_type TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_is_half_day BOOLEAN,
    p_reason TEXT,
    p_medical_certificate_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_employee_id UUID;
    v_caller public.profiles%ROWTYPE;
    v_leave_id UUID;
    v_status TEXT := 'Pending Level';
    v_is_paid BOOLEAN := false;
    v_balance NUMERIC;
    v_leave_days NUMERIC := 0;
    v_hours_required NUMERIC := 0;
    d INTEGER;
BEGIN
    v_employee_id := auth.uid();
    IF v_employee_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT * INTO v_caller FROM public.profiles WHERE id = v_employee_id;

    IF p_start_date > p_end_date THEN
        RAISE EXCEPTION 'End date cannot be before start date';
    END IF;

    IF p_is_half_day AND p_start_date <> p_end_date THEN
        RAISE EXCEPTION 'Half-day leave must be for a single day';
    END IF;

    -- SUPER_ADMIN gets auto-approval
    IF v_caller.roles @> ARRAY['SUPER_ADMIN']::public.user_role[] THEN
        v_status := 'Approved';
    END IF;

    -- Default paid status
    IF p_leave_type = 'Compensatory Off' THEN
        v_is_paid := true;
    ELSIF p_leave_type = 'Casual Leave' THEN
        v_is_paid := false;
    ELSIF p_leave_type = 'Sick Leave' THEN
        v_is_paid := false; -- Wait until verified
    ELSIF p_leave_type = 'Unpaid Leave' THEN
        v_is_paid := false;
    END IF;

    IF p_leave_type = 'Compensatory Off' THEN
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

        PERFORM 1 FROM public.profiles WHERE id = v_employee_id FOR UPDATE;

        v_balance := public.get_comp_off_balance(v_employee_id);

        IF v_balance < v_hours_required THEN
            RAISE EXCEPTION 'Insufficient Comp-Off balance. Required: % hours, Available: % hours.', v_hours_required, v_balance;
        END IF;
    END IF;

    INSERT INTO public.leave_requests (
        employee_id,
        leave_type,
        start_date,
        end_date,
        is_half_day,
        reason,
        medical_certificate_url,
        status,
        is_paid
    ) VALUES (
        v_employee_id,
        p_leave_type,
        p_start_date,
        p_end_date,
        p_is_half_day,
        p_reason,
        p_medical_certificate_url,
        v_status,
        v_is_paid
    ) RETURNING id INTO v_leave_id;

    IF p_leave_type = 'Compensatory Off' THEN
        IF v_status = 'Approved' THEN
            -- Directly DEBIT
            INSERT INTO public.comp_off_ledger (
                employee_id, transaction_type, hours, reference_id
            ) VALUES (
                v_employee_id, 'DEBIT', v_hours_required, v_leave_id
            );
        ELSE
            -- HOLD
            INSERT INTO public.comp_off_ledger (
                employee_id, transaction_type, hours, reference_id
            ) VALUES (
                v_employee_id, 'HOLD', v_hours_required, v_leave_id
            );
        END IF;
    END IF;

    RETURN v_leave_id;
END;
$$;

-- 4. Unified approve_leave RPC
CREATE OR REPLACE FUNCTION public.approve_leave(
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
    v_hold_hours NUMERIC := 0;
BEGIN
    SELECT * INTO v_caller FROM public.profiles WHERE id = auth.uid();
    IF NOT FOUND THEN RAISE EXCEPTION 'Unauthorized'; END IF;

    SELECT * INTO v_leave FROM public.leave_requests WHERE id = p_leave_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Leave not found'; END IF;

    IF v_leave.status <> 'Pending Level' THEN
        RAISE EXCEPTION 'Leave is not pending approval';
    END IF;

    SELECT * INTO v_employee FROM public.profiles WHERE id = v_leave.employee_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Employee profile not found'; END IF;

    IF v_caller.id = v_employee.id THEN
        RAISE EXCEPTION 'Cannot approve your own leave';
    END IF;

    IF v_caller.roles @> ARRAY['SUPER_ADMIN']::public.user_role[] THEN
        NULL; 
    ELSIF v_caller.roles @> ARRAY['BRANCH_MANAGER_ADMINISTRATIVE']::public.user_role[] THEN
        IF v_employee.roles @> ARRAY['SUPER_ADMIN']::public.user_role[] OR v_employee.roles @> ARRAY['BRANCH_MANAGER_ADMINISTRATIVE']::public.user_role[] THEN
            RAISE EXCEPTION 'Unauthorized: ADMIN cannot approve ADMIN or SUPER_ADMIN leaves';
        END IF;
        IF v_caller.branch_id IS DISTINCT FROM v_employee.branch_id THEN
            RAISE EXCEPTION 'Unauthorized: cross-branch approval is not permitted';
        END IF;
    ELSIF v_caller.roles @> ARRAY['HR']::public.user_role[] THEN
        IF v_employee.roles @> ARRAY['SUPER_ADMIN']::public.user_role[] OR v_employee.roles @> ARRAY['BRANCH_MANAGER_ADMINISTRATIVE']::public.user_role[] OR v_employee.roles @> ARRAY['HR']::public.user_role[] THEN
            RAISE EXCEPTION 'Unauthorized: HR can only approve regular employee leaves';
        END IF;
        IF v_caller.branch_id IS DISTINCT FROM v_employee.branch_id THEN
            RAISE EXCEPTION 'Unauthorized: cross-branch approval is not permitted';
        END IF;
    ELSE
        RAISE EXCEPTION 'Unauthorized: You do not have approval privileges';
    END IF;

    IF v_leave.leave_type = 'Compensatory Off' THEN
        SELECT COALESCE(SUM(hours), 0) INTO v_hold_hours 
        FROM public.comp_off_ledger 
        WHERE reference_id = p_leave_id AND transaction_type = 'HOLD';

        IF v_hold_hours > 0 THEN
            INSERT INTO public.comp_off_ledger (employee_id, transaction_type, hours, reference_id)
            VALUES (v_leave.employee_id, 'RELEASE', v_hold_hours, p_leave_id);

            INSERT INTO public.comp_off_ledger (employee_id, transaction_type, hours, reference_id)
            VALUES (v_leave.employee_id, 'DEBIT', v_hold_hours, p_leave_id);
        END IF;
    END IF;

    UPDATE public.leave_requests 
    SET status = 'Approved', hr_approver_id = v_caller.id, updated_at = now()
    WHERE id = p_leave_id;
END;
$$;

-- 5. Unified reject_leave RPC
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
    v_caller public.profiles%ROWTYPE;
    v_employee public.profiles%ROWTYPE;
    v_hold_hours NUMERIC := 0;
BEGIN
    SELECT * INTO v_caller FROM public.profiles WHERE id = auth.uid();
    IF NOT FOUND THEN RAISE EXCEPTION 'Unauthorized'; END IF;

    SELECT * INTO v_leave FROM public.leave_requests WHERE id = p_leave_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Leave not found'; END IF;

    IF v_leave.status <> 'Pending Level' THEN
        RAISE EXCEPTION 'Leave is not pending approval';
    END IF;

    SELECT * INTO v_employee FROM public.profiles WHERE id = v_leave.employee_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Employee profile not found'; END IF;

    IF v_caller.id = v_employee.id THEN
        RAISE EXCEPTION 'Cannot reject your own leave';
    END IF;

    IF v_caller.roles @> ARRAY['SUPER_ADMIN']::public.user_role[] THEN
        NULL;
    ELSIF v_caller.roles @> ARRAY['BRANCH_MANAGER_ADMINISTRATIVE']::public.user_role[] THEN
        IF v_employee.roles @> ARRAY['SUPER_ADMIN']::public.user_role[] OR v_employee.roles @> ARRAY['BRANCH_MANAGER_ADMINISTRATIVE']::public.user_role[] THEN
            RAISE EXCEPTION 'Unauthorized: ADMIN cannot reject ADMIN or SUPER_ADMIN leaves';
        END IF;
        IF v_caller.branch_id IS DISTINCT FROM v_employee.branch_id THEN
            RAISE EXCEPTION 'Unauthorized: cross-branch rejection is not permitted';
        END IF;
    ELSIF v_caller.roles @> ARRAY['HR']::public.user_role[] THEN
        IF v_employee.roles @> ARRAY['SUPER_ADMIN']::public.user_role[] OR v_employee.roles @> ARRAY['BRANCH_MANAGER_ADMINISTRATIVE']::public.user_role[] OR v_employee.roles @> ARRAY['HR']::public.user_role[] THEN
            RAISE EXCEPTION 'Unauthorized: HR can only reject regular employee leaves';
        END IF;
        IF v_caller.branch_id IS DISTINCT FROM v_employee.branch_id THEN
            RAISE EXCEPTION 'Unauthorized: cross-branch rejection is not permitted';
        END IF;
    ELSE
        RAISE EXCEPTION 'Unauthorized: You do not have rejection privileges';
    END IF;

    IF v_leave.leave_type = 'Compensatory Off' THEN
        SELECT COALESCE(SUM(hours), 0) INTO v_hold_hours 
        FROM public.comp_off_ledger 
        WHERE reference_id = p_leave_id AND transaction_type = 'HOLD';

        IF v_hold_hours > 0 THEN
            INSERT INTO public.comp_off_ledger (employee_id, transaction_type, hours, reference_id)
            VALUES (v_leave.employee_id, 'RELEASE', v_hold_hours, p_leave_id);
        END IF;
    END IF;

    UPDATE public.leave_requests 
    SET status = 'Rejected', rejection_reason = p_reason, updated_at = now()
    WHERE id = p_leave_id;
END;
$$;

-- 6. Cancel Approved Leave 
CREATE OR REPLACE FUNCTION public.cancel_leave(
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

    IF v_caller.roles @> ARRAY['SUPER_ADMIN']::public.user_role[] THEN
        NULL;
    ELSIF v_caller.roles @> ARRAY['BRANCH_MANAGER_ADMINISTRATIVE']::public.user_role[] THEN
        IF v_caller.branch_id IS DISTINCT FROM v_employee.branch_id THEN
            RAISE EXCEPTION 'Unauthorized: cross-branch cancellation is not permitted';
        END IF;
    ELSIF v_caller.roles @> ARRAY['HR']::public.user_role[] THEN
        IF v_caller.branch_id IS DISTINCT FROM v_employee.branch_id THEN
            RAISE EXCEPTION 'Unauthorized: cross-branch cancellation is not permitted';
        END IF;
    ELSE
        RAISE EXCEPTION 'Unauthorized: You do not have cancellation privileges';
    END IF;

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
$$;

-- Drop old functions
DROP FUNCTION IF EXISTS public.approve_leave_first_level(UUID);
DROP FUNCTION IF EXISTS public.approve_comp_off_leave(UUID);
DROP FUNCTION IF EXISTS public.submit_comp_off_leave(DATE, DATE, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS public.cancel_comp_off_leave(UUID);

-- Grant privileges
GRANT EXECUTE ON FUNCTION public.submit_leave(TEXT, DATE, DATE, BOOLEAN, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_leave(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_leave(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_leave(UUID) TO authenticated;
