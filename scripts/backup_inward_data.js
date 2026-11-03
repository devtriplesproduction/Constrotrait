const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('DATABASE_URL or SUPABASE_DB_URL environment variable must be set.');
  process.exit(1);
}

const client = new Client({ connectionString });

async function backup() {
  await client.connect();
  console.log('Connected to database. Starting backup of inward data...');

  const tablesToBackup = [
    'job_entries',
    'job_entry_tests',
    'job_assignments',
    'test_result_rows',
    'lab_reports',
    'lab_report_lines',
    'ulr_generation_queue',
    'invoices',
    'invoice_payments',
    'inward_receipts',
    'accounting_expenses',
    'accounting_audit_log',
    'lab_uid_counters',
    'report_yearly_counters'
  ];

  const backupData = {
    timestamp: new Date().toISOString(),
    tables: {}
  };

  for (const table of tablesToBackup) {
    const res = await client.query(`SELECT * FROM "${table}"`);
    backupData.tables[table] = res.rows;
    console.log(`Backed up ${table}: ${res.rows.length} rows`);
  }

  const outputDir = path.join(__dirname, 'audit-reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'inward_data_backup_20261101.json');
  fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`Backup successfully written to ${outputPath}`);

  await client.end();
}

backup().catch(console.error);

