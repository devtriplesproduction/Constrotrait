"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Search,
  Calendar,
  Banknote,
  SlidersHorizontal,
  Plus,
  X,
  Package,
  Building2,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/Dropdown";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/use-pagination";
import { approveExpenseAction } from "@/actions/accounting.actions";
import { useToast } from "@/hooks/use-toast";

interface ExpenseLedgerTableProps {
  expenses: any[];
  onRecordExpense?: () => void;
  onRefresh?: () => void;
  canApprove?: boolean;
  hideSummaryCards?: boolean;
  fromDate?: string;
  toDate?: string;
  selectedPeriod?: string;
  onDateRangeChange?: (fromDate: string, toDate: string, period: string) => void;
}

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export function ExpenseLedgerTable({
  expenses = [],
  onRecordExpense,
  onRefresh,
  canApprove = true,
  hideSummaryCards = false,
  fromDate,
  toDate,
  selectedPeriod,
  onDateRangeChange,
}: ExpenseLedgerTableProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | "inward" | "inhouse" | "company">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");

  const [internalFromDate, setInternalFromDate] = useState("");
  const [internalToDate, setInternalToDate] = useState("");
  const [internalPeriod, setInternalPeriod] = useState("all");

  const effectiveFromDate = fromDate !== undefined ? fromDate : internalFromDate;
  const effectiveToDate = toDate !== undefined ? toDate : internalToDate;
  const effectivePeriod = selectedPeriod !== undefined ? selectedPeriod : internalPeriod;

  const handleDateChange = (s: string, e: string, p: string) => {
    setInternalFromDate(s);
    setInternalToDate(e);
    setInternalPeriod(p);
    onDateRangeChange?.(s, e, p);
  };

  const handleSetPreset = (preset: "this_month" | "last_month" | "this_quarter" | "this_fy" | "all") => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (preset === "this_month") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (preset === "last_month") {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (preset === "this_quarter") {
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), qMonth, 1);
      end = new Date(today.getFullYear(), qMonth + 3, 0);
    } else if (preset === "this_fy") {
      const fyStartYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      start = new Date(fyStartYear, 3, 1);
      end = new Date(fyStartYear + 1, 2, 31);
    } else if (preset === "all") {
      handleDateChange("", "", "all");
      return;
    }

    const fmtLocal = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    handleDateChange(fmtLocal(start), fmtLocal(end), preset);
  };

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      const name = e.expense_categories?.name || e.category_name;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [expenses]);

  // Scope Counts
  const countsByScope = useMemo(() => {
    let inward = 0;
    let inhouse = 0;
    let company = 0;

    expenses.forEach((e) => {
      const isUnderInward = !!(e.inward_id || e.job_entries);
      const type = e.expense_type || (isUnderInward ? "inward" : "company");
      if (type === "inward") inward++;
      else if (type === "inhouse") inhouse++;
      else company++;
    });

    return {
      all: expenses.length,
      inward,
      inhouse,
      company,
    };
  }, [expenses]);

  // Filtered expenses
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const isUnderInward = !!(e.inward_id || e.job_entries);
      const expenseType = e.expense_type || (isUnderInward ? "inward" : "company");

      // Scope filter
      if (scopeFilter === "inward" && expenseType !== "inward") return false;
      if (scopeFilter === "inhouse" && expenseType !== "inhouse") return false;
      if (scopeFilter === "company" && expenseType !== "company") return false;

      // Category filter
      const cat = e.expense_categories?.name || e.category_name;
      if (categoryFilter !== "all" && cat !== categoryFilter) return false;

      // Approval filter
      const status = e.approval_status || "approved";
      if (approvalFilter !== "all" && status !== approvalFilter) return false;

      // Date range filter
      const date = e.expense_date || (e.created_at ? e.created_at.slice(0, 10) : "");
      if (effectiveFromDate && date && date < effectiveFromDate) return false;
      if (effectiveToDate && date && date > effectiveToDate) return false;

      // Search term
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const descMatch = (e.description || "").toLowerCase().includes(q);
      const vendorMatch = (e.vendor_name || "").toLowerCase().includes(q);
      const billMatch = (e.bill_number || e.voucher_no || "").toLowerCase().includes(q);
      const uidMatch = (
        e.job_entries?.uid_label ||
        String(e.job_entries?.uid || "") ||
        e.inward_uid ||
        ""
      )
        .toLowerCase()
        .includes(q);
      const clientMatch = (
        e.job_entries?.clients?.name ||
        e.client_name ||
        ""
      ).toLowerCase().includes(q);
      const testMatch = (
        e.test_name ||
        e.job_entry_tests?.test_master?.specific_test ||
        e.job_entry_tests?.material_description ||
        ""
      )
        .toLowerCase()
        .includes(q);

      return descMatch || vendorMatch || billMatch || uidMatch || clientMatch || testMatch;
    });
  }, [expenses, scopeFilter, categoryFilter, approvalFilter, effectiveFromDate, effectiveToDate, searchTerm]);

  const pagination = usePagination({
    data: filtered,
    initialPageSize: 10,
  });

  // Summary Metrics
  const summary = useMemo(() => {
    let total = 0;
    let inwardTotal = 0;
    let inhouseTotal = 0;
    let companyTotal = 0;
    let pendingCount = 0;
    let pendingAmount = 0;

    filtered.forEach((e) => {
      const amt = Number(e.amount || 0);
      const isUnderInward = !!(e.inward_id || e.job_entries);
      const type = e.expense_type || (isUnderInward ? "inward" : "company");
      const status = e.approval_status || "approved";

      if (status === "approved") {
        total += amt;
        if (type === "inward") inwardTotal += amt;
        else if (type === "inhouse") inhouseTotal += amt;
        else companyTotal += amt;
      } else if (status === "pending") {
        pendingCount += 1;
        pendingAmount += amt;
      }
    });

    return { total, inwardTotal, inhouseTotal, companyTotal, pendingCount, pendingAmount };
  }, [filtered]);

  // Handle Approve / Reject
  const handleApproval = async (id: string, approve: boolean) => {
    try {
      const res = await approveExpenseAction(id, approve);
      if (res.success) {
        toast({
          title: approve ? "Expense Approved" : "Expense Rejected",
          description: `The expense has been marked as ${approve ? "approved" : "rejected"}.`,
        });
        onRefresh?.();
      } else {
        toast({
          title: "Action Failed",
          description: res.error || "Could not update status.",
          variant: "error",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred.",
        variant: "error",
      });
    }
  };

  return (
    <div className="animate-in fade-in duration-500 mt-2 space-y-6">
      {/* ================= Filter Card (Following Job Assignments Filter UI) ================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <SlidersHorizontal className="w-5 h-5 text-orange-500" />
            <span>Filter Expenses</span>
          </div>
          {onRecordExpense && (
            <Button
              onClick={onRecordExpense}
              className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Record Expense
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          {/* SEARCH */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Search</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search Vendor, Description, Bill No, UID, Client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-8 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors shadow-sm bg-white"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* STATUS */}
          <div className="w-full sm:w-48">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
            <Dropdown
              value={approvalFilter}
              onChange={setApprovalFilter}
              placeholder="All Statuses"
              buttonClassName="bg-white border-slate-200 shadow-sm rounded-xl h-10"
              options={[
                { value: "all", label: "All Statuses" },
                { value: "approved", label: "Approved" },
                { value: "pending", label: "Pending" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
          </div>

          {/* SCOPE / TYPE */}
          <div className="w-full sm:w-44">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Scope / Type</label>
            <Dropdown
              value={scopeFilter}
              onChange={(val) => setScopeFilter(val as any)}
              placeholder="All Types"
              buttonClassName="bg-white border-slate-200 shadow-sm rounded-xl h-10"
              options={[
                { value: "all", label: `All Types (${countsByScope.all})` },
                { value: "inward", label: `Inward (${countsByScope.inward})` },
                { value: "inhouse", label: `In-House Lab (${countsByScope.inhouse})` },
                { value: "company", label: `Company (${countsByScope.company})` },
              ]}
            />
          </div>

          {/* CATEGORY */}
          <div className="w-full sm:w-44">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
            <Dropdown
              value={categoryFilter}
              onChange={setCategoryFilter}
              placeholder="All Categories"
              buttonClassName="bg-white border-slate-200 shadow-sm rounded-xl h-10"
              options={[
                { value: "all", label: "All Categories" },
                ...categories.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>

          {/* DATE RANGE */}
          <div className="w-full sm:w-44">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date Range</label>
            <Dropdown
              value={effectivePeriod}
              onChange={(val) => {
                if (val === "custom") {
                  handleDateChange(effectiveFromDate, effectiveToDate, "custom");
                } else {
                  handleSetPreset(val as any);
                }
              }}
              placeholder="All Time"
              buttonClassName="bg-white border-slate-200 shadow-sm rounded-xl h-10"
              options={[
                { value: "all", label: "All Time" },
                { value: "this_month", label: "This Month" },
                { value: "last_month", label: "Last Month" },
                { value: "this_quarter", label: "This Quarter" },
                { value: "this_fy", label: "FY" },
                { value: "custom", label: "Custom Dates..." },
              ]}
            />
          </div>
        </div>

        {/* Custom date range inputs */}
        {effectivePeriod === "custom" && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
              <span>From:</span>
              <input
                type="date"
                value={effectiveFromDate}
                onChange={(e) => handleDateChange(e.target.value, effectiveToDate, "custom")}
                className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-orange-500 shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
              <span>To:</span>
              <input
                type="date"
                value={effectiveToDate}
                onChange={(e) => handleDateChange(effectiveFromDate, e.target.value, "custom")}
                className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-orange-500 shadow-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* ================= Table (Following Job Assignments Table UI) ================= */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-sm bg-white mb-6">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/80 text-[11px] uppercase tracking-widest text-slate-400 font-bold border-b border-slate-200/80">
            <tr>
              <th className="px-6 py-4 rounded-tl-2xl">Voucher / Bill (UID)</th>
              <th className="px-6 py-4">Particulars & Scope</th>
              <th className="px-6 py-4">Expense Date</th>
              <th className="px-6 py-4">Payee / Handler</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Debit Amount</th>
              {canApprove && <th className="px-6 py-4 rounded-tr-2xl text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canApprove ? 7 : 6} className="py-14 text-center text-slate-400 font-medium">
                  <div className="flex flex-col items-center justify-center gap-3 py-4">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shadow-sm">
                      <Banknote className="w-7 h-7" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-bold text-sm sm:text-base text-slate-800">No expense records found</p>
                      <p className="text-xs text-slate-500 max-w-sm">No expense ledger entries match the selected filters or date range.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              pagination.paginatedData.map((e) => {
                const isUnderInward = !!(e.inward_id || e.job_entries);
                const type = e.expense_type || (isUnderInward ? "inward" : "company");
                const inward = e.job_entries;
                const uid = inward?.uid_label || (inward?.uid ? `UID-${inward.uid}` : e.inward_uid || null);
                const client = inward?.clients?.name || e.client_name || null;
                const cat = e.expense_categories?.name || e.category_name || "General";
                const acc = e.financial_accounts?.name || e.account_name || "Direct / Cash";
                const status = (e.approval_status || "approved").toLowerCase();

                const payeeName = e.vendor_name || e.paid_through_person || "Vendor / Payee";
                const payeeInitial = (payeeName.trim().charAt(0) || "P").toUpperCase();

                let expenseDateStr = "—";
                const dRaw = e.expense_date || e.created_at;
                if (dRaw) {
                  try {
                    expenseDateStr = format(new Date(dRaw), "dd MMM, yyyy");
                  } catch {
                    expenseDateStr = String(dRaw).slice(0, 10);
                  }
                }

                return (
                  <tr
                    key={e.id}
                    className="hover:bg-orange-50/30 transition-colors group cursor-pointer"
                  >
                    {/* 1. Voucher / Bill (UID) - MATCHING JOB CARD (UID) */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                          <Banknote className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <div className="font-bold text-slate-800 text-[13px] flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono">{e.bill_number || e.voucher_no || `EXP-${e.id.slice(0, 6).toUpperCase()}`}</span>
                            {type === "inward" ? (
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                                Inward
                              </span>
                            ) : type === "inhouse" ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                In-House Lab
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                                Company
                              </span>
                            )}
                            {e.bill_attached && (
                              <span title="Bill Attached" className="text-blue-600 text-xs">📎</span>
                            )}
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-semibold">
                            {acc} · <span className="uppercase">{e.payment_mode || "CASH"}</span>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Particulars & Scope - MATCHING MATERIAL */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 truncate max-w-[220px]" title={e.description || cat}>
                          {e.description || cat}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium truncate max-w-[220px]">
                          <span>{cat}</span>
                          {uid && <span>• {uid}</span>}
                          {client && <span className="truncate">• {client}</span>}
                        </div>
                      </div>
                    </td>

                    {/* 3. Expense Date - MATCHING RECEIVED DATE */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-[13px]">{expenseDateStr}</span>
                      </div>
                    </td>

                    {/* 4. Payee / Handler - MATCHING ASSIGNED TO */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm bg-blue-100 text-blue-700">
                          {payeeInitial}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 text-[13px] truncate max-w-[180px]" title={payeeName}>
                            {payeeName}
                          </span>
                          {e.is_reimbursement && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 font-bold uppercase tracking-wider border border-amber-200 w-fit">
                              Reimbursement
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 5. Status - MATCHING STATUS */}
                    <td className="px-6 py-4">
                      {status === "approved" ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          Approved
                        </Badge>
                      ) : status === "pending" ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          Pending
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Rejected
                        </Badge>
                      )}
                    </td>

                    {/* 6. Debit Amount */}
                    <td className="px-6 py-4 text-right">
                      <div className="font-mono font-bold text-rose-700 text-[14px] tracking-tight tabular-nums">
                        {fmt(e.amount)}
                      </div>
                    </td>

                    {/* 7. Actions */}
                    {canApprove && (
                      <td className="px-6 py-4 text-right">
                        {status === "pending" ? (
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproval(e.id, true)}
                              className="text-emerald-700 hover:text-white border-emerald-200 hover:bg-emerald-600 hover:border-emerald-600 shadow-sm rounded-xl h-8 px-3 text-xs font-bold transition-all cursor-pointer"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproval(e.id, false)}
                              className="text-rose-700 hover:text-white border-rose-200 hover:bg-rose-600 hover:border-rose-600 shadow-sm rounded-xl h-8 px-3 text-xs font-bold transition-all cursor-pointer"
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Settled</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
        itemLabel="expenses"
      />
    </div>
  );
}
