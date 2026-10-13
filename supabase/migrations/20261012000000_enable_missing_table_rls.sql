-- Migration: Enable Row Level Security (RLS) on remaining auxiliary and LIMS tables
-- Tables covered:
-- 1. qr_documents
-- 2. lab_reports
-- 3. lab_report_lines
-- 4. lab_settings
-- 5. id_sequences
-- 6. ulr_yearly_counters
-- 7. report_yearly_counters
-- 8. branch_employee_sequences

-- 1. qr_documents
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'qr_documents') THEN
    ALTER TABLE public.qr_documents ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow authenticated to view qr_documents" ON public.qr_documents;
    CREATE POLICY "Allow authenticated to view qr_documents"
      ON public.qr_documents FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "Allow admins to manage qr_documents" ON public.qr_documents;
    CREATE POLICY "Allow admins to manage qr_documents"
      ON public.qr_documents FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND roles && ARRAY['SUPER_ADMIN', 'QUALITY_MANAGER', 'TECHNICAL_MANAGER']::public.user_role[]
        )
      );
  END IF;
END $$;

-- 2. lab_reports
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lab_reports') THEN
    ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow authenticated to view lab_reports" ON public.lab_reports;
    CREATE POLICY "Allow authenticated to view lab_reports"
      ON public.lab_reports FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "Allow lab staff to manage lab_reports" ON public.lab_reports;
    CREATE POLICY "Allow lab staff to manage lab_reports"
      ON public.lab_reports FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND roles && ARRAY['SUPER_ADMIN', 'QUALITY_MANAGER', 'TECHNICAL_MANAGER', 'TEST_ENGINEER', 'BRANCH_MANAGER_ADMINISTRATIVE']::public.user_role[]
        )
      );
  END IF;
END $$;

-- 3. lab_report_lines
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lab_report_lines') THEN
    ALTER TABLE public.lab_report_lines ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow authenticated to view lab_report_lines" ON public.lab_report_lines;
    CREATE POLICY "Allow authenticated to view lab_report_lines"
      ON public.lab_report_lines FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "Allow lab staff to manage lab_report_lines" ON public.lab_report_lines;
    CREATE POLICY "Allow lab staff to manage lab_report_lines"
      ON public.lab_report_lines FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND roles && ARRAY['SUPER_ADMIN', 'QUALITY_MANAGER', 'TECHNICAL_MANAGER', 'TEST_ENGINEER', 'BRANCH_MANAGER_ADMINISTRATIVE']::public.user_role[]
        )
      );
  END IF;
END $$;

-- 4. lab_settings
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lab_settings') THEN
    ALTER TABLE public.lab_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow authenticated to view lab_settings" ON public.lab_settings;
    CREATE POLICY "Allow authenticated to view lab_settings"
      ON public.lab_settings FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "Allow admins to manage lab_settings" ON public.lab_settings;
    CREATE POLICY "Allow admins to manage lab_settings"
      ON public.lab_settings FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND roles && ARRAY['SUPER_ADMIN', 'QUALITY_MANAGER', 'TECHNICAL_MANAGER']::public.user_role[]
        )
      );
  END IF;
END $$;

-- 5. id_sequences
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'id_sequences') THEN
    ALTER TABLE public.id_sequences ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow authenticated to view id_sequences" ON public.id_sequences;
    CREATE POLICY "Allow authenticated to view id_sequences"
      ON public.id_sequences FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "Allow super admins to manage id_sequences" ON public.id_sequences;
    CREATE POLICY "Allow super admins to manage id_sequences"
      ON public.id_sequences FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND roles && ARRAY['SUPER_ADMIN']::public.user_role[]
        )
      );
  END IF;
END $$;

-- 6. ulr_yearly_counters
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ulr_yearly_counters') THEN
    ALTER TABLE public.ulr_yearly_counters ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow authenticated to view ulr_yearly_counters" ON public.ulr_yearly_counters;
    CREATE POLICY "Allow authenticated to view ulr_yearly_counters"
      ON public.ulr_yearly_counters FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "Allow super admins to manage ulr_yearly_counters" ON public.ulr_yearly_counters;
    CREATE POLICY "Allow super admins to manage ulr_yearly_counters"
      ON public.ulr_yearly_counters FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND roles && ARRAY['SUPER_ADMIN']::public.user_role[]
        )
      );
  END IF;
END $$;

-- 7. report_yearly_counters
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'report_yearly_counters') THEN
    ALTER TABLE public.report_yearly_counters ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow authenticated to view report_yearly_counters" ON public.report_yearly_counters;
    CREATE POLICY "Allow authenticated to view report_yearly_counters"
      ON public.report_yearly_counters FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "Allow super admins to manage report_yearly_counters" ON public.report_yearly_counters;
    CREATE POLICY "Allow super admins to manage report_yearly_counters"
      ON public.report_yearly_counters FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND roles && ARRAY['SUPER_ADMIN']::public.user_role[]
        )
      );
  END IF;
END $$;

-- 8. branch_employee_sequences
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'branch_employee_sequences') THEN
    ALTER TABLE public.branch_employee_sequences ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow authenticated to view branch_employee_sequences" ON public.branch_employee_sequences;
    CREATE POLICY "Allow authenticated to view branch_employee_sequences"
      ON public.branch_employee_sequences FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "Allow super admins and HR to manage branch_employee_sequences" ON public.branch_employee_sequences;
    CREATE POLICY "Allow super admins and HR to manage branch_employee_sequences"
      ON public.branch_employee_sequences FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND roles && ARRAY['SUPER_ADMIN', 'HR']::public.user_role[]
        )
      );
  END IF;
END $$;
