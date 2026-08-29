"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select";
import { calculateMonthlyPayrollAction } from "@/actions/payroll.actions";
import { isSuperAdmin } from "@/config/roles";

type PayrollCycle = {
  id: string;
  month: number;
  year: number;
  status: string;
  created_at: string | null;
};

type PayrollSnapshot = {
  id: string;
  employee_name: string | null;
  employee_id_external: string | null;
  department: string | null;
  days_present: number | null;
  days_field: number | null;
  days_paid_leave: number | null;
  days_unpaid_leave: number | null;
  days_absent: number | null;
  base_salary: number | null;
  net_payable: number | null;
  basic_salary: number | null;
  hra: number | null;
  allowance: number | null;
  bonus: number | null;
  total_deductions: number | null;
  gross_salary: number | null;
  net_salary: number | null;
};

export default function PayrollClient({ initialCycles, userRoles, branches }: { initialCycles: PayrollCycle[], userRoles?: string[], branches?: { id: string; name: string }[] }) {
  const [cycles] = useState<PayrollCycle[]>(initialCycles);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [snapshots, setSnapshots] = useState<PayrollSnapshot[]>([]);
  const [activeCycle, setActiveCycle] = useState<{ status: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const years = [2024, 2025, 2026, 2027, 2028];
  
  const isSA = isSuperAdmin(userRoles);

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    setSnapshots([]);
    setActiveCycle(null);
    
    try {
      const res = await calculateMonthlyPayrollAction(selectedMonth, selectedYear, isSA ? selectedBranchId : undefined);
      if (res.success && 'data' in res) {
        setSnapshots(res.data || []);
        setActiveCycle(res.cycle || { status: 'draft' });
      } else {
        setError(res.error || "Failed to calculate payroll.");
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message || "An unexpected error occurred.");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Lock workflow removed for Stage 1

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">Payroll Management</h1>
      
      <div className="flex flex-wrap gap-4 items-end bg-white p-4 rounded shadow">
        <div className="space-y-2">
          <label className="text-sm font-medium">Month</label>
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(Number(v))} placeholder="Select Month">
            {months.map((m, i) => (
              <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
            ))}
          </Select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Year</label>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))} placeholder="Select Year">
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </Select>
        </div>
        
        {isSA && branches && branches.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Branch</label>
            <Select value={selectedBranchId} onValueChange={(v) => setSelectedBranchId(v)} placeholder="Select Branch">
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </Select>
          </div>
        )}
        
        <Button onClick={handleCalculate} disabled={loading || (isSA && !selectedBranchId)} className="bg-blue-600 text-white px-4 py-2 rounded">
          {loading ? "Calculating..." : "Calculate Payroll"}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200">
          {error}
        </div>
      )}

      {snapshots.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Payroll Details</h2>
            <div className="flex items-center gap-4">
              {/* Lock button removed for Stage 1 */}
            </div>
          </div>
          
          <div className="overflow-x-auto bg-white shadow rounded border">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 font-semibold text-gray-600">Employee</th>
                  <th className="p-3 font-semibold text-gray-600">Department</th>
                  <th className="p-3 font-semibold text-gray-600">Base Salary</th>
                  <th className="p-3 font-semibold text-gray-600">Present</th>
                  <th className="p-3 font-semibold text-gray-600">Field Assgn</th>
                  <th className="p-3 font-semibold text-gray-600">Paid Lv</th>
                  <th className="p-3 font-semibold text-gray-600">Unpaid Lv</th>
                  <th className="p-3 font-semibold text-gray-600">Absent</th>
                  <th className="p-3 font-semibold text-gray-600">Net Payable</th>
                  <th className="p-3 font-semibold text-gray-600">Basic Salary</th>
                  <th className="p-3 font-semibold text-gray-600">HRA</th>
                  <th className="p-3 font-semibold text-gray-600">Allowance</th>
                  <th className="p-3 font-semibold text-gray-600">Bonus</th>
                  <th className="p-3 font-semibold text-gray-600">Deductions</th>
                  <th className="p-3 font-semibold text-gray-600">Net Salary</th>
                  <th className="p-3 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((snap) => (
                  <tr key={snap.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{snap.employee_name} ({snap.employee_id_external})</td>
                    <td className="p-3">{snap.department}</td>
                    <td className="p-3">₹{(snap.base_salary || 0).toLocaleString()}</td>
                    <td className="p-3">{(snap.days_present || 0).toFixed(1)}</td>
                    <td className="p-3">{(snap.days_field || 0).toFixed(1)}</td>
                    <td className="p-3">{(snap.days_paid_leave || 0).toFixed(1)}</td>
                    <td className="p-3">{(snap.days_unpaid_leave || 0).toFixed(1)}</td>
                    <td className="p-3">{(snap.days_absent || 0).toFixed(1)}</td>
                    <td className="p-3">₹{(snap.net_payable || 0).toLocaleString()}</td>
                    <td className="p-3">₹{(snap.basic_salary || 0).toLocaleString()}</td>
                    <td className="p-3">₹{(snap.hra || 0).toLocaleString()}</td>
                    <td className="p-3">₹{(snap.allowance || 0).toLocaleString()}</td>
                    <td className="p-3">₹{(snap.bonus || 0).toLocaleString()}</td>
                    <td className="p-3 text-red-600">₹{(snap.total_deductions || 0).toLocaleString()}</td>
                    <td className="p-3 font-bold text-green-700">₹{(snap.net_salary || 0).toLocaleString()}</td>
                    <td className="p-3 capitalize">{activeCycle?.status || 'Draft'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Payroll History</h2>
        {cycles.length === 0 ? (
          <p className="text-gray-500">No payroll cycles found.</p>
        ) : (
          <div className="overflow-x-auto bg-white shadow rounded border">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 font-semibold text-gray-600">Month / Year</th>
                  <th className="p-3 font-semibold text-gray-600">Status</th>
                  <th className="p-3 font-semibold text-gray-600">Created At</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((cycle: PayrollCycle) => (
                  <tr key={cycle.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{months[cycle.month - 1]} {cycle.year}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                        cycle.status === 'draft' ? 'bg-gray-200 text-gray-700' :
                        cycle.status === 'locked' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-green-200 text-green-800'
                      }`}>
                        {cycle.status}
                      </span>
                    </td>
                    <td className="p-3">{cycle.created_at ? new Date(cycle.created_at).toLocaleDateString() : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
