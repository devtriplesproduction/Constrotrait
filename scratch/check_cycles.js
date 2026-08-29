const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCycles() {
  const { data: rakhi } = await supabase.from('profiles').select('*').ilike('first_name', 'Rakhi').limit(1);
  const id = rakhi[0].id;
  const branchId = rakhi[0].branch_id;

  const { data: cycles } = await supabase.from('payroll_cycles').select('*');
  console.log("Cycles:", cycles);

  const { data: snapshots } = await supabase.from('payroll_snapshots').select('*').eq('employee_id', id);
  console.log("Rakhi snapshots:", snapshots);
}

checkCycles();
