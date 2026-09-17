-- Migration: 20260908000006_secure_submit_eod_rpc_status.sql
-- Description: Secures submit_eod_rpc to completely ignore the client-supplied p_status and p_submitted_by inside the INSERT.

CREATE OR REPLACE FUNCTION public.submit_eod_rpc(
  p_employee_id UUID,
  p_report_date DATE,
  p_tasks_accomplished TEXT,
  p_office_hours NUMERIC,
  p_location TEXT,
  p_blockers TEXT,
  p_photo_url TEXT,
  p_status TEXT,
  p_submitted_by UUID,
  p_job_card_numbers TEXT DEFAULT NULL,
  p_tomorrows_plan TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_eod_id UUID;
  v_attendance_status TEXT;
  v_caller_uid UUID;
  v_is_working BOOLEAN;
  v_credit_hours NUMERIC;
  v_final_status TEXT;
  v_employee_branch_id UUID;
BEGIN
  v_caller_uid := auth.uid();

  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not authenticated';
  END IF;

  IF v_caller_uid != p_submitted_by THEN
    RAISE EXCEPTION 'Unauthorized: Caller identity mismatch';
  END IF;

  -- Derive branch_id from target employee's profile
  SELECT branch_id INTO v_employee_branch_id FROM public.profiles WHERE id = p_employee_id;

  IF v_caller_uid = p_employee_id THEN
    -- Prevent self-approval bypass
    v_final_status := 'Pending';
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = v_caller_uid AND roles @> '{"SUPER_ADMIN"}'
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles caller
        JOIN public.profiles target ON target.id = p_employee_id
        WHERE caller.id = v_caller_uid 
        AND (caller.roles @> '{"HR"}' OR caller.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
        AND caller.branch_id = target.branch_id
      ) THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.profiles caller
          JOIN public.profiles target ON target.id = p_employee_id
          WHERE caller.id = v_caller_uid 
          AND target.reporting_manager_id = v_caller_uid
          AND caller.branch_id = target.branch_id
        ) THEN
          RAISE EXCEPTION 'Unauthorized: Insufficient permissions or cross-branch proxy submission not permitted';
        END IF;
      END IF;
    END IF;
    -- Enforce proxy submissions to be Approved, ignoring client-provided p_status
    v_final_status := 'Approved';
  END IF;

  IF p_location = 'Field' AND (p_photo_url IS NULL OR p_photo_url = '') THEN
    RAISE EXCEPTION 'A field photo is required when location is Field';
  END IF;

  INSERT INTO public.eod_reports (
    employee_id, report_date, tasks_accomplished, office_hours, 
    location, blockers, photo_url, status, submitted_by, job_card_numbers, tomorrows_plan, branch_id
  ) VALUES (
    p_employee_id, p_report_date, p_tasks_accomplished, p_office_hours, 
    p_location, p_blockers, p_photo_url, v_final_status, v_caller_uid, p_job_card_numbers, p_tomorrows_plan, v_employee_branch_id
  ) RETURNING id INTO v_eod_id;

  -- ONLY Sync Attendance if Approved (e.g. proxy submission by admin)
  IF v_final_status = 'Approved' THEN
    IF p_location = 'Office' THEN
      v_attendance_status := 'Present';
    ELSE
      v_attendance_status := 'Field Assignment';
    END IF;

    INSERT INTO public.attendance (employee_id, date, status, eod_reference_id, branch_id)
    VALUES (p_employee_id, p_report_date, v_attendance_status, v_eod_id, v_employee_branch_id)
    ON CONFLICT (employee_id, date) DO UPDATE 
    SET status = EXCLUDED.status, eod_reference_id = EXCLUDED.eod_reference_id, branch_id = EXCLUDED.branch_id, updated_at = now();
  END IF;

  -- COMP-OFF INTEGRATION
  IF v_final_status = 'Approved' THEN
    v_is_working := public.is_working_day(p_employee_id, p_report_date);
    IF v_is_working THEN
      v_credit_hours := GREATEST(p_office_hours - 8, 0);
    ELSE
      v_credit_hours := p_office_hours;
    END IF;

    IF v_credit_hours > 0 THEN
      INSERT INTO public.comp_off_ledger (employee_id, transaction_type, hours, reference_id)
      VALUES (p_employee_id, 'CREDIT', v_credit_hours, v_eod_id)
      ON CONFLICT (employee_id, reference_id) WHERE transaction_type = 'CREDIT'
      DO UPDATE SET hours = EXCLUDED.hours, created_at = now();
    END IF;
  END IF;

  RETURN v_eod_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
