import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';
import { getCompOffBalance } from './comp_off.service';

export type LeaveRequestInsert = Database['public']['Tables']['leave_requests']['Insert'];
export type LeaveRequestRow = Database['public']['Tables']['leave_requests']['Row'];

/**
 * Applies for a leave.
 */
export async function applyLeave(payload: Omit<LeaveRequestInsert, 'employee_id' | 'status' | 'first_approval_status' | 'final_approval_status'>) {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData.user) {
    return { success: false, error: 'Unauthorized' };
  }

  const employeeId = userData.user.id;

  // If Comp-Off, verify balance
  if (payload.leave_type === 'COMPENSATORY_OFF') {
    const balance = await getCompOffBalance(employeeId);
    
    // Calculate required hours
    const start = new Date(payload.start_date);
    const end = new Date(payload.end_date);
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const requiredHours = payload.is_half_day ? 4 * days : 8 * days;

    if (balance < requiredHours) {
      return { success: false, error: `Insufficient Comp-Off balance. You have ${balance} hours, but require ${requiredHours} hours.` };
    }
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .insert({
      ...payload,
      employee_id: employeeId,
      status: 'PENDING',
      first_approval_status: 'PENDING',
      final_approval_status: 'PENDING',
    })
    .select()
    .single();

  if (error) {
    console.error('Error applying for leave:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Approve or Reject First Level.
 */
export async function reviewFirstLevel(leaveId: string, status: 'APPROVED' | 'REJECTED', reason?: string) {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData.user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Actual authorization check is enforced via RLS (Update policy)
  // If user doesn't have permission to update, it will silently fail or return error.
  
  // If rejected at first level, the overall status is REJECTED
  const updatePayload: any = {
    first_approver_id: userData.user.id,
    first_approval_status: status,
    first_approval_date: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (status === 'REJECTED') {
    updatePayload.status = 'REJECTED';
    updatePayload.rejection_reason = reason;
    updatePayload.final_approval_status = 'REJECTED';
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .update(updatePayload)
    .eq('id', leaveId)
    .select()
    .single();

  if (error) {
    console.error('Error in first level review:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Approve or Reject Final Level (HR).
 */
export async function reviewFinalLevel(leaveId: string, status: 'APPROVED' | 'REJECTED', reason?: string) {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData.user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get leave request first to calculate comp-off debit if necessary
  const { data: leaveReq, error: fetchError } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('id', leaveId)
    .single();

  if (fetchError || !leaveReq) {
    return { success: false, error: 'Leave request not found.' };
  }

  // Check if we need to process comp-off debit
  if (status === 'APPROVED' && leaveReq.leave_type === 'COMPENSATORY_OFF' && leaveReq.status !== 'APPROVED') {
    const start = new Date(leaveReq.start_date);
    const end = new Date(leaveReq.end_date);
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const debitHours = leaveReq.is_half_day ? 4 * days : 8 * days;

    const balance = await getCompOffBalance(leaveReq.employee_id);
    if (balance < debitHours) {
      return { success: false, error: 'Insufficient comp-off balance at time of final approval.' };
    }

    // Insert debit via admin client
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: insertError } = await adminSupabase
      .from('comp_off_ledger')
      .insert({
        employee_id: leaveReq.employee_id,
        transaction_type: 'DEBIT',
        amount_hours: debitHours,
        reference_leave_id: leaveId,
        description: `Consumed ${debitHours} hours for Leave ${leaveId}`,
      });

    if (insertError) {
      console.error('Error inserting comp_off debit:', insertError);
      return { success: false, error: 'Failed to insert comp off debit.' };
    }
  }

  const updatePayload: any = {
    final_approver_id: userData.user.id,
    final_approval_status: status,
    final_approval_date: new Date().toISOString(),
    status: status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'REJECTED') {
    updatePayload.rejection_reason = reason;
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .update(updatePayload)
    .eq('id', leaveId)
    .select()
    .single();

  if (error) {
    console.error('Error in final level review:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Cancel an approved leave.
 * Reverses Comp-Off if it was a Comp-Off leave.
 */
export async function cancelLeave(leaveId: string) {
  const supabase = await createClient();
  
  // 1. Fetch leave
  const { data: leaveReq, error: fetchError } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('id', leaveId)
    .single();

  if (fetchError || !leaveReq) {
    return { success: false, error: 'Leave request not found.' };
  }

  if (leaveReq.status !== 'APPROVED') {
    return { success: false, error: 'Only approved leaves can be cancelled.' };
  }

  // 2. Reverse Comp-Off if applicable
  if (leaveReq.leave_type === 'COMPENSATORY_OFF') {
    const start = new Date(leaveReq.start_date);
    const end = new Date(leaveReq.end_date);
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const reversalHours = leaveReq.is_half_day ? 4 * days : 8 * days;

    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: insertError } = await adminSupabase
      .from('comp_off_ledger')
      .insert({
        employee_id: leaveReq.employee_id,
        transaction_type: 'REVERSAL',
        amount_hours: reversalHours,
        reference_leave_id: leaveId,
        description: `Reversed ${reversalHours} hours for Cancelled Leave ${leaveId}`,
      });

    if (insertError) {
      console.error('Error inserting comp_off reversal:', insertError);
      return { success: false, error: 'Failed to insert comp off reversal.' };
    }
  }

  // 3. Update status
  const { error: updateError } = await supabase
    .from('leave_requests')
    .update({ 
      status: 'CANCELLED',
      updated_at: new Date().toISOString()
    })
    .eq('id', leaveId);

  if (updateError) {
    return { success: false, error: 'Failed to update leave status to cancelled.' };
  }

  return { success: true };
}

/**
 * Verify Sick Leave Certificate.
 */
export async function verifySickLeaveCertificate(leaveId: string, isPaid: boolean) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('leave_requests')
    .update({ 
      is_paid: isPaid,
      updated_at: new Date().toISOString()
    })
    .eq('id', leaveId)
    .eq('leave_type', 'SICK_LEAVE');

  if (error) {
    console.error('Error verifying sick leave certificate:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
