-- ============================================================
-- RPCs for deleting and rejecting medical certificates
-- Migration: 20260907143000_secure_medical_certificate_actions.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_medical_certificate(
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
            RAISE EXCEPTION 'Unauthorized: cross-branch certificate deletion is not permitted';
        END IF;

    ELSE
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE public.leave_requests
    SET
        medical_certificate_url = NULL,
        certificate_verified_by = NULL,
        is_paid = false,
        updated_at = now()
    WHERE id = v_leave.id;

END;
$$;


CREATE OR REPLACE FUNCTION public.reject_medical_certificate(
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
            RAISE EXCEPTION 'Unauthorized: cross-branch certificate rejection is not permitted';
        END IF;

    ELSE
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE public.leave_requests
    SET
        certificate_verified_by = v_caller.id,
        is_paid = false,
        updated_at = now()
    WHERE id = v_leave.id;

END;
$$;

-- Grant execution privileges
REVOKE ALL ON FUNCTION public.delete_medical_certificate(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_medical_certificate(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.delete_medical_certificate(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_medical_certificate(UUID) TO authenticated;
