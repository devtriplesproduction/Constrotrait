-- Migration: 20260825000005_secure_review_eod_rpc.sql
-- Description: Secures EOD reviews by enforcing strict branch checks and replacing direct UPDATE with an RPC.

CREATE OR REPLACE FUNCTION public.review_eod_rpc(
  p_eod_id UUID,
  p_status TEXT,
  p_rejection_reason TEXT,
  p_approved_by UUID
) RETURNS UUID AS $$
DECLARE
  v_employee_id UUID;
  v_caller_uid UUID;
BEGIN
  v_caller_uid := auth.uid();

  -- Get employee_id of the EOD
  SELECT employee_id INTO v_employee_id FROM public.eod_reports WHERE id = p_eod_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'EOD Report not found';
  END IF;

  -- 1. Security Check: Only admins can call this function to review any EOD, with Branch Isolation
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = v_caller_uid 
    AND roles @> '{"SUPER_ADMIN"}'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles caller
      JOIN public.profiles target ON target.id = v_employee_id
      WHERE caller.id = v_caller_uid 
      AND (caller.roles @> '{"HR"}' OR caller.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
      AND caller.branch_id = target.branch_id
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Insufficient permissions or cross-branch review not permitted';
    END IF;

    -- HR/BM cannot review their own
    IF v_employee_id = v_caller_uid THEN
      RAISE EXCEPTION 'Unauthorized: Cannot review own EOD';
    END IF;
  END IF;

  UPDATE public.eod_reports SET
    status = p_status,
    rejection_reason = p_rejection_reason,
    approved_by = p_approved_by,
    approved_at = now(),
    updated_at = now()
  WHERE id = p_eod_id;

  RETURN p_eod_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
