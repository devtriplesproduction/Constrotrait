import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

export type HolidayRow = Database['public']['Tables']['holidays']['Row'];
export type HolidayInsert = Database['public']['Tables']['holidays']['Insert'];
export type HolidayUpdate = Database['public']['Tables']['holidays']['Update'];

/**
 * Get all active holidays, optionally filtered by branch and department.
 */
export async function getHolidays(filters?: { branch_id?: string; department?: string; year?: number }) {
  const supabase = await createClient();
  let query = supabase.from('holidays').select('*').eq('is_active', true);

  if (filters?.year) {
    const startOfYear = `${filters.year}-01-01`;
    const endOfYear = `${filters.year}-12-31`;
    query = query.gte('date', startOfYear).lte('date', endOfYear);
  }

  const { data, error } = await query.order('date', { ascending: true });

  if (error) {
    console.error('Error fetching holidays:', error);
    return { success: false, error: 'Failed to fetch holidays' };
  }

  // Client-side filtering for branch/department applicability to avoid complex OR logic in DB
  let filteredData = data;
  if (filters?.branch_id || filters?.department) {
    filteredData = data.filter((holiday) => {
      const branchMatch = !holiday.branch_id || holiday.branch_id === filters.branch_id;
      const deptMatch = !holiday.department || holiday.department === filters.department;
      return branchMatch && deptMatch;
    });
  }

  return { success: true, data: filteredData };
}

/**
 * Resolves if a specific date is a working day for an employee based on their branch and department.
 * - Saturday and Sunday are non-working days.
 * - Applicable holidays are non-working days.
 */
export async function isWorkingDayForEmployee(employeeId: string, dateStr: string): Promise<boolean> {
  const dateObj = new Date(dateStr);
  const dayOfWeek = dateObj.getDay();

  // 0 is Sunday, 6 is Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  const supabase = await createClient();
  
  // Get employee branch and department
  const { data: employee, error: empError } = await supabase
    .from('profiles')
    .select('branch_id, department')
    .eq('id', employeeId)
    .single();

  if (empError || !employee) {
    // Fallback to true if we can't determine employee
    return true;
  }

  // Check if there is an active holiday for this date
  const { data: holidays, error: holError } = await supabase
    .from('holidays')
    .select('*')
    .eq('date', dateStr)
    .eq('is_active', true);

  if (holError || !holidays || holidays.length === 0) {
    return true; // No holidays on this date
  }

  // Check if any holiday applies to this employee
  for (const holiday of holidays) {
    const branchMatch = !holiday.branch_id || holiday.branch_id === employee.branch_id;
    const deptMatch = !holiday.department || holiday.department === employee.department;
    
    if (branchMatch && deptMatch) {
      return false; // It's an applicable holiday
    }
  }

  return true; // No applicable holiday found
}

import { createEmployeeNotification } from './notification.service';

/**
 * Add a new holiday. Requires HR or SUPER_ADMIN role (enforced by RLS).
 */
export async function addHoliday(payload: HolidayInsert) {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data, error } = await supabase
    .from('holidays')
    .insert({
      ...payload,
      created_by: userData.user.id,
      updated_by: userData.user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding holiday:', error);
    return { success: false, error: error.message };
  }

  // Notify affected employees
  let empQuery = supabase.from('profiles').select('id');
  if (payload.branch_id) {
    empQuery = empQuery.eq('branch_id', payload.branch_id);
  }
  if (payload.department) {
    empQuery = empQuery.eq('department', payload.department);
  }
  const { data: employees } = await empQuery;
  
  if (employees && employees.length > 0) {
    const employeeIds = employees.map(e => e.id);
    await createEmployeeNotification(
      employeeIds,
      `New Holiday Added: ${payload.name} on ${payload.date}`,
      'HOLIDAY_ADDED'
    );
  }

  return { success: true, data };
}

/**
 * Update a holiday. Requires HR or SUPER_ADMIN role (enforced by RLS).
 */
export async function updateHoliday(id: string, payload: HolidayUpdate) {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data, error } = await supabase
    .from('holidays')
    .update({
      ...payload,
      updated_by: userData.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating holiday:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Delete a holiday. Requires HR or SUPER_ADMIN role (enforced by RLS).
 */
export async function deleteHoliday(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('holidays').delete().eq('id', id);

  if (error) {
    console.error('Error deleting holiday:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
