import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

export type PayrollCycle = Database["public"]["Tables"]["payroll_cycles"]["Row"];
export type PayrollSnapshot = Database["public"]["Tables"]["payroll_snapshots"]["Row"];
export type SalarySlip = Database["public"]["Tables"]["salary_slips"]["Row"];

export async function getPayrollCycles(): Promise<PayrollCycle[]> {
  const supabase = await createClient();
  const { data: cycles, error } = await supabase
    .from('payroll_cycles')
    .select('id, month, year, status, locked_by, locked_at, slip_status, created_at')
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) throw error;
  return cycles || [];
}

export async function calculateMonthlyPayroll(month: number, year: number, branchId: string): Promise<{ isLocked: boolean; cycle: PayrollCycle | null; data: PayrollSnapshot[]; appliedAdjustments?: any[] }> {
  const supabase = await createClient();

  // Check if cycle is already locked
  const { data: cycles, error: cyclesError } = await supabase
    .from('payroll_cycles')
    .select('id, month, year, status, locked_by, locked_at, slip_status, created_at')
    .eq('month', month)
    .eq('year', year);

  if (cyclesError) throw cyclesError;

  const existingCycle = cycles && cycles.length > 0 ? cycles[0] : null;
  const isLocked = existingCycle?.status === "locked" || existingCycle?.status === "paid";

  if (isLocked) {
    // Return existing snapshots
    const { data: cycleSnapshots, error: snapshotsError } = await supabase
      .from('payroll_snapshots')
      .select('id, cycle_id, employee_id, employee_name, employee_id_external, department, designation, base_salary, days_present, days_field, days_paid_leave, days_unpaid_leave, days_absent, net_payable, basic_salary, hra, allowance, bonus, gross_salary, pf, esi, professional_tax, income_tax, other_deductions, damage_recovery, salary_advance_recovery, total_deductions, net_salary, overtime_hours, overtime_pay, is_reviewed, remarks, calculated_at, salary_slips(emailed, status)')
      .eq('cycle_id', existingCycle.id);

    if (snapshotsError) throw snapshotsError;

    const enrichedSnapshots = cycleSnapshots.map((snap) => {
      // Handle relation arrays returned by Supabase
      const slipsArray = snap.salary_slips as unknown as { emailed: boolean; status: string }[];
      const slip = slipsArray && slipsArray.length > 0 ? slipsArray[0] : null;
      
      let notifStatus = 'Pending';
      if (slip) {
         if (slip.status === 'sent' || slip.status === 'Sent') notifStatus = 'Sent';
         else if (slip.status === 'failed') notifStatus = 'Failed';
         else if (slip.emailed) notifStatus = 'Sent';
      }
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { salary_slips, ...snapshotData } = snap;
      
      return {
        ...snapshotData,
        emailed: slip ? slip.emailed : false,
        notification_status: notifStatus
      } as PayrollSnapshot & { emailed: boolean, notification_status: string };
    });

    return { data: enrichedSnapshots, isLocked: true, cycle: existingCycle, appliedAdjustments: [] };
  }

  // 1. Fetch all active employees (include branch_id for holiday resolution)
  const { data: employees, error: empError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, employee_id, branch_id, department, designation, salary')
    .eq('is_active', true)
    .eq('branch_id', branchId)
    .is('deleted_at', null);
    
  if (empError || !employees) throw new Error("Failed to fetch employees.");

  // Date range boundaries
  const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // 2. Fetch all attendance logs for this month
  const { data: attendanceLogs, error: attendanceError } = await supabase
    .from('attendance')
    .select('employee_id, date, status')
    .gte('date', startOfMonth)
    .lte('date', endOfMonth);
    
  if (attendanceError) throw attendanceError;

  // 3. Fetch all approved leave requests
  const { data: leaveRequests, error: leaveError } = await supabase
    .from('leave_requests')
    .select('employee_id, start_date, end_date, is_half_day, is_paid, status')
    .lte('start_date', endOfMonth)
    .gte('end_date', startOfMonth)
    .eq('status', 'Approved');

  if (leaveError) throw leaveError;

  // 4. Fetch all active holidays for the month
  const { data: allHolidays, error: holidaysError } = await supabase
    .from('holidays')
    .select('date, branch_id, department')
    .gte('date', startOfMonth)
    .lte('date', endOfMonth)
    .eq('is_active', true);
    
  if (holidaysError) throw holidaysError;

  // 5. Fetch all salary hikes up to this month
  const { data: incrementsData } = await supabase
    .from('salary_hikes')
    .select('employee_id, new_salary, effective_date')
    .lte('effective_date', endOfMonth)
    .order('effective_date', { ascending: false });

  // 6. Fetch all active ledger entries up to this month
  const { data: ledgerData, error: ledgerError } = await supabase
    .from('employee_financial_ledger')
    .select('*')
    .in('status', ['pending', 'partially_recovered'])
    .lte('effective_date', endOfMonth);
    
  if (ledgerError) throw ledgerError;

  const appliedAdjustments: any[] = [];

  const workingDaysLimit = 26;

  const draftSnapshots: PayrollSnapshot[] = [];
  
  for (const emp of employees) {
    const empAttendance = (attendanceLogs || []).filter((l) => l.employee_id === emp.id);
    const empLeaves = (leaveRequests || []).filter((l) => l.employee_id === emp.id);

    // Pre-expand leaves to match Leave module logic
    const expandedLeaves = new Map<string, typeof empLeaves[0]>();
    for (const lr of empLeaves) {
      const dates: string[] = [];
      const start = new Date(lr.start_date);
      const end = new Date(lr.end_date);
      while (start <= end) {
        dates.push(start.toISOString().split("T")[0]);
        start.setDate(start.getDate() + 1);
      }
      for (const d of dates) {
        expandedLeaves.set(d, lr);
      }
    }

    let days_present = 0;
    let days_field = 0;
    let days_paid_leave = 0;
    let days_unpaid_leave = 0;
    let standardHolidaysCount = 0;

    // Iterate through the month to resolve daily status
    for (let day = 1; day <= lastDay; day++) {
      const currentDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const currentDateObj = new Date(`${currentDateStr}T00:00:00Z`);
      const dayOfWeek = currentDateObj.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Replicate `isWorkingDayForEmployee` logic purely in-memory
      let isHoliday = false;
      const activeHolidays = (allHolidays || []).filter((h) => h.date === currentDateStr);
      for (const holiday of activeHolidays) {
        let applies = false;
        const matchesBranch = holiday.branch_id === emp.branch_id;
        const matchesDepartment = holiday.department && emp.department 
          ? holiday.department.split(',').map((d: string) => d.trim()).includes(emp.department) 
          : false;

        if (holiday.branch_id && holiday.department) {
          if (matchesBranch && matchesDepartment) applies = true;
        } else if (holiday.branch_id && !holiday.department) {
          if (matchesBranch) applies = true;
        } else if (!holiday.branch_id && holiday.department) {
          if (matchesDepartment) applies = true;
        }

        if (applies) {
          isHoliday = true;
          break;
        }
      }

      const isWorking = !isWeekend && !isHoliday;
      if (isHoliday) {
        standardHolidaysCount += 1;
      }

      const leaveForDay = expandedLeaves.get(currentDateStr);
      const attendanceForDay = empAttendance.find((l) => l.date === currentDateStr);

      let presentPortion = 0;
      let fieldPortion = 0;
      let paidLeavePortion = 0;
      let unpaidLeavePortion = 0;

      // Only calculate leave deductions on days that would otherwise be working days. 
      if (isWorking) {
        if (leaveForDay) {
          if (leaveForDay.is_half_day) {
            if (leaveForDay.is_paid) paidLeavePortion += 0.5;
            else unpaidLeavePortion += 0.5;
            
            if (attendanceForDay) {
                if (attendanceForDay.status === 'Field Assignment') fieldPortion += 0.5;
                else if (attendanceForDay.status === 'Present') presentPortion += 0.5;
            }
          } else {
            if (leaveForDay.is_paid) paidLeavePortion += 1;
            else unpaidLeavePortion += 1;
          }
        } else if (attendanceForDay) {
          if (attendanceForDay.status === 'Field Assignment') fieldPortion += 1;
          else if (attendanceForDay.status === 'Present') presentPortion += 1;
        }
      }

      days_present += presentPortion;
      days_field += fieldPortion;
      days_paid_leave += paidLeavePortion;
      days_unpaid_leave += unpaidLeavePortion;
    }

    const effectiveHolidays = (days_present + days_field + days_paid_leave > 0) ? standardHolidaysCount : 0;
    const accounted_days = days_present + days_field + days_paid_leave + days_unpaid_leave + effectiveHolidays;
    const days_absent = Math.max(0, workingDaysLimit - accounted_days);

    const empIncrements = (incrementsData || []).filter((inc) => inc.employee_id === emp.id);
    const latestIncrement = empIncrements.length > 0 ? empIncrements[0] : null;
    const base_salary = latestIncrement ? latestIncrement.new_salary : (emp.salary || 0);

    const totalEarnedDays = Math.min(workingDaysLimit, (days_present + days_field + days_paid_leave + effectiveHolidays));
    const prorationFactor = workingDaysLimit > 0 ? totalEarnedDays / workingDaysLimit : 1;
    const net_payable = Math.max(0, Math.round(base_salary * Math.max(0, prorationFactor)));

    const basic_salary = Math.round(net_payable * 0.5);
    const hra = Math.round(net_payable * 0.2);
    const allowance = net_payable - basic_salary - hra;

    const empLedger = (ledgerData || []).filter((l) => l.employee_id === emp.id);
    let calculated_bonus = 0;
    let calculated_other_deductions = 0;
    let calculated_salary_advance_recovery = 0;
    let calculated_damage_recovery = 0;

    for (const entry of empLedger) {
        const amount = Number(entry.remaining_amount);
        if (entry.adjustment_type.toLowerCase().includes('bonus')) {
            calculated_bonus += amount;
        } else if (entry.adjustment_type.toLowerCase().includes('advance')) {
            calculated_salary_advance_recovery += amount;
        } else if (entry.adjustment_type.toLowerCase().includes('damage')) {
            calculated_damage_recovery += amount;
        } else {
            calculated_other_deductions += amount;
        }
        
        appliedAdjustments.push({
            ledger_id: entry.id,
            adjustment_type: entry.adjustment_type,
            adjustment_category: entry.adjustment_category,
            amount: amount
        });
    }

    const bonus = calculated_bonus;
    const overtime_pay = 0; // ConstroTrait overtime -> Comp-Off
    const gross_salary = basic_salary + hra + allowance + bonus + overtime_pay;
    
    const pf = 0;
    const esi = 0;
    const professional_tax = 0;
    const income_tax = 0;
    const other_deductions = calculated_other_deductions;
    const salary_advance_recovery = calculated_salary_advance_recovery;
    const damage_recovery = calculated_damage_recovery;
    const total_deductions = pf + esi + professional_tax + income_tax + other_deductions + salary_advance_recovery + damage_recovery;
    
    const net_salary = gross_salary - total_deductions;
    const overtime_hours = 0;

    draftSnapshots.push({
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
      is_reviewed: false,
      remarks: null,
      calculated_at: new Date().toISOString()
    });
  }

  return { data: draftSnapshots, isLocked: false, cycle: existingCycle, appliedAdjustments };
}

export async function lockPayrollCycle(month: number, year: number, userId: string, branchId: string): Promise<void> {
  const supabase = await createClient();

  // Re-calculate safely on the server to prevent trusting client snapshots
  const { data: serverCalculatedSnapshots, appliedAdjustments } = await calculateMonthlyPayroll(month, year, branchId);
  
  if (!serverCalculatedSnapshots || serverCalculatedSnapshots.length === 0) {
      throw new Error("No snapshots generated.");
  }

  // Use the safe RPC for atomic finalization
  const { error: rpcError } = await supabase.rpc('lock_payroll_cycle', {
    p_month: month,
    p_year: year,
    p_locked_by: userId,
    p_snapshots: serverCalculatedSnapshots,
    p_adjustments: appliedAdjustments
  });

  if (rpcError) {
    throw new Error(rpcError.message || "Failed to lock payroll cycle transactionally.");
  }
}
