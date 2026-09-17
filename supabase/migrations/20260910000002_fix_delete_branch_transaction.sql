-- Migration: 20260910000002_fix_delete_branch_transaction.sql
-- Description: Updates delete_branch_transaction to strictly adhere to ON DELETE RESTRICT for employees.
-- Branches with existing employees will not be deleted to prevent accidental user account data loss.

CREATE OR REPLACE FUNCTION public.delete_branch_transaction(p_branch_id UUID, p_admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_admin_roles public.user_role[];
    v_has_employees BOOLEAN;
    v_branch_exists BOOLEAN;
BEGIN
    -- 0. Check if branch exists
    SELECT EXISTS (
        SELECT 1 FROM public.branches WHERE id = p_branch_id
    ) INTO v_branch_exists;

    IF NOT v_branch_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Branch not found');
    END IF;

    -- 1. Check if admin exists and is SUPER_ADMIN
    SELECT roles INTO v_admin_roles
    FROM public.profiles
    WHERE id = p_admin_id;

    IF v_admin_roles IS NULL OR NOT 'SUPER_ADMIN' = ANY(v_admin_roles) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only Super Admins can delete a branch');
    END IF;

    -- 2. Prevent deletion if the branch has ANY employees (adhering to ON DELETE RESTRICT)
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE branch_id = p_branch_id
    ) INTO v_has_employees;

    IF v_has_employees THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot delete branch because it still has employees assigned to it. Please reassign or remove them first.');
    END IF;

    -- 3. Delete other records explicitly if they have branch_id but cascade might not exist
    DELETE FROM public.holidays WHERE branch_id = p_branch_id;
    DELETE FROM public.attendance WHERE branch_id = p_branch_id;
    DELETE FROM public.eod_reports WHERE branch_id = p_branch_id;
    
    -- payroll_cycles has ON DELETE CASCADE from branches, so they will be deleted when we delete the branch
    -- but just in case, we can delete them too to be explicit.
    DELETE FROM public.payroll_cycles WHERE branch_id = p_branch_id;

    -- 4. Delete the branch
    DELETE FROM public.branches WHERE id = p_branch_id;

    RETURN jsonb_build_object('success', true, 'deleted_users_count', 0);
EXCEPTION WHEN OTHERS THEN
    -- Transaction rolls back automatically
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
