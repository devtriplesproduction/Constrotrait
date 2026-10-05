const { Client } = require('pg');
const fs = require('fs');
const sql = fs.readFileSync('supabase/migrations/20261005000003_fix_report_no_format.sql', 'utf8');

const client = new Client({ connectionString: 'postgresql://postgres.nxvghafschdniemrpqkn:cg9r3yUmPaR0DMXD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres' });
client.connect().then(() => client.query(sql)).then(() => {
  console.log('Migration 3 applied successfully.');
  
  // Fix the previously incorrectly formatted report_no
  // Wrong format: 'QR-74/26-00010'
  // Should be: 'CMTS/QR-74/2026/10'
  return client.query(`
    UPDATE public.lab_reports 
    SET report_no = 'CMTS/' || SPLIT_PART(report_no, '/', 1) || '/2026/' || CAST(SPLIT_PART(SPLIT_PART(report_no, '/', 2), '-', 2) AS INT)
    WHERE report_no LIKE '%/26-%' AND report_no NOT LIKE 'CMTS/%';
  `);
}).then(() => {
  console.log('Fixed lab_reports report_no.');
  
  // Also fix the dummy report formatting
  // Wrong format: 'CT-26-00010'
  // Should be: 'CMTS/TBD/2026/10'
  return client.query(`
    UPDATE public.lab_reports 
    SET report_no = 'CMTS/TBD/2026/' || CAST(SPLIT_PART(report_no, '-', 3) AS INT)
    WHERE report_no LIKE 'CT-26-%';
  `);
}).then(() => {
  console.log('Fixed lab_reports dummy CT-26 report_no.');

  // Fix qc_number in job_entry_tests
  // Wrong format: 'QR-74/26-00010'
  // Should be: 'CMTS/QR-74/2026/10'
  return client.query(`
    UPDATE public.job_entry_tests 
    SET qc_number = 'CMTS/' || SPLIT_PART(qc_number, '/', 1) || '/2026/' || CAST(SPLIT_PART(SPLIT_PART(qc_number, '/', 2), '-', 2) AS INT)
    WHERE qc_number LIKE '%/26-%' AND qc_number NOT LIKE 'CMTS/%';
  `);
}).then(() => {
  console.log('Fixed job_entry_tests qc_number.');
  client.end();
}).catch(err => {
  console.error(err);
  client.end();
});
