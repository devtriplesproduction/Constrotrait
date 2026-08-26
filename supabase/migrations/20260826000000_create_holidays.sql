-- Create holidays table
CREATE TABLE public.holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    department TEXT,
    branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT chk_holiday_scope CHECK (department IS NOT NULL OR branch_id IS NOT NULL)
);

CREATE UNIQUE INDEX uq_holiday_scope ON public.holidays (date, COALESCE(department, 'ALL'), COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Enable RLS
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Add RLS policies

-- All authenticated users can view active holidays (and maybe inactive if they are admin/HR, but requirement says "Employees should be able to see applicable holidays using the existing application/navigation pattern". Let's allow authenticated to read, the app will filter)
CREATE POLICY "Authenticated users can read holidays"
ON public.holidays FOR SELECT
USING (auth.role() = 'authenticated');

-- Authorized roles can insert holidays
CREATE POLICY "Authorized roles can insert holidays"
ON public.holidays FOR INSERT
WITH CHECK (
    (
        (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
    )
    OR
    (
        (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['HR']
        AND branch_id IS NULL
        AND department IS NOT NULL
    )
    OR
    (
        (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['BRANCH_MANAGER_ADMINISTRATIVE']
        AND branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
    )
);

-- Only HR and SUPER_ADMIN can update
CREATE POLICY "HR and SUPER_ADMIN can update holidays"
ON public.holidays FOR UPDATE
USING (
    (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN', 'HR']
);

-- Only HR and SUPER_ADMIN can delete (if they want to physically delete)
CREATE POLICY "HR and SUPER_ADMIN can delete holidays"
ON public.holidays FOR DELETE
USING (
    (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN', 'HR']
);

-- Add indexes
CREATE INDEX idx_holidays_date ON public.holidays(date);
CREATE INDEX idx_holidays_branch_id ON public.holidays(branch_id);
CREATE INDEX idx_holidays_department ON public.holidays(department);
