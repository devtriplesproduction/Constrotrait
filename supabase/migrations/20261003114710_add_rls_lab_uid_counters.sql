-- Allow authenticated users to view counters
CREATE POLICY "Allow authenticated to view lab_uid_counters" 
ON public.lab_uid_counters 
FOR SELECT 
TO authenticated 
USING (true);

-- Ensure RLS is enabled
ALTER TABLE public.lab_uid_counters ENABLE ROW LEVEL SECURITY;

-- If uid_yearly_counters exists, do the same
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM pg_tables
        WHERE  schemaname = 'public'
        AND    tablename  = 'uid_yearly_counters'
    ) THEN
        EXECUTE 'ALTER TABLE public.uid_yearly_counters ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated to view uid_yearly_counters" ON public.uid_yearly_counters';
        EXECUTE 'CREATE POLICY "Allow authenticated to view uid_yearly_counters" ON public.uid_yearly_counters FOR SELECT TO authenticated USING (true)';
    END IF;
END $$;
