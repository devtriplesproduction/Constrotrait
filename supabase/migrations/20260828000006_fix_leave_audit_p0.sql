-- ============================================================
-- Leave Management P0 Security Fixes
-- Migration: 20260828000006_fix_leave_audit_p0.sql
-- ============================================================

-- ============================================================
-- 1. REMOVE DIRECT UPDATE ACCESS FROM APPROVERS
-- ============================================================

DROP POLICY IF EXISTS "HR and Super Admins can update leaves"
ON public.leave_requests;

DROP POLICY IF EXISTS "Branch Managers can update branch leaves"
ON public.leave_requests;


-- ============================================================
-- 2. FIRST-LEVEL APPROVAL RPC
--
-- Allowed:
--   - SUPER_ADMIN
--   - Branch Manager in same branch
--   - Reporting Manager of employee
--
-- Only changes:
--   status
--   first_level_approver_id
--   updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_leave_first_level(
    p_leave_id UUID
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
BEGIN
    -- Resolve caller from auth context.
    SELECT *
    INTO v_caller
    FROM public.profiles
    WHERE id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Lock the leave request.
    SELECT *
    INTO v_leave
    FROM public.leave_requests
    WHERE id = p_leave_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave not found';
    END IF;

    -- Only first-level pending leaves can be approved.
    IF v_leave.status <> 'Pending First Level' THEN
        RAISE EXCEPTION 'Leave is not pending first-level approval';
    END IF;

    -- Load employee.
    SELECT *
    INTO v_employee
    FROM public.profiles
    WHERE id = v_leave.employee_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee profile not found';
    END IF;

    -- Employee cannot approve own leave.
    IF v_caller.id = v_employee.id THEN
        RAISE EXCEPTION 'Cannot approve your own leave';
    END IF;

    -- Super Admin can approve.
    IF v_caller.roles @> ARRAY['SUPER_ADMIN']::user_role[] THEN
        NULL;

    -- Branch Manager must be in same branch.
    ELSIF v_caller.roles @> ARRAY['BRANCH_MANAGER_ADMINISTRATIVE']::user_role[] THEN

        IF v_caller.branch_id IS NULL
           OR v_employee.branch_id IS NULL
           OR v_caller.branch_id <> v_employee.branch_id
        THEN
            RAISE EXCEPTION 'Unauthorized: cross-branch approval is not permitted';
        END IF;

    -- Reporting Manager must be the employee's reporting manager.
    ELSIF v_employee.reporting_manager_id = v_caller.id THEN
        NULL;

    ELSE
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE public.leave_requests
    SET
        status = 'Pending HR',
        first_level_approver_id = v_caller.id,
        updated_at = now()
    WHERE id = v_leave.id;

END;
$$;


-- ============================================================
-- 3. REJECTION RPC
--
-- Allowed:
--   SUPER_ADMIN -> any branch
--   HR          -> same branch
--   Branch Mgr  -> same branch
--   Reporting Manager -> own reports
--
-- Valid source states:
--   Pending First Level
--   Pending HR
-- ============================================================

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
BEGIN
    SELECT *
    INTO v_caller
    FROM public.profiles
    WHERE id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT *
    INTO v_leave
    FROM public.leave_requests
    WHERE id = p_leave_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave not found';
    END IF;

    IF v_leave.status NOT IN (
        'Pending First Level',
        'Pending HR'
    ) THEN
        RAISE EXCEPTION 'Leave cannot be rejected in its current state';
    END IF;

    SELECT *
    INTO v_employee
    FROM public.profiles
    WHERE id = v_leave.employee_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee profile not found';
    END IF;

    IF v_caller.id = v_employee.id THEN
        RAISE EXCEPTION 'Cannot reject your own leave';
    END IF;

    -- Super Admin.
    IF v_caller.roles @> ARRAY['SUPER_ADMIN']::user_role[] THEN
        NULL;

    -- HR: same branch only.
    ELSIF v_caller.roles @> ARRAY['HR']::user_role[] THEN

        IF v_caller.branch_id IS NULL
           OR v_employee.branch_id IS NULL
           OR v_caller.branch_id <> v_employee.branch_id
        THEN
            RAISE EXCEPTION 'Unauthorized: cross-branch rejection is not permitted';
        END IF;

    -- Branch Manager: same branch only.
    ELSIF v_caller.roles @> ARRAY['BRANCH_MANAGER_ADMINISTRATIVE']::user_role[] THEN

        IF v_caller.branch_id IS NULL
           OR v_employee.branch_id IS NULL
           OR v_caller.branch_id <> v_employee.branch_id
        THEN
            RAISE EXCEPTION 'Unauthorized: cross-branch rejection is not permitted';
        END IF;

    -- Reporting Manager.
    ELSIF v_employee.reporting_manager_id = v_caller.id THEN
        NULL;

    ELSE
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE public.leave_requests
    SET
        status = 'Rejected',
        rejection_reason = p_reason,
        updated_at = now()
    WHERE id = v_leave.id;

END;
$$;


-- ============================================================
-- 4. HR APPROVAL
--
-- Replace the existing function while preserving:
--   - Pending HR validation
--   - Comp-Off calculation
--   - Comp-Off debit
--   - normal leave approval
--
-- New authorization:
--   SUPER_ADMIN -> all branches
--   HR          -> same branch only
-- ============================================================

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
    v_balance NUMERIC := 0;
    v_hours_to_debit NUMERIC := 0;
    v_leave_days NUMERIC := 0;
    d INTEGER;
BEGIN
    SELECT *
    INTO v_caller
    FROM public.profiles
    WHERE id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT *
    INTO v_leave
    FROM public.leave_requests
    WHERE id = p_leave_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave not found';
    END IF;

    IF v_leave.status <> 'Pending HR' THEN
        RAISE EXCEPTION 'Leave is not pending HR approval';
    END IF;

    SELECT *
    INTO v_employee
    FROM public.profiles
    WHERE id = v_leave.employee_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee profile not found';
    END IF;

    -- Super Admin: all branches.
    IF v_caller.roles @> ARRAY['SUPER_ADMIN']::user_role[] THEN
        NULL;

    -- HR: same branch only.
    ELSIF v_caller.roles @> ARRAY['HR']::user_role[] THEN

        IF v_caller.branch_id IS NULL
           OR v_employee.branch_id IS NULL
           OR v_caller.branch_id <> v_employee.branch_id
        THEN
            RAISE EXCEPTION 'Unauthorized: cross-branch HR approval is not permitted';
        END IF;

    ELSE
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Comp-Off is the only leave type that consumes Comp-Off.
    IF v_leave.leave_type = 'Compensatory Off' THEN

        IF v_leave.is_half_day THEN
            v_hours_to_debit := 4;
        ELSE
            v_leave_days := 0;

            FOR d IN 0..(v_leave.end_date - v_leave.start_date) LOOP
                IF public.is_working_day(
                    v_leave.employee_id,
                    v_leave.start_date + d
                ) THEN
                    v_leave_days := v_leave_days + 1;
                END IF;
            END LOOP;

            v_hours_to_debit := v_leave_days * 8;
        END IF;

        IF v_hours_to_debit > 0 THEN

            SELECT COALESCE(
                SUM(
                    CASE
                        WHEN transaction_type IN ('CREDIT', 'REVERSAL')
                            THEN hours
                        ELSE -hours
                    END
                ),
                0
            )
            INTO v_balance
            FROM public.comp_off_ledger
            WHERE employee_id = v_leave.employee_id;

            IF v_balance < v_hours_to_debit THEN
                RAISE EXCEPTION 'Insufficient Comp-Off balance';
            END IF;

            INSERT INTO public.comp_off_ledger (
                employee_id,
                transaction_type,
                hours,
                reference_id
            )
            VALUES (
                v_leave.employee_id,
                'DEBIT',
                v_hours_to_debit,
                p_leave_id
            );
        END IF;
    END IF;

    UPDATE public.leave_requests
    SET
        status = 'Approved',
        hr_approver_id = v_caller.id,
        updated_at = now()
    WHERE id = v_leave.id;

END;
$$;


-- ============================================================
-- 5. HR CANCELLATION
--
-- Existing RPC name/signature is preserved:
-- cancel_comp_off_leave(UUID)
--
-- SUPER_ADMIN -> all
-- HR          -> same branch
-- ============================================================

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
    SELECT *
    INTO v_caller
    FROM public.profiles
    WHERE id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT *
    INTO v_leave
    FROM public.leave_requests
    WHERE id = p_leave_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave not found';
    END IF;

    IF v_leave.status <> 'Approved' THEN
        RAISE EXCEPTION 'Only approved leaves can be cancelled';
    END IF;

    SELECT *
    INTO v_employee
    FROM public.profiles
    WHERE id = v_leave.employee_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee profile not found';
    END IF;

    IF v_caller.roles @> ARRAY['SUPER_ADMIN']::user_role[] THEN
        NULL;

    ELSIF v_caller.roles @> ARRAY['HR']::user_role[] THEN

        IF v_caller.branch_id IS NULL
           OR v_employee.branch_id IS NULL
           OR v_caller.branch_id <> v_employee.branch_id
        THEN
            RAISE EXCEPTION 'Unauthorized: cross-branch cancellation is not permitted';
        END IF;

    ELSE
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE public.leave_requests
    SET
        status = 'Cancelled',
        updated_at = now()
    WHERE id = v_leave.id;

    IF v_leave.leave_type = 'Compensatory Off' THEN

        SELECT *
        INTO v_debit
        FROM public.comp_off_ledger
        WHERE reference_id = p_leave_id
          AND transaction_type = 'DEBIT'
        LIMIT 1;

        IF FOUND THEN
            INSERT INTO public.comp_off_ledger (
                employee_id,
                transaction_type,
                hours,
                reference_id
            )
            VALUES (
                v_leave.employee_id,
                'REVERSAL',
                v_debit.hours,
                p_leave_id
            );
        END IF;

    END IF;

END;
$$;


-- ============================================================
-- 6. MEDICAL CERTIFICATE VERIFICATION
--
-- SUPER_ADMIN -> all
-- HR          -> same branch
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_medical_certificate(
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
BEGIN
    SELECT *
    INTO v_caller
    FROM public.profiles
    WHERE id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT *
    INTO v_leave
    FROM public.leave_requests
    WHERE id = p_leave_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave not found';
    END IF;

    IF v_leave.leave_type <> 'Sick Leave' THEN
        RAISE EXCEPTION 'Only Sick Leaves have medical certificates';
    END IF;

    SELECT *
    INTO v_employee
    FROM public.profiles
    WHERE id = v_leave.employee_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee profile not found';
    END IF;

    IF v_caller.roles @> ARRAY['SUPER_ADMIN']::user_role[] THEN
        NULL;

    ELSIF v_caller.roles @> ARRAY['HR']::user_role[] THEN

        IF v_caller.branch_id IS NULL
           OR v_employee.branch_id IS NULL
           OR v_caller.branch_id <> v_employee.branch_id
        THEN
            RAISE EXCEPTION 'Unauthorized: cross-branch certificate verification is not permitted';
        END IF;

    ELSE
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE public.leave_requests
    SET
        is_paid = true,
        certificate_verified_by = v_caller.id,
        updated_at = now()
    WHERE id = v_leave.id;

END;
$$;


-- ============================================================
-- 7. MEDICAL CERTIFICATE STORAGE POLICIES
-- ============================================================

DROP POLICY IF EXISTS
    "HR and Super Admins can view all medical certificates"
ON storage.objects;

DROP POLICY IF EXISTS
    "Users can view their own medical certificates"
ON storage.objects;


CREATE POLICY "Users can view their own medical certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'medical_certificates'
    AND owner_id = (select auth.uid()::text)
);


CREATE POLICY "Branch HR can view branch medical certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'medical_certificates'
    AND EXISTS (
        SELECT 1
        FROM public.profiles caller
        JOIN public.profiles employee
          ON employee.id::text = storage.objects.owner_id
        WHERE caller.id = (select auth.uid())
          AND caller.roles @> ARRAY['HR']::user_role[]
          AND caller.branch_id IS NOT NULL
          AND employee.branch_id = caller.branch_id
    )
);


