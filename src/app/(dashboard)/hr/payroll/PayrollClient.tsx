"use client";

import React, { useState } from "react";
import { 
  calculateMonthlyPayrollAction, 
  approveAndLockPayrollAction,
  addManualLedgerEntryAction
} from "@/actions/payroll.actions";
import {
  generateSalarySlipAction,
  generateSignedSalarySlipUrlAction,
  downloadSalarySlipBase64Action
} from "@/actions/payroll_slips.actions";
import type { Database } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/Dropdown";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Loader2, 
  FileText, 
  Layers, 
  DollarSign, 
  Clock, 
  FileSpreadsheet,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/modules/PageHeader";

export type PayrollSnapshot = Database["public"]["Tables"]["payroll_snapshots"]["Row"] & {
  status?: string;
  slip_status?: string;
};

interface PayrollClientProps {
  initialMonth: number;
  initialYear: number;
  initialData: PayrollSnapshot[];
  initialIsLocked: boolean;
  initialCycle: Database["public"]["Tables"]["payroll_cycles"]["Row"] | null;
  currentUserRole: string;
  branches?: { id: string; name: string }[];
  userBranchId?: string;
  isSA: boolean;
}

export function PayrollClient({ 
  initialMonth, 
  initialYear, 
  initialData, 
  initialIsLocked,
  initialCycle,
  branches = [],
  userBranchId,
  isSA
}: PayrollClientProps) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [data, setData] = useState<PayrollSnapshot[]>(initialData);
  const [isLocked, setIsLocked] = useState(initialIsLocked);
  const [cycle, setCycle] = useState<Database["public"]["Tables"]["payroll_cycles"]["Row"] | null>(initialCycle);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>(isSA ? "" : (userBranchId || ""));

  const totalEmployees = data.length;
  const grossPayroll = data.reduce((acc, curr) => acc + (curr.gross_salary || 0), 0);
  const netPayroll = data.reduce((acc, curr) => acc + (curr.net_salary || 0), 0);

  const [activeTab, setActiveTab] = useState<"attendance" | "adjustments" | "history">("attendance");

  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [employeeDetailsOpen, setEmployeeDetailsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollSnapshot | null>(null);

  // Adjustment Modal State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjEmployeeId, setAdjEmployeeId] = useState("");
  const [adjType, setAdjType] = useState("Bonus");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjDesc, setAdjDesc] = useState("");
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);
  
  const { toast } = useToast();

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const loadData = async (m: number, y: number, branchId: string) => {
    if (!branchId && isSA) {
      setData([]);
      setIsLocked(false);
      setCycle(null);
      return;
    }
    setLoading(true);
    try {
      const res = await calculateMonthlyPayrollAction(m, y, branchId);
      if (res.success && 'data' in res && res.data) {
        setData(res.data);
        setIsLocked(res.isLocked || false);
        setCycle(res.cycle || null);
      } else if (!res.success) {
        toast({ title: "Error", description: res.error || "Failed to load payroll data.", variant: "error" });
        setData([]);
      }
    } catch (err) {
      const error = err as Error;
      toast({ title: "Error", description: error.message || "An error occurred.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    let newM = month - 1;
    let newY = year;
    if (newM < 1) { newM = 12; newY -= 1; }
    setMonth(newM);
    setYear(newY);
    loadData(newM, newY, selectedBranchId);
  };

  const handleNextMonth = () => {
    let newM = month + 1;
    let newY = year;
    if (newM > 12) { newM = 1; newY += 1; }
    setMonth(newM);
    setYear(newY);
    loadData(newM, newY, selectedBranchId);
  };

  const handleBranchChange = (value: string) => {
    setSelectedBranchId(value);
    loadData(month, year, value);
  };

  const confirmLock = async () => {
    if (!selectedBranchId) {
      toast({ title: "Error", description: "Please select a branch first.", variant: "error" });
      return;
    }
    setActionLoading(true);
    try {
      const res = await approveAndLockPayrollAction(month, year, selectedBranchId);
      if (res.success) {
        toast({ title: "Success", description: res.message || "Payroll locked successfully.", variant: "success" });
        setLockModalOpen(false);
        loadData(month, year, selectedBranchId);
      } else {
        toast({ title: "Error", description: res.error || "Failed to lock payroll.", variant: "error" });
      }
    } catch (err) {
      const error = err as Error;
      toast({ title: "Error", description: error.message || "An error occurred.", variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      toast({ title: "Error", description: "No data to export.", variant: "error" });
      return;
    }
    const headers = ["Employee ID", "Name", "Department", "Days Present", "Days Paid Leave", "Days Absent", "Gross Salary", "Total Deductions", "Net Salary"];
    const rows = data.map(emp => [
      emp.employee_id.substring(0,8),
      emp.employee_name,
      emp.department,
      emp.days_present || 0,
      emp.days_paid_leave || 0,
      emp.days_absent || 0,
      emp.gross_salary || 0,
      emp.total_deductions || 0,
      emp.net_salary || 0
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Payroll_${months[month-1]}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Success", description: "CSV Exported successfully.", variant: "success" });
  };

  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjEmployeeId || !adjAmount || isNaN(Number(adjAmount))) {
      toast({ title: "Error", description: "Please enter valid adjustment details.", variant: "error" });
      return;
    }
    setIsSubmittingAdj(true);
    try {
      const res = await addManualLedgerEntryAction(adjEmployeeId, adjType, Number(adjAmount), adjDesc);
      if (res.success) {
        toast({ title: "Success", description: res.message, variant: "success" });
        setIsAdjustmentModalOpen(false);
        setAdjAmount("");
        setAdjDesc("");
        // Reload data to recalculate adjustments
        loadData(month, year, selectedBranchId);
      } else {
        toast({ title: "Error", description: res.error || "Failed to add adjustment", variant: "error" });
      }
    } catch (err) {
      const error = err as Error;
      toast({ title: "Error", description: error.message, variant: "error" });
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  const handleGenerateSlip = async (snapshotId: string) => {
    setActionLoading(true);
    try {
      const res = await generateSalarySlipAction(snapshotId, month, year);
      if (res.success) {
        toast({ title: "Success", description: res.message || "Salary slip generated.", variant: "success" });
        loadData(month, year, selectedBranchId);
      } else {
        toast({ title: "Error", description: res.error || "Failed to generate slip.", variant: "error" });
      }
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewSlip = async (snapshotId: string) => {
    setActionLoading(true);
    try {
      const res = await generateSignedSalarySlipUrlAction(snapshotId);
      if (res.success && res.signedUrl) {
        window.open(res.signedUrl, '_blank');
      } else {
        toast({ title: "Error", description: res.error || "Failed to view slip.", variant: "error" });
      }
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadSlip = async (employeeId: string) => {
    setActionLoading(true);
    try {
      const res = await downloadSalarySlipBase64Action(employeeId, month, year);
      if (res.success && res.base64) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${res.base64}`;
        link.download = res.filename || `salary-slip-${employeeId}-${month}-${year}.pdf`;
        link.click();
      } else {
        toast({ title: "Error", description: res.error || "Failed to download slip.", variant: "error" });
      }
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Payroll Processing"
          subtitle="Manage attendance, adjustments, and calculate net payable salary."
          icon={Layers}
          className="flex-1 w-auto"
        />
        
        <div className="flex items-center gap-3">
          {isSA && (
            <div className="w-48">
              <Dropdown
                options={branches.map(b => ({ label: b.name, value: b.id }))}
                value={selectedBranchId}
                onChange={handleBranchChange}
                placeholder="Select Branch"
              />
            </div>
          )}
          
          <div className="flex items-center bg-white rounded-xl border shadow-sm p-1 border-gray-200">
            <Button variant="ghost" size="sm" onClick={handlePrevMonth} disabled={loading || actionLoading} className="h-8 w-8 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-4 font-medium text-sm w-32 text-center text-gray-700">
              {months[month - 1]} {year}
            </div>
            <Button variant="ghost" size="sm" onClick={handleNextMonth} disabled={loading || actionLoading} className="h-8 w-8 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {!selectedBranchId && isSA ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed bg-gray-50/50">
          <Layers className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Branch Selected</h3>
          <p className="text-sm text-gray-500 max-w-sm mt-1">
            Please select a branch from the dropdown above to view or calculate its payroll data.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6 border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl bg-white/60 backdrop-blur-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Status</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">
                    {isLocked ? "Locked" : "Draft"}
                  </h3>
                </div>
                <div className={`p-3 rounded-2xl ${isLocked ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                  {isLocked ? <Lock className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                </div>
              </div>
            </Card>

            <Card className="p-6 border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl bg-white/60 backdrop-blur-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Employees</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">{totalEmployees}</h3>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl bg-white/60 backdrop-blur-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Gross Payroll</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">₹{grossPayroll.toLocaleString()}</h3>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl bg-white/60 backdrop-blur-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Net Payable</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">₹{netPayroll.toLocaleString()}</h3>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 font-medium">Payroll Cycle ID:</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-700">{cycle?.id || "draft-cycle"}</span>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={loading || data.length === 0} className="rounded-xl font-bold h-[40px]">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              {!isLocked && (
                <Button size="sm" onClick={() => setLockModalOpen(true)} disabled={loading || data.length === 0 || actionLoading} className="bg-orange-600 hover:bg-orange-700 rounded-xl font-bold text-white shadow-md shadow-orange-500/20 h-[40px]">
                  {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                  Review & Lock
                </Button>
              )}
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
            <div className="flex border-b border-gray-100">
              <button 
                className={`flex-1 py-4 px-6 text-sm font-bold transition-colors ${activeTab === 'attendance' ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50/30' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}
                onClick={() => setActiveTab('attendance')}
              >
                Attendance Summary
              </button>
              <button 
                className={`flex-1 py-4 px-6 text-sm font-bold transition-colors ${activeTab === 'adjustments' ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50/30' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}
                onClick={() => setActiveTab('adjustments')}
              >
                Payroll Adjustments
              </button>
              <button 
                className={`flex-1 py-4 px-6 text-sm font-bold transition-colors ${activeTab === 'history' ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50/30' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}
                onClick={() => setActiveTab('history')}
              >
                Payroll History
              </button>
            </div>

            <div className="p-0">
              {activeTab === 'attendance' && (
                <div className="overflow-x-auto min-h-[400px] bg-white rounded-b-3xl">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                      <p className="text-sm font-medium text-slate-500">Loading attendance data...</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Employee</th>
                          <th className="px-6 py-4">Department</th>
                          <th className="px-6 py-4 text-right">Base Salary</th>
                          <th className="px-6 py-4 text-center">Present</th>
                          <th className="px-6 py-4 text-center">Leaves</th>
                          <th className="px-6 py-4 text-center">Absent</th>
                          <th className="px-6 py-4 text-right">Net Payable</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-16 text-slate-500 font-medium">
                              No employees found for this branch/period.
                            </td>
                          </tr>
                        ) : (
                          data.map((emp) => (
                            <tr key={emp.employee_id} className="hover:bg-orange-50/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-900">{emp.employee_name}</div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">{emp.employee_id.substring(0,8)}</div>
                              </td>
                              <td className="px-6 py-4 text-slate-600 font-medium">{emp.department || 'N/A'}</td>
                              <td className="px-6 py-4 text-right font-bold text-slate-700">₹{(emp.base_salary || 0).toLocaleString()}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  {emp.days_present || 0} / 26
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100" title="Paid Leaves">
                                    {emp.days_paid_leave || 0}P
                                  </span>
                                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100" title="Unpaid Leaves">
                                    {emp.days_unpaid_leave || 0}U
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${(emp.days_absent || 0) > 0 ? "bg-red-50 text-red-700 border-red-100" : "bg-slate-50 text-slate-600 border-slate-100"}`}>
                                  {emp.days_absent || 0}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-black text-slate-900 text-base">
                                ₹{(emp.net_payable || 0).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Button variant="outline" size="sm" onClick={() => { setSelectedEmployee(emp); setEmployeeDetailsOpen(true); }} className="rounded-xl text-xs font-bold">
                                  Details
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'adjustments' && (
                <div className="overflow-x-auto min-h-[400px] bg-white rounded-b-3xl">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                      <p className="text-sm font-medium text-slate-500">Loading adjustments data...</p>
                    </div>
                  ) : (
                    <>
                      {!isLocked && data.length > 0 && (
                        <div className="flex justify-end p-4 border-b border-slate-100">
                          <Button 
                            onClick={() => setIsAdjustmentModalOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-500/20"
                          >
                            + Add Adjustment
                          </Button>
                        </div>
                      )}
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Employee</th>
                          <th className="px-6 py-4 text-right">Gross Salary</th>
                          <th className="px-6 py-4 text-right text-emerald-600">Bonus</th>
                          <th className="px-6 py-4 text-right text-red-600">Deductions</th>
                          <th className="px-6 py-4 text-right">Net Salary</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-16 text-slate-500 font-medium">
                              No adjustments data for this branch/period.
                            </td>
                          </tr>
                        ) : (
                          data.map((emp) => (
                            <tr key={emp.employee_id} className="hover:bg-orange-50/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-900">{emp.employee_name}</div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">{emp.employee_id.substring(0,8)}</div>
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-slate-700">₹{(emp.gross_salary || 0).toLocaleString()}</td>
                              <td className="px-6 py-4 text-right text-emerald-600 font-black">+₹{(emp.bonus || 0).toLocaleString()}</td>
                              <td className="px-6 py-4 text-right text-red-600 font-black">-₹{(emp.total_deductions || 0).toLocaleString()}</td>
                              <td className="px-6 py-4 text-right font-black text-slate-900 text-base">₹{(emp.net_salary || 0).toLocaleString()}</td>
                              <td className="px-6 py-4 text-right">
                                <Button variant="outline" size="sm" onClick={() => { setSelectedEmployee(emp); setEmployeeDetailsOpen(true); }} className="rounded-xl text-xs font-bold">
                                  Breakdown
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </>
                  )}
                </div>
              )}
              
              {activeTab === 'history' && (
                <div className="p-8 bg-white min-h-[400px] rounded-b-3xl">
                  {cycle ? (
                    <div className="space-y-6 max-w-2xl">
                      <h3 className="text-xl font-bold text-slate-900">Cycle Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</p>
                          <p className="font-black text-lg mt-1 text-slate-900 capitalize">{cycle.status}</p>
                        </div>
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Locked At</p>
                          <p className="font-bold mt-1 text-slate-700">{cycle.locked_at ? new Date(cycle.locked_at).toLocaleString() : 'N/A'}</p>
                        </div>
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Created At</p>
                          <p className="font-bold mt-1 text-slate-700">{cycle.created_at ? new Date(cycle.created_at).toLocaleString() : 'N/A'}</p>
                        </div>
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payroll Cycle ID</p>
                          <p className="font-mono text-sm font-bold mt-1 text-slate-700 break-all">{cycle.id}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <Clock className="w-10 h-10 text-slate-400" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">No History</h3>
                      <p className="text-slate-500 max-w-sm">
                        No historical cycle data recorded for this month/year yet.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Custom Lock Modal */}
      {lockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">Lock Payroll</h2>
              <button onClick={() => setLockModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-6 text-slate-600 text-sm leading-relaxed">
              Are you sure you want to lock the payroll for <span className="font-bold text-slate-900">{months[month - 1]} {year}</span>?
              This action will finalize calculations and prevent further draft changes.
            </div>
            <div className="px-6 py-5 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setLockModalOpen(false)} className="rounded-xl font-bold border-slate-200 hover:bg-slate-100">
                Cancel
              </Button>
              <Button onClick={confirmLock} disabled={actionLoading} className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-md shadow-orange-500/20">
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Lock
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">Add Payroll Adjustment</h2>
              <button onClick={() => setIsAdjustmentModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-white rounded-full p-1.5 shadow-sm border border-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddAdjustment} className="px-6 py-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Employee</label>
                <Select
                  value={adjEmployeeId}
                  onValueChange={setAdjEmployeeId}
                  placeholder="Select Employee"
                >
                  {data.map(emp => (
                    <SelectItem key={emp.employee_id} value={emp.employee_id}>
                      {emp.employee_name}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Adjustment Type</label>
                <Select
                  value={adjType}
                  onValueChange={setAdjType}
                >
                  <SelectItem value="Bonus">Bonus</SelectItem>
                  <SelectItem value="Damage Recovery">Damage Recovery</SelectItem>
                  <SelectItem value="Salary Advance">Salary Advance Deduction</SelectItem>
                  <SelectItem value="Other Deduction">Other Deduction</SelectItem>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Amount (₹)</label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  placeholder="e.g. 5000"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Description (Optional)</label>
                <textarea 
                  className="w-full rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                  value={adjDesc}
                  onChange={(e) => setAdjDesc(e.target.value)}
                  placeholder="Reason for adjustment..."
                  rows={2}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsAdjustmentModalOpen(false)} className="rounded-xl font-bold border-slate-200 hover:bg-slate-100">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingAdj} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-500/20">
                  {isSubmittingAdj && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Adjustment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Employee Details Modal */}
      {employeeDetailsOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Payroll Details</h2>
                <p className="text-sm font-medium text-slate-500 mt-0.5">{selectedEmployee.employee_name}</p>
              </div>
              <button onClick={() => setEmployeeDetailsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-white rounded-full p-1.5 shadow-sm border border-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-6 overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Earnings</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-slate-500 font-medium text-xs mb-1">Basic Salary</p>
                      <p className="font-bold text-slate-900">₹{(selectedEmployee.basic_salary || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-slate-500 font-medium text-xs mb-1">HRA</p>
                      <p className="font-bold text-slate-900">₹{(selectedEmployee.hra || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-slate-500 font-medium text-xs mb-1">Allowance</p>
                      <p className="font-bold text-slate-900">₹{(selectedEmployee.allowance || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                      <p className="text-emerald-700 font-medium text-xs mb-1">Bonus</p>
                      <p className="font-black text-emerald-700">+₹{(selectedEmployee.bonus || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-between items-center px-4 py-3 bg-slate-100 rounded-2xl">
                    <span className="font-bold text-slate-600 text-sm">Gross Salary</span>
                    <span className="font-black text-slate-900">₹{(selectedEmployee.gross_salary || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Deductions</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-red-50/50 p-3 rounded-2xl border border-red-100/50">
                      <p className="text-red-700 font-medium text-xs mb-1">Total Deductions</p>
                      <p className="font-black text-red-700">-₹{(selectedEmployee.total_deductions || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl flex justify-between items-center shadow-lg shadow-slate-900/20">
                  <div>
                    <span className="font-bold text-slate-400 text-sm uppercase tracking-wider block mb-1">Net Salary</span>
                    <span className="text-3xl font-black text-white">₹{(selectedEmployee.net_salary || 0).toLocaleString()}</span>
                  </div>
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                    <DollarSign className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-3 justify-between items-center">
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setAdjEmployeeId(selectedEmployee.employee_id);
                    setIsAdjustmentModalOpen(true);
                  }}
                  disabled={isLocked}
                  className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 hover:text-indigo-800 rounded-xl font-bold"
                  size="sm"
                >
                  + Add Adjustment
                </Button>
                
                {isLocked && (
                  <>
                    <Button 
                      onClick={() => handleGenerateSlip(selectedEmployee.id)}
                      disabled={actionLoading}
                      variant="outline"
                      className="rounded-xl font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      size="sm"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                      Generate Slip
                    </Button>
                    
                    {selectedEmployee.slip_status === 'generated' || selectedEmployee.slip_status === 'sent' ? (
                      <>
                        <Button 
                          onClick={() => handleViewSlip(selectedEmployee.id)}
                          disabled={actionLoading}
                          variant="outline"
                          className="rounded-xl font-bold"
                          size="sm"
                        >
                          View
                        </Button>
                        <Button 
                          onClick={() => handleDownloadSlip(selectedEmployee.employee_id)}
                          disabled={actionLoading}
                          variant="outline"
                          className="rounded-xl font-bold"
                          size="sm"
                        >
                          Download
                        </Button>
                      </>
                    ) : null}
                    
                    <span className={`text-xs font-bold px-2 py-1 rounded-md self-center ${
                      selectedEmployee.slip_status === 'generated' || selectedEmployee.slip_status === 'sent' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {selectedEmployee.slip_status === 'generated' || selectedEmployee.slip_status === 'sent' ? 'Generated' : 'Not Generated'}
                    </span>
                  </>
                )}
              </div>
              
              <Button variant="outline" onClick={() => setEmployeeDetailsOpen(false)} className="rounded-xl font-bold bg-white ml-auto">Close Details</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
