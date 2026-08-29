/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { getPayrollCyclesAction } from "@/actions/payroll.actions";

export default async function PayrollPage() {
  const cyclesRes = await getPayrollCyclesAction();
  const cycles = (cyclesRes.success && cyclesRes.data) ? cyclesRes.data : [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Payroll Management</h1>
      {cycles.length === 0 ? (
        <p>No payroll cycles found.</p>
      ) : (
        <ul className="space-y-4">
          {cycles.map((cycle: any) => (
            <li key={cycle.id} className="p-4 border rounded shadow">
              <p><strong>Month/Year:</strong> {cycle.month}/{cycle.year}</p>
              <p><strong>Status:</strong> {cycle.status}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
