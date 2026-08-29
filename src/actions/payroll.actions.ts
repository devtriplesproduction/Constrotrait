/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { isWorkingDayForEmployee } from "@/services/holiday.service";
import { isHR, isSuperAdmin } from "@/config/roles";

export async function getPayrollCyclesAction() {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };

    const supabase = await createClient();
    const { data: cycles, error } = await supabase.from('payroll_cycles').select('*').order('year', { ascending: false }).order('month', { ascending: false });
    if (error) throw error;
    
    return { success: true, data: cycles };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function calculateMonthlyPayrollAction(month: number, year: number) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isHR(user.roles) && !isSuperAdmin(user.roles)) return { success: false, error: "Unauthorized" };

    const supabase = await createClient();

    // Check if cycle is already locked
    const { data: cycles, error: cyclesError } = await supabase
      .from('payroll_cycles')
      .select('*')
      .eq('month', month)
      .eq('year', year);

    if (cyclesError) throw cyclesError;

    const existingCycle = cycles && cycles.length > 0 ? cycles[0] : null;
    const isLocked = existingCycle?.status === "locked" || existingCycle?.status === "paid";

    if (isLocked) {
      // Return existing snapshots
      const { data: cycleSnapshots, error: snapshotsError } = await supabase
        .from('payroll_snapshots')
        .select('*, salary_slips(emailed, status)')
        .eq('cycle_id', existingCycle.id);

      if (snapshotsError) throw snapshotsError;

      const enrichedSnapshots = cycleSnapshots.map((snap: any) => {
        const slip = snap.salary_slips && snap.salary_slips.length > 0 ? snap.salary_slips[0] : null;
        
        let notifStatus = 'Pending';
        if (slip) {
           if (slip.status === 'sent' || slip.status === 'Sent') notifStatus = 'Sent';
           else if (slip.status === 'failed') notifStatus = 'Failed';
           else if (slip.emailed) notifStatus = 'Sent';
        }
        
        return {
          ...snap,
          emailed: slip ? slip.emailed : false,
          notification_status: notifStatus
        };
      });

      return { success: true, data: enrichedSnapshots, isLocked: true, cycle: existingCycle };
    }

    // 1. Fetch all active employees
    const { data: employees, error: empError } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null);
      
    if (empError || !employees) throw new Error("Failed to fetch employees.");

    // Date range boundaries
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // 2. Fetch all EOD reports for this month
    const { data: eodLogs, error: eodError } = await supabase
      .from('eod_reports')
      .select('employee_id, report_date, status, location')
      .gte('report_date', startOfMonth)
      .lte('report_date', endOfMonth)
      .in('status', ['Approved', 'Pending']);
      
    if (eodError) throw eodError;

    // 3. Fetch all approved leave requests
    const { data: leaveRequests, error: leaveError } = await supabase
      .from('leave_requests')
      .select('employee_id, start_date, end_date, is_half_day, is_paid, status')
      .lte('start_date', endOfMonth)
      .gte('end_date', startOfMonth)
      .eq('status', 'Approved');

    if (leaveError) throw leaveError;

    // Expand leave requests into daily logs
    const dailyLeaves: any[] = [];
    for (const lr of leaveRequests || []) {
      const current = new Date(lr.start_date);
      const end = new Date(lr.end_date);
      const monthStart = new Date(startOfMonth);
      const monthEnd = new Date(endOfMonth);
      
      while (current <= end) {
        if (current >= monthStart && current <= monthEnd) {
          dailyLeaves.push({
            employee_id: lr.employee_id,
            date: current.toISOString().split('T')[0],
            is_half_day: lr.is_half_day,
            is_paid: lr.is_paid
          });
        }
        current.setDate(current.getDate() + 1);
      }
    }

    // Fetch all salary hikes up to this month
    const { data: incrementsData } = await supabase
      .from('salary_hikes')
      .select('*')
      .lte('effective_date', endOfMonth)
      .order('effective_date', { ascending: false });

    // Fetch ledger
    const { data: ledgerData } = await supabase
      .from('employee_financial_ledger')
      .select('*')
      .in('employee_id', employees.map((e: any) => e.id))
      .eq('status', 'pending');
      
    let currentApps: any[] = [];
    if (existingCycle?.id) {
      const { data } = await supabase
        .from('payroll_adjustment_applications')
        .select('*')
        .eq('cycle_id', existingCycle.id);
      currentApps = data || [];
    }

    const workingDaysLimit = 26;

    const draftSnapshots = await Promise.all(employees.map(async (emp: any) => {
      const empEods = (eodLogs || []).filter((l: any) => l.employee_id === emp.id);
      const empLeaves = dailyLeaves.filter((l: any) => l.employee_id === emp.id);

      let days_present = 0;
      let days_field = 0;
      let days_paid_leave = 0;
      let days_unpaid_leave = 0;
      let standardHolidaysCount = 0;

      // Iterate through the month to resolve daily status
      for (let day = 1; day <= lastDay; day++) {
        const currentDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // 1. Is it a working day for this employee? (Checks weekends and branch/department holidays)
        const isWorking = await isWorkingDayForEmployee(emp.id, currentDateStr);
        if (!isWorking) {
          standardHolidaysCount += 1;
        }

        // 2. Check Leaves
        const leaveForDay = empLeaves.find((l: any) => l.date === currentDateStr);
        // 3. Check EOD
        const eodForDay = empEods.find((l: any) => l.report_date === currentDateStr);

        let presentPortion = 0;
        let fieldPortion = 0;
        let paidLeavePortion = 0;
        let unpaidLeavePortion = 0;

        if (leaveForDay) {
          if (leaveForDay.is_half_day) {
             if (leaveForDay.is_paid) paidLeavePortion += 0.5;
             else unpaidLeavePortion += 0.5;
             
             // If half-day leave, the other half depends on EOD
             if (eodForDay) {
                if (eodForDay.location === 'Field') fieldPortion += 0.5;
                else presentPortion += 0.5;
             }
          } else {
             if (leaveForDay.is_paid) paidLeavePortion += 1;
             else unpaidLeavePortion += 1;
          }
        } else if (eodForDay) {
          if (eodForDay.location === 'Field') fieldPortion += 1;
          else presentPortion += 1;
        }

        // Add to totals
        days_present += presentPortion;
        days_field += fieldPortion;
        days_paid_leave += paidLeavePortion;
        days_unpaid_leave += unpaidLeavePortion;
      }

      // Calculate days_absent: Any working day (up to 26) not accounted for
      const effectiveHolidays = (days_present + days_field + days_paid_leave > 0) ? standardHolidaysCount : 0;
      const accounted_days = days_present + days_field + days_paid_leave + days_unpaid_leave + effectiveHolidays;
      const days_absent = Math.max(0, workingDaysLimit - accounted_days);

      // Salary
      const empIncrements = (incrementsData || []).filter((inc: any) => inc.employee_id === emp.id);
      const latestIncrement = empIncrements.length > 0 ? empIncrements[0] : null;
      const base_salary = latestIncrement ? latestIncrement.new_salary : (emp.salary || 0);

      const totalEarnedDays = Math.min(workingDaysLimit, (days_present + days_field + days_paid_leave + effectiveHolidays));
      const prorationFactor = workingDaysLimit > 0 ? totalEarnedDays / workingDaysLimit : 1;
      const net_payable = Math.max(0, Math.round(base_salary * Math.max(0, prorationFactor)));

      const basic_salary = Math.round(net_payable * 0.5);
      const hra = Math.round(net_payable * 0.2);
      const allowance = net_payable - basic_salary - hra;

      const empLedgers = (ledgerData || []).filter((l: any) => l.employee_id === emp.id);
      const empApps = (currentApps || []).filter((a: any) => a.employee_id === emp.id);

      let total_bonus = 0;
      let total_other_deductions = 0;
      let salary_advance_recovery = 0;
      let damage_recovery = 0;
      let overtime_hours = 0;

      for (const ledger of empLedgers) {
        const draftApp = empApps.find((a: any) => a.ledger_id === ledger.id);
        const applied_amount = draftApp ? draftApp.applied_amount : (ledger.adjustment_category === 'one_time' ? ledger.remaining_amount : 0);

        if (applied_amount > 0) {
           if (ledger.adjustment_type === 'bonus' || ledger.adjustment_type === 'festival_bonus') total_bonus += applied_amount;
           else if (ledger.adjustment_type === 'salary_advance') salary_advance_recovery += applied_amount;
           else if (ledger.adjustment_type === 'damage') damage_recovery += applied_amount;
           else total_other_deductions += applied_amount;
        }
      }

      for (const app of empApps) {
        if (!empLedgers.find((l: any) => l.id === app.ledger_id)) {
           if (app.adjustment_type === 'bonus') total_bonus += app.applied_amount;
           else if (app.adjustment_type === 'overtime_hours') overtime_hours += app.applied_amount;
           else total_other_deductions += app.applied_amount;
        }
      }

      const hourly_rate = base_salary / 208; // 26 days * 8 hours
      const overtime_pay = Math.round(overtime_hours * 1.5 * hourly_rate);

      const bonus = total_bonus;
      const gross_salary = basic_salary + hra + allowance + bonus + overtime_pay;
      
      const pf = 0;
      const esi = 0;
      const professional_tax = 0;
      const income_tax = 0;
      const other_deductions = total_other_deductions;
      const total_deductions = pf + esi + professional_tax + income_tax + other_deductions + salary_advance_recovery + damage_recovery;
      
      const net_salary = gross_salary - total_deductions;

      return {
        id: `draft-${emp.id}`,
        cycle_id: existingCycle?.id || "draft-cycle",
        employee_id: emp.id,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        employee_id_external: emp.employee_id || "UNK-000",
        department: emp.department || "General",
        designation: emp.designation || "Staff",
        base_salary,
        days_present,
        days_field,
        days_paid_leave,
        days_unpaid_leave,
        days_absent,
        net_payable,
        basic_salary,
        hra,
        allowance,
        bonus,
        gross_salary,
        pf,
        esi,
        professional_tax,
        income_tax,
        other_deductions,
        total_deductions,
        net_salary,
        overtime_hours,
        overtime_pay,
        salary_advance_recovery,
        damage_recovery,
        calculated_at: new Date().toISOString()
      };
    }));

    return { success: true, data: draftSnapshots, isLocked: false, cycle: existingCycle };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function approveAndLockPayrollAction(month: number, year: number, snapshots: any[]) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isHR(user.roles) && !isSuperAdmin(user.roles)) return { success: false, error: "Unauthorized" };

    const supabase = await createClient();

    // Upsert the cycle
    const { data: cycle, error: cycleError } = await supabase
      .from('payroll_cycles')
      .upsert({ month, year, status: 'locked', locked_by: user.id, locked_at: new Date().toISOString() }, { onConflict: 'month,year' })
      .select()
      .single();

    if (cycleError || !cycle) throw cycleError;

    // Clean existing snapshots to allow re-locking safely (Idempotency)
    await supabase.from('payroll_snapshots').delete().eq('cycle_id', cycle.id);

    // Insert new snapshots
    const inserts = snapshots.map(s => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, cycle_id, ...rest } = s;
      return { ...rest, cycle_id: cycle.id };
    });

    const { error: snapError } = await supabase.from('payroll_snapshots').insert(inserts);
    if (snapError) throw snapError;

    return { success: true, message: "Payroll cycle locked successfully." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
