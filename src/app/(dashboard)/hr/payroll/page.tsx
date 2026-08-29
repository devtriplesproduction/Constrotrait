import React from "react";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { isSuperAdmin, isHR, isBranchManager } from "@/config/roles";
import { getBranches } from "@/services/branch.service";
import { calculateMonthlyPayrollAction } from "@/actions/payroll.actions";
import { PayrollClient, PayrollSnapshot } from "./PayrollClient";

export default async function PayrollPage() {
  const user = await getAuthenticatedUserWithRoles();
  const roleArray = user?.roles ? (user.roles as string[]) : [];
  const isSA = isSuperAdmin(roleArray);
  let primaryRole = "employee";
  if (isSA) primaryRole = "admin";
  else if (isHR(roleArray)) primaryRole = "hr";
  else if (isBranchManager(roleArray)) primaryRole = "manager";

  let branches: { id: string; name: string }[] = [];
  if (isSA) {
    const branchesRes = await getBranches();
    if (branchesRes.success && branchesRes.data) {
      branches = branchesRes.data;
    }
  }

  // Pre-calculate/fetch current month's payroll for initial render
  const currentDate = new Date();
  const initialMonth = currentDate.getMonth() + 1;
  const initialYear = currentDate.getFullYear();
  
  const branchId = isSA ? undefined : user?.branch_id;
  
  let initialData: PayrollSnapshot[] = [];
  let initialIsLocked = false;
  let initialCycle: unknown = null;

  // Only prefetch if we have a branch to filter by (or if SA, they must select a branch first)
  if (branchId) {
    const res: unknown = await calculateMonthlyPayrollAction(initialMonth, initialYear, branchId);
    const result = res as { success: boolean; data?: PayrollSnapshot[]; isLocked?: boolean; cycle?: unknown; error?: string };
    if (result.success && result.data) {
      initialData = result.data;
      initialIsLocked = result.isLocked || false;
      initialCycle = result.cycle || null;
    }
  }

  return (
    <PayrollClient 
      initialMonth={initialMonth} 
      initialYear={initialYear} 
      initialData={initialData} 
      initialIsLocked={initialIsLocked}
      initialCycle={initialCycle}
      currentUserRole={primaryRole}
      branches={branches}
      userBranchId={user?.branch_id || undefined}
      isSA={isSA}
    />
  );
}
