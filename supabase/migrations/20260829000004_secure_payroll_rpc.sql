CREATE OR REPLACE FUNCTION public.lock_payroll_cycle(
    p_month INT,
    p_year INT,
    p_locked_by UUID,
    p_snapshots JSONB
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cycle_id UUID;
    v_status TEXT;
    v_snapshot JSONB;
    v_caller_uid UUID;
BEGIN
    v_caller_uid := auth.uid();

    IF v_caller_uid IS NULL OR v_caller_uid != p_locked_by THEN
        RAISE EXCEPTION 'Unauthorized: Caller identity mismatch';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = v_caller_uid 
        AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Insufficient permissions to lock payroll';
    END IF;
    -- Check existing cycle
    SELECT id, status INTO v_cycle_id, v_status
    FROM public.payroll_cycles
    WHERE month = p_month AND year = p_year;

    -- A. Prevent modifying a paid payroll
    IF v_status = 'paid' THEN
        RAISE EXCEPTION 'Cannot modify a payroll cycle that has already been paid.';
    END IF;

    -- Create or update cycle
    IF v_cycle_id IS NULL THEN
        INSERT INTO public.payroll_cycles (month, year, status, locked_by, locked_at)
        VALUES (p_month, p_year, 'locked', p_locked_by, now())
        RETURNING id INTO v_cycle_id;
    ELSE
        UPDATE public.payroll_cycles
        SET status = 'locked', locked_by = p_locked_by, locked_at = now()
        WHERE id = v_cycle_id;
    END IF;

    -- Remove existing draft/unpaid snapshots safely
    DELETE FROM public.payroll_snapshots WHERE cycle_id = v_cycle_id;

    -- Insert snapshots
    FOR v_snapshot IN SELECT * FROM jsonb_array_elements(p_snapshots)
    LOOP
        INSERT INTO public.payroll_snapshots (
            cycle_id,
            employee_id,
            employee_name,
            employee_id_external,
            department,
            designation,
            base_salary,
            days_present,
            days_field,
            days_paid_leave,
            days_unpaid_leave,
            days_absent,
            net_payable,
            basic_salary,
            hra,
            allowance,
            bonus,
            gross_salary,
            pf,
            esi,
            professional_tax,
            income_tax,
            other_deductions,
            salary_advance_recovery,
            damage_recovery,
            total_deductions,
            net_salary,
            overtime_hours,
            overtime_pay,
            is_reviewed,
            remarks,
            calculated_at
        ) VALUES (
            v_cycle_id,
            (v_snapshot->>'employee_id')::UUID,
            v_snapshot->>'employee_name',
            v_snapshot->>'employee_id_external',
            v_snapshot->>'department',
            v_snapshot->>'designation',
            (v_snapshot->>'base_salary')::NUMERIC,
            (v_snapshot->>'days_present')::NUMERIC,
            (v_snapshot->>'days_field')::NUMERIC,
            (v_snapshot->>'days_paid_leave')::NUMERIC,
            (v_snapshot->>'days_unpaid_leave')::NUMERIC,
            (v_snapshot->>'days_absent')::NUMERIC,
            (v_snapshot->>'net_payable')::NUMERIC,
            (v_snapshot->>'basic_salary')::NUMERIC,
            (v_snapshot->>'hra')::NUMERIC,
            (v_snapshot->>'allowance')::NUMERIC,
            (v_snapshot->>'bonus')::NUMERIC,
            (v_snapshot->>'gross_salary')::NUMERIC,
            (v_snapshot->>'pf')::NUMERIC,
            (v_snapshot->>'esi')::NUMERIC,
            (v_snapshot->>'professional_tax')::NUMERIC,
            (v_snapshot->>'income_tax')::NUMERIC,
            (v_snapshot->>'other_deductions')::NUMERIC,
            (v_snapshot->>'salary_advance_recovery')::NUMERIC,
            (v_snapshot->>'damage_recovery')::NUMERIC,
            (v_snapshot->>'total_deductions')::NUMERIC,
            (v_snapshot->>'net_salary')::NUMERIC,
            (v_snapshot->>'overtime_hours')::NUMERIC,
            (v_snapshot->>'overtime_pay')::NUMERIC,
            COALESCE((v_snapshot->>'is_reviewed')::BOOLEAN, false),
            v_snapshot->>'remarks',
            now()
        );
    END LOOP;
END;
$$;
