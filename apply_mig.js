const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const password = process.env.SUPABASE_DB_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const projectIdMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectId = projectIdMatch ? projectIdMatch[1] : 'nxvghafschdniemrpqkn';
const dbUrl = `postgresql://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;

const sql = fs.readFileSync('supabase/migrations/20261001000001_fix_issue_reports_uid.sql', 'utf8');

const client = new Client({ connectionString: dbUrl });
client.connect().then(async () => {
  await client.query(sql);
  console.log('Applied migration successfully');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
