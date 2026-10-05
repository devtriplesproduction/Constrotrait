const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const sql = fs.readFileSync('supabase/migrations/20261005000002_fix_issue_reports_qr_fallback.sql', 'utf8');

const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.nxvghafschdniemrpqkn:cg9r3yUmPaR0DMXD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres' });
client.connect().then(() => client.query(sql)).then(() => {
  console.log('Migration applied successfully.');
  return client.query("UPDATE public.ulr_generation_queue SET status = 'queued', processed_at = NULL WHERE job_entry_id IN (SELECT DISTINCT job_entry_id FROM public.job_entry_tests WHERE ulr_status = 'pending')");
}).then(() => {
  console.log('Queue reset for pending tests.');
  return client.query('SELECT public.process_ulr_queue_for_date(CURRENT_DATE)');
}).then(res => {
  console.log('Queue processed:', JSON.stringify(res.rows[0], null, 2));
  client.end();
}).catch(err => {
  console.error(err);
  client.end();
});
