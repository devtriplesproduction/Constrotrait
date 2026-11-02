-- Migration: 20261102180000_seed_non_nabl_monthly_starting_counters.sql
-- Description: Seed starting UID sequences for Non-NABL monthly inwards across all branches:
-- JAN: 494, FEB: 489, MAR: 481, APR: 422, MAY: 417, JUN: 396,
-- JUL: 304, AUG: 308, SEP: 244, OCT: 227, NOV: 219, DEC: 391.

-- 1. Ensure peek_uid_seq handles branch-scoped counters cleanly without resetting monthly counters
CREATE OR REPLACE FUNCTION public.peek_uid_seq(p_name text, p_year int, p_branch_id uuid DEFAULT NULL)
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
  WHERE counter_name = p_name 
    AND counter_year = p_year 
    AND COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(p_branch_id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF p_name = 'UID_NABL' THEN
    SELECT COALESCE(MAX(uid), 0) INTO v_max_saved 
    FROM public.job_entries 
    WHERE is_nabl = true 
      AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    IF v_max_saved > 0 AND v_val IS NOT NULL AND v_val > v_max_saved THEN
      v_val := v_max_saved;
      UPDATE public.lab_uid_counters
      SET counter_value = v_max_saved
      WHERE counter_name = p_name 
        AND counter_year = p_year
        AND COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(p_branch_id, '00000000-0000-0000-0000-000000000000'::uuid);
    END IF;
  ELSIF p_name = 'SAMPLE_CON' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(jet.additional_details_values->>'sample_code_no' FROM '/([0-9]+)(?:-[IVXLCDM0-9]+)?(?:,|$)') AS INT)), 0)
    INTO v_max_saved
    FROM public.job_entry_tests jet
    JOIN public.job_entries je ON je.id = jet.job_entry_id
    WHERE jet.additional_details_values->>'sample_code_no' LIKE '%/CON/%'
      AND (p_branch_id IS NULL OR je.branch_id = p_branch_id);

    IF v_max_saved > 0 AND v_val IS NOT NULL AND v_val > v_max_saved THEN
      v_val := v_max_saved;
      UPDATE public.lab_uid_counters
      SET counter_value = v_max_saved
      WHERE counter_name = p_name 
        AND counter_year = p_year
        AND COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(p_branch_id, '00000000-0000-0000-0000-000000000000'::uuid);
    END IF;
  ELSIF p_name = 'SAMPLE_ENV' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(jet.additional_details_values->>'sample_code_no' FROM '/([0-9]+)(?:-[IVXLCDM0-9]+)?(?:,|$)') AS INT)), 0)
    INTO v_max_saved
    FROM public.job_entry_tests jet
    JOIN public.job_entries je ON je.id = jet.job_entry_id
    WHERE jet.additional_details_values->>'sample_code_no' LIKE '%/ENV/%'
      AND (p_branch_id IS NULL OR je.branch_id = p_branch_id);

    IF v_max_saved > 0 AND v_val IS NOT NULL AND v_val > v_max_saved THEN
      v_val := v_max_saved;
      UPDATE public.lab_uid_counters
      SET counter_value = v_max_saved
      WHERE counter_name = p_name 
        AND counter_year = p_year
        AND COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(p_branch_id, '00000000-0000-0000-0000-000000000000'::uuid);
    END IF;
  END IF;

  RETURN COALESCE(v_val, 0) + 1;
END;
$$;

-- 2. Seed monthly starting counters for each branch and NULL branch
DO $$
DECLARE
  b RECORD;
  c_year int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  m RECORD;
BEGIN
  FOR m IN (
    SELECT 'UID_JAN' AS name, 493 AS val UNION ALL
    SELECT 'UID_FEB' AS name, 488 AS val UNION ALL
    SELECT 'UID_MAR' AS name, 480 AS val UNION ALL
    SELECT 'UID_APR' AS name, 421 AS val UNION ALL
    SELECT 'UID_MAY' AS name, 416 AS val UNION ALL
    SELECT 'UID_JUN' AS name, 395 AS val UNION ALL
    SELECT 'UID_JUL' AS name, 303 AS val UNION ALL
    SELECT 'UID_AUG' AS name, 307 AS val UNION ALL
    SELECT 'UID_SEP' AS name, 243 AS val UNION ALL
    SELECT 'UID_OCT' AS name, 226 AS val UNION ALL
    SELECT 'UID_NOV' AS name, 218 AS val UNION ALL
    SELECT 'UID_DEC' AS name, 390 AS val
  ) LOOP
    -- Seed for NULL branch
    INSERT INTO public.lab_uid_counters (counter_name, counter_year, counter_value, branch_id)
    VALUES (m.name, c_year, m.val, NULL)
    ON CONFLICT (counter_name, counter_year, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid))
    DO UPDATE SET counter_value = GREATEST(public.lab_uid_counters.counter_value, EXCLUDED.counter_value);

    -- Seed for all existing branches
    FOR b IN SELECT id FROM public.branches LOOP
      INSERT INTO public.lab_uid_counters (counter_name, counter_year, counter_value, branch_id)
      VALUES (m.name, c_year, m.val, b.id)
      ON CONFLICT (counter_name, counter_year, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid))
      DO UPDATE SET counter_value = GREATEST(public.lab_uid_counters.counter_value, EXCLUDED.counter_value);
    END LOOP;
  END LOOP;
END $$;
