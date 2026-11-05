CREATE TABLE IF NOT EXISTS public.delivery_challans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    challan_no TEXT NOT NULL UNIQUE,
    challan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    project_site_name TEXT,
    material_taken_by TEXT NOT NULL,
    company_agency_name TEXT,
    mobile_no TEXT,
    purpose_of_handover TEXT NOT NULL,
    purpose_other TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    receiver_name TEXT NOT NULL,
    receiver_signature_date DATE,
    issued_by_name TEXT NOT NULL,
    issued_by_signature_date DATE,
    verified_by_name TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_delivery_challans_created_at ON public.delivery_challans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_challans_challan_no ON public.delivery_challans(challan_no);
CREATE INDEX IF NOT EXISTS idx_delivery_challans_customer ON public.delivery_challans(customer_name);

ALTER TABLE public.delivery_challans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view delivery challans" ON public.delivery_challans;
CREATE POLICY "Authenticated users can view delivery challans" 
ON public.delivery_challans FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert delivery challans" ON public.delivery_challans;
CREATE POLICY "Authenticated users can insert delivery challans" 
ON public.delivery_challans FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update delivery challans" ON public.delivery_challans;
CREATE POLICY "Authenticated users can update delivery challans" 
ON public.delivery_challans FOR UPDATE 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete delivery challans" ON public.delivery_challans;
CREATE POLICY "Authenticated users can delete delivery challans" 
ON public.delivery_challans FOR DELETE 
TO authenticated 
USING (true);

-- Permissions
GRANT ALL ON TABLE public.delivery_challans TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

