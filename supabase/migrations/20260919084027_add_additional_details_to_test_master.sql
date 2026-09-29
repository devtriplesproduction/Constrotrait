ALTER TABLE public.test_master ADD COLUMN IF NOT EXISTS additional_details TEXT[] DEFAULT '{}';
