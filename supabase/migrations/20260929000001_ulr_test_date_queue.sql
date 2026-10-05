-- Queue ULR generation on test date
-- Make uid nullable on job_entries to avoid insert errors

ALTER TABLE public.job_entries ALTER COLUMN uid DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.ulr_generation_queue (
    job_entry_id UUID NOT NULL REFERENCES public.job_entries(id) ON DELETE CASCADE,
    job_entry_test_id UUID NOT NULL REFERENCES public.job_entry_tests(id) ON DELETE CASCADE,
    scheduled_on DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'generated', 'skipped')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (job_entry_id, job_entry_test_id)
);

ALTER TABLE public.ulr_generation_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.ulr_generation_queue;
CREATE POLICY "Enable all access for authenticated users" ON public.ulr_generation_queue
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.enqueue_ulr_for_job(p_job_entry_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.ulr_generation_queue (job_entry_id, job_entry_test_id, scheduled_on, status)
    SELECT 
        p_job_entry_id, 
        t.id, 
        COALESCE(t.date_of_testing, CURRENT_DATE),
        'queued'
    FROM public.job_entry_tests t
    WHERE t.job_entry_id = p_job_entry_id
    ON CONFLICT (job_entry_id, job_entry_test_id) DO UPDATE SET scheduled_on = COALESCE(EXCLUDED.scheduled_on, ulr_generation_queue.scheduled_on);
END;
$$;
