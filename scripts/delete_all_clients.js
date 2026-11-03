const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('DATABASE_URL or SUPABASE_DB_URL environment variable must be set.');
  process.exit(1);
}

const client = new Client({ connectionString });

async function deleteClients() {
  await client.connect();
  console.log('Connected to database.');

  // 1. Backup clients first
  const clientsRes = await client.query('SELECT * FROM public.clients');
  const backupPath = path.join(__dirname, '..', 'audit-reports', 'clients_backup_20261101.json');
  fs.writeFileSync(backupPath, JSON.stringify(clientsRes.rows, null, 2), 'utf-8');
  console.log(`Backed up ${clientsRes.rows.length} clients to ${backupPath}`);

  // 2. Perform deletion in a transaction
  await client.query('BEGIN');

  // If any project or quotation references client_id, nullify or cascade
  await client.query('UPDATE public.accounting_projects SET client_id = NULL WHERE client_id IS NOT NULL');
  await client.query('UPDATE public.quotations SET client_id = NULL WHERE client_id IS NOT NULL');

  const delRes = await client.query('DELETE FROM public.clients');
  console.log(`Deleted ${delRes.rowCount} rows from public.clients.`);

  await client.query('COMMIT');
  console.log('Committed transaction successfully.');

  // 3. Verify count
  const verifyRes = await client.query('SELECT count(*) FROM public.clients');
  console.log(`Verified clients count: ${verifyRes.rows[0].count}`);

  await client.end();
}

deleteClients().catch(console.error);

