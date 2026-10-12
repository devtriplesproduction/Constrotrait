CREATE TABLE IF NOT EXISTS public.employee_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    application_date DATE NOT NULL,
    subject TEXT NOT NULL,
    approval_for TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewer_remark TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.employee_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own applications" ON public.employee_applications;
CREATE POLICY "Users can view own applications" 
ON public.employee_applications FOR SELECT 
USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can insert own applications" ON public.employee_applications;
CREATE POLICY "Users can insert own applications" 
ON public.employee_applications FOR INSERT 
WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Admins can view all applications" ON public.employee_applications;
CREATE POLICY "Admins can view all applications"
ON public.employee_applications FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() 
        AND (
            roles && ARRAY['SUPER_ADMIN', 'HR', 'BRANCH_MANAGER_ADMINISTRATIVE']::public.user_role[]
        )
    )
);

DROP POLICY IF EXISTS "Admins can update all applications" ON public.employee_applications;
CREATE POLICY "Admins can update all applications"
ON public.employee_applications FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() 
        AND (
            roles && ARRAY['SUPER_ADMIN', 'HR', 'BRANCH_MANAGER_ADMINISTRATIVE']::public.user_role[]
        )
    )
);
