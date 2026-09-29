-- Migration: 20260824000001_secure_submit_eod_rpc.sql
-- Description: Secures submit_eod_rpc by verifying auth.uid() and permissions internally, as it runs as SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.submit_eod_rpc(
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

  -- 2. Security Check: Proxy submission authorization
  IF v_caller_uid != p_employee_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = v_caller_uid 
      AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Insufficient permissions for proxy submission';
    END IF;
  END IF;

  -- 3. Enforce Field Photo Requirement DB-side
  IF p_location = 'Field' AND (p_photo_url IS NULL OR p_photo_url = '') THEN
    RAISE EXCEPTION 'A field photo is required when location is Field';
  END IF;

  -- 4. Insert EOD Report (will fail if duplicate exists due to UNIQUE constraint)
  INSERT INTO public.eod_reports (
    employee_id, report_date, tasks_accomplished, office_hours, 
    location, blockers, photo_url, status, submitted_by
  ) VALUES (
    p_employee_id, p_report_date, p_tasks_accomplished, p_office_hours, 
    p_location, p_blockers, p_photo_url, p_status, p_submitted_by
  ) RETURNING id INTO v_eod_id;

  -- 5. Determine Attendance Status
  IF p_location = 'Office' THEN
    v_attendance_status := 'Present';
  ELSE
    v_attendance_status := 'Field Assignment';
  END IF;

  -- 6. Sync Attendance (Idempotent: upsert behavior)
  INSERT INTO public.attendance (
    employee_id, date, status, eod_reference_id
  ) VALUES (
    p_employee_id, p_report_date, v_attendance_status, v_eod_id
  ) ON CONFLICT (employee_id, date) DO UPDATE 
    SET status = EXCLUDED.status,
        eod_reference_id = EXCLUDED.eod_reference_id,
        updated_at = now();

  RETURN v_eod_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
