CREATE TABLE IF NOT EXISTS public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_entry_test_id UUID NOT NULL REFERENCES public.job_entry_tests(id) ON DELETE CASCADE,
  sr_no INT NOT NULL,
  id_mark TEXT,
  length_mm NUMERIC,
  width_mm NUMERIC,
  area_mm2 NUMERIC,
  load_kn NUMERIC,
  strength_nmm2 NUMERIC,
  particulars TEXT,
  result_value TEXT,
  specified_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to test_results"
ON public.test_results FOR ALL TO authenticated USING (true);
