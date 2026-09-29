-- Migration: 20260824000005_fix_update_eod_rpc.sql
-- Description: Updates update_eod_rpc to enforce auth.uid() checks correctly.

CREATE OR REPLACE FUNCTION public.update_eod_rpc(
  p_employee_id UUID,
  p_report_date DATE,
  p_tasks_accomplished TEXT,
  p_office_hours NUMERIC,
  p_location TEXT,
  p_blockers TEXT,
  p_photo_url TEXT,
  p_status TEXT,
  p_submitted_by UUID
) RETURNS UUID AS $$
DECLARE
  v_eod_id UUID;
  v_attendance_status TEXT;
  v_caller_uid UUID;
BEGIN
  v_caller_uid := auth.uid();

  -- 1. Security Check: Caller identity verification
  IF v_caller_uid IS NULL OR v_caller_uid != p_submitted_by THEN
    RAISE EXCEPTION 'Unauthorized: Caller identity mismatch';
  END IF;

  -- 2. Security Check: Proxy update authorization
  IF v_caller_uid != p_employee_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = v_caller_uid 
      AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}' OR roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Insufficient permissions for proxy update';
    END IF;
  END IF;

  -- 3. Enforce Field Photo Requirement DB-side
  IF p_location = 'Field' AND (p_photo_url IS NULL OR p_photo_url = '') THEN
    SELECT photo_url INTO p_photo_url FROM public.eod_reports WHERE employee_id = p_employee_id AND report_date = p_report_date;
    IF p_photo_url IS NULL OR p_photo_url = '' THEN
      RAISE EXCEPTION 'A field photo is required when location is Field';
    END IF;
  END IF;

  -- 4. Update EOD Report
  UPDATE public.eod_reports SET
    tasks_accomplished = p_tasks_accomplished,
    office_hours = p_office_hours,
    location = p_location,
    blockers = p_blockers,
    photo_url = CASE WHEN p_photo_url = '' THEN photo_url ELSE p_photo_url END,
    status = p_status,
    submitted_by = p_submitted_by,
    updated_at = now()
  WHERE employee_id = p_employee_id AND report_date = p_report_date
  RETURNING id INTO v_eod_id;

  IF v_eod_id IS NULL THEN
    RAISE EXCEPTION 'EOD Report not found';
  END IF;

  -- 5. Determine Attendance Status
  IF p_location = 'Office' THEN
    v_attendance_status := 'Present';
  ELSE
    v_attendance_status := 'Field Assignment';
  END IF;

  -- 6. Sync Attendance
  UPDATE public.attendance 
  SET status = v_attendance_status,
      eod_reference_id = v_eod_id,
      updated_at = now()
  WHERE employee_id = p_employee_id AND date = p_report_date;

  RETURN v_eod_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;