-- 20260921000001_refactor_job_entries_to_multi_test.sql

-- Modify job_entries to remove test specific fields
ALTER TABLE public.job_entries DROP COLUMN material_id;
ALTER TABLE public.job_entries DROP COLUMN material_details_location;
ALTER TABLE public.job_entries DROP COLUMN sample_quantity;
ALTER TABLE public.job_entries DROP COLUMN test_to_be_performed;
ALTER TABLE public.job_entries DROP COLUMN grade;
ALTER TABLE public.job_entries DROP COLUMN testing_day;
ALTER TABLE public.job_entries DROP COLUMN test_method;

-- Create job_entry_tests table
CREATE TABLE public.job_entry_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_entry_id UUID NOT NULL REFERENCES public.job_entries(id) ON DELETE CASCADE,
    test_master_id UUID NOT NULL REFERENCES public.test_master(id),
    material_id TEXT NOT NULL,
    material_details_location TEXT,
    sample_quantity TEXT,
    grade TEXT,
    testing_day TEXT,
    test_method TEXT,
    additional_details_values JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.job_entry_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users"
ON public.job_entry_tests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON public.job_entry_tests FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON public.job_entry_tests FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users"
ON public.job_entry_tests FOR DELETE TO authenticated USING (true);
