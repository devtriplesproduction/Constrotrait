-- Migration: 20260909000006_delete_branch_rpc.sql
-- Description: Adds a server-side transactional RPC to delete a branch and all its associated records (including employees).

CREATE OR REPLACE FUNCTION public.delete_branch_transaction(p_branch_id UUID, p_admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_admin_roles public.user_role[];
    v_has_super_admin BOOLEAN;
    v_deleted_users_count INT := 0;
    v_deleted_users UUID[];
    v_target_user UUID;
BEGIN
    -- 1. Check if admin exists and is SUPER_ADMIN
    SELECT roles INTO v_admin_roles
    FROM public.profiles
    WHERE id = p_admin_id;

    IF v_admin_roles IS NULL OR NOT 'SUPER_ADMIN' = ANY(v_admin_roles) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only Super Admins can delete a branch');
    END IF;

    -- 2. Prevent deletion if any SUPER_ADMIN belongs to this branch
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE branch_id = p_branch_id AND 'SUPER_ADMIN' = ANY(roles)
    ) INTO v_has_super_admin;

    IF v_has_super_admin THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot delete a branch that contains a SUPER_ADMIN. Please reassign the admin first.');
    END IF;

    -- 3. Get all user IDs to delete
    SELECT array_agg(id) INTO v_deleted_users
    FROM public.profiles
    WHERE branch_id = p_branch_id;

    IF v_deleted_users IS NOT NULL THEN
        -- 4. Delete auth.users. 
        -- Since profiles references auth.users ON DELETE CASCADE, this will cascade to profiles
        -- and then cascade to attendance, eod_reports, etc.
        FOREACH v_target_user IN ARRAY v_deleted_users
        LOOP
            DELETE FROM auth.users WHERE id = v_target_user;
            v_deleted_users_count := v_deleted_users_count + 1;
        END LOOP;
    END IF;

    -- 5. Delete other records explicitly if they have branch_id but were not deleted by employee cascade
    DELETE FROM public.holidays WHERE branch_id = p_branch_id;
    DELETE FROM public.attendance WHERE branch_id = p_branch_id;
    DELETE FROM public.eod_reports WHERE branch_id = p_branch_id;
    
    -- payroll_cycles has ON DELETE CASCADE from branches, so they will be deleted when we delete the branch
    -- but just in case, we can delete them too to be explicit, but the FK takes care of it.

    -- 6. Delete the branch
    DELETE FROM public.branches WHERE id = p_branch_id;

    RETURN jsonb_build_object('success', true, 'deleted_users_count', v_deleted_users_count);
EXCEPTION WHEN OTHERS THEN
    -- Transaction rolls back automatically
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
