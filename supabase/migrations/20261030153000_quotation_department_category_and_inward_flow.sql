-- ============================================================
-- FILE: 20261030153000_quotation_department_category_and_inward_flow.sql
-- PURPOSE: Add department, category to quotations & quotation_versions,
--          and link quotations <-> job_entries (inward)
-- ============================================================

-- 1. Add department, category, and inward_id to quotations
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS inward_id UUID REFERENCES public.job_entries(id) ON DELETE SET NULL;

-- 2. Add department and category to quotation_versions
ALTER TABLE public.quotation_versions
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT;

-- 3. Add quotation_id to job_entries
ALTER TABLE public.job_entries
  ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_job_entries_quotation_id ON public.job_entries(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotations_inward_id ON public.quotations(inward_id);

-- 4. Update status check constraint on quotations to optionally support inward_created
ALTER TABLE public.quotations
  DROP CONSTRAINT IF EXISTS quotations_status_check;

ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_status_check
  CHECK (status IN ('draft', 'sent', 'accepted', 'approved', 'rejected', 'rework', 'revision_requested', 'superseded', 'inward_created'));
