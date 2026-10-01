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
        WHEN t.testing_age::text ILIKE '%7%' THEN 7 
        ELSE 0 
      END AS age_days,
      array_agg(t.id) AS test_ids,
      MAX(t.uid_label) AS existing_uid_label
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


CREATE OR REPLACE FUNCTION public.process_ulr_queue_for_date(p_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_job UUID;
  v_out JSONB := '[]'::JSONB;
  v_one JSONB;
BEGIN
  FOR v_job IN
    SELECT DISTINCT job_entry_id
    FROM public.ulr_generation_queue
    WHERE scheduled_on = p_date AND status = 'queued'
  LOOP
    v_one := public.issue_reports_for_job(v_job, NULL);
    UPDATE public.ulr_generation_queue q
       SET status = 'generated', processed_at = NOW()
     WHERE q.job_entry_id = v_job AND q.scheduled_on = p_date AND q.status = 'queued';
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'job_entry_id', v_job, 'issued', v_one
    ));
  END LOOP;
  RETURN v_out;
END;
$function$;
