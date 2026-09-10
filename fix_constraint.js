const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.nxvghafschdniemrpqkn:cg9r3yUmPaR0DMXD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
});

async function main() {
  await client.connect();
  
  // Update existing rows
  await client.query(`
    UPDATE public.leave_requests 
    SET status = 'Pending Level' 
    WHERE status = 'Pending First Level'
  `);
  
  // Drop and recreate constraint to match codebase intended convention
  await client.query(`
    ALTER TABLE public.leave_requests DROP CONSTRAINT leave_requests_status_check;
    ALTER TABLE public.leave_requests ADD CONSTRAINT leave_requests_status_check 
      CHECK (status IN ('Pending Level', 'Pending HR', 'Approved', 'Rejected', 'Cancelled'));
  `);
  
  console.log('Database constraint updated successfully.');
  await client.end();
}

main().catch(console.error);
