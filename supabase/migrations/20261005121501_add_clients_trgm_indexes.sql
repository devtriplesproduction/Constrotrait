-- Enable the pg_trgm extension if it doesn't already exist
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes for the heavily searched columns on the clients table
-- These indexes greatly speed up queries using the 'ilike' operator with wildcards (e.g., %keyword%)
CREATE INDEX IF NOT EXISTS idx_clients_name_trgm ON clients USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_company_name_trgm ON clients USING GIN (company_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_email_trgm ON clients USING GIN (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_mobile_trgm ON clients USING GIN (mobile gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_gst_no_trgm ON clients USING GIN (gst_no gin_trgm_ops);
