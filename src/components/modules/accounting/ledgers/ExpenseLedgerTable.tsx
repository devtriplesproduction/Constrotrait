"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  Building2,
  Calendar,
  Layers,
  ArrowDownRight,
  TrendingDown,
  ChevronDown,
  User,
  CreditCard,
  FileText,
  AlertCircle,
  FlaskConical,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { approveExpenseAction } from "@/actions/accounting.actions";
import { useToast } from "@/hooks/use-toast";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/use-pagination";

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
  const [isDateOpen, setIsDateOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const effectiveFromDate = fromDate !== undefined ? fromDate : internalFromDate;
  const effectiveToDate = toDate !== undefined ? toDate : internalToDate;
  const effectivePeriod = selectedPeriod !== undefined ? selectedPeriod : internalPeriod;

  const handleDateChange = (s: string, e: string, p: string) => {
    setInternalFromDate(s);
    setInternalToDate(e);
    setInternalPeriod(p);
    onDateRangeChange?.(s, e, p);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDateOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const periodDisplayLabel = useMemo(() => {
    if (effectivePeriod === "this_month") return "This Month";
    if (effectivePeriod === "last_month") return "Last Month";
    if (effectivePeriod === "this_quarter") return "This Quarter";
    if (effectivePeriod === "this_fy") return "Financial Year";
    if (effectivePeriod === "all") return "All Dates";
    if (effectiveFromDate && effectiveToDate) return `${effectiveFromDate} to ${effectiveToDate}`;
    if (effectiveFromDate) return `From ${effectiveFromDate}`;
    if (effectiveToDate) return `Up to ${effectiveToDate}`;
    return "All Dates";
  }, [effectivePeriod, effectiveFromDate, effectiveToDate]);

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
      )
        .toLowerCase()
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
    <div className="space-y-6">
      {/* KPI Cards */}
      {!hideSummaryCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Outflows
              </span>
              <div className="p-1.5 rounded-xl bg-rose-50 text-rose-600">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-900 mt-2">{fmt(summary.total)}</div>
            <span className="text-[10px] text-slate-500">All cleared debit transactions</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                Inward Direct
              </span>
              <div className="p-1.5 rounded-xl bg-blue-100 text-blue-700">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-blue-900 mt-2">{fmt(summary.inwardTotal)}</div>
            <span className="text-[10px] text-blue-600 font-medium">Job testing & field costs</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                In-House Lab
              </span>
              <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700">
                <FlaskConical className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-emerald-900 mt-2">{fmt(summary.inhouseTotal)}</div>
            <span className="text-[10px] text-emerald-600 font-medium">Calibration, chemicals & PT/ILC</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-purple-200 bg-purple-50/20 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                Company Overheads
              </span>
              <div className="p-1.5 rounded-xl bg-purple-100 text-purple-700">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-purple-900 mt-2">{fmt(summary.companyTotal)}</div>
            <span className="text-[10px] text-purple-600 font-medium">Rent, salaries & admin</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                Pending
              </span>
              <div className="p-1.5 rounded-xl bg-amber-100 text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-amber-900 mt-2">{fmt(summary.pendingAmount)}</div>
            <span className="text-[10px] text-amber-700 font-bold">
              {summary.pendingCount} transaction{summary.pendingCount === 1 ? "" : "s"} waiting
            </span>
          </div>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">Expense Ledger</span>
            <span className="text-[11px] text-slate-400 font-mono">
              ({filtered.length} of {expenses.length} records)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Date Range Selector Popover */}
            <div className="relative" ref={datePickerRef}>
              <button
                type="button"
                onClick={() => setIsDateOpen(!isDateOpen)}
                className="h-9 px-3.5 bg-white hover:bg-slate-50 rounded-xl border border-slate-200/90 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-2xs hover:border-orange-300 transition-colors cursor-pointer group"
              >
                <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0 group-hover:text-orange-600" />
                <span className="truncate max-w-[180px]">{periodDisplayLabel}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isDateOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isDateOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-3.5 space-y-3 animate-in fade-in-0 zoom-in-95 duration-150">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Quick Presets
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: "all", label: "All Time" },
                        { id: "this_month", label: "This Month" },
                        { id: "last_month", label: "Last Month" },
                        { id: "this_quarter", label: "This Quarter" },
                        { id: "this_fy", label: "This FY" },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            handleSetPreset(p.id as any);
                            setIsDateOpen(false);
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                            effectivePeriod === p.id
                              ? "bg-orange-50 text-orange-700 border border-orange-200 font-bold"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Custom Date Range
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                          From:
                        </label>
                        <input
                          type="date"
                          value={effectiveFromDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleDateChange(val, effectiveToDate, "custom");
                          }}
                          className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                          To:
                        </label>
                        <input
                          type="date"
                          value={effectiveToDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleDateChange(effectiveFromDate, val, "custom");
                          }}
                          className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                    {(effectiveFromDate || effectiveToDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          handleSetPreset("all");
                          setIsDateOpen(false);
                        }}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer block mt-1"
                      >
                        Clear date filter
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2.5 border-t border-slate-100">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              placeholder="Search by vendor, description, bill no, UID, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8.5 text-xs bg-slate-50/50"
            />
          </div>

          <div>
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as any)}
              className="w-full h-8.5 px-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium outline-none cursor-pointer"
            >
              <option value="all">All Expenses ({countsByScope.all})</option>
              <option value="inward">Inward Expenses ({countsByScope.inward})</option>
              <option value="inhouse">In-House Lab ({countsByScope.inhouse})</option>
              <option value="company">Company Expenses ({countsByScope.company})</option>
            </select>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-8.5 px-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className="w-full h-8.5 px-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved Only</option>
              <option value="pending">Pending Approval</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5">Voucher / Bill</th>
                <th className="py-3 px-3.5">Scope & Ref</th>
                <th className="py-3 px-3.5">Category</th>
                <th className="py-3 px-3.5">Payee / Handler</th>
                <th className="py-3 px-3.5">Account & Mode</th>
                <th className="py-3 px-3.5">Particulars</th>
                <th className="py-3 px-3.5 text-right">Debit Amount (₹)</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                {canApprove && <th className="py-3 px-3.5 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={canApprove ? 10 : 9}
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    No expense ledger entries match the selected filters.
                  </td>
                </tr>
              ) : (
                pagination.paginatedData.map((e) => {
                  const isUnderInward = !!(e.inward_id || e.job_entries);
                  const type = e.expense_type || (isUnderInward ? "inward" : "company");
                  const inward = e.job_entries;
                  const uid =
                    inward?.uid_label || (inward?.uid ? `UID-${inward.uid}` : e.inward_uid || null);
                  const client = inward?.clients?.name || e.client_name || null;
                  const cat = e.expense_categories?.name || e.category_name || "General";
                  const acc = e.financial_accounts?.name || e.account_name || "Direct / Cash";
                  const status = e.approval_status || "approved";

                  return (
                    <tr
                      key={e.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-900">
                        {e.expense_date || (e.created_at ? e.created_at.slice(0, 10) : "N/A")}
                      </td>

                      {/* Voucher / Bill */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {e.bill_number || e.voucher_no || `EXP-${e.id.slice(0, 6).toUpperCase()}`}
                        {e.bill_attached && (
                          <span
                            title="Bill Attached"
                            className="ml-1.5 inline-block text-blue-600 font-sans"
                          >
                            📎
                          </span>
                        )}
                      </td>

                      {/* Scope & Ref */}
                      <td className="py-3 px-3.5">
                        {type === "inward" ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Package className="w-3 h-3 text-blue-600" />
                              <span>{uid || "INWARD"}</span>
                            </span>
                            {(e.test_name || e.job_entry_tests?.test_master?.specific_test || e.job_entry_tests?.material_description) && (
                              <div
                                className="flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50/90 px-1.5 py-0.5 rounded border border-indigo-200/80 max-w-[170px] truncate"
                                title={`Tagged to Test: ${e.test_name || e.job_entry_tests?.test_master?.specific_test || e.job_entry_tests?.material_description}`}
                              >
                                <FlaskConical className="w-2.5 h-2.5 shrink-0 text-indigo-600" />
                                <span className="truncate">
                                  {e.test_name || e.job_entry_tests?.test_master?.specific_test || e.job_entry_tests?.material_description}
                                </span>
                              </div>
                            )}
                            {client && (
                              <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                                {client}
                              </div>
                            )}
                          </div>
                        ) : type === "inhouse" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <FlaskConical className="w-3 h-3 text-emerald-600" />
                            <span>IN-HOUSE LAB</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Building2 className="w-3 h-3 text-purple-600" />
                            <span>COMPANY</span>
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{cat}</span>
                        {e.department && (
                          <div className="text-[10px] text-slate-400">{e.department}</div>
                        )}
                      </td>

                      {/* Payee / Handler */}
                      <td className="py-3 px-3.5">
                        <div className="font-medium text-slate-800">
                          {e.vendor_name || e.paid_through_person || "—"}
                        </div>
                        {e.is_reimbursement && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Reimbursement
                          </span>
                        )}
                      </td>

                      {/* Account & Mode */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="text-slate-800 font-medium">{acc}</div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          {e.payment_mode || "cash"}
                        </span>
                      </td>

                      {/* Particulars */}
                      <td className="py-3 px-3.5 max-w-[200px] truncate text-slate-600">
                        {e.description || e.remarks || "—"}
                      </td>

                      {/* Debit Amount */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-right font-black text-rose-700 text-sm">
                        {fmt(e.amount)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        {status === "approved" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Approved</span>
                          </span>
                        ) : status === "pending" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </td>

                      {/* Approval Actions */}
                      {canApprove && (
                        <td className="py-3 px-3.5 whitespace-nowrap text-right">
                          {status === "pending" && (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproval(e.id, true)}
                                className="h-7 px-2.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproval(e.id, false)}
                                className="h-7 px-2.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50 border-rose-300"
                              >
                                Reject
                              </Button>
                            </div>
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

        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          itemLabel="expenses"
        />

        {onRecordExpense && (
          <div className="p-3.5 sm:p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Need to record a new expenditure or debit voucher?
            </span>
            <Button
              variant="custom"
              size="none"
              onClick={onRecordExpense}
              className="h-9 px-4 text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Record Expense</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
