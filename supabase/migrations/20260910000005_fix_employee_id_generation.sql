-- Migration: 20260910000005_fix_employee_id_generation.sql
-- Description: Secures the generate_employee_id RPC against unauthorized generation

CREATE OR REPLACE FUNCTION public.generate_employee_id(p_branch_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_branch_number INT;
    v_next_emp_number INT;
    v_user_role TEXT;
BEGIN
    -- Check Authorization: Only specific roles should be able to call this
    v_user_role := auth.jwt() -> 'app_metadata' ->> 'role';
    IF v_user_role NOT IN ('SUPER_ADMIN', 'HR', 'BRANCH_MANAGER_ADMINISTRATIVE') THEN
        RAISE EXCEPTION 'Unauthorized: Only authorized roles can generate employee IDs.';
    END IF;

    IF p_branch_id IS NULL THEN
        RAISE EXCEPTION 'Branch ID is required to generate an employee ID.';
    END IF;

    -- Atomically lock and increment the sequence
    UPDATE public.branch_employee_sequences
    SET current_value = current_value + 1
    WHERE branch_id = p_branch_id
    RETURNING current_value INTO v_next_emp_number;
    
    IF v_next_emp_number IS NULL THEN
        RAISE EXCEPTION 'Branch sequence not found for branch_id %', p_branch_id;
    END IF;
    
    SELECT branch_number INTO v_branch_number 
    FROM public.branches 
    WHERE id = p_branch_id;
    
    IF v_branch_number IS NULL THEN
        RAISE EXCEPTION 'Branch not found';
    END IF;
    
    -- Format: CMTS-{2-digit branch}-{employee number}
    RETURN 'CMTS-' || LPAD(v_branch_number::TEXT, 2, '0') || '-' || v_next_emp_number::TEXT;
END;
$$;
