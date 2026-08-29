const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testRPC() {
  const { data: rakhi } = await supabaseAdmin.from('profiles').select('*').ilike('first_name', 'Rakhi').limit(1);
  const id = rakhi[0].id;
  
  // Impersonate Rakhi for submission
  const rakhiToken = jwt.sign({
    role: 'authenticated',
    aud: 'authenticated',
    sub: id,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  }, process.env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long');

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${rakhiToken}` } }
  });
  const { data: submitRes, error: submitErr } = await supabase.rpc('submit_eod_rpc', {
    p_employee_id: id,
    p_report_date: '2026-08-30',
    p_tasks_accomplished: 'test',
    p_office_hours: 8,
    p_location: 'Office',
    p_blockers: 'none',
    p_photo_url: '',
    p_status: 'Pending',
    p_submitted_by: id
  });
  console.log("Submit EOD result:", submitRes, submitErr);

  const eodId = submitRes;

  // 2. Check attendance - should be missing
  const { data: att1 } = await supabaseAdmin.from('attendance').select('*').eq('employee_id', id).eq('date', '2026-08-30');
  console.log("Attendance after submit (should be empty):", att1);

  // Impersonate admin for approval
  const { data: admin } = await supabaseAdmin.from('profiles').select('*').eq('roles', '{"SUPER_ADMIN"}').limit(1);
  const adminId = admin[0]?.id || id;
  const adminToken = jwt.sign({
    role: 'authenticated',
    aud: 'authenticated',
    sub: adminId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  }, process.env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long');

  const supabaseAdminUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${adminToken}` } }
  });

  // 3. Approve EOD
  const { data: appRes, error: appErr } = await supabaseAdminUser.rpc('review_eod_rpc', {
    p_eod_id: eodId,
    p_status: 'Approved',
    p_rejection_reason: null
  });
  console.log("Approve EOD result:", appRes, appErr);

  // 4. Check attendance - should be Present
  const { data: att2 } = await supabaseAdmin.from('attendance').select('*').eq('employee_id', id).eq('date', '2026-08-30');
  console.log("Attendance after approve (should be Present):", att2);
  
  // 5. Reject EOD
  await supabaseAdminUser.rpc('review_eod_rpc', {
    p_eod_id: eodId,
    p_status: 'Rejected',
    p_rejection_reason: 'test'
  });
  
  // 6. Check attendance - should be deleted
  const { data: att3 } = await supabaseAdmin.from('attendance').select('*').eq('employee_id', id).eq('date', '2026-08-30');
  console.log("Attendance after reject (should be empty):", att3);
}

testRPC();
