const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const password = process.env.SUPABASE_DB_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const projectIdMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectId = projectIdMatch ? projectIdMatch[1] : 'nxvghafschdniemrpqkn';
const dbUrl = `postgresql://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;

const client = new Client({ connectionString: dbUrl });
client.connect().then(async () => {
  const res = await client.query(`
    SELECT pg_get_functiondef(oid) 
    FROM pg_proc 
    WHERE proname = 'process_ulr_queue_for_date';
  `);
  if (res.rows.length > 0) {
    console.log(res.rows[0].pg_get_functiondef);
  }
  
  const colRes = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'lab_reports' AND column_name = 'uid_label';
  `);
  console.log('Has uid_label:', colRes.rowCount > 0);
  
  process.exit(0);
});
