-- Migration: 20260909000004_fix_lock_payroll_cycle_adjustments.sql
-- Description: Fixes lock_payroll_cycle to correctly handle new payroll adjustments and include them in the snapshots.

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
    processed_ledgers UUID[] := '{}';
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

    -- Validate adjustments for duplicates and cross-branch issues
    IF p_adjustments IS NOT NULL THEN
        FOR v_adj IN SELECT * FROM jsonb_array_elements(p_adjustments)
        LOOP
            DECLARE
                v_test_ledger_id UUID;
                v_emp_branch UUID;
                v_test_emp_id UUID;
            BEGIN
                v_test_ledger_id := (v_adj->>'ledger_id')::UUID;
                IF v_test_ledger_id = ANY(processed_ledgers) THEN
                    RAISE EXCEPTION 'Duplicate ledger ID % in adjustments', v_test_ledger_id;
                END IF;
                processed_ledgers := array_append(processed_ledgers, v_test_ledger_id);
                
                SELECT employee_id INTO v_test_emp_id FROM public.employee_financial_ledger WHERE id = v_test_ledger_id;
                IF v_test_emp_id IS NOT NULL THEN
                    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_snapshots) AS s WHERE (s->>'employee_id')::UUID = v_test_emp_id) THEN
                        RAISE EXCEPTION 'Adjustment for employee % who is not in the current payroll snapshots', v_test_emp_id;
                    END IF;
                    
                    SELECT branch_id INTO v_emp_branch FROM public.profiles WHERE id = v_test_emp_id;
                    IF p_branch_id IS NOT NULL AND v_emp_branch != p_branch_id THEN
                        RAISE EXCEPTION 'Cross-branch adjustment not allowed for ledger %', v_test_ledger_id;
                    END IF;
                END IF;
            END;
        END LOOP;
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
                
                db_medical_allowance NUMERIC := 0;
                db_travel_expense NUMERIC := 0;
                db_performance_incentive NUMERIC := 0;
                db_food_allowance NUMERIC := 0;
                db_tds NUMERIC := 0;

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
                
                db_days_present NUMERIC;
                db_days_field NUMERIC;
                db_days_paid_leave NUMERIC;
                db_days_unpaid_leave NUMERIC;
                db_days_absent NUMERIC;
                
                v_ledger_emp_id UUID;
                v_ledger_rem NUMERIC;
                v_ledger_type TEXT;
                v_ledger_cat TEXT;

                v_emp_name TEXT;
                v_emp_external_id TEXT;
                v_emp_dept TEXT;
                v_emp_desig TEXT;
                db_standard_holidays NUMERIC := 0;
                db_effective_holidays NUMERIC := 0;
                db_accounted_days NUMERIC := 0;
                db_total_earned_days NUMERIC := 0;
                db_proration_factor NUMERIC := 1;
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

                -- 1.5 Calculate attendance independently from DB
                SELECT COUNT(*) INTO db_days_present FROM public.attendance WHERE employee_id = db_emp_id AND status = 'Present' AND EXTRACT(MONTH FROM date) = p_month AND EXTRACT(YEAR FROM date) = p_year;
                SELECT COUNT(*) INTO db_days_field FROM public.attendance WHERE employee_id = db_emp_id AND status = 'Field Assignment' AND EXTRACT(MONTH FROM date) = p_month AND EXTRACT(YEAR FROM date) = p_year;

                -- 1.6 Derive metadata securely from profiles
                SELECT first_name || ' ' || last_name, employee_id, department, designation
                INTO v_emp_name, v_emp_external_id, v_emp_dept, v_emp_desig
                FROM public.profiles
                WHERE id = db_emp_id;

                -- 1.7 Calculate Holidays
                SELECT COUNT(*) INTO db_standard_holidays
                FROM public.holidays
                WHERE is_active = true 
                  AND date >= make_date(p_year, p_month, 1) 
                  AND date <= v_end_date
                  AND (branch_id IS NULL OR branch_id = p_branch_id)
                  AND (department IS NULL OR v_emp_dept IS NULL OR department ILIKE '%' || v_emp_dept || '%');

                -- 1.8 Calculate Leaves
                SELECT 
                    COALESCE(SUM(CASE WHEN lr.is_paid THEN (CASE WHEN lr.is_half_day THEN 0.5 ELSE 1.0 END) ELSE 0 END), 0),
                    COALESCE(SUM(CASE WHEN NOT lr.is_paid THEN (CASE WHEN lr.is_half_day THEN 0.5 ELSE 1.0 END) ELSE 0 END), 0)
                INTO db_days_paid_leave, db_days_unpaid_leave
                FROM public.leave_requests lr,
                     generate_series(
                         GREATEST(lr.start_date, make_date(p_year, p_month, 1)),
                         LEAST(lr.end_date, v_end_date),
                         '1 day'::interval
                     ) d
                WHERE lr.employee_id = db_emp_id
                  AND lr.status = 'Approved'
                  AND extract(dow from d) NOT IN (0, 6)
                  AND NOT EXISTS (
                      SELECT 1 FROM public.holidays h 
                      WHERE h.date = d::date 
                        AND h.is_active = true
                        AND (h.branch_id IS NULL OR h.branch_id = p_branch_id)
                        AND (h.department IS NULL OR v_emp_dept IS NULL OR h.department ILIKE '%' || v_emp_dept || '%')
                  );

                -- 1.9 Derive net payable and absences strictly on the server
                IF (db_days_present + db_days_field + db_days_paid_leave) > 0 THEN
                    db_effective_holidays := db_standard_holidays;
                ELSE
                    db_effective_holidays := 0;
                END IF;

                db_accounted_days := db_days_present + db_days_field + db_days_paid_leave + db_days_unpaid_leave + db_effective_holidays;
                db_days_absent := GREATEST(0, 26 - db_accounted_days);

                db_total_earned_days := LEAST(26, db_days_present + db_days_field + db_days_paid_leave + db_effective_holidays);
                db_proration_factor := db_total_earned_days / 26.0;
                db_net_payable := GREATEST(0, ROUND(db_base_salary * GREATEST(0, db_proration_factor)));

                -- 2. Input Validation
                IF db_net_payable < 0 THEN
                    RAISE EXCEPTION 'Security error: net_payable cannot be negative';
                END IF;

                IF db_net_payable > db_base_salary THEN
                    RAISE EXCEPTION 'Security error: net_payable (%) exceeds base_salary (%) for employee %', db_net_payable, db_base_salary, db_emp_id;
                END IF;

                -- 3. Calculate dependent financial structures strictly
                db_basic_salary := db_net_payable;
                db_hra := 0;
                db_allowance := 0;

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
                            ELSIF v_ledger_type ILIKE '%medical allowance%' THEN
                                db_medical_allowance := db_medical_allowance + (v_adj->>'amount')::NUMERIC;
                            ELSIF v_ledger_type ILIKE '%travel expense%' THEN
                                db_travel_expense := db_travel_expense + (v_adj->>'amount')::NUMERIC;
                            ELSIF v_ledger_type ILIKE '%performance incentive%' THEN
                                db_performance_incentive := db_performance_incentive + (v_adj->>'amount')::NUMERIC;
                            ELSIF v_ledger_type ILIKE '%food allowance%' THEN
                                db_food_allowance := db_food_allowance + (v_adj->>'amount')::NUMERIC;
                            ELSIF v_ledger_type ILIKE '%tds%' THEN
                                RAISE EXCEPTION 'TDS calculation is not implemented: missing taxable-base rule';
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
                db_gross_salary := db_basic_salary + db_hra + db_allowance + db_bonus + db_overtime_pay + db_medical_allowance + db_travel_expense + db_performance_incentive + db_food_allowance;
                db_total_deductions := db_pf + db_esi + db_professional_tax + db_income_tax + 
                                       db_other_deductions + db_salary_advance_recovery + db_damage_recovery + db_tds;
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
                    medical_allowance,
                    travel_expense,
                    performance_incentive,
                    food_allowance,
                    tds,
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
                    v_emp_name,
                    v_emp_external_id,
                    v_emp_dept,
                    v_emp_desig,
                    db_base_salary, -- Server derived
                    db_days_present, -- Server derived
                    db_days_field, -- Server derived
                    db_days_paid_leave,
                    db_days_unpaid_leave,
                    db_days_absent,
                    db_net_payable, -- Validated
                    db_basic_salary, -- Server derived
                    db_hra,          -- Server derived
                    db_allowance,    -- Server derived
                    db_bonus,        -- Server derived
                    db_medical_allowance, -- Server derived
                    db_travel_expense,    -- Server derived
                    db_performance_incentive, -- Server derived
                    db_food_allowance,    -- Server derived
                    db_tds,          -- Server derived
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
                v_ledger_type TEXT;
            BEGIN
                SELECT employee_id, remaining_amount, adjustment_category, adjustment_type
                INTO v_ledger_emp_id, v_ledger_rem, v_ledger_cat, v_ledger_type
                FROM public.employee_financial_ledger
                WHERE id = (v_adj->>'ledger_id')::UUID;
                
                IF v_ledger_emp_id IS NOT NULL AND (v_adj->>'amount')::NUMERIC >= 0 AND (v_adj->>'amount')::NUMERIC <= v_ledger_rem THEN
                    INSERT INTO public.payroll_adjustment_applications (
                        employee_id, ledger_id, cycle_id, adjustment_type, adjustment_category, applied_amount, status, applied_at, applied_by
                    ) VALUES (
                        v_ledger_emp_id,
                        (v_adj->>'ledger_id')::UUID,
                        v_cycle_id,
                        v_ledger_type,
                        v_ledger_cat,
                        (v_adj->>'amount')::NUMERIC,
                        'applied',
                        now(),
                        p_locked_by
                    );

                    -- Update the ledger status
                    IF v_ledger_cat = 'one_time' THEN
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
