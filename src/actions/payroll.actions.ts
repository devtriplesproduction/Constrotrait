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
    console.error("Error fetching payroll cycles:", err);
    return { success: false, error: "Failed to retrieve payroll cycles." };
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
    console.error("Error calculating monthly payroll:", err);
    return { success: false, error: "Failed to calculate monthly payroll." };
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
    console.error("Error approving and locking payroll:", err);
    return { success: false, error: "Failed to approve and lock payroll." };
  }
}

export async function addManualLedgerEntryAction(
  employeeId: string,
  type: string,
  amount: number,
  description?: string,
  kilometers?: number,
  vehicle_type?: string,
  tds_applied?: boolean,
  tds_rate?: number
) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!isHR(user.roles) && !isSuperAdmin(user.roles)) {
      return { success: false, error: "Unauthorized" };
    }

    await import("@/services/payroll.service").then(m => m.addManualLedgerEntry(employeeId, type, amount, description, user.id, kilometers, vehicle_type, tds_applied, tds_rate));

    return { success: true, message: "Adjustment added successfully." };
  } catch (error) {
    const err = error as Error;
    console.error("Error adding manual ledger entry:", err);
    return { success: false, error: err.message === "Validation failed" ? "Invalid input provided." : "Failed to add manual ledger entry." };
  }
}
