const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const password = process.env.SUPABASE_DB_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const projectIdMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectId = projectIdMatch ? projectIdMatch[1] : 'nxvghafschdniemrpqkn';
const dbUrl = `postgresql://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;

const client = new Client({ connectionString: dbUrl });
client.connect().then(async () => {
  const res = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lab_uid_counters'`);
  console.log(res.rows);
  const constraints = await client.query(`SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'lab_uid_counters'`);
  console.log(constraints.rows);
  process.exit(0);
});
