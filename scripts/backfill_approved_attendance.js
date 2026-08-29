const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function backfill() {
  console.log("Starting backfill for approved EODs...");
  
  // 1. Fetch all approved EODs
  const { data: eods, error: eodError } = await supabase
    .from('eod_reports')
    .select('*')
    .eq('status', 'Approved');

  if (eodError) {
    console.error("Error fetching EODs:", eodError);
    return;
  }

  console.log(`Found ${eods.length} approved EODs.`);

  let insertedCount = 0;

  for (const eod of eods) {
    // 2. Check if attendance exists
    const { data: att, error: attError } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', eod.employee_id)
      .eq('date', eod.report_date);

    if (attError) {
      console.error(`Error fetching attendance for ${eod.employee_id} on ${eod.report_date}:`, attError);
      continue;
    }

    if (!att || att.length === 0) {
      // 3. Create attendance
      const status = eod.location === 'Office' ? 'Present' : 'Field Assignment';
      console.log(`Missing attendance for ${eod.employee_id} on ${eod.report_date}. Creating as ${status}.`);
      
      const { error: insertError } = await supabase
        .from('attendance')
        .insert({
          employee_id: eod.employee_id,
          date: eod.report_date,
          status: status,
          eod_reference_id: eod.id
        });
        
      if (insertError) {
        console.error("Failed to insert attendance:", insertError);
      } else {
        insertedCount++;
      }
    }
  }

  console.log(`Backfill complete. Inserted ${insertedCount} missing attendance records.`);
}

backfill();
