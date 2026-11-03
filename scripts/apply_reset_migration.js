const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('DATABASE_URL or SUPABASE_DB_URL environment variable must be set.');
  process.exit(1);
}

const client = new Client({ connectionString });

async function run() {
  await client.connect();
  console.log('Connected to database. Executing migration...');

  const migrationSql = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '20261101000000_reset_inward_data_and_sequences.sql'),
    'utf-8'
  );

  await client.query(migrationSql);
  console.log('Migration executed successfully!\n');

  console.log('=== Verifying row counts ===');
  const tables = [
    'job_entries',
    'job_entry_tests',
    'job_assignments',
    'test_result_rows',
    'lab_reports',
    'lab_report_lines',
    'ulr_generation_queue',
    'invoices',
    'inward_receipts',
    'accounting_expenses',
    'quotations',
    'clients'
  ];

  for (const t of tables) {
    const res = await client.query(`SELECT count(*) FROM "${t}"`);
    console.log(`${t}: ${res.rows[0].count} rows`);
  }

  console.log('\n=== lab_uid_counters ===');
  const counters = await client.query('SELECT counter_name, counter_year, counter_value FROM lab_uid_counters ORDER BY counter_name');
  console.log(counters.rows);

  console.log('\n=== report_yearly_counters ===');
  const repCounters = await client.query('SELECT * FROM report_yearly_counters');
  console.log(repCounters.rows);

  await client.end();
}

run().catch(console.error);

