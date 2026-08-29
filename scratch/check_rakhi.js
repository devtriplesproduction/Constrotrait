const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: rakhi, error: e1 } = await supabase.from('profiles').select('*').ilike('first_name', 'Rakhi').limit(1);
  if (rakhi && rakhi.length > 0) {
    const id = rakhi[0].id;
    console.log("Rakhi ID:", id);
    const { data: eod } = await supabase.from('eod_reports').select('*').eq('employee_id', id).eq('report_date', '2026-08-29');
    console.log("EOD:", eod);
    const { data: att } = await supabase.from('attendance').select('*').eq('employee_id', id).eq('date', '2026-08-29');
    console.log("Attendance:", att);
  }
}
check();
