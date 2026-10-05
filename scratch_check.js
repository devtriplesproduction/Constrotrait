const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.nxvghafschdniemrpqkn:cg9r3yUmPaR0DMXD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres' });
client.connect().then(() => client.query("SELECT id, specific_test, is_nabl, category, report_qr FROM public.test_master WHERE specific_test IN ('Setting Time', 'Comprencive Strength', 'Soundness')")).then(res => {
  console.log(res.rows);
  client.end();
}).catch(console.error);
