-- Migration: 20260828000002_strict_rpc_security.sql
-- Description: Overrides EOD and Leave RPCs with auth.uid() checks and native EOD Comp-Off integration

-- 1. Helper function for working days
CREATE OR REPLACE FUNCTION public.is_working_day(p_employee_id UUID, p_date DATE)
RETURNS BOOLEAN AS $$
DECLARE
    v_day_of_week INT;
    v_profile RECORD;
    v_holiday RECORD;
    v_applies BOOLEAN;
BEGIN
    v_day_of_week := EXTRACT(DOW FROM p_date);
    IF v_day_of_week = 0 OR v_day_of_week = 6 THEN
        RETURN FALSE; 
    END IF;

    SELECT branch_id, department INTO v_profile FROM public.profiles WHERE id = p_employee_id;

    FOR v_holiday IN SELECT branch_id, department FROM public.holidays WHERE date = p_date AND is_active = true LOOP
        v_applies := false;
        IF v_holiday.branch_id IS NOT NULL AND v_holiday.department IS NOT NULL THEN
            IF v_holiday.branch_id = v_profile.branch_id AND (string_to_array(v_holiday.department, ',') @> ARRAY[v_profile.department] OR v_holiday.department LIKE '%' || v_profile.department || '%') THEN
                v_applies := true;
            END IF;
        ELSIF v_holiday.branch_id IS NOT NULL THEN
            IF v_holiday.branch_id = v_profile.branch_id THEN
                v_applies := true;
            END IF;
        ELSIF v_holiday.department IS NOT NULL THEN
            IF string_to_array(v_holiday.department, ',') @> ARRAY[v_profile.department] OR v_holiday.department LIKE '%' || v_profile.department || '%' THEN
                v_applies := true;
            END IF;
        END IF;

        IF v_applies THEN
            RETURN FALSE;
        END IF;
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update submit_eod_rpc
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
  v_is_working BOOLEAN;
  v_credit_hours NUMERIC;
BEGIN
  v_caller_uid := auth.uid();

  IF v_caller_uid IS NULL OR v_caller_uid != p_submitted_by THEN
    RAISE EXCEPTION 'Unauthorized: Caller identity mismatch';
  END IF;

  IF v_caller_uid != p_employee_id THEN
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
          SELECT 1 FROM public.profiles target
          WHERE target.id = p_employee_id AND target.reporting_manager_id = v_caller_uid
        ) THEN
          RAISE EXCEPTION 'Unauthorized: Insufficient permissions or cross-branch proxy submission not permitted';
        END IF;
      END IF;
    END IF;
  END IF;

  IF p_location = 'Field' AND (p_photo_url IS NULL OR p_photo_url = '') THEN
    RAISE EXCEPTION 'A field photo is required when location is Field';
  END IF;

  INSERT INTO public.eod_reports (
    employee_id, report_date, tasks_accomplished, office_hours, 
    location, blockers, photo_url, status, submitted_by
  ) VALUES (
    p_employee_id, p_report_date, p_tasks_accomplished, p_office_hours, 
    p_location, p_blockers, p_photo_url, p_status, p_submitted_by
  ) RETURNING id INTO v_eod_id;

  IF p_location = 'Office' THEN
    v_attendance_status := 'Present';
  ELSE
    v_attendance_status := 'Field Assignment';
  END IF;

  INSERT INTO public.attendance (employee_id, date, status, eod_reference_id)
  VALUES (p_employee_id, p_report_date, v_attendance_status, v_eod_id)
  ON CONFLICT (employee_id, date) DO UPDATE 
  SET status = EXCLUDED.status, eod_reference_id = EXCLUDED.eod_reference_id, updated_at = now();

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
    END IF;
  END IF;

  RETURN v_eod_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Update review_eod_rpc
