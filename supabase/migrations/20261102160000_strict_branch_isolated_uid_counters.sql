-- Migration: 20261102160000_strict_branch_isolated_uid_counters.sql
-- Description: Strict branch isolation for UIDs, sample code sequences, and lab counters.
-- Each branch maintains completely independent counters for UID_NABL, SAMPLE_CON, SAMPLE_ENV, etc.

-- 1. Add branch_id to lab_uid_counters
ALTER TABLE public.lab_uid_counters 
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE;

-- Backfill existing records to Main Branch Wai if NULL
UPDATE public.lab_uid_counters
SET branch_id = (SELECT id FROM public.branches WHERE name = 'Main Branch Wai' OR code = 'CMTS-01' LIMIT 1)
WHERE branch_id IS NULL;

-- 2. Drop existing unique constraint/index and enforce unique per branch
ALTER TABLE public.lab_uid_counters DROP CONSTRAINT IF EXISTS lab_uid_counters_pkey;
ALTER TABLE public.lab_uid_counters DROP CONSTRAINT IF EXISTS lab_uid_counters_counter_name_counter_year_key;
DROP INDEX IF EXISTS lab_uid_counters_counter_name_counter_year_key;
DROP INDEX IF EXISTS lab_uid_counters_branch_scoped_idx;
CREATE UNIQUE INDEX IF NOT EXISTS lab_uid_counters_branch_scoped_idx 
  ON public.lab_uid_counters (counter_name, counter_year, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 3. Seed counters for all branches if not exists
DO $$
DECLARE
  b RECORD;
  c_name text;
  c_year int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
BEGIN
  FOR b IN SELECT id FROM public.branches LOOP
    FOREACH c_name IN ARRAY ARRAY['UID_NABL', 'SAMPLE_CON', 'SAMPLE_ENV'] LOOP
      INSERT INTO public.lab_uid_counters (counter_name, counter_year, counter_value, branch_id)
      VALUES (c_name, c_year, 0, b.id)
      ON CONFLICT (counter_name, counter_year, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid))
      DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 4. Branch-scoped peek_uid_seq
DROP FUNCTION IF EXISTS public.peek_uid_seq(text, int);
DROP FUNCTION IF EXISTS public.peek_uid_seq(text, int, uuid);
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

-- 5. Branch-scoped advance_uid_seq
DROP FUNCTION IF EXISTS public.advance_uid_seq(text, int, int);
DROP FUNCTION IF EXISTS public.advance_uid_seq(text, int, int, uuid);
CREATE OR REPLACE FUNCTION public.advance_uid_seq(p_name text, p_year int, p_val int, p_branch_id uuid DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_res int;
BEGIN
  INSERT INTO public.lab_uid_counters (counter_name, counter_year, counter_value, branch_id)
  VALUES (p_name, p_year, p_val, p_branch_id)
  ON CONFLICT (counter_name, counter_year, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET counter_value = GREATEST(public.lab_uid_counters.counter_value, EXCLUDED.counter_value)
  RETURNING counter_value INTO v_res;

  RETURN v_res;
END;
$$;

-- 6. Branch-scoped next_uid_seq
DROP FUNCTION IF EXISTS public.next_uid_seq(text, int);
DROP FUNCTION IF EXISTS public.next_uid_seq(text, int, uuid);
CREATE OR REPLACE FUNCTION public.next_uid_seq(p_name text, p_year int, p_branch_id uuid DEFAULT NULL)
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
    WHERE is_nabl = true 
      AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    SELECT counter_value INTO v_curr 
    FROM public.lab_uid_counters 
    WHERE counter_name = p_name 
      AND counter_year = p_year
      AND COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(p_branch_id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF v_max_saved > 0 AND v_curr IS NOT NULL AND v_curr > v_max_saved THEN
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

    SELECT counter_value INTO v_curr 
    FROM public.lab_uid_counters 
    WHERE counter_name = p_name 
      AND counter_year = p_year
      AND COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(p_branch_id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF v_max_saved > 0 AND v_curr IS NOT NULL AND v_curr > v_max_saved THEN
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

    SELECT counter_value INTO v_curr 
    FROM public.lab_uid_counters 
    WHERE counter_name = p_name 
      AND counter_year = p_year
      AND COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(p_branch_id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF v_max_saved > 0 AND v_curr IS NOT NULL AND v_curr > v_max_saved THEN
      UPDATE public.lab_uid_counters
      SET counter_value = v_max_saved
      WHERE counter_name = p_name 
        AND counter_year = p_year
        AND COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(p_branch_id, '00000000-0000-0000-0000-000000000000'::uuid);
    END IF;
  END IF;

  INSERT INTO public.lab_uid_counters (counter_name, counter_year, counter_value, branch_id)
  VALUES (p_name, p_year, 1, p_branch_id)
  ON CONFLICT (counter_name, counter_year, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET counter_value = public.lab_uid_counters.counter_value + 1
  RETURNING counter_value INTO v_next;

  RETURN v_next;
END;
$$;
