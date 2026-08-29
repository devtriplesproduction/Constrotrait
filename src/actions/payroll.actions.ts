"use server";

import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { isHR, isSuperAdmin, isBranchManager } from "@/config/roles";
import {
  getPayrollCycles,
  calculateMonthlyPayroll,
  lockPayrollCycle
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

export async function calculateMonthlyPayrollAction(month: number, year: number, requestedBranchId?: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isHR(user.roles) && !isSuperAdmin(user.roles) && !isBranchManager(user.roles)) return { success: false, error: "Unauthorized" };

    let branchId = requestedBranchId;
    if (!isSuperAdmin(user.roles)) {
      if (!user.branch_id) return { success: false, error: "No branch assigned to user" };
      branchId = user.branch_id;
    }

    if (!branchId) {
      return { success: false, error: "Branch ID is required" };
    }

    const result = await calculateMonthlyPayroll(month, year, branchId);

    return { success: true, ...result };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

export async function approveAndLockPayrollAction(month: number, year: number, requestedBranchId?: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isHR(user.roles) && !isSuperAdmin(user.roles) && !isBranchManager(user.roles)) return { success: false, error: "Unauthorized" };

    let branchId = requestedBranchId;
    if (!isSuperAdmin(user.roles)) {
      if (!user.branch_id) return { success: false, error: "No branch assigned to user" };
      branchId = user.branch_id;
    }
    
    if (!branchId) {
      return { success: false, error: "Branch ID is required" };
    }

    await lockPayrollCycle(month, year, user.id, branchId);

    return { success: true, message: "Payroll cycle locked successfully." };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

export async function addManualLedgerEntryAction(
  employeeId: string,
  type: string,
  amount: number,
  description?: string
) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isHR(user.roles) && !isSuperAdmin(user.roles)) {
      return { success: false, error: "Unauthorized" };
    }

    const { createClient } = await import("@/lib/supabase/server");
    const supabaseClient = await createClient();

    const { error } = await supabaseClient
      .from("employee_financial_ledger")
      .insert({
        employee_id: employeeId,
        adjustment_type: type,
        adjustment_category: "one_time",
        original_amount: amount,
        remaining_amount: amount,
        description,
        status: "pending",
        created_by: user.id,
      });

    if (error) throw error;
    return { success: true, message: "Adjustment added successfully." };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}
