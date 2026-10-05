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
  v_job_is_nabl BOOLEAN;
  v_uid_label TEXT;
  v_test_count INT;
BEGIN
  -- Get inward date and properties
  SELECT COALESCE(inward_on, created_at::date), COALESCE(is_nabl, false), uid_label 
  INTO v_job_date, v_job_is_nabl, v_uid_label
  FROM public.job_entries
  WHERE id = p_job_entry_id;

  v_job_month := UPPER(TO_CHAR(v_job_date, 'MON'));
  v_job_year := EXTRACT(YEAR FROM v_job_date)::INT;

  -- Check if there are any tests
  SELECT COUNT(*) INTO v_test_count FROM public.job_entry_tests WHERE job_entry_id = p_job_entry_id;

  IF v_test_count = 0 THEN
    -- DUMMY JOB CARD LOGIC: Generate ULR/Report without tests
    -- Check if we already generated a report for this dummy card
    SELECT id INTO v_report FROM public.lab_reports WHERE job_entry_id = p_job_entry_id LIMIT 1;
    IF v_report IS NOT NULL THEN
       RETURN v_out; -- Already generated
    END IF;

    -- Use existing UID or generate one
    IF v_uid_label IS NOT NULL AND v_uid_label <> '' THEN
      v_uid := v_uid_label;
    ELSE
      IF v_job_is_nabl THEN
        v_uid := public.next_uid_seq('UID_NABL', v_job_year)::TEXT;
      ELSE
        v_uid := v_job_month || '-' || LPAD(public.next_uid_seq('UID_' || v_job_month, v_job_year)::TEXT, 2, '0');
      END IF;
      UPDATE public.job_entries SET uid_label = v_uid WHERE id = p_job_entry_id;
    END IF;

    v_qr := 'TBD';
    v_seq := public.next_report_seq(v_year);
    v_rep := 'CMTS/' || v_qr || '/' || v_year::TEXT || '/' || v_seq::TEXT;

    IF v_job_is_nabl THEN
      v_ulr := 'TC16212' || v_yy || LPAD(v_seq::TEXT, 9, '0') || 'F';
    ELSE
      v_ulr := NULL;
    END IF;

    INSERT INTO public.lab_reports (job_entry_id, report_class, report_no, ulr_number, qr_code, issued_by, uid_label)
    VALUES (
      p_job_entry_id,
      CASE WHEN v_job_is_nabl THEN 'NABL' ELSE 'QC' END,
      v_rep, v_ulr, v_qr, p_issued_by, v_uid
    )
    RETURNING id INTO v_report;

    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'is_nabl', v_job_is_nabl,
      'report_id', v_report
    ));
    RETURN v_out;
  END IF;

  -- NORMAL LOGIC FOR JOBS WITH TESTS
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
    
    -- CHECK IF A PRE-GENERATED DUMMY REPORT EXISTS
    SELECT id, ulr_number, report_no, uid_label INTO v_report, v_ulr, v_rep, v_uid 
    FROM public.lab_reports 
    WHERE job_entry_id = p_job_entry_id AND qr_code = 'TBD' LIMIT 1;

    IF v_report IS NOT NULL THEN
      -- A pre-generated report exists, we update it with the real QR
      v_rep := REPLACE(v_rep, 'TBD', v_qr);
      UPDATE public.lab_reports 
      SET qr_code = v_qr, report_no = v_rep 
      WHERE id = v_report;
      
      -- Extract v_seq from v_rep (everything after the last slash)
      v_seq := (regexp_match(v_rep, '/(\d+)$'))[1]::INT;
    ELSE
      -- Generate new sequence normally
      v_seq := public.next_report_seq(v_year);
      v_rep := 'CMTS/' || v_qr || '/' || v_year::TEXT || '/' || v_seq::TEXT;

      IF v_grp.existing_uid_label IS NOT NULL AND v_grp.existing_uid_label <> '' THEN
        v_uid := v_grp.existing_uid_label;
      ELSE
        IF v_grp.is_nabl THEN
          v_uid := public.next_uid_seq('UID_NABL', v_job_year)::TEXT;
        ELSE
          v_uid := v_job_month || '-' || LPAD(public.next_uid_seq('UID_' || v_job_month, v_job_year)::TEXT, 2, '0');
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
    END IF;

    -- Link tests to report
    INSERT INTO public.lab_report_lines (report_id, job_entry_test_id)
    SELECT v_report, x FROM unnest(v_grp.test_ids) AS x
    ON CONFLICT DO NOTHING;

    -- Update tests with ULR details
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
      'is_nabl', v_grp.is_nabl,
      'category', v_grp.category,
      'age_days', v_grp.age_days,
      'report_id', v_report
    ));
  END LOOP;
  
  RETURN v_out;
END;
$$;
