import React from "react";
import { getPayrollCyclesAction } from "@/actions/payroll.actions";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { isSuperAdmin } from "@/config/roles";
import { getBranches } from "@/services/branch.service";
import PayrollClient from "./PayrollClient";

export default async function PayrollPage() {
  const user = await getAuthenticatedUserWithRoles();
  const role = user?.roles ? (user.roles as string[]) : [];
  const isSA = isSuperAdmin(user?.roles);

  const cyclesRes = await getPayrollCyclesAction();
  const cycles = (cyclesRes.success && cyclesRes.data) ? cyclesRes.data : [];

  let branches: { id: string; name: string }[] = [];
  if (isSA) {
    const branchesRes = await getBranches();
    if (branchesRes.success && branchesRes.data) {
      branches = branchesRes.data;
    }
  }

  return <PayrollClient initialCycles={cycles} userRoles={role} branches={branches} />;
}
