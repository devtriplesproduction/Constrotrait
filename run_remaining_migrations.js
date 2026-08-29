const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const migrationsToRun = [
    '20260829000003_compoff_hold_and_expire.sql',
    '20260829000004_secure_payroll_rpc.sql',
    '20260829000005_update_payroll_rpc.sql'
  ];

  const client = new Client({
    connectionString: "postgresql://postgres:ceSJ6657ONQDRMQP@db.wbsgbohrwsgmrymyprib.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting...");
    await client.connect();
    console.log("Connected!");

    for (const file of migrationsToRun) {
      console.log(`Running migration: ${file}...`);
      const sql = fs.readFileSync(path.join('supabase', 'migrations', file), 'utf8');
      
      // Execute the SQL
      await client.query(sql);
      
      // Extract the version from the filename
      const version = file.split('_')[0];
      
      // Insert into schema_migrations so supabase knows it's applied
      try {
        await client.query('INSERT INTO supabase_migrations.schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING', [version]);
      } catch (err) {
        console.warn(`Could not insert version for ${file}, maybe table doesn't exist? Error: ${err.message}`);
      }
      
      console.log(`Successfully completed migration: ${file}`);
    }
    console.log("All migrations executed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

runMigrations();