CREATE POLICY "Branch Managers can view branch medical certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'medical_certificates'
    AND EXISTS (
        SELECT 1
        FROM public.profiles caller
        JOIN public.profiles employee
          ON employee.id::text = storage.objects.owner_id
        WHERE caller.id = (select auth.uid())
          AND caller.roles @> ARRAY['BRANCH_MANAGER_ADMINISTRATIVE']::user_role[]
          AND caller.branch_id IS NOT NULL
          AND employee.branch_id = caller.branch_id
    )
);


CREATE POLICY "Super Admins can view all medical certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'medical_certificates'
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = (select auth.uid())
          AND roles @> ARRAY['SUPER_ADMIN']::user_role[]
    )
);


-- ============================================================
-- 8. COMP-OFF LEDGER HR SCOPE
-- ============================================================

DROP POLICY IF EXISTS
    "HR and Super Admins can view all comp-off ledgers"
ON public.comp_off_ledger;


CREATE POLICY "HR can view same branch comp-off ledgers"
ON public.comp_off_ledger
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles caller
        JOIN public.profiles employee
          ON employee.id = comp_off_ledger.employee_id
        WHERE caller.id = (select auth.uid())
          AND caller.roles @> ARRAY['HR']::user_role[]
          AND caller.branch_id IS NOT NULL
          AND employee.branch_id = caller.branch_id
    )
);


