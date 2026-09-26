-- Replace per-test TC-YYYY-##### ULR with NABL-legal allocation.
-- One ULR per job's in-scope tests. Non-NABL tests get qc_number only.

ALTER TABLE public.job_entry_tests
  ADD COLUMN IF NOT EXISTS qc_number TEXT NULL,
  ADD COLUMN IF NOT EXISTS report_class TEXT NULL;

DO $$
BEGIN
  ALTER TABLE public.job_entry_tests
    ADD CONSTRAINT job_entry_tests_report_class_check
    CHECK (report_class IS NULL OR report_class IN ('NABL', 'QC'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.lab_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  lab_code TEXT NOT NULL DEFAULT 'WAI',
  tc_number TEXT NOT NULL DEFAULT '16212'
);

INSERT INTO public.lab_settings (id, lab_code, tc_number)
VALUES (1, 'WAI', '16212')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.id_sequences (
  kind TEXT NOT NULL CHECK (kind IN ('ULR', 'QC')),
  fy TEXT NOT NULL,
  last_value INT NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, fy)
);

CREATE OR REPLACE FUNCTION public.current_fy(p_at DATE DEFAULT CURRENT_DATE)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT to_char(
    CASE WHEN EXTRACT(MONTH FROM p_at) >= 4
      THEN EXTRACT(YEAR FROM p_at)
      ELSE EXTRACT(YEAR FROM p_at) - 1
    END,
    'FM00'
  );
$$;

CREATE OR REPLACE FUNCTION public.next_seq(p_kind TEXT, p_fy TEXT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_next INT;
BEGIN
  INSERT INTO public.id_sequences (kind, fy, last_value)
  VALUES (p_kind, p_fy, 0)
  ON CONFLICT (kind, fy) DO NOTHING;

  UPDATE public.id_sequences
     SET last_value = last_value + 1
   WHERE kind = p_kind AND fy = p_fy
   RETURNING last_value INTO v_next;

  RETURN v_next;
END;
$$;

-- Issue ULRs for tests dated p_date.
-- Groups by job. Only test_master.is_nabl = true get a shared ULR.
CREATE OR REPLACE FUNCTION public.generate_ulr_for_date(p_date DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fy TEXT := public.current_fy(p_date);
  v_tc TEXT;
  v_lab TEXT;
  v_job RECORD;
  v_nabl_count INT;
  v_qc_count INT;
  v_seq INT;
  v_ulr TEXT;
  v_qc TEXT;
BEGIN
  SELECT tc_number, lab_code INTO v_tc, v_lab FROM public.lab_settings WHERE id = 1;
  IF v_tc IS NULL THEN
    v_tc := '16212';
    v_lab := 'WAI';
  END IF;

  FOR v_job IN
    SELECT DISTINCT t.job_entry_id
      FROM public.job_entry_tests t
     WHERE t.date_of_testing = p_date
       AND COALESCE(t.ulr_status, 'pending') = 'pending'
  LOOP
    SELECT COUNT(*) INTO v_nabl_count
      FROM public.job_entry_tests t
      LEFT JOIN public.test_master m ON m.id = t.test_master_id
     WHERE t.job_entry_id = v_job.job_entry_id
       AND t.date_of_testing = p_date
       AND COALESCE(t.ulr_status, 'pending') = 'pending'
       AND COALESCE(m.is_nabl, false) = true;

    SELECT COUNT(*) INTO v_qc_count
      FROM public.job_entry_tests t
      LEFT JOIN public.test_master m ON m.id = t.test_master_id
     WHERE t.job_entry_id = v_job.job_entry_id
       AND t.date_of_testing = p_date
       AND COALESCE(t.ulr_status, 'pending') = 'pending'
       AND COALESCE(m.is_nabl, false) = false;

    IF v_nabl_count > 0 THEN
      v_seq := public.next_seq('ULR', v_fy);
      v_ulr := 'TC' || LPAD(regexp_replace(v_tc, '\D', '', 'g'), 5, '0')
               || v_fy || LPAD(v_seq::TEXT, 8, '0') || 'F';

      UPDATE public.job_entry_tests t
         SET ulr_seq = v_seq,
             ulr_year = NULL,
             ulr_number = v_ulr,
             ulr_generated_at = NOW(),
             ulr_status = 'generated',
             report_class = 'NABL',
             qc_number = NULL
        FROM public.test_master m
       WHERE t.test_master_id = m.id
         AND t.job_entry_id = v_job.job_entry_id
         AND t.date_of_testing = p_date
         AND COALESCE(t.ulr_status, 'pending') = 'pending'
         AND m.is_nabl = true;
    END IF;

    IF v_qc_count > 0 THEN
      v_seq := public.next_seq('QC', v_fy);
      v_qc := 'QC-' || v_lab || '-' || v_fy || '-' || LPAD(v_seq::TEXT, 6, '0');

      UPDATE public.job_entry_tests t
         SET ulr_number = NULL,
             ulr_seq = NULL,
             ulr_generated_at = NOW(),
             ulr_status = 'generated',
             report_class = 'QC',
             qc_number = v_qc
        FROM public.test_master m
       WHERE t.test_master_id IS NOT DISTINCT FROM m.id
         AND t.job_entry_id = v_job.job_entry_id
         AND t.date_of_testing = p_date
         AND COALESCE(t.ulr_status, 'pending') = 'pending'
         AND COALESCE(m.is_nabl, false) = false;

      -- tests with no test_master (null) are QC
      UPDATE public.job_entry_tests t
         SET ulr_number = NULL,
             ulr_seq = NULL,
             ulr_generated_at = NOW(),
             ulr_status = 'generated',
             report_class = 'QC',
             qc_number = COALESCE(t.qc_number, v_qc)
       WHERE t.job_entry_id = v_job.job_entry_id
         AND t.date_of_testing = p_date
         AND COALESCE(t.ulr_status, 'pending') = 'pending'
         AND t.test_master_id IS NULL;
    END IF;
  END LOOP;
END;
$$;
