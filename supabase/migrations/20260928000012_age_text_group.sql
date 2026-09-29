-- testing_age is TEXT. Treat 7 / 7 days / 28 / 28 days as split groups.
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
      v_uid := UPPER(TO_CHAR(CURRENT_DATE, 'MON')) || '-' ||
               LPAD(public.next_uid_seq('UID_' || UPPER(TO_CHAR(CURRENT_DATE, 'MON')), v_year)::TEXT, 2, '0');
    END IF;

    INSERT INTO public.lab_reports (job_entry_id, report_class, report_no, ulr_number, qr_code, issued_by)
    VALUES (
      p_job_entry_id,
      CASE WHEN v_grp.is_nabl THEN 'NABL' ELSE 'QC' END,
      v_rep, v_ulr, v_qr, p_issued_by
    ) RETURNING id INTO v_report;

    INSERT INTO public.lab_report_lines (report_id, job_entry_test_id)
    SELECT v_report, x FROM unnest(v_grp.test_ids) AS x;

    UPDATE public.job_entry_tests
       SET ulr_number = v_ulr, ulr_seq = v_seq, ulr_year = v_year,
           ulr_generated_at = NOW(), ulr_status = 'generated',
           report_class = CASE WHEN v_grp.is_nabl THEN 'NABL' ELSE 'QC' END,
           qc_number = CASE WHEN v_grp.is_nabl THEN NULL ELSE v_rep END
     WHERE id = ANY (v_grp.test_ids);

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
