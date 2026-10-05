const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.nxvghafschdniemrpqkn:cg9r3yUmPaR0DMXD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres' });
client.connect().then(() => client.query("DROP INDEX IF EXISTS public.job_entry_tests_ulr_unique_idx")).then(() => {
  console.log('Dropped unique index.');
  return client.query("UPDATE public.ulr_generation_queue SET status = 'queued', processed_at = NULL WHERE job_entry_id IN (SELECT DISTINCT job_entry_id FROM public.job_entry_tests WHERE ulr_status = 'pending')");
}).then(() => {
  console.log('Queue reset.');
  return client.query("SELECT public.process_ulr_queue_for_date(CURRENT_DATE)");
}).then(res => {
  console.log('Queue processed.');
  client.end();
}).catch(console.error);
