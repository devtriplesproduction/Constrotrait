-- Migration: 20261102140000_counter_advances_only_when_record_saved.sql
-- Description: Ensure that sequence counters advance strictly when records are saved,
-- preventing gaps caused by failed or uncommitted inward submissions.

-- 1. Helper to peek next sequence number without advancing counter
CREATE OR REPLACE FUNCTION public.peek_uid_seq(p_name text, p_year int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_val int;
  v_max_saved int;
BEGIN
  SELECT counter_value INTO v_val
  FROM public.lab_uid_counters
  WHERE counter_name = p_name AND counter_year = p_year;

  IF p_name = 'UID_NABL' THEN
    SELECT COALESCE(MAX(uid), 0) INTO v_max_saved 
    FROM public.job_entries 
    WHERE is_nabl = true;

    IF v_max_saved > 0 AND v_val IS NOT NULL AND v_val > v_max_saved THEN
      v_val := v_max_saved;
      UPDATE public.lab_uid_counters
      SET counter_value = v_max_saved
      WHERE counter_name = p_name AND counter_year = p_year;
    END IF;
  ELSIF p_name = 'SAMPLE_CON' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(additional_details_values->>'sample_code_no' FROM '/([0-9]+)(?:-[IVXLCDM0-9]+)?(?:,|$)') AS INT)), 0)
    INTO v_max_saved
    FROM public.job_entry_tests
    WHERE additional_details_values->>'sample_code_no' LIKE '%/CON/%';

    IF v_max_saved > 0 AND v_val IS NOT NULL AND v_val > v_max_saved THEN
      v_val := v_max_saved;
      UPDATE public.lab_uid_counters
      SET counter_value = v_max_saved
      WHERE counter_name = p_name AND counter_year = p_year;
    END IF;
  ELSIF p_name = 'SAMPLE_ENV' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(additional_details_values->>'sample_code_no' FROM '/([0-9]+)(?:-[IVXLCDM0-9]+)?(?:,|$)') AS INT)), 0)
    INTO v_max_saved
    FROM public.job_entry_tests
    WHERE additional_details_values->>'sample_code_no' LIKE '%/ENV/%';

    IF v_max_saved > 0 AND v_val IS NOT NULL AND v_val > v_max_saved THEN
      v_val := v_max_saved;
      UPDATE public.lab_uid_counters
      SET counter_value = v_max_saved
      WHERE counter_name = p_name AND counter_year = p_year;
    END IF;
  END IF;

  RETURN COALESCE(v_val, 0) + 1;
END;
$$;

-- 2. Function to advance sequence counter ONLY when record is saved
CREATE OR REPLACE FUNCTION public.advance_uid_seq(p_name text, p_year int, p_val int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_res int;
BEGIN
  INSERT INTO public.lab_uid_counters (counter_name, counter_year, counter_value)
  VALUES (p_name, p_year, p_val)
  ON CONFLICT (counter_name, counter_year)
  DO UPDATE SET counter_value = GREATEST(public.lab_uid_counters.counter_value, EXCLUDED.counter_value)
  RETURNING counter_value INTO v_res;

  RETURN v_res;
END;
$$;

-- 3. Update next_uid_seq to self-heal and clamp to max saved records so counter never outpaces saved data
CREATE OR REPLACE FUNCTION public.next_uid_seq(p_name text, p_year int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next int;
  v_max_saved int;
  v_curr int;
BEGIN
  IF p_name = 'UID_NABL' THEN
    SELECT COALESCE(MAX(uid), 0) INTO v_max_saved 
    FROM public.job_entries 
    WHERE is_nabl = true;

    SELECT counter_value INTO v_curr 
    FROM public.lab_uid_counters 
    WHERE counter_name = p_name AND counter_year = p_year;

    IF v_max_saved > 0 AND v_curr IS NOT NULL AND v_curr > v_max_saved THEN
      UPDATE public.lab_uid_counters
      SET counter_value = v_max_saved
      WHERE counter_name = p_name AND counter_year = p_year;
    END IF;
  ELSIF p_name = 'SAMPLE_CON' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(additional_details_values->>'sample_code_no' FROM '/([0-9]+)(?:-[IVXLCDM0-9]+)?(?:,|$)') AS INT)), 0)
    INTO v_max_saved
    FROM public.job_entry_tests
    WHERE additional_details_values->>'sample_code_no' LIKE '%/CON/%';

    SELECT counter_value INTO v_curr 
    FROM public.lab_uid_counters 
    WHERE counter_name = p_name AND counter_year = p_year;

    IF v_max_saved > 0 AND v_curr IS NOT NULL AND v_curr > v_max_saved THEN
      UPDATE public.lab_uid_counters
      SET counter_value = v_max_saved
      WHERE counter_name = p_name AND counter_year = p_year;
    END IF;
  ELSIF p_name = 'SAMPLE_ENV' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(additional_details_values->>'sample_code_no' FROM '/([0-9]+)(?:-[IVXLCDM0-9]+)?(?:,|$)') AS INT)), 0)
    INTO v_max_saved
    FROM public.job_entry_tests
    WHERE additional_details_values->>'sample_code_no' LIKE '%/ENV/%';

    SELECT counter_value INTO v_curr 
    FROM public.lab_uid_counters 
    WHERE counter_name = p_name AND counter_year = p_year;

    IF v_max_saved > 0 AND v_curr IS NOT NULL AND v_curr > v_max_saved THEN
      UPDATE public.lab_uid_counters
      SET counter_value = v_max_saved
      WHERE counter_name = p_name AND counter_year = p_year;
    END IF;
  END IF;

  INSERT INTO public.lab_uid_counters (counter_name, counter_year, counter_value)
  VALUES (p_name, p_year, 1)
  ON CONFLICT (counter_name, counter_year)
  DO UPDATE SET counter_value = public.lab_uid_counters.counter_value + 1
  RETURNING counter_value INTO v_next;

  RETURN v_next;
END;
$$;

