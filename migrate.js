const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  // Read SQL migration
  const sql = fs.readFileSync('supabase/migrations/20260829000001_fix_eod_attendance_flow.sql', 'utf8');

  // Try standard password
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
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
