const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const password = process.env.SUPABASE_DB_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const projectIdMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectId = projectIdMatch ? projectIdMatch[1] : 'nxvghafschdniemrpqkn';
const dbUrl = `postgresql://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;

const client = new Client({ connectionString: dbUrl });
client.connect().then(() => {
  return client.query(`
    ALTER TABLE public.job_entry_tests ALTER COLUMN test_master_id DROP NOT NULL;
    ALTER TABLE public.job_entry_tests ALTER COLUMN material_id DROP NOT NULL;
  `);
}).then(() => {
  console.log('Columns altered successfully');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
