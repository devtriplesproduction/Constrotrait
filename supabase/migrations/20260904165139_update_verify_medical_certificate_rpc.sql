CREATE OR REPLACE FUNCTION public.verify_medical_certificate(
    p_leave_id UUID,
    p_medical_certificate_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $body$
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
        medical_certificate_url = COALESCE(p_medical_certificate_url, medical_certificate_url),
        updated_at = now()
    WHERE id = v_leave.id;

END;
$body$;
