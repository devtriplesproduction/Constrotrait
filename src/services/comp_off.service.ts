import { createClient } from '@/lib/supabase/server';
import { isWorkingDayForEmployee } from './holiday.service';

/**
 * Calculates the amount of comp-off hours earned for a specific EOD.
 * 
 * Rules:
 * - On a normal working day (Mon-Fri, not a holiday), credit = approved EOD hours - 8 (min 0)
 * - On a non-working day (Sat, Sun, or holiday), credit = full approved EOD hours
 */
export async function calculateCreditForEOD(employeeId: string, eodHours: number, dateStr: string): Promise<number> {
  const isWorkingDay = await isWorkingDayForEmployee(employeeId, dateStr);

  if (!isWorkingDay) {
    // Full hours for non-working days
    return eodHours;
  }

  // Overtime for working days
  const overtime = eodHours - 8;
  return overtime > 0 ? overtime : 0;
}

/**
 * Gets the current comp-off balance for an employee.
 * It sums all CREDIT transactions and subtracts all DEBIT and REVERSAL transactions.
 * Wait, REVERSAL reverses a DEBIT, so it effectively ADDS to the balance.
 * Actually, let's treat CREDIT as positive, DEBIT as negative, and REVERSAL as positive (reversing a debit).
 * Or we can just do: CREDIT + REVERSAL - DEBIT.
 */
export async function getCompOffBalance(employeeId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('comp_off_ledger')
    .select('transaction_type, amount_hours')
    .eq('employee_id', employeeId);

  if (error) {
    console.error('Error fetching comp_off_ledger:', error);
    return 0;
  }

  let balance = 0;
  for (const row of data) {
    const hours = Number(row.amount_hours);
    if (row.transaction_type === 'CREDIT' || row.transaction_type === 'REVERSAL') {
      balance += hours;
    } else if (row.transaction_type === 'DEBIT') {
      balance -= hours;
    }
  }

  return balance;
}

/**
 * Grants comp-off credit based on an approved EOD.
 * This should only be called when an EOD is approved.
 * It is idempotent (prevents duplicate credit for the same EOD).
 */
export async function grantCompOffForEOD(eodId: string, employeeId: string, eodHours: number, dateStr: string) {
  const supabase = await createClient();

  // 1. Check if credit was already granted for this EOD
  const { data: existingCredit, error: checkError } = await supabase
    .from('comp_off_ledger')
    .select('id')
    .eq('reference_eod_id', eodId)
    .eq('transaction_type', 'CREDIT')
    .maybeSingle();

  if (checkError) {
    console.error('Error checking existing comp off credit:', checkError);
    return { success: false, error: 'Database error while checking existing credit.' };
  }

  if (existingCredit) {
    // Already granted, idempotent success
    return { success: true, message: 'Credit already granted for this EOD.' };
  }

  // 2. Calculate credit
  const creditHours = await calculateCreditForEOD(employeeId, eodHours, dateStr);

  if (creditHours <= 0) {
    return { success: true, message: 'No comp-off hours earned.' };
  }

  // 3. Insert credit transaction
  // Note: This relies on service-role for inserting to ledger if RLS denies standard users.
  // Actually, we use the authenticated client, so the caller must be HR or BM. 
  // Wait, the ledger has NO INSERT policies, meaning only service_role can insert.
  // We MUST use a service_role client for ledger insertions.
  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: insertError } = await adminSupabase
    .from('comp_off_ledger')
    .insert({
      employee_id: employeeId,
      transaction_type: 'CREDIT',
      amount_hours: creditHours,
      reference_eod_id: eodId,
      description: `Earned ${creditHours} hours from EOD on ${dateStr}`,
    });

  if (insertError) {
    console.error('Error inserting comp_off credit:', insertError);
    return { success: false, error: 'Failed to insert comp off credit.' };
  }

  return { success: true, creditHours };
}
