const { Client } = require('pg');
const fs = require('fs');

async function runMigration() {
  // Read SQL migration
  const sql = fs.readFileSync('supabase/migrations/20260824000002_branch_manager_profiles_select.sql', 'utf8');

  // Try standard password
  const client = new Client({
    connectionString: "postgresql://postgres:ceSJ6657ONQDRMQP@db.wbsgbohrwsgmrymyprib.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting...");
    await client.connect();
    console.log("Connected! Running migration...");
    await client.query(sql);
    console.log("Migration executed successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    await client.end();
  }
}

runMigration();
