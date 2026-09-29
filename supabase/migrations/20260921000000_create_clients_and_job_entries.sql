-- 20260921000000_create_clients_and_job_entries.sql

CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    division TEXT,
    site_name TEXT,
    agency_name TEXT,
    project_name TEXT,
    dispatch_name TEXT,
    dispatch_address TEXT,
    contact_person TEXT,
    mobile TEXT,
    email TEXT,
    collected_by TEXT,
    gst_no TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users"
ON public.clients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON public.clients FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON public.clients FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users"
ON public.clients FOR DELETE TO authenticated USING (true);

CREATE TABLE public.job_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    material_id TEXT NOT NULL,
    material_details_location TEXT,
    sample_quantity TEXT,
    test_to_be_performed TEXT NOT NULL,
    grade TEXT,
    testing_day TEXT,
    test_method TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.job_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users"
ON public.job_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON public.job_entries FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON public.job_entries FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users"
ON public.job_entries FOR DELETE TO authenticated USING (true);
