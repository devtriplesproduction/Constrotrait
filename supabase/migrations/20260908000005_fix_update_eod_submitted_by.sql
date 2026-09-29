-- Migration: 20260908000005_fix_update_eod_submitted_by.sql
-- Description: Enforces caller identity check against p_submitted_by in update_eod_rpc.

CREATE OR REPLACE FUNCTION public.update_eod_rpc(
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
  v_employee_branch_id UUID;
BEGIN
  v_caller_uid := auth.uid();

  IF v_caller_uid IS NULL OR v_caller_uid != p_submitted_by THEN
    RAISE EXCEPTION 'Unauthorized: Caller identity mismatch';
  END IF;

  -- Derive branch_id from target employee's profile
  SELECT branch_id INTO v_employee_branch_id FROM public.profiles WHERE id = p_employee_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_caller_uid AND roles @> '{"SUPER_ADMIN"}'
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
        RAISE EXCEPTION 'Unauthorized: Insufficient permissions or cross-branch update not permitted';
      END IF;
    END IF;
  END IF;

  IF p_location = 'Field' AND (p_photo_url IS NULL OR p_photo_url = '') THEN
    SELECT photo_url INTO p_photo_url FROM public.eod_reports WHERE employee_id = p_employee_id AND report_date = p_report_date;
    IF p_photo_url IS NULL OR p_photo_url = '' THEN
      RAISE EXCEPTION 'A field photo is required when location is Field';
    END IF;
  END IF;

  UPDATE public.eod_reports SET
    tasks_accomplished = p_tasks_accomplished,
    office_hours = p_office_hours,
    location = p_location,
    blockers = p_blockers,
    photo_url = CASE WHEN p_photo_url = '' THEN photo_url ELSE p_photo_url END,
    status = p_status,
    submitted_by = p_submitted_by,
    job_card_numbers = p_job_card_numbers,
    tomorrows_plan = p_tomorrows_plan,
    branch_id = v_employee_branch_id,
    updated_at = now()
  WHERE employee_id = p_employee_id AND report_date = p_report_date
  RETURNING id INTO v_eod_id;

  IF v_eod_id IS NULL THEN
    RAISE EXCEPTION 'EOD Report not found';
  END IF;

  -- ATTENDANCE SYNC
  IF p_status = 'Approved' THEN
    IF p_location = 'Office' THEN
      v_attendance_status := 'Present';
    ELSE
      v_attendance_status := 'Field Assignment';
    END IF;

    INSERT INTO public.attendance (employee_id, date, status, eod_reference_id, branch_id)
    VALUES (p_employee_id, p_report_date, v_attendance_status, v_eod_id, v_employee_branch_id)
    ON CONFLICT (employee_id, date) DO UPDATE 
    SET status = EXCLUDED.status, eod_reference_id = EXCLUDED.eod_reference_id, branch_id = EXCLUDED.branch_id, updated_at = now();
  ELSE
    DELETE FROM public.attendance 
    WHERE employee_id = p_employee_id AND date = p_report_date AND eod_reference_id = v_eod_id;
  END IF;

  -- COMP-OFF INTEGRATION
  IF p_status = 'Approved' THEN
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
    ELSE
      DELETE FROM public.comp_off_ledger WHERE employee_id = p_employee_id AND reference_id = v_eod_id AND transaction_type = 'CREDIT';
    END IF;
  ELSE
    DELETE FROM public.comp_off_ledger WHERE employee_id = p_employee_id AND reference_id = v_eod_id AND transaction_type = 'CREDIT';
  END IF;

  RETURN v_eod_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
