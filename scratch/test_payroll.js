const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testPayroll() {
  const { data: rakhi } = await supabase.from('profiles').select('*').ilike('first_name', 'Rakhi').limit(1);
  const id = rakhi[0].id;
  
  const branchId = rakhi[0].branch_id || "null-branch"; // whatever branch she's in

  // Now emulate just the start of calculateMonthlyPayroll for this id:
  const year = 2026;
  const month = 8;
  const startOfMonth = `2026-08-01`;
  const endOfMonth = `2026-08-31`;

  const { data: attendanceLogs } = await supabase
    .from('attendance')
    .select('employee_id, date, status')
    .gte('date', startOfMonth)
    .lte('date', endOfMonth)
    .eq('employee_id', id);

  console.log("Attendance logs fetched:", attendanceLogs);
  const empAttendance = attendanceLogs || [];
  let days_present = 0;
  for (let day = 1; day <= 31; day++) {
    const currentDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const attendanceForDay = empAttendance.find((l) => l.date === currentDateStr);
    if (attendanceForDay) {
       console.log(`Matched day: ${currentDateStr}`, attendanceForDay);
       if (attendanceForDay.status === 'Present') days_present += 1;
    }
  }
  console.log("Total days_present calculated:", days_present);
}
testPayroll();
