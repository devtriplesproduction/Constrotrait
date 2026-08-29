"use server";

import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { isHR, isSuperAdmin } from "@/config/roles";
import {
  getPayrollCycles,
  calculateMonthlyPayroll,
  lockPayrollCycle,
  PayrollSnapshot
} from "@/services/payroll.service";

export async function getPayrollCyclesAction() {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };

    const cycles = await getPayrollCycles();
    return { success: true, data: cycles };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

export async function calculateMonthlyPayrollAction(month: number, year: number) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isHR(user.roles) && !isSuperAdmin(user.roles)) return { success: false, error: "Unauthorized" };

    const result = await calculateMonthlyPayroll(month, year);

    return { success: true, ...result };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

export async function approveAndLockPayrollAction(month: number, year: number, snapshots: Omit<PayrollSnapshot, 'id' | 'cycle_id'>[]) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isHR(user.roles) && !isSuperAdmin(user.roles)) return { success: false, error: "Unauthorized" };

    await lockPayrollCycle(month, year, snapshots, user.id);

    return { success: true, message: "Payroll cycle locked successfully." };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}
