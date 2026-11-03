const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('DATABASE_URL or SUPABASE_DB_URL environment variable must be set.');
  process.exit(1);
}

const client = new Client({ connectionString });

async function verify() {
  await client.connect();
  console.log('Connected to database. Testing sequence generations in a rollback transaction...');

  await client.query('BEGIN');

  // Test 1: UID_NABL sequence
  const nablRes = await client.query("SELECT public.next_uid_seq('UID_NABL', 2026) as next_uid");
  const nextUid = nablRes.rows[0].next_uid;
  console.log(`[TEST 1] next_uid_seq('UID_NABL', 2026) returned: ${nextUid} (Expected: 3188)`);

  if (Number(nextUid) !== 3188) {
    throw new Error(`Assertion failed: expected 3188, got ${nextUid}`);
  }

  // Test 2: SAMPLE_CON sequence
  const conRes = await client.query("SELECT public.next_uid_seq('SAMPLE_CON', 2026) as next_sample");
  const nextSampleCon = conRes.rows[0].next_sample;
  console.log(`[TEST 2] next_uid_seq('SAMPLE_CON', 2026) returned: ${nextSampleCon} (Expected: 860)`);

  if (Number(nextSampleCon) !== 860) {
    throw new Error(`Assertion failed: expected 860, got ${nextSampleCon}`);
  }

  // Test 3: SAMPLE_ENV sequence
  const envRes = await client.query("SELECT public.next_uid_seq('SAMPLE_ENV', 2026) as next_sample");
  const nextSampleEnv = envRes.rows[0].next_sample;
  console.log(`[TEST 3] next_uid_seq('SAMPLE_ENV', 2026) returned: ${nextSampleEnv} (Expected: 860)`);

  if (Number(nextSampleEnv) !== 860) {
    throw new Error(`Assertion failed: expected 860, got ${nextSampleEnv}`);
  }

  // Rollback so the test doesn't consume the sequence numbers
  await client.query('ROLLBACK');
  console.log('Rolled back test transaction successfully. Counters remain intact.');

  // Check counter values in DB
  const res = await client.query('SELECT counter_name, counter_year, counter_value FROM lab_uid_counters ORDER BY counter_name');
  console.log('\nCurrent lab_uid_counters state:');
  console.log(res.rows);

  await client.end();
}

verify().catch(console.error);

