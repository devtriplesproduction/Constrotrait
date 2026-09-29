-- Final locked matrix (client sheet + QR note).
-- Groups on one job card: is_nabl + category (Construction/Environmental) + 7/28 age.
-- All NABL reports use QR103. Off-scope / non-NABL use QR280. No ULR on non-NABL.

ALTER TABLE public.job_entries ADD COLUMN IF NOT EXISTS uid_label TEXT;
ALTER TABLE public.lab_reports ADD COLUMN IF NOT EXISTS qr_code TEXT;

CREATE TABLE IF NOT EXISTS public.report_yearly_counters (
  year INT PRIMARY KEY,
  last_seq INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.uid_yearly_counters (
  kind TEXT NOT NULL,
  year INT NOT NULL,
  last_seq INT NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, year)
);

CREATE OR REPLACE FUNCTION public.next_report_seq(p_year INT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE v INT;
BEGIN
  INSERT INTO public.report_yearly_counters(year, last_seq) VALUES (p_year, 1)
  ON CONFLICT (year) DO UPDATE SET last_seq = public.report_yearly_counters.last_seq + 1
  RETURNING last_seq INTO v;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.next_uid_seq(p_kind TEXT, p_year INT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE v INT;
BEGIN
  INSERT INTO public.uid_yearly_counters(kind, year, last_seq) VALUES (p_kind, p_year, 1)
  ON CONFLICT (kind, year) DO UPDATE SET last_seq = public.uid_yearly_counters.last_seq + 1
  RETURNING last_seq INTO v;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_job_uid(p_job_entry_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_has_qc BOOLEAN;
  v_seq INT;
  v_label TEXT;
  v_mon TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.job_entry_tests t
    LEFT JOIN public.test_master m ON m.id = t.test_master_id
    WHERE t.job_entry_id = p_job_entry_id AND COALESCE(m.is_nabl, false) = false
  ) INTO v_has_qc;

  SELECT uid_label INTO v_label FROM public.job_entries WHERE id = p_job_entry_id;
  IF v_label IS NOT NULL AND v_label <> '' THEN
    RETURN v_label;
  END IF;

  IF v_has_qc THEN
    v_mon := UPPER(TO_CHAR(CURRENT_DATE, 'MON'));
    v_seq := public.next_uid_seq('UID_' || v_mon, v_year);
    v_label := v_mon || '-' || LPAD(v_seq::TEXT, 2, '0');
  ELSE
    v_seq := public.next_uid_seq('UID_NABL', v_year);
    v_label := v_seq::TEXT;
  END IF;

  UPDATE public.job_entries SET uid = v_seq, uid_label = v_label WHERE id = p_job_entry_id;
  RETURN v_label;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_job_uid(p_job_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN public.allocate_job_uid(p_job_id);
END;
$$;

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
BEGIN
  v_uid := public.allocate_job_uid(p_job_entry_id);

  FOR v_grp IN
    SELECT
      COALESCE(m.is_nabl, false) AS is_nabl,
      COALESCE(m.category, 'Construction') AS category,
      CASE WHEN t.testing_age IN (7, 28) THEN t.testing_age ELSE 0 END AS age_days,
      array_agg(t.id) AS test_ids
    FROM public.job_entry_tests t
    LEFT JOIN public.test_master m ON m.id = t.test_master_id
    WHERE t.job_entry_id = p_job_entry_id
      AND COALESCE(t.ulr_status, 'pending') <> 'generated'
    GROUP BY 1, 2, 3
    ORDER BY 1 DESC, 2, 3
  LOOP
    v_qr := CASE WHEN v_grp.is_nabl THEN 'QR103' ELSE 'QR280' END;
    v_seq := public.next_report_seq(v_year);
    v_rep := 'CMTS/' || v_qr || '/' || v_year::TEXT || '/' || v_seq::TEXT;

    IF v_grp.is_nabl THEN
      v_ulr := 'TC16212' || v_yy || LPAD(v_seq::TEXT, 9, '0') || 'F';
      v_uid := public.next_uid_seq('UID_NABL', v_year)::TEXT;
    ELSE
      v_ulr := NULL;
      v_uid := UPPER(TO_CHAR(CURRENT_DATE, 'MON')) || '-' ||
               LPAD(public.next_uid_seq('UID_' || UPPER(TO_CHAR(CURRENT_DATE, 'MON')), v_year)::TEXT, 2, '0');
    END IF;

    INSERT INTO public.lab_reports (job_entry_id, report_class, report_no, ulr_number, qr_code, issued_by)
    VALUES (
      p_job_entry_id,
      CASE WHEN v_grp.is_nabl THEN 'NABL' ELSE 'QC' END,
      v_rep, v_ulr, v_qr, p_issued_by
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
           qc_number = CASE WHEN v_grp.is_nabl THEN NULL ELSE v_rep END
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
