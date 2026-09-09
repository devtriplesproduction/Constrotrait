const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  const password = process.env.SUPABASE_DB_PASSWORD;
  const dbUrl = `postgresql://postgres:${password}@db.nxvghafschdniemrpqkn.supabase.co:5432/postgres`;

  const client = new Client({
    connectionString: dbUrl
  });

  try {
    console.log("Connecting to the database...");
    await client.connect();
    console.log("Connected successfully.");

    // Ensure migration table exists
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS supabase_migrations;
      CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
        version varchar(255) PRIMARY KEY
      );
    `);

    // Get applied migrations
    const res = await client.query('SELECT version FROM supabase_migrations.schema_migrations');
    const appliedVersions = new Set(res.rows.map(r => r.version));

    let appliedCount = 0;

    for (const file of files) {
      const version = file.split('_')[0];
      if (appliedVersions.has(version)) {
        continue;
      }

      console.log(`Running migration: ${file}...`);
      let rawSql = fs.readFileSync(path.join(migrationsDir, file));
      let sql;
      if (rawSql.length >= 2 && rawSql[0] === 0xff && rawSql[1] === 0xfe) {
        sql = rawSql.toString('utf16le');
      } else {
        sql = rawSql.toString('utf8');
      }
      
      // Strip BOM if present
      if (sql.charCodeAt(0) === 0xFEFF) {
        sql = sql.substring(1);
      }
      
      // Execute the SQL
      await client.query(sql);
      
      // Insert into schema_migrations
      await client.query('INSERT INTO supabase_migrations.schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING', [version]);
      
      console.log(`Successfully completed migration: ${file}`);
      appliedCount++;
    }
    
    if (appliedCount === 0) {
      console.log("No new migrations to apply.");
    } else {
      console.log(`All ${appliedCount} pending migrations executed successfully.`);
    }
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

runMigrations();
