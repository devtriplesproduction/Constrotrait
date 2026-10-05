const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.nxvghafschdniemrpqkn:cg9r3yUmPaR0DMXD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres' });
client.connect().then(() => client.query("SELECT job_entry_test_id FROM public.job_assignments WHERE id = 'c0d11aaa-d918-490a-90b3-db67482c3938'")).then(res => {
  if (!res.rows.length) throw new Error("Assignment not found");
  const testId = res.rows[0].job_entry_test_id;
  return client.query("SELECT job_entry_id FROM public.job_entry_tests WHERE id = $1", [testId]);
}).then(res => {
  const jobEntryId = res.rows[0].job_entry_id;
  return client.query("SELECT t.id, m.specific_test, m.is_nabl, m.category, m.report_qr, t.additional_details_values, t.ulr_number FROM public.job_entry_tests t LEFT JOIN public.test_master m ON m.id = t.test_master_id WHERE t.job_entry_id = $1", [jobEntryId]);
}).then(res => {
  console.log(JSON.stringify(res.rows, null, 2));
  client.end();
}).catch(console.error);
