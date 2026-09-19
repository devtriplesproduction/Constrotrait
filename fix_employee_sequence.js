const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixEmployeeSequences() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  
  if (!password) {
      console.error("No SUPABASE_DB_PASSWORD found in .env.local");
      return;
  }
  
  const dbUrl = `postgresql://postgres:${password}@db.nxvghafschdniemrpqkn.supabase.co:5432/postgres`;

  const client = new Client({
    connectionString: dbUrl
  });

  const sql = `
  DO $$
  DECLARE
      r RECORD;
      emp RECORD;
      v_new_seq INT;
  BEGIN
      -- Loop through all branches
      FOR r IN SELECT id, branch_number FROM branches LOOP
          v_new_seq := 0;
          
          -- Loop through employees in this branch, ordered by when they were created
          FOR emp IN SELECT id FROM profiles WHERE branch_id = r.id ORDER BY created_at LOOP
              v_new_seq := v_new_seq + 1;
              
              -- Update the employee's ID to be sequential
              UPDATE profiles 
              SET employee_id = 'CMTS-' || LPAD(r.branch_number::TEXT, 2, '0') || '-' || v_new_seq::TEXT
              WHERE id = emp.id;
          END LOOP;
          
          -- Update the sequence counter for this branch to the new max number
          UPDATE branch_employee_sequences
          SET current_value = v_new_seq
          WHERE branch_id = r.id;
      END LOOP;
  END;
  $$;
  `;

  try {
    console.log("Connecting to database...");
    await client.connect();
    console.log("Connected! Running the sequence fix query...");

    await client.query(sql);
    
    console.log("Successfully fixed all employee sequences and IDs!");
  } catch (err) {
    console.error("Script failed:", err);
  } finally {
    await client.end();
  }
}

fixEmployeeSequences();