CREATE POLICY "Super Admins can view all comp-off ledgers"
ON public.comp_off_ledger
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = (select auth.uid())
          AND roles @> ARRAY['SUPER_ADMIN']::user_role[]
    )
);


-- ============================================================
-- 9. EXECUTION PRIVILEGES
-- ============================================================

REVOKE ALL ON FUNCTION public.approve_leave_first_level(UUID)
FROM PUBLIC;

REVOKE ALL ON FUNCTION public.reject_leave(UUID, TEXT)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.approve_leave_first_level(UUID)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.reject_leave(UUID, TEXT)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.approve_comp_off_leave(UUID)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.cancel_comp_off_leave(UUID)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.verify_medical_certificate(UUID)
TO authenticated;

-- ============================================================
-- 10. LEAVE REQUESTS SELECT POLICIES
-- ============================================================

DROP POLICY IF EXISTS "HR and Super Admins can view all leaves"
ON public.leave_requests;

CREATE POLICY "HR can view same branch leaves"
ON public.leave_requests
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles caller
        JOIN public.profiles employee
          ON employee.id = leave_requests.employee_id
        WHERE caller.id = (select auth.uid())
          AND caller.roles @> ARRAY['HR']::user_role[]
          AND caller.branch_id IS NOT NULL
          AND employee.branch_id = caller.branch_id
    )
);

CREATE POLICY "Super Admins can view all leaves"
ON public.leave_requests
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = (select auth.uid())
          AND roles @> ARRAY['SUPER_ADMIN']::user_role[]
    )
);

CREATE POLICY "Reporting Managers can view direct reports leaves"
ON public.leave_requests
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles employee
        WHERE employee.id = leave_requests.employee_id
          AND employee.reporting_manager_id = (select auth.uid())
    )
);