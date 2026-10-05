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
      WHERE scheduled_on <= p_date AND status = 'queued'
    LOOP
      v_one := public.issue_reports_for_job(v_job, NULL);
      UPDATE public.ulr_generation_queue q
         SET status = 'generated', processed_at = NOW()
       WHERE q.job_entry_id = v_job AND q.scheduled_on <= p_date AND q.status = 'queued';
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'job_entry_id', v_job, 'issued', v_one
      ));
    END LOOP;
    RETURN v_out;
  END;
$function$;
