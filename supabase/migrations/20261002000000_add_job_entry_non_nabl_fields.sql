-- Add non-NABL fields to job_entries
ALTER TABLE public.job_entries
ADD COLUMN IF NOT EXISTS division text,
ADD COLUMN IF NOT EXISTS agency text,
ADD COLUMN IF NOT EXISTS project_name text,
ADD COLUMN IF NOT EXISTS dispatch_name text,
ADD COLUMN IF NOT EXISTS dispatch_address text,
ADD COLUMN IF NOT EXISTS collected_by text,
ADD COLUMN IF NOT EXISTS invoice_no text,
ADD COLUMN IF NOT EXISTS invoice_date date,
ADD COLUMN IF NOT EXISTS letter_reference text,
ADD COLUMN IF NOT EXISTS payment_status text;
