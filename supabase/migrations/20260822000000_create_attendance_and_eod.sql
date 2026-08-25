-- Migration: 20260822000000_create_attendance_and_eod.sql
-- Description: Creates Attendance, EOD Reports tables, RPC for submission, and Storage Bucket for photos.

-- Enable uuid-ossp if not already enabled (typically already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- EOD REPORTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.eod_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  tasks_accomplished TEXT NOT NULL,
  office_hours NUMERIC NOT NULL CHECK (office_hours >= 0 AND office_hours <= 12),
  location TEXT NOT NULL CHECK (location IN ('Office', 'Field')),
  blockers TEXT,
  photo_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
  rejection_reason TEXT,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  
  -- Prevent multiple EODs per employee per day
  UNIQUE (employee_id, report_date)
);

CREATE INDEX IF NOT EXISTS eod_reports_employee_id_idx ON public.eod_reports(employee_id);
CREATE INDEX IF NOT EXISTS eod_reports_report_date_idx ON public.eod_reports(report_date);
CREATE INDEX IF NOT EXISTS eod_reports_status_idx ON public.eod_reports(status);

-- ==========================================
-- ATTENDANCE TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Present', 'Field Assignment')),
  eod_reference_id UUID REFERENCES public.eod_reports(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate attendance
  UNIQUE (employee_id, date)
);

CREATE INDEX IF NOT EXISTS attendance_employee_id_idx ON public.attendance(employee_id);
CREATE INDEX IF NOT EXISTS attendance_date_idx ON public.attendance(date);

-- ==========================================
-- EOD + ATTENDANCE RPC (TRANSACTIONAL)
-- ==========================================
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
BEGIN
  -- 0. Enforce Field Photo Requirement DB-side
  IF p_location = 'Field' AND (p_photo_url IS NULL OR p_photo_url = '') THEN
    RAISE EXCEPTION 'A field photo is required when location is Field';
  END IF;
  -- 1. Insert EOD Report (will fail if duplicate exists due to UNIQUE constraint)
  INSERT INTO public.eod_reports (
    employee_id, report_date, tasks_accomplished, office_hours, 
    location, blockers, photo_url, status, submitted_by
  ) VALUES (
    p_employee_id, p_report_date, p_tasks_accomplished, p_office_hours, 
    p_location, p_blockers, p_photo_url, p_status, p_submitted_by
  ) RETURNING id INTO v_eod_id;

  -- 2. Determine Attendance Status
  IF p_location = 'Office' THEN
    v_attendance_status := 'Present';
  ELSE
    v_attendance_status := 'Field Assignment';
  END IF;

  -- 3. Sync Attendance (Idempotent: upsert behavior)
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


-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.eod_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- EOD Reports Policies
CREATE POLICY "Users can view their own EODs" 
ON public.eod_reports FOR SELECT 
USING (auth.uid() = employee_id OR auth.uid() = submitted_by);

CREATE POLICY "HR and Super Admins can view all EODs" 
ON public.eod_reports FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
  )
);

CREATE POLICY "Users can insert their own EODs" 
ON public.eod_reports FOR INSERT 
WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "HR and Super Admins can insert proxy EODs" 
ON public.eod_reports FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
  )
);

CREATE POLICY "HR and Super Admins can update EODs" 
ON public.eod_reports FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
  )
);

-- Attendance Policies
CREATE POLICY "Users can view their own attendance" 
ON public.attendance FOR SELECT 
USING (auth.uid() = employee_id);

CREATE POLICY "HR and Super Admins can view all attendance" 
ON public.attendance FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
  )
);


-- ==========================================
-- STORAGE BUCKET FOR EOD PHOTOS
-- ==========================================
-- Insert the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('eod_photos', 'eod_photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Users can upload photos if they are authenticated
CREATE POLICY "Authenticated users can upload EOD photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'eod_photos' 
  AND auth.uid() = owner
);

-- Users can view their own photos
CREATE POLICY "Users can view their own EOD photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'eod_photos' 
  AND auth.uid() = owner
);

-- HR and Super Admins can view all EOD photos
CREATE POLICY "HR and Super Admins can view all EOD photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'eod_photos' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (roles @> '{"SUPER_ADMIN"}' OR roles @> '{"HR"}')
  )
);
