const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const password = process.env.SUPABASE_DB_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const projectIdMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectId = projectIdMatch ? projectIdMatch[1] : 'nxvghafschdniemrpqkn';
const dbUrl = `postgresql://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;

const sql = `
CREATE TABLE IF NOT EXISTS public.lab_uid_counters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  counter_name text NOT NULL,
  counter_year int NOT NULL,
  counter_value int NOT NULL DEFAULT 0,
  UNIQUE(counter_name, counter_year)
);

-- Try to add counter_year if missing (if the table already existed with old schema)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lab_uid_counters' AND column_name='counter_year') THEN
        ALTER TABLE public.lab_uid_counters ADD COLUMN counter_year int NOT NULL DEFAULT date_part('year', CURRENT_DATE);
        ALTER TABLE public.lab_uid_counters DROP CONSTRAINT IF EXISTS lab_uid_counters_counter_name_key;
        ALTER TABLE public.lab_uid_counters ADD UNIQUE (counter_name, counter_year);
    END IF;
END $$;

DROP FUNCTION IF EXISTS public.next_uid_seq(text, integer);
CREATE OR REPLACE FUNCTION public.next_uid_seq(p_name text, p_year int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_val int;
BEGIN
    INSERT INTO public.lab_uid_counters (counter_name, counter_year, counter_value)
    VALUES (p_name, p_year, 1)
    ON CONFLICT (counter_name, counter_year)
    DO UPDATE SET counter_value = public.lab_uid_counters.counter_value + 1
    RETURNING counter_value INTO next_val;
    
    RETURN next_val;
END;
$$;
`;

const client = new Client({ connectionString: dbUrl });
client.connect().then(async () => {
  await client.query(sql);
  console.log('Migration applied successfully');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
