-- Migration for QR Documents and Report Issue Logic
CREATE TABLE IF NOT EXISTS public.qr_documents (
  code text PRIMARY KEY,
  name text,
  doc_type text CHECK (doc_type IN ('TR','DS')),
  is_nabl boolean
);

ALTER TABLE public.test_master 
  ADD COLUMN IF NOT EXISTS report_qr text REFERENCES public.qr_documents(code),
  ADD COLUMN IF NOT EXISTS datasheet_qr text REFERENCES public.qr_documents(code);

-- Normalize and Seed codes
INSERT INTO public.qr_documents (code, name, doc_type, is_nabl)
VALUES
  ('QR103', 'Test Report (QR 103)', 'TR', true),
  ('QR50', 'Test Report (QR 50)', 'TR', false),
  ('QR124', 'Test Report (QR 124)', 'TR', true),
  ('QR74', 'Test Report (QR 74)', 'TR', false),
  ('QR121', 'Test Report (QR 121)', 'TR', true),
  ('QR73', 'Test Report (QR 73)', 'TR', false),
  ('QR130', 'Test Report (QR 130)', 'TR', true),
  ('QR155', 'Test Report (QR 155)', 'TR', false),
  ('QR294', 'Test Report (QR 294)', 'TR', true),
  ('QR237A', 'Test Report (QR 237 A)', 'TR', false),
  ('QR280', 'Test Report (QR 280)', 'TR', false)
ON CONFLICT (code) DO NOTHING;

-- Map existing tests
UPDATE public.test_master SET report_qr = 'QR103' WHERE name = 'Compressive Strength of Cube' AND is_nabl = true;
UPDATE public.test_master SET report_qr = 'QR50' WHERE name = 'Compressive Strength of Cube' AND (is_nabl = false OR is_nabl IS NULL);

UPDATE public.test_master SET report_qr = 'QR124' WHERE name = 'Ultrasonic Pulse Velocity' AND is_nabl = true;
UPDATE public.test_master SET report_qr = 'QR74' WHERE name = 'Ultrasonic Pulse Velocity' AND (is_nabl = false OR is_nabl IS NULL);

UPDATE public.test_master SET report_qr = 'QR121' WHERE name = 'Rebound Hammer' AND is_nabl = true;
UPDATE public.test_master SET report_qr = 'QR73' WHERE name = 'Rebound Hammer' AND (is_nabl = false OR is_nabl IS NULL);

UPDATE public.test_master SET report_qr = 'QR130' WHERE name = 'Half Cell Potential' AND is_nabl = true;
UPDATE public.test_master SET report_qr = 'QR155' WHERE name = 'Half Cell Potential' AND (is_nabl = false OR is_nabl IS NULL);

UPDATE public.test_master SET report_qr = 'QR294' WHERE name = 'Ambient Noise Level' AND is_nabl = true;
UPDATE public.test_master SET report_qr = 'QR237A' WHERE name = 'Ambient Noise Level' AND (is_nabl = false OR is_nabl IS NULL);

CREATE OR REPLACE FUNCTION public.issue_reports_for_job(p_job_entry_id UUID, p_issued_by UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_yy TEXT := RIGHT(v_year::TEXT, 2);
  v_grp RECORD;
  v_seq INT;
  v_ulr TEXT;
  v_rep TEXT;
  v_qr TEXT;
  v_report UUID;
  v_uid TEXT;
  v_out JSONB := '[]'::JSONB;
  v_job_date DATE;
  v_job_month TEXT;
  v_job_year INT;
BEGIN
  -- Get inward date to mint UID
  SELECT COALESCE(inward_on, created_at::date) INTO v_job_date
  FROM public.job_entries
  WHERE id = p_job_entry_id;

  v_job_month := UPPER(TO_CHAR(v_job_date, 'MON'));
  v_job_year := EXTRACT(YEAR FROM v_job_date)::INT;

  FOR v_grp IN
    SELECT
      COALESCE(m.is_nabl, false) AS is_nabl,
      COALESCE(NULLIF(TRIM(m.category), ''), 'Construction') AS category,
      CASE 
        WHEN t.testing_age::text ILIKE '%28%' THEN 28 
        WHEN TRIM(t.testing_age::text) = '7' 
          OR TRIM(t.testing_age::text) ILIKE '7 %' 
          OR TRIM(t.testing_age::text) ILIKE '7-%' 
          OR TRIM(t.testing_age::text) ILIKE '7D%' THEN 7 
        ELSE 0 
      END AS age_days,
      m.report_qr AS report_qr,
      array_agg(t.id) AS test_ids,
      MAX(t.uid_label) AS existing_uid_label
    FROM public.job_entry_tests t
    LEFT JOIN public.test_master m ON m.id = t.test_master_id
    WHERE t.job_entry_id = p_job_entry_id
      AND COALESCE(t.ulr_status, 'pending') <> 'generated'
    GROUP BY 1, 2, 3, 4
    ORDER BY 1 DESC, 2, 3, 4
  LOOP
    IF v_grp.report_qr IS NULL THEN
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'error', 'Set report QR on test master',
        'is_nabl', v_grp.is_nabl,
        'category', v_grp.category,
        'age_days', v_grp.age_days
      ));
      CONTINUE;
    END IF;

    v_qr := v_grp.report_qr;
    v_seq := public.next_report_seq(v_year);
    v_rep := 'CMTS/' || v_qr || '/' || v_year::TEXT || '/' || v_seq::TEXT;

    IF v_grp.existing_uid_label IS NOT NULL AND v_grp.existing_uid_label <> '' THEN
      v_uid := v_grp.existing_uid_label;
    ELSE
      IF v_grp.is_nabl THEN
        v_uid := public.next_uid_seq('UID_NABL', v_job_year)::TEXT;
      ELSE
        v_uid := v_job_month || '-' ||
                 LPAD(public.next_uid_seq('UID_' || v_job_month, v_job_year)::TEXT, 2, '0');
      END IF;
    END IF;

    IF v_grp.is_nabl THEN
      v_ulr := 'TC16212' || v_yy || LPAD(v_seq::TEXT, 9, '0') || 'F';
    ELSE
      v_ulr := NULL;
    END IF;

    INSERT INTO public.lab_reports (job_entry_id, report_class, report_no, ulr_number, qr_code, issued_by, uid_label)
    VALUES (
      p_job_entry_id,
      CASE WHEN v_grp.is_nabl THEN 'NABL' ELSE 'QC' END,
      v_rep, v_ulr, v_qr, p_issued_by, v_uid
    )
    RETURNING id INTO v_report;

    INSERT INTO public.lab_report_lines (report_id, job_entry_test_id)
    SELECT v_report, x FROM unnest(v_grp.test_ids) AS x;

    UPDATE public.job_entry_tests
       SET ulr_number = v_ulr,
           ulr_seq = v_seq,
           ulr_year = v_year,
           ulr_generated_at = NOW(),
           ulr_status = 'generated',
           report_class = CASE WHEN v_grp.is_nabl THEN 'NABL' ELSE 'QC' END,
           qc_number = CASE WHEN v_grp.is_nabl THEN NULL ELSE v_rep END,
           uid_label = COALESCE(uid_label, v_uid)
     WHERE id = ANY (v_grp.test_ids);

    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'report_id', v_report,
      'class', CASE WHEN v_grp.is_nabl THEN 'NABL' ELSE 'QC' END,
      'category', v_grp.category,
      'age_days', v_grp.age_days,
      'report_no', v_rep,
      'ulr', v_ulr,
      'qr', v_qr,
      'uid', v_uid
    ));
  END LOOP;

  RETURN v_out;
END;
$$;
