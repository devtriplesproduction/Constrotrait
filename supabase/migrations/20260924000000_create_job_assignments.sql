-- 20260924000000_create_job_assignments.sql

-- Create teams table
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create team_members table
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, employee_id)
);

-- Create job_assignments table
CREATE TABLE public.job_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_entry_test_id UUID NOT NULL REFERENCES public.job_entry_tests(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
    due_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure at least one of team_id or assigned_to is present
    CONSTRAINT check_assignee CHECK (
        (team_id IS NOT NULL AND assigned_to IS NULL) OR 
        (team_id IS NULL AND assigned_to IS NOT NULL)
    )
);

-- Update trigger for job_assignments
CREATE OR REPLACE FUNCTION update_job_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_assignments_updated_at_trigger
    BEFORE UPDATE ON public.job_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_job_assignments_updated_at();

-- RLS for teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users on teams"
ON public.teams FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users on teams"
ON public.teams FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on teams"
ON public.teams FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users on teams"
ON public.teams FOR DELETE TO authenticated USING (true);

-- RLS for team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users on team_members"
ON public.team_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users on team_members"
ON public.team_members FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on team_members"
ON public.team_members FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users on team_members"
ON public.team_members FOR DELETE TO authenticated USING (true);

-- RLS for job_assignments
ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users on job_assignments"
ON public.job_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users on job_assignments"
ON public.job_assignments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on job_assignments"
ON public.job_assignments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users on job_assignments"
ON public.job_assignments FOR DELETE TO authenticated USING (true);
