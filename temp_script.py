import re

with open('supabase/migrations/20260909000000_secure_payroll_financials.sql', 'r') as f:
    sql = f.read()

# I need to modify lock_payroll_cycle to support the new columns and TDS.
# Replace the loop variables:
old_vars = '''                db_other_deductions NUMERIC := 0;
                db_salary_advance_recovery NUMERIC := 0;
                db_damage_recovery NUMERIC := 0;'''

new_vars = '''                db_other_deductions NUMERIC := 0;
                db_salary_advance_recovery NUMERIC := 0;
                db_damage_recovery NUMERIC := 0;
                db_medical_allowance NUMERIC := 0;
                db_travel_expense NUMERIC := 0;
                db_performance_incentive NUMERIC := 0;
                db_food_allowance NUMERIC := 0;
                db_tds NUMERIC := 0;'''

sql = sql.replace(old_vars, new_vars)

# Replace the ledger check
old_ledger_check = '''                            IF (v_adj->>'amount')::NUMERIC > v_ledger_rem THEN
                                RAISE EXCEPTION 'Security error: Adjustment amount exceeds remaining amount for ledger %', v_adj->>'ledger_id';
                            END IF;'''

new_ledger_check = '''                            IF v_ledger_type NOT ILIKE 'tds%' AND (v_adj->>'amount')::NUMERIC > v_ledger_rem THEN
                                RAISE EXCEPTION 'Security error: Adjustment amount exceeds remaining amount for ledger %', v_adj->>'ledger_id';
                            END IF;'''
sql = sql.replace(old_ledger_check, new_ledger_check)

# Replace ledger processing
old_ledger_proc = '''                            IF v_ledger_type ILIKE '%bonus%' THEN
                                db_bonus := db_bonus + (v_adj->>'amount')::NUMERIC;
                            ELSIF v_ledger_type ILIKE '%advance%' THEN
                                db_salary_advance_recovery := db_salary_advance_recovery + (v_adj->>'amount')::NUMERIC;
                            ELSIF v_ledger_type ILIKE '%damage%' THEN
                                db_damage_recovery := db_damage_recovery + (v_adj->>'amount')::NUMERIC;
                            ELSE
                                db_other_deductions := db_other_deductions + (v_adj->>'amount')::NUMERIC;
                            END IF;'''

new_ledger_proc = '''                            IF v_ledger_type ILIKE '%bonus%' THEN
                                db_bonus := db_bonus + (v_adj->>'amount')::NUMERIC;
                            ELSIF v_ledger_type ILIKE 'medical allowance%' THEN
                                db_medical_allowance := db_medical_allowance + (v_adj->>'amount')::NUMERIC;
                            ELSIF v_ledger_type ILIKE 'travel expense%' THEN
                                db_travel_expense := db_travel_expense + (v_adj->>'amount')::NUMERIC;
                            ELSIF v_ledger_type ILIKE 'performance incentive%' THEN
                                db_performance_incentive := db_performance_incentive + (v_adj->>'amount')::NUMERIC;
                            ELSIF v_ledger_type ILIKE 'food allowance%' THEN
                                db_food_allowance := db_food_allowance + (v_adj->>'amount')::NUMERIC;
                            ELSIF v_ledger_type ILIKE 'tds%' THEN
                                db_tds := db_tds + (v_adj->>'amount')::NUMERIC;
                            ELSIF v_ledger_type ILIKE '%advance%' THEN
                                db_salary_advance_recovery := db_salary_advance_recovery + (v_adj->>'amount')::NUMERIC;
                            ELSIF v_ledger_type ILIKE '%damage%' THEN
                                db_damage_recovery := db_damage_recovery + (v_adj->>'amount')::NUMERIC;
                            ELSE
                                db_other_deductions := db_other_deductions + (v_adj->>'amount')::NUMERIC;
                            END IF;'''
sql = sql.replace(old_ledger_proc, new_ledger_proc)

# Update db_gross_salary
old_gross = '''                db_gross_salary := db_basic_salary + db_hra + db_allowance + db_bonus + db_overtime_pay;'''
new_gross = '''                db_gross_salary := db_basic_salary + db_hra + db_allowance + db_bonus + db_overtime_pay + db_medical_allowance + db_travel_expense + db_performance_incentive + db_food_allowance;'''
sql = sql.replace(old_gross, new_gross)

# Update db_total_deductions
old_ded = '''                db_total_deductions := db_pf + db_esi + db_professional_tax + db_income_tax + 
                                       db_other_deductions + db_salary_advance_recovery + db_damage_recovery;'''
new_ded = '''                db_total_deductions := db_pf + db_esi + db_professional_tax + db_income_tax + 
                                       db_other_deductions + db_salary_advance_recovery + db_damage_recovery + db_tds;'''
sql = sql.replace(old_ded, new_ded)

# Update insert
old_insert = '''                    basic_salary,
                    hra,
                    allowance,
                    bonus,
                    gross_salary,'''
new_insert = '''                    basic_salary,
                    hra,
                    allowance,
                    bonus,
                    medical_allowance,
                    travel_expense,
                    performance_incentive,
                    food_allowance,
                    gross_salary,'''
sql = sql.replace(old_insert, new_insert)

old_insert2 = '''                    damage_recovery,
                    total_deductions,'''
new_insert2 = '''                    damage_recovery,
                    tds,
                    total_deductions,'''
sql = sql.replace(old_insert2, new_insert2)

old_val = '''                    db_basic_salary, -- Server derived
                    db_hra,          -- Server derived
                    db_allowance,    -- Server derived
                    db_bonus,        -- Server derived
                    db_gross_salary, -- Server derived'''
new_val = '''                    db_basic_salary, -- Server derived
                    db_hra,          -- Server derived
                    db_allowance,    -- Server derived
                    db_bonus,        -- Server derived
                    db_medical_allowance,
                    db_travel_expense,
                    db_performance_incentive,
                    db_food_allowance,
                    db_gross_salary, -- Server derived'''
sql = sql.replace(old_val, new_val)

old_val2 = '''                    db_damage_recovery,         -- Server derived
                    db_total_deductions,        -- Server derived'''
new_val2 = '''                    db_damage_recovery,         -- Server derived
                    db_tds,
                    db_total_deductions,        -- Server derived'''
sql = sql.replace(old_val2, new_val2)

# Also update the final adjustment application logic to ignore remaining_amount for TDS
old_app = '''                IF v_ledger_emp_id IS NOT NULL AND (v_adj->>'amount')::NUMERIC >= 0 AND (v_adj->>'amount')::NUMERIC <= v_ledger_rem THEN'''
new_app = '''                IF v_ledger_emp_id IS NOT NULL AND (v_adj->>'amount')::NUMERIC >= 0 AND ((v_adj->>'adjustment_type') ILIKE 'tds%' OR (v_adj->>'amount')::NUMERIC <= v_ledger_rem) THEN'''
sql = sql.replace(old_app, new_app)

with open('supabase/migrations/20260909000003_add_new_payroll_adjustments.sql', 'a') as f:
    f.write('\n\n')
    f.write(sql)
