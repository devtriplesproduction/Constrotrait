-- ============================================================
-- FILE: 20261023140000_quotation_templates.sql
-- PURPOSE: Terms & Conditions clause templates for quotations & invoices (MaleeHouse-style)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.quotation_templates (
  id TEXT PRIMARY KEY,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  clauses JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure clauses column exists on quotations and invoices
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS clauses JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS clauses JSONB DEFAULT '[]'::jsonb;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quotation_templates_branch ON public.quotation_templates(branch_id);
CREATE INDEX IF NOT EXISTS idx_quotation_templates_category ON public.quotation_templates(category);

-- Enable RLS
ALTER TABLE public.quotation_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quotation_templates_branch" ON public.quotation_templates;
CREATE POLICY "quotation_templates_branch" ON public.quotation_templates
  FOR ALL USING (
    branch_id IS NULL
    OR branch_id = (SELECT branch_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'SUPER_ADMIN' = ANY(roles))
  );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_templates TO service_role;

-- Seed default initial templates tailored for ConstroTrait
INSERT INTO public.quotation_templates (id, name, category, is_default, clauses)
VALUES
  (
    'tpl-material-testing-default',
    'Standard Material Testing T&C',
    'Material Testing',
    true,
    '[
      {
        "id": "c1",
        "title": "Sample Collection & Integrity",
        "content": "ConstroTrait receives samples solely for laboratory evaluation in accordance with relevant IS / ASTM specifications. Test results relate exclusively to the specimen items sampled or submitted and received at the testing facility.",
        "display_order": 1
      },
      {
        "id": "c2",
        "title": "Payment Terms & Mobilization",
        "content": "50% advance payment is required upon quotation confirmation prior to testing mobilization or sample processing. Remaining 50% balance must be cleared prior to dispatch of signed formal test certificates.",
        "display_order": 2
      },
      {
        "id": "c3",
        "title": "Turnaround Time & Report Delivery",
        "content": "Standard testing turnaround time is 5 to 7 business working days following specimen cure period or receipt. Expedited testing services incur a 25% surcharge upon mutual written agreement.",
        "display_order": 3
      },
      {
        "id": "c4",
        "title": "Sample Disposal & Retention",
        "content": "Unless otherwise instructed in writing by the client, non-perishable test remnants will be retained for 15 days post-reporting and subsequently disposed of in compliance with local environmental safety norms.",
        "display_order": 4
      },
      {
        "id": "c5",
        "title": "Liability & Statutory Compliance",
        "content": "Liability of ConstroTrait is limited strictly to the total testing fee charged for the specific item tested. ConstroTrait shall not be held liable for indirect, consequential or third-party construction damages.",
        "display_order": 5
      }
    ]'::jsonb
  ),
  (
    'tpl-soil-geotech-default',
    'Soil & Geotechnical Investigation T&C',
    'Soil Investigation',
    false,
    '[
      {
        "id": "c1",
        "title": "Site Access & Clearances",
        "content": "Client shall provide unhindered site access, necessary municipal clearances, underground utility location maps, and right-of-way permissions prior to rig mobilization.",
        "display_order": 1
      },
      {
        "id": "c2",
        "title": "Payment Milestones",
        "content": "40% advance with work order, 40% upon borehole completion and field testing, balance 20% on submission of draft geotechnical investigation report.",
        "display_order": 2
      },
      {
        "id": "c3",
        "title": "Subsurface Variations & Obstructions",
        "content": "Field strata descriptions reflect findings at exact borehole locations. Unforeseen subterranean obstructions, boulders, or high water table anomalies requiring special drilling bits will be billed on actuals.",
        "display_order": 3
      },
      {
        "id": "c4",
        "title": "Safety & Environmental Care",
        "content": "All site borehole operations strictly adhere to field safety norms. Boreholes will be backfilled with native soils unless grouting is specifically contracted.",
        "display_order": 4
      }
    ]'::jsonb
  ),
  (
    'tpl-ndt-concrete-default',
    'NDT & Structural Audit T&C',
    'Non-Destructive Testing',
    false,
    '[
      {
        "id": "c1",
        "title": "Scope & Surface Preparation",
        "content": "Rebound hammer, UPV testing, and core cutting are performed on exposed concrete members. Client shall provide scaffolding, ladder, power supply, and preliminary plaster chipping.",
        "display_order": 1
      },
      {
        "id": "c2",
        "title": "Structural Integrity Disclaimer",
        "content": "NDT assessments provide comparative qualitative indicators of concrete health. Results do not constitute a structural redesign or guarantee against pre-existing structural defects.",
        "display_order": 2
      },
      {
        "id": "c3",
        "title": "Commercial Terms",
        "content": "100% payment required within 15 days of invoice submission. GST extra as applicable at prevailing statutory rates.",
        "display_order": 3
      }
    ]'::jsonb
  ),
  (
    'tpl-commercial-standard',
    'Standard Commercial Quotation T&C',
    'Standard Commercial',
    false,
    '[
      {
        "id": "c1",
        "title": "Quotation Validity",
        "content": "This quotation remains valid for 30 calendar days from the date of issue. Prices are subject to revision thereafter.",
        "display_order": 1
      },
      {
        "id": "c2",
        "title": "Taxes & Levies",
        "content": "Goods and Services Tax (GST) will be charged extra at 18% or as prevailing at the time of invoicing. TDS certificates to be issued quarterly if deducted.",
        "display_order": 2
      },
      {
        "id": "c3",
        "title": "Jurisdiction",
        "content": "Any disputes arising out of this contract shall be subject to the exclusive jurisdiction of the competent courts in Pune, Maharashtra.",
        "display_order": 3
      }
    ]'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  clauses = EXCLUDED.clauses;