CREATE OR REPLACE FUNCTION public.review_eod_rpc(
  p_eod_id UUID,
  p_status TEXT,
  p_rejection_reason TEXT
) RETURNS UUID AS $$
DECLARE
  v_employee_id UUID;
  v_report_date DATE;
  v_office_hours NUMERIC;
  v_caller_uid UUID;
  v_is_working BOOLEAN;
  v_credit_hours NUMERIC;
BEGIN
  v_caller_uid := auth.uid();

  SELECT employee_id, report_date, office_hours INTO v_employee_id, v_report_date, v_office_hours 
  FROM public.eod_reports WHERE id = p_eod_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'EOD Report not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_caller_uid AND roles @> '{"SUPER_ADMIN"}'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles caller
      JOIN public.profiles target ON target.id = v_employee_id
      WHERE caller.id = v_caller_uid 
      AND (caller.roles @> '{"HR"}' OR caller.roles @> '{"BRANCH_MANAGER_ADMINISTRATIVE"}')
      AND caller.branch_id = target.branch_id
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles target
        WHERE target.id = v_employee_id AND target.reporting_manager_id = v_caller_uid
      ) THEN
        RAISE EXCEPTION 'Unauthorized: Insufficient permissions or cross-branch review not permitted';
      END IF;
    END IF;
    IF v_employee_id = v_caller_uid THEN
      RAISE EXCEPTION 'Unauthorized: Cannot review own EOD';
    END IF;
  END IF;

  UPDATE public.eod_reports SET
    status = p_status,
    rejection_reason = p_rejection_reason,
    approved_by = CASE WHEN p_status = 'Approved' THEN v_caller_uid ELSE NULL END,
    approved_at = CASE WHEN p_status = 'Approved' THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_eod_id;

  -- COMP-OFF INTEGRATION
  IF p_status = 'Approved' THEN
    v_is_working := public.is_working_day(v_employee_id, v_report_date);
    IF v_is_working THEN
      v_credit_hours := GREATEST(v_office_hours - 8, 0);
    ELSE
      v_credit_hours := v_office_hours;
    END IF;

    IF v_credit_hours > 0 THEN
      INSERT INTO public.comp_off_ledger (employee_id, transaction_type, hours, reference_id)
      VALUES (v_employee_id, 'CREDIT', v_credit_hours, p_eod_id)
      ON CONFLICT (employee_id, reference_id) WHERE transaction_type = 'CREDIT'
      DO UPDATE SET hours = EXCLUDED.hours, created_at = now();
    ELSE
      DELETE FROM public.comp_off_ledger WHERE employee_id = v_employee_id AND reference_id = p_eod_id AND transaction_type = 'CREDIT';
    END IF;
  ELSE
    DELETE FROM public.comp_off_ledger WHERE employee_id = v_employee_id AND reference_id = p_eod_id AND transaction_type = 'CREDIT';
  END IF;

  RETURN p_eod_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Update update_eod_rpc
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
  v_is_working BOOLEAN;
  v_credit_hours NUMERIC;
BEGIN
  v_caller_uid := auth.uid();

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
        SELECT 1 FROM public.profiles target
        WHERE target.id = p_employee_id AND target.reporting_manager_id = v_caller_uid
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
    updated_at = now()
  WHERE employee_id = p_employee_id AND report_date = p_report_date
  RETURNING id INTO v_eod_id;

  IF v_eod_id IS NULL THEN
    RAISE EXCEPTION 'EOD Report not found';
  END IF;

  IF p_location = 'Office' THEN
    v_attendance_status := 'Present';
  ELSE
    v_attendance_status := 'Field Assignment';
  END IF;

  UPDATE public.attendance 
  SET status = v_attendance_status, eod_reference_id = v_eod_id, updated_at = now()
  WHERE employee_id = p_employee_id AND date = p_report_date;

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


-- 5. Rewrite Leave RPCs
CREATE OR REPLACE FUNCTION public.approve_comp_off_leave(p_leave_id UUID) 
RETURNS VOID AS $$
DECLARE
    v_leave RECORD;
    v_balance NUMERIC;
    v_hours_to_debit NUMERIC;
    v_caller_uid UUID;
    v_leave_days NUMERIC;
