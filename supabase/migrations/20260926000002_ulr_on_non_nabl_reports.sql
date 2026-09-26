-- Company practice (Wai): a ULR-format number is printed on non-NABL reports too.
-- NABL 133 still forbids the accreditation symbol on those sheets.
-- Same 18-char pack and same ULR sequence so numbers never collide.

CREATE OR REPLACE FUNCTION public.issue_reports_for_job(p_job_entry_id UUID, p_issued_by UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fy TEXT := public.current_fy();
  v_tc TEXT;
  v_lab TEXT;
  v_nabl_ids UUID[];
  v_qc_ids UUID[];
  v_seq INT;
  v_ulr TEXT;
  v_qc_ulr TEXT;
  v_qc TEXT;
  v_tr TEXT;
  v_nabl_report UUID;
  v_qc_report UUID;
BEGIN
  PERFORM public.ensure_job_uid(p_job_entry_id);

  SELECT tc_number, lab_code INTO v_tc, v_lab FROM public.lab_settings WHERE id = 1;
  IF v_tc IS NULL THEN
    v_tc := '16212';
    v_lab := 'WAI';
  END IF;

  SELECT COALESCE(array_agg(t.id), ARRAY[]::UUID[]) INTO v_nabl_ids
    FROM public.job_entry_tests t
    JOIN public.test_master m ON m.id = t.test_master_id
   WHERE t.job_entry_id = p_job_entry_id
     AND m.is_nabl = true
     AND COALESCE(t.ulr_status, 'pending') <> 'generated';

  SELECT COALESCE(array_agg(t.id), ARRAY[]::UUID[]) INTO v_qc_ids
    FROM public.job_entry_tests t
    LEFT JOIN public.test_master m ON m.id = t.test_master_id
   WHERE t.job_entry_id = p_job_entry_id
     AND COALESCE(m.is_nabl, false) = false
     AND COALESCE(t.ulr_status, 'pending') <> 'generated';

  IF v_nabl_ids IS NOT NULL AND array_length(v_nabl_ids, 1) > 0 THEN
    v_seq := public.next_seq('TR', v_fy);
    v_tr := 'TR-' || v_lab || '-' || v_fy || '-' || LPAD(v_seq::TEXT, 6, '0');
    v_seq := public.next_seq('ULR', v_fy);
    v_ulr := 'TC' || LPAD(regexp_replace(v_tc, '\D', '', 'g'), 5, '0') || v_fy || LPAD(v_seq::TEXT, 8, '0') || 'F';

    INSERT INTO public.lab_reports (job_entry_id, report_class, report_no, ulr_number, issued_by)
    VALUES (p_job_entry_id, 'NABL', v_tr, v_ulr, p_issued_by)
    RETURNING id INTO v_nabl_report;

    INSERT INTO public.lab_report_lines (report_id, job_entry_test_id)
    SELECT v_nabl_report, x FROM unnest(v_nabl_ids) AS x;

    UPDATE public.job_entry_tests
       SET ulr_seq = v_seq,
           ulr_number = v_ulr,
           ulr_generated_at = NOW(),
           ulr_status = 'generated',
           report_class = 'NABL',
           qc_number = NULL
     WHERE id = ANY (v_nabl_ids);
  END IF;

  IF v_qc_ids IS NOT NULL AND array_length(v_qc_ids, 1) > 0 THEN
    v_seq := public.next_seq('TR', v_fy);
    v_tr := 'TR-' || v_lab || '-' || v_fy || '-' || LPAD(v_seq::TEXT, 6, '0');
    v_seq := public.next_seq('ULR', v_fy);
    v_qc_ulr := 'TC' || LPAD(regexp_replace(v_tc, '\D', '', 'g'), 5, '0') || v_fy || LPAD(v_seq::TEXT, 8, '0') || 'F';
    v_seq := public.next_seq('QC', v_fy);
    v_qc := 'QC-' || v_lab || '-' || v_fy || '-' || LPAD(v_seq::TEXT, 6, '0');

    INSERT INTO public.lab_reports (job_entry_id, report_class, report_no, ulr_number, qc_number, sibling_report_id, issued_by)
    VALUES (p_job_entry_id, 'QC', v_tr, v_qc_ulr, v_qc, v_nabl_report, p_issued_by)
    RETURNING id INTO v_qc_report;

    IF v_nabl_report IS NOT NULL THEN
      UPDATE public.lab_reports SET sibling_report_id = v_qc_report WHERE id = v_nabl_report;
    END IF;

    INSERT INTO public.lab_report_lines (report_id, job_entry_test_id)
    SELECT v_qc_report, x FROM unnest(v_qc_ids) AS x;

    UPDATE public.job_entry_tests
       SET ulr_number = v_qc_ulr,
           ulr_seq = v_seq,
           ulr_generated_at = NOW(),
           ulr_status = 'generated',
           report_class = 'QC',
           qc_number = v_qc
     WHERE id = ANY (v_qc_ids);
  END IF;

  RETURN jsonb_build_object(
    'nabl_report_id', v_nabl_report,
    'qc_report_id', v_qc_report,
    'ulr', v_ulr,
    'qc_ulr', v_qc_ulr,
    'qc', v_qc
  );
END;
$$;
