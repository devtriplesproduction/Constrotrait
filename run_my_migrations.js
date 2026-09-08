const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigrations() {
  const migrationsToRun = [
    '20260908000002_restore_eod_proxy_branch.sql',
    '20260908000003_secure_reporting_manager_branch.sql',
    '20260908000004_fix_eod_attendance_branch_id.sql',
    '20260908000005_fix_update_eod_submitted_by.sql'
  ];

  const password = process.env.SUPABASE_DB_PASSWORD;
  const dbUrl = `postgresql://postgres:${password}@db.nxvghafschdniemrpqkn.supabase.co:5432/postgres`;

  const client = new Client({
    connectionString: dbUrl
  });

  try {
    console.log("Connecting...");
    await client.connect();
    console.log("Connected!");

    // Get applied migrations
    const res = await client.query('SELECT version FROM supabase_migrations.schema_migrations');
    const appliedVersions = new Set(res.rows.map(r => r.version));

    for (const file of migrationsToRun) {
      const version = file.split('_')[0];
      if (appliedVersions.has(version)) {
        console.log(`Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`Running migration: ${file}...`);
      const sql = fs.readFileSync(path.join('supabase', 'migrations', file), 'utf8');
      
      // Execute the SQL
      await client.query(sql);
      
      // Insert into schema_migrations
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
