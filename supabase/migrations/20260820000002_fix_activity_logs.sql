-- Fix activity_logs id to UUID and add updated_at

-- 1. Add updated_at
ALTER TABLE public.activity_logs
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;

-- 2. Drop the primary key constraint temporarily
ALTER TABLE public.activity_logs DROP CONSTRAINT activity_logs_pkey;

-- 3. Alter the id column type to UUID, generating a new UUID for existing rows
ALTER TABLE public.activity_logs 
  ALTER COLUMN id TYPE UUID USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. Re-add the primary key constraint
ALTER TABLE public.activity_logs ADD PRIMARY KEY (id);
