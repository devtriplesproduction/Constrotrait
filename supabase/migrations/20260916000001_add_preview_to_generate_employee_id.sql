-- Migration: 20260916000001_add_preview_to_generate_employee_id.sql
-- Description: Adds a preview parameter to generate_employee_id to safely generate the ID without consuming a sequence number.

-- Drop the old function since we are adding a parameter
DROP FUNCTION IF EXISTS public.generate_employee_id(UUID);

CREATE OR REPLACE FUNCTION public.generate_employee_id(p_branch_id UUID, p_is_preview BOOLEAN DEFAULT false)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_branch_number INT;
    v_next_emp_number INT;
    v_caller_uid UUID;
    v_caller_profile RECORD;
    v_target_branch_id UUID;
BEGIN
    v_caller_uid := auth.uid();
    
    IF v_caller_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User is not authenticated.';
    END IF;

    -- Fetch caller profile for server-side verification
    SELECT * INTO v_caller_profile FROM public.profiles WHERE id = v_caller_uid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unauthorized: Profile not found.';
    END IF;

    -- Check Authorization: Only specific roles should be able to call this
    IF NOT (v_caller_profile.roles @> '{"SUPER_ADMIN"}' OR v_caller_profile.roles @> '{"HR"}' OR v_caller_profile.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}') THEN
        RAISE EXCEPTION 'Unauthorized: Only authorized roles can generate employee IDs.';
    END IF;

    -- Determine target branch id based on authorization level
    IF v_caller_profile.roles @> '{"SUPER_ADMIN"}' THEN
        v_target_branch_id := p_branch_id;
    ELSE
        -- HR and Branch Managers can only generate IDs for their own assigned branch
        v_target_branch_id := v_caller_profile.branch_id;
    END IF;

    IF v_target_branch_id IS NULL THEN
        RAISE EXCEPTION 'Branch ID is required to generate an employee ID.';
    END IF;

    IF p_is_preview THEN
        -- Only preview the next value without locking or incrementing
        SELECT current_value + 1 INTO v_next_emp_number
        FROM public.branch_employee_sequences
        WHERE branch_id = v_target_branch_id;
    ELSE
        -- Atomically lock and increment the sequence
        UPDATE public.branch_employee_sequences
        SET current_value = current_value + 1
        WHERE branch_id = v_target_branch_id
        RETURNING current_value INTO v_next_emp_number;
    END IF;
    
    IF v_next_emp_number IS NULL THEN
        RAISE EXCEPTION 'Branch sequence not found for branch_id %', v_target_branch_id;
    END IF;
    
    SELECT branch_number INTO v_branch_number 
    FROM public.branches 
    WHERE id = v_target_branch_id;
    
    IF v_branch_number IS NULL THEN
        RAISE EXCEPTION 'Branch not found';
    END IF;
    
    -- Format: CMTS-{2-digit branch}-{employee number}
    RETURN 'CMTS-' || LPAD(v_branch_number::TEXT, 2, '0') || '-' || v_next_emp_number::TEXT;
END;
$$;
