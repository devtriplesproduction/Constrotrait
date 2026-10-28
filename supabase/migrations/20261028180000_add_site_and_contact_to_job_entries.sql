-- 20261028180000_add_site_and_contact_to_job_entries.sql
-- Add site_name and contact_person columns to job_entries table

ALTER TABLE public.job_entries
ADD COLUMN IF NOT EXISTS site_name TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT;

-- Backfill from clients table where possible
UPDATE public.job_entries j
SET
  site_name = COALESCE(j.site_name, c.site_name),
  contact_person = COALESCE(j.contact_person, c.contact_person)
FROM public.clients c
WHERE j.client_id = c.id;
