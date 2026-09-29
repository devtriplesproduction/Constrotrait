-- 20260918000000_create_test_master.sql

CREATE TABLE public.test_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no TEXT NOT NULL,
    discipline_group TEXT NOT NULL,
    material_product TEXT NOT NULL,
    component_parameter TEXT NOT NULL,
    specific_test TEXT NOT NULL,
    test_method TEXT NOT NULL,
    technique_equipment TEXT NOT NULL,
    is_nabl BOOLEAN NOT NULL DEFAULT true,
    category TEXT NOT NULL CHECK (category IN ('Construction', 'Environmental')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.test_master ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view
CREATE POLICY "Enable read access for all authenticated users"
ON public.test_master
FOR SELECT
TO authenticated
USING (true);

-- Allow inserting for authenticated users
CREATE POLICY "Enable insert for authenticated users"
ON public.test_master
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow update for authenticated users
CREATE POLICY "Enable update for authenticated users"
ON public.test_master
FOR UPDATE
TO authenticated
USING (true);

-- Allow delete for authenticated users
CREATE POLICY "Enable delete for authenticated users"
ON public.test_master
FOR DELETE
TO authenticated
USING (true);
