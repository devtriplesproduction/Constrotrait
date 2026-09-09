-- Update lock_payroll_cycle RPC to strictly derive and validate financial values securely
CREATE OR REPLACE FUNCTION public.lock_payroll_cycle(
    p_month INT,
    p_year INT,
    p_locked_by UUID,
    p_snapshots JSONB,
    p_adjustments JSONB DEFAULT '[]'::jsonb,
    p_branch_id UUID DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cycle_id UUID;
    v_status TEXT;
    v_snapshot JSONB;
    v_adj JSONB;
    v_caller_uid UUID;
    v_caller_roles TEXT[];
    v_caller_branch_id UUID;
BEGIN
    v_caller_uid := auth.uid();

    IF v_caller_uid IS NULL OR v_caller_uid != p_locked_by THEN
        RAISE EXCEPTION 'Unauthorized: Caller identity mismatch';
    END IF;

    -- Fetch caller's roles and branch
    SELECT roles, branch_id INTO v_caller_roles, v_caller_branch_id
    FROM public.profiles
    WHERE id = v_caller_uid;

    IF v_caller_roles IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Profile not found';
    END IF;

    -- Check if user has an allowed payroll-management role
    IF NOT (
        v_caller_roles @> '{"SUPER_ADMIN"}' OR 
        v_caller_roles @> '{"HR"}' OR 
        v_caller_roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Insufficient permissions to lock payroll';
    END IF;

    -- Enforce branch authorization for non-Super-Admin users
    IF NOT (v_caller_roles @> '{"SUPER_ADMIN"}') THEN
        IF v_caller_branch_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: Caller has no assigned branch';
        END IF;

        IF p_branch_id IS NULL OR v_caller_branch_id != p_branch_id THEN
            RAISE EXCEPTION 'Unauthorized: Cross-branch operations are not allowed';
        END IF;
    END IF;

    -- Check existing cycle for this specific branch
    IF p_branch_id IS NOT NULL THEN
        SELECT id, status INTO v_cycle_id, v_status
        FROM public.payroll_cycles
        WHERE month = p_month AND year = p_year AND branch_id = p_branch_id;
    ELSE
        SELECT id, status INTO v_cycle_id, v_status
        FROM public.payroll_cycles
        WHERE month = p_month AND year = p_year AND branch_id IS NULL;
    END IF;

    -- A. Prevent modifying a paid payroll
    IF v_status = 'paid' THEN
        RAISE EXCEPTION 'Cannot modify a payroll cycle that has already been paid.';
    END IF;

    -- Create or update cycle
    IF v_cycle_id IS NULL THEN
        INSERT INTO public.payroll_cycles (branch_id, month, year, status, locked_by, locked_at)
        VALUES (p_branch_id, p_month, p_year, 'locked', p_locked_by, now())
        RETURNING id INTO v_cycle_id;
    ELSE
        UPDATE public.payroll_cycles
        SET status = 'locked', locked_by = p_locked_by, locked_at = now()
        WHERE id = v_cycle_id;
    END IF;

    -- Remove existing draft/unpaid snapshots safely
    DELETE FROM public.payroll_snapshots WHERE cycle_id = v_cycle_id;
    DELETE FROM public.payroll_adjustment_applications WHERE cycle_id = v_cycle_id;

    -- Pre-calculate month end date for salary checking
    DECLARE
        v_end_date DATE;
    BEGIN
        v_end_date := (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::DATE;

        -- Insert snapshots securely
        FOR v_snapshot IN SELECT * FROM jsonb_array_elements(p_snapshots)
        LOOP
            DECLARE
                db_emp_id UUID;
                db_base_salary NUMERIC;
                db_net_payable NUMERIC;
                db_basic_salary NUMERIC;
                db_hra NUMERIC;
                db_allowance NUMERIC;
                db_bonus NUMERIC := 0;
                db_overtime_pay NUMERIC := 0;
                db_gross_salary NUMERIC;
                db_pf NUMERIC := 0;
                db_esi NUMERIC := 0;
                db_professional_tax NUMERIC := 0;
                db_income_tax NUMERIC := 0;
                db_other_deductions NUMERIC := 0;
                db_salary_advance_recovery NUMERIC := 0;
                db_damage_recovery NUMERIC := 0;
                db_total_deductions NUMERIC;
                db_net_salary NUMERIC;
                
                v_ledger_emp_id UUID;
                v_ledger_rem NUMERIC;
                v_ledger_type TEXT;
                v_ledger_cat TEXT;
            BEGIN
                db_emp_id := (v_snapshot->>'employee_id')::UUID;
                
                -- 1. Derive Base Salary securely from database
                SELECT new_salary INTO db_base_salary
                FROM public.salary_hikes
                WHERE employee_id = db_emp_id AND effective_date <= v_end_date
                ORDER BY effective_date DESC
                LIMIT 1;

                IF db_base_salary IS NULL THEN
                    SELECT salary INTO db_base_salary
                    FROM public.profiles
                    WHERE id = db_emp_id;
                END IF;
                
                db_base_salary := COALESCE(db_base_salary, 0);

                -- 2. Validate Net Payable
                db_net_payable := COALESCE((v_snapshot->>'net_payable')::NUMERIC, 0);
                IF db_net_payable > db_base_salary THEN
                    RAISE EXCEPTION 'Security error: net_payable (%) exceeds base_salary (%) for employee %', db_net_payable, db_base_salary, db_emp_id;
                END IF;

                -- 3. Calculate dependent financial structures strictly
                db_basic_salary := ROUND(db_net_payable * 0.5);
                db_hra := ROUND(db_net_payable * 0.2);
                db_allowance := db_net_payable - db_basic_salary - db_hra;

                -- 4. Calculate Adjustments strictly against the ledger (ignore client sums)
                IF p_adjustments IS NOT NULL THEN
                    FOR v_adj IN SELECT * FROM jsonb_array_elements(p_adjustments)
                    LOOP
                        SELECT employee_id, remaining_amount, adjustment_type, adjustment_category
                        INTO v_ledger_emp_id, v_ledger_rem, v_ledger_type, v_ledger_cat
                        FROM public.employee_financial_ledger
                        WHERE id = (v_adj->>'ledger_id')::UUID;

                        IF v_ledger_emp_id IS NULL THEN
                            RAISE EXCEPTION 'Invalid ledger entry %', v_adj->>'ledger_id';
                        END IF;

                        IF v_ledger_emp_id = db_emp_id THEN
                            IF (v_adj->>'amount')::NUMERIC > v_ledger_rem THEN
                                RAISE EXCEPTION 'Security error: Adjustment amount exceeds remaining amount for ledger %', v_adj->>'ledger_id';
                            END IF;
                            
                            IF (v_adj->>'amount')::NUMERIC < 0 THEN
                                RAISE EXCEPTION 'Security error: Negative adjustment amount not allowed for ledger %', v_adj->>'ledger_id';
                            END IF;

                            IF v_ledger_type ILIKE '%bonus%' THEN
                                db_bonus := db_bonus + (v_adj->>'amount')::NUMERIC;
                            ELSIF v_ledger_type ILIKE '%advance%' THEN
                                db_salary_advance_recovery := db_salary_advance_recovery + (v_adj->>'amount')::NUMERIC;
                            ELSIF v_ledger_type ILIKE '%damage%' THEN
                                db_damage_recovery := db_damage_recovery + (v_adj->>'amount')::NUMERIC;
                            ELSE
                                db_other_deductions := db_other_deductions + (v_adj->>'amount')::NUMERIC;
                            END IF;
                        END IF;
                    END LOOP;
                END IF;

                -- 5. Calculate Gross, Deductions, and Net strictly
                db_gross_salary := db_basic_salary + db_hra + db_allowance + db_bonus + db_overtime_pay;
                db_total_deductions := db_pf + db_esi + db_professional_tax + db_income_tax + 
                                       db_other_deductions + db_salary_advance_recovery + db_damage_recovery;
                db_net_salary := db_gross_salary - db_total_deductions;

                -- 6. Insert Snapshot
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
                    db_emp_id,
                    v_snapshot->>'employee_name',
                    v_snapshot->>'employee_id_external',
                    v_snapshot->>'department',
                    v_snapshot->>'designation',
                    db_base_salary, -- Server derived
                    (v_snapshot->>'days_present')::NUMERIC,
                    (v_snapshot->>'days_field')::NUMERIC,
                    (v_snapshot->>'days_paid_leave')::NUMERIC,
                    (v_snapshot->>'days_unpaid_leave')::NUMERIC,
                    (v_snapshot->>'days_absent')::NUMERIC,
                    db_net_payable, -- Validated
                    db_basic_salary, -- Server derived
                    db_hra,          -- Server derived
                    db_allowance,    -- Server derived
                    db_bonus,        -- Server derived
                    db_gross_salary, -- Server derived
                    db_pf,
                    db_esi,
                    db_professional_tax,
                    db_income_tax,
                    db_other_deductions,        -- Server derived
                    db_salary_advance_recovery, -- Server derived
                    db_damage_recovery,         -- Server derived
                    db_total_deductions,        -- Server derived
                    db_net_salary,              -- Server derived
                    (v_snapshot->>'overtime_hours')::NUMERIC,
                    db_overtime_pay,
                    COALESCE((v_snapshot->>'is_reviewed')::BOOLEAN, false),
                    v_snapshot->>'remarks',
                    now()
                );
            END;
        END LOOP;
    END;

    -- Apply Adjustments securely
    IF p_adjustments IS NOT NULL THEN
        FOR v_adj IN SELECT * FROM jsonb_array_elements(p_adjustments)
        LOOP
            DECLARE
                v_ledger_rem NUMERIC;
                v_ledger_emp_id UUID;
                v_ledger_cat TEXT;
            BEGIN
                SELECT employee_id, remaining_amount, adjustment_category
                INTO v_ledger_emp_id, v_ledger_rem, v_ledger_cat
                FROM public.employee_financial_ledger
                WHERE id = (v_adj->>'ledger_id')::UUID;
                
                IF v_ledger_emp_id IS NOT NULL AND (v_adj->>'amount')::NUMERIC >= 0 AND (v_adj->>'amount')::NUMERIC <= v_ledger_rem THEN
                    INSERT INTO public.payroll_adjustment_applications (
                        ledger_id, cycle_id, adjustment_type, adjustment_category, applied_amount, status, applied_at, applied_by, employee_id
                    ) VALUES (
                        (v_adj->>'ledger_id')::UUID,
                        v_cycle_id,
                        v_adj->>'adjustment_type',
                        v_adj->>'adjustment_category',
                        (v_adj->>'amount')::NUMERIC,
                        'applied',
                        now(),
                        p_locked_by,
                        v_ledger_emp_id
                    );

                    -- Update the ledger status
                    IF v_adj->>'adjustment_category' = 'one_time' THEN
                        UPDATE public.employee_financial_ledger
                        SET status = 'completed', remaining_amount = 0
                        WHERE id = (v_adj->>'ledger_id')::UUID;
                    ELSE
                        UPDATE public.employee_financial_ledger
                        SET remaining_amount = GREATEST(remaining_amount - (v_adj->>'amount')::NUMERIC, 0)
                        WHERE id = (v_adj->>'ledger_id')::UUID;

                        UPDATE public.employee_financial_ledger
                        SET status = CASE WHEN remaining_amount - (v_adj->>'amount')::NUMERIC <= 0 THEN 'completed' ELSE 'partially_recovered' END
                        WHERE id = (v_adj->>'ledger_id')::UUID;
                    END IF;
                END IF;
            END;
        END LOOP;
    END IF;

END;
$$;