BEGIN
    v_caller_uid := auth.uid();
    
    SELECT * INTO v_leave FROM public.leave_requests WHERE id = p_leave_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Leave not found'; END IF;
    IF v_leave.status != 'Pending HR' THEN RAISE EXCEPTION 'Leave is not pending HR approval'; END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_caller_uid AND (roles @> '{"HR"}' OR roles @> '{"SUPER_ADMIN"}')) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- calculate debit
    IF v_leave.is_half_day THEN
        v_hours_to_debit := 4;
    ELSE
        -- 1 full day = 8 hours. If it spans multiple days, we need to know the number of working days.
        -- We will do a basic loop in Postgres to count working days
        v_leave_days := 0;
        FOR d IN 0..(v_leave.end_date - v_leave.start_date) LOOP
            IF public.is_working_day(v_leave.employee_id, v_leave.start_date + d) THEN
                v_leave_days := v_leave_days + 1;
            END IF;
        END LOOP;
        v_hours_to_debit := v_leave_days * 8;
    END IF;

    IF v_hours_to_debit > 0 THEN
        SELECT COALESCE(SUM(CASE WHEN transaction_type IN ('CREDIT', 'REVERSAL') THEN hours ELSE -hours END), 0)
        INTO v_balance FROM public.comp_off_ledger WHERE employee_id = v_leave.employee_id;

        IF v_balance < v_hours_to_debit THEN
            RAISE EXCEPTION 'Insufficient Comp-Off balance';
        END IF;

        INSERT INTO public.comp_off_ledger (employee_id, transaction_type, hours, reference_id)
        VALUES (v_leave.employee_id, 'DEBIT', v_hours_to_debit, p_leave_id);
    END IF;

    UPDATE public.leave_requests 
    SET status = 'Approved', hr_approver_id = v_caller_uid, updated_at = now()
    WHERE id = p_leave_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.cancel_comp_off_leave(p_leave_id UUID) 
RETURNS VOID AS $$
DECLARE
    v_leave RECORD;
    v_debit RECORD;
    v_caller_uid UUID;
BEGIN
    v_caller_uid := auth.uid();

    SELECT * INTO v_leave FROM public.leave_requests WHERE id = p_leave_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Leave not found'; END IF;
    IF v_leave.status != 'Approved' THEN RAISE EXCEPTION 'Only approved leaves can be cancelled'; END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_caller_uid AND (roles @> '{"HR"}' OR roles @> '{"SUPER_ADMIN"}')) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE public.leave_requests SET status = 'Cancelled', updated_at = now() WHERE id = p_leave_id;

    IF v_leave.leave_type = 'Compensatory Off' THEN
        SELECT * INTO v_debit FROM public.comp_off_ledger WHERE reference_id = p_leave_id AND transaction_type = 'DEBIT' LIMIT 1;
        IF FOUND THEN
            INSERT INTO public.comp_off_ledger (employee_id, transaction_type, hours, reference_id)
            VALUES (v_leave.employee_id, 'REVERSAL', v_debit.hours, p_leave_id);
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.verify_medical_certificate(p_leave_id UUID) 
RETURNS VOID AS $$
DECLARE
    v_leave RECORD;
    v_caller_uid UUID;
BEGIN
    v_caller_uid := auth.uid();

    SELECT * INTO v_leave FROM public.leave_requests WHERE id = p_leave_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Leave not found'; END IF;
    IF v_leave.leave_type != 'Sick Leave' THEN RAISE EXCEPTION 'Only Sick Leaves have medical certificates'; END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_caller_uid AND (roles @> '{"HR"}' OR roles @> '{"SUPER_ADMIN"}')) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE public.leave_requests 
    SET is_paid = true, certificate_verified_by = v_caller_uid, updated_at = now() 
    WHERE id = p_leave_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
