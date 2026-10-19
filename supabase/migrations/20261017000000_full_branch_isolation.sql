-- 20261017000000_full_branch_isolation.sql
-- Implement full branch isolation for test_master, clients, job_entries, and job_assignments

-- 1. test_master branch_id column & backfill
ALTER TABLE public.test_master
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT;

UPDATE public.test_master
SET branch_id = (SELECT id FROM public.branches WHERE is_active = true ORDER BY created_at ASC LIMIT 1)
WHERE branch_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_test_master_branch_id ON public.test_master(branch_id);

-- 2. clients branch_id column & backfill
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT;

UPDATE public.clients
SET branch_id = (SELECT id FROM public.branches WHERE is_active = true ORDER BY created_at ASC LIMIT 1)
WHERE branch_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_branch_id ON public.clients(branch_id);

-- 3. job_entries branch_id column & backfill
ALTER TABLE public.job_entries
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT;

UPDATE public.job_entries j
SET branch_id = COALESCE(
  (SELECT c.branch_id FROM public.clients c WHERE c.id = j.client_id),
  (SELECT id FROM public.branches WHERE is_active = true ORDER BY created_at ASC LIMIT 1)
)
WHERE j.branch_id IS NULL;

UPDATE public.job_entries
SET branch_id = (SELECT id FROM public.branches WHERE is_active = true ORDER BY created_at ASC LIMIT 1)
WHERE branch_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_job_entries_branch_id ON public.job_entries(branch_id);

-- 4. job_assignments branch_id column & backfill
ALTER TABLE public.job_assignments
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

UPDATE public.job_assignments a
SET branch_id = COALESCE(
  (SELECT t.branch_id FROM public.teams t WHERE t.id = a.team_id),
  (SELECT p.branch_id FROM public.profiles p WHERE p.id = a.assigned_to),
  (
    SELECT je.branch_id
    FROM public.job_entry_tests jet
    JOIN public.job_entries je ON jet.job_entry_id = je.id
    WHERE jet.id = a.job_entry_test_id
  ),
  (SELECT id FROM public.branches WHERE is_active = true ORDER BY created_at ASC LIMIT 1)
)
WHERE a.branch_id IS NULL;

UPDATE public.job_assignments
SET branch_id = (SELECT id FROM public.branches WHERE is_active = true ORDER BY created_at ASC LIMIT 1)
WHERE branch_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_job_assignments_branch_id ON public.job_assignments(branch_id);
