import React from "react";
import { getPayrollCyclesAction } from "@/actions/payroll.actions";
import PayrollClient from "./PayrollClient";

export default async function PayrollPage() {
  const cyclesRes = await getPayrollCyclesAction();
  const cycles = (cyclesRes.success && cyclesRes.data) ? cyclesRes.data : [];

  return <PayrollClient initialCycles={cycles} />;
}
