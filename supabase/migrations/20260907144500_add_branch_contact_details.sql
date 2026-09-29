-- Add contact details to branches table
ALTER TABLE branches
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS gst_number text;
