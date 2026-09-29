-- Non-NABL UID month = job inward (job_entries.created_at), not run date.
-- Mixed jobs: one UID per report group on lab_reports + job_entry_tests.

ALTER TABLE public.lab_reports ADD COLUMN IF NOT EXISTS uid_label TEXT;
ALTER TABLE public.job_entry_tests ADD COLUMN IF NOT EXISTS uid_label TEXT;
ALTER TABLE public.job_entries ADD COLUMN IF NOT EXISTS inward_on DATE;
UPDATE public.job_entries SET inward_on = created_at::date WHERE inward_on IS NULL;

CREATE OR REPLACE FUNCTION public.issue_reports_for_job(p_job_entry_id UUID, p_issued_by UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_yy TEXT := RIGHT(v_year::TEXT, 2);
  v_inward DATE;
  v_inward_year INT;
  v_mon TEXT;
  v_grp RECORD;
  v_seq INT;
  v_ulr TEXT;
  v_rep TEXT;
  v_qr TEXT;
  v_report UUID;
  v_uid TEXT;
  v_out JSONB := '[]'::JSONB;
  v_first TEXT;
BEGIN
  SELECT COALESCE(inward_on, created_at::date) INTO v_inward
  FROM public.job_entries WHERE id = p_job_entry_id;
  v_inward_year := EXTRACT(YEAR FROM v_inward)::INT;
  v_mon := UPPER(TO_CHAR(v_inward, 'MON'));

  FOR v_grp IN
    SELECT
      COALESCE(m.is_nabl, false) AS is_nabl,
      COALESCE(m.category, 'Construction') AS category,
      CASE
        WHEN COALESCE(t.testing_age, '') ~ '28' THEN 28
        WHEN COALESCE(t.testing_age, '') ~ '7' THEN 7
        ELSE 0
      END AS age_days,
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
      v_uid := v_mon || '-' ||
               LPAD(public.next_uid_seq('UID_' || v_mon, v_inward_year)::TEXT, 2, '0');
    END IF;

    INSERT INTO public.lab_reports (job_entry_id, report_class, report_no, ulr_number, qr_code, uid_label, issued_by)
    VALUES (
      p_job_entry_id,
      CASE WHEN v_grp.is_nabl THEN 'NABL' ELSE 'QC' END,
      v_rep, v_ulr, v_qr, v_uid, p_issued_by
    ) RETURNING id INTO v_report;

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
           uid_label = v_uid
     WHERE id = ANY (v_grp.test_ids);

    IF v_first IS NULL THEN
      v_first := v_uid;
      UPDATE public.job_entries
         SET uid_label = v_first,
             uid = CASE WHEN v_grp.is_nabl THEN NULLIF(regexp_replace(v_uid, '\D', '', 'g'), '')::INT ELSE uid END
       WHERE id = p_job_entry_id;
    END IF;

    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'report_id', v_report,
      'class', CASE WHEN v_grp.is_nabl THEN 'NABL' ELSE 'QC' END,
      'category', v_grp.category,
      'age_days', v_grp.age_days,
      'report_no', v_rep, 'ulr', v_ulr, 'qr', v_qr, 'uid', v_uid
    ));
  END LOOP;
  RETURN v_out;
END;
$$;
