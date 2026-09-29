-- Migration: 20260824000004_update_eod_permissions.sql
-- Description: Updates EOD submission to allow BRANCH_MANAGER_ADMINISTRATIVE, creates update_eod_rpc, and updates RLS policies.

-- 1. Update submit_eod_rpc to include BRANCH_MANAGER_ADMINISTRATIVE
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
      AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}' OR roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
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


-- 2. Create update_eod_rpc
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

  -- 1. Security Check: Only admins can call this function to update any EOD
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = v_caller_uid 
    AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}' OR roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Insufficient permissions to update EOD';
  END IF;

  -- 2. Enforce Field Photo Requirement DB-side
  IF p_location = 'Field' AND (p_photo_url IS NULL OR p_photo_url = '') THEN
    -- If photo_url is empty but there's an existing one, we will use COALESCE below,
    -- but we should ensure they aren't wiping it out. For simplicity, if they pass empty and it's Field,
    -- we might want to check the existing row first.
    SELECT photo_url INTO p_photo_url FROM public.eod_reports WHERE employee_id = p_employee_id AND report_date = p_report_date;
    IF p_photo_url IS NULL OR p_photo_url = '' THEN
      RAISE EXCEPTION 'A field photo is required when location is Field';
    END IF;
  END IF;

  -- 3. Update EOD Report
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

  -- 4. Determine Attendance Status
  IF p_location = 'Office' THEN
    v_attendance_status := 'Present';
  ELSE
    v_attendance_status := 'Field Assignment';
  END IF;

  -- 5. Sync Attendance
  UPDATE public.attendance 
  SET status = v_attendance_status,
      eod_reference_id = v_eod_id,
      updated_at = now()
  WHERE employee_id = p_employee_id AND date = p_report_date;

  RETURN v_eod_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Update RLS Policies for eod_reports

DROP POLICY IF EXISTS "HR and Super Admins can insert proxy EODs" ON public.eod_reports;
CREATE POLICY "Admins can insert proxy EODs" 
ON public.eod_reports FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}' OR roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
  )
);

DROP POLICY IF EXISTS "HR and Super Admins can update EODs" ON public.eod_reports;
CREATE POLICY "Admins can update EODs" 
ON public.eod_reports FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}' OR roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
  )
);

-- Branch managers need to be able to SELECT EODs they are updating.
DROP POLICY IF EXISTS "HR and Super Admins can view all EODs" ON public.eod_reports;
CREATE POLICY "Admins can view all EODs" 
ON public.eod_reports FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}' OR roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
  )
);


-- 4. Update RLS Policies for attendance (if they can edit EOD, they might need to view attendance contextually)
DROP POLICY IF EXISTS "HR and Super Admins can view all attendance" ON public.attendance;
CREATE POLICY "Admins can view all attendance" 
ON public.attendance FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}' OR roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
  )
);
