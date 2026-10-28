-- ============================================================
-- FILE: 20261028131000_quotation_workflow_and_versions.sql
-- PURPOSE: MaleeHouse-style quotation workflow (Approve, Reject, Rework, History)
-- ============================================================

-- 1. Add versioning & rework fields to quotations if not existing
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rework_notes TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id);

-- 2. Update status constraint to allow rework, revision_requested, superseded
ALTER TABLE public.quotations
  DROP CONSTRAINT IF EXISTS quotations_status_check;

ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_status_check
  CHECK (status IN ('draft', 'sent', 'accepted', 'approved', 'rejected', 'rework', 'revision_requested', 'superseded'));

-- 3. Create quotation_versions table for full revision and action history
CREATE TABLE IF NOT EXISTS public.quotation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,2) DEFAULT 0,
  gst_rate NUMERIC(5,2) DEFAULT 18,
  gst_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  terms TEXT DEFAULT '',
  clauses JSONB DEFAULT '[]'::jsonb,
  remarks TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  action_type TEXT DEFAULT 'created', -- 'created', 'sent', 'approved', 'rejected', 'rework', 'revised'
  action_reason TEXT,
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_versions_quotation_id ON public.quotation_versions(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_versions_created_at ON public.quotation_versions(created_at DESC);

-- Enable RLS
ALTER TABLE public.quotation_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quotation_versions_all" ON public.quotation_versions;
CREATE POLICY "quotation_versions_all" ON public.quotation_versions
  FOR ALL USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_versions TO service_role;

-- Populate initial version record for existing quotations that don't have one
INSERT INTO public.quotation_versions (
  quotation_id,
  version_number,
  items,
  subtotal,
  discount_amount,
  gst_rate,
  gst_amount,
  total_amount,
  terms,
  clauses,
  remarks,
  status,
  action_type,
  action_reason,
  performed_by,
  created_at
)
SELECT
  q.id,
  COALESCE(q.version_number, 1),
  COALESCE(q.items, '[]'::jsonb),
  COALESCE(q.subtotal, q.amount, 0),
  COALESCE(q.discount_amount, 0),
  COALESCE(q.gst_rate, 18),
  COALESCE(q.gst_amount, 0),
  COALESCE(q.total_amount, q.amount, 0),
  COALESCE(q.terms, ''),
  COALESCE(q.clauses, '[]'::jsonb),
  COALESCE(q.remarks, ''),
  COALESCE(q.status, 'draft'),
  'initial',
  'Legacy initial quotation record',
  q.created_by,
  q.created_at
FROM public.quotations q
WHERE NOT EXISTS (
  SELECT 1 FROM public.quotation_versions v WHERE v.quotation_id = q.id
);
