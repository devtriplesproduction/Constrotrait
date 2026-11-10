"use client";

import React, { useState, useEffect, useRef, useTransition, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  FileSpreadsheet,
  Plus,
  Calendar,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  X,
  Receipt,
  CheckCircle2,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Building,
  Info,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/Dropdown";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/use-pagination";
import { useToast } from "@/hooks/use-toast";
import { getTestWiseProfitabilityReportAction } from "@/actions/accounting.actions";

interface TestBillingExpensesTabProps {
  data: any;
  onOpenCreateProforma?: (inward?: any) => void;
  onOpenRecordExpense: (
    inward?: any,
    options?: { testId?: string; defaultExpenseType?: "inward" | "inhouse" | "company" }
  ) => void;
  onOpenViewInvoice: (invoice: any) => void;
  onRefresh?: () => void;
  onRegisterExportExcel?: (fn: () => void) => void;
}

// Clean Indian Rupee formatting with proper negative sign placement (-₹2,000.00 instead of ₹-2,000.00)
const fmt = (n: number | string | undefined | null) => {
  const val = Number(n || 0);
  const isNeg = val < 0;
  const abs = Math.abs(val).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isNeg ? `-₹${abs}` : `₹${abs}`;
};

type SortField =
  | "testName"
  | "volume"
  | "revenue"
  | "taggedExpense"
  | "totalCost"
  | "grossProfit"
  | "grossMargin";

type QuickFilter = "all" | "profitable" | "loss" | "tagged";

export function TestBillingExpensesTab({
  data,
  onOpenRecordExpense,
  onOpenViewInvoice,
  onRefresh,
  onRegisterExportExcel,
}: TestBillingExpensesTabProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Selected period preset: this_month | last_month | this_quarter | this_fy | all | custom
  const [selectedPeriod, setSelectedPeriod] = useState<string>("this_month");

  // Date filters
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  });
  const [toDate, setToDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  // Report state
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);

  // Filters matching Job Assignments
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [nablFilter, setNablFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("revenue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Detail modal state
  const [selectedTestDetail, setSelectedTestDetail] = useState<any | null>(null);

  const fetchEconomics = useCallback((from?: string, to?: string) => {
    setLoadingReport(true);
    const activeFrom = from !== undefined ? from : fromDate;
    const activeTo = to !== undefined ? to : toDate;
    getTestWiseProfitabilityReportAction(activeFrom, activeTo)
      .then((res) => {
        if (res.success && "data" in res && res.data) {
          setReportData(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingReport(false));
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchEconomics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Silently re-fetch economics when newly recorded expenses update dashboard data
  const prevExpensesCountRef = useRef(data?.expenses?.length ?? 0);
  useEffect(() => {
    const currentCount = data?.expenses?.length ?? 0;
    if (currentCount !== prevExpensesCountRef.current) {
      prevExpensesCountRef.current = currentCount;
      fetchEconomics();
    }
  }, [data?.expenses, fetchEconomics]);

  const setPresetRange = (preset: "this_month" | "last_month" | "this_quarter" | "this_fy" | "all") => {
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
      setFromDate("");
      setToDate("");
      fetchEconomics("", "");
      return;
    }

    const fmtLocal = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const sStr = fmtLocal(start);
    const eStr = fmtLocal(end);
    setFromDate(sStr);
    setToDate(eStr);
    fetchEconomics(sStr, eStr);
  };

  const handlePeriodChange = (val: string) => {
    setSelectedPeriod(val);
    if (val === "custom") return;
    setPresetRange(val as any);
  };

  // Export to Excel
  const handleExportExcel = useCallback(() => {
    if (!reportData || !reportData.testBreakdown || reportData.testBreakdown.length === 0) {
      toast({ title: "No Data", description: "No test records found for export.", variant: "warning" });
      return;
    }
    const wb = XLSX.utils.book_new();

    const rows = [
      ["CONSTROTRAIT - TEST-WISE REALIZED REVENUE (PAID INVOICES) & PROFITABILITY ANALYSIS"],
      [`Period: ${fromDate || "All Time"} to ${toDate || "Present"}`],
      [],
      [
        "Material / Product",
        "Specific Test Parameter",
        "Discipline",
        "Test Volume",
        "Inward Jobs",
        "Clients",
        "Realized Revenue from Paid Invoices (INR)",
        "Paid Invoice References",
        "Direct Cost (INR)",
        "Shared Inward Cost (INR)",
        "In-House Lab Cost (INR)",
        "Total Cost (INR)",
        "Gross Profit (INR)",
        "Gross Margin (%)",
        "Avg Revenue / Test (INR)",
        "Avg Cost / Test (INR)",
      ],
      ...reportData.testBreakdown.map((t: any) => [
        t.materialGroup,
        t.testName,
        t.discipline,
        t.testCount,
        t.inwardCount,
        t.clientCount,
        t.revenue,
        (t.paidInvoices || []).map((p: any) => `${p.invoiceNo} (₹${p.testRevenue})`).join("; ") || "None (Unpaid)",
        t.taggedExpense || 0,
        t.sharedInwardExpense || 0,
        t.inhouseExpense,
        t.totalCost,
        t.grossProfit,
        `${t.grossMargin}%`,
        t.avgRevenuePerTest,
        t.avgCostPerTest,
      ]),
      [],
      [
        "TOTALS",
        "",
        "",
        reportData.summary.totalTests,
        "",
        "",
        reportData.summary.totalRevenue,
        reportData.summary.totalTaggedExpense,
        "",
        "",
        reportData.summary.totalCost,
        reportData.summary.grossProfit,
        `${reportData.summary.overallMargin}%`,
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Test Economics");
    XLSX.writeFile(wb, `Constrotrait_Test_Economics_${fromDate || "all"}_to_${toDate || "present"}.xlsx`);
    toast({ title: "Excel Downloaded", description: "Test economics report exported successfully." });
  }, [reportData, fromDate, toDate, toast]);

  useEffect(() => {
    onRegisterExportExcel?.(handleExportExcel);
  }, [onRegisterExportExcel, handleExportExcel]);

  // Branch options from report data or data prop
  const branchOptions = useMemo(() => {
    if (reportData?.branches && Array.isArray(reportData.branches) && reportData.branches.length > 0) {
      return reportData.branches;
    }
    if (data?.branches && Array.isArray(data.branches) && data.branches.length > 0) {
      return data.branches;
    }
    return [];
  }, [reportData?.branches, data?.branches]);

  // Filtered unit economics tests based on Search, NABL, Status, Branch
  const filteredTests = useMemo(() => {
    const list = reportData?.testBreakdown || [];
    return list.filter((t: any) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (t.testName || "").toLowerCase();
        const mat = (t.materialGroup || "").toLowerCase();
        const disc = (t.discipline || "").toLowerCase();
        const cat = (t.category || "").toLowerCase();
        if (!name.includes(q) && !mat.includes(q) && !disc.includes(q) && !cat.includes(q)) {
          return false;
        }
      }

      // 2. NABL status filter
      if (nablFilter === "nabl" && !t.isNabl) return false;
      if (nablFilter === "non-nabl" && t.isNabl) return false;

      // 3. Branch filter
      if (branchFilter !== "all") {
        if (t.branchId && t.branchId !== branchFilter) return false;
      }

      // 4. Quick filter tabs (Status)
      if (quickFilter === "profitable" && t.grossProfit <= 0) return false;
      if (quickFilter === "loss" && t.grossProfit >= 0) return false;
      if (quickFilter === "tagged" && (!t.taggedExpense || t.taggedExpense <= 0)) return false;

      return true;
    });
  }, [reportData?.testBreakdown, searchQuery, nablFilter, branchFilter, quickFilter]);

  // Sorted list of tests
  const sortedTests = useMemo(() => {
    const list = [...filteredTests];
    list.sort((a: any, b: any) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortField) {
        case "testName":
          valA = (a.testName || "").toLowerCase();
          valB = (b.testName || "").toLowerCase();
          if (valA < valB) return sortDirection === "asc" ? -1 : 1;
          if (valA > valB) return sortDirection === "asc" ? 1 : -1;
          return 0;
        case "volume":
          valA = Number(a.testCount || 0);
          valB = Number(b.testCount || 0);
          break;
        case "revenue":
          valA = Number(a.revenue || 0);
          valB = Number(b.revenue || 0);
          break;
        case "taggedExpense":
          valA = Number(a.taggedExpense || 0);
          valB = Number(b.taggedExpense || 0);
          break;
        case "totalCost":
          valA = Number(a.totalCost || 0);
          valB = Number(b.totalCost || 0);
          break;
        case "grossProfit":
          valA = Number(a.grossProfit || 0);
          valB = Number(b.grossProfit || 0);
          break;
        case "grossMargin":
          valA = Number(a.grossMargin || 0);
          valB = Number(b.grossMargin || 0);
          break;
      }

      return sortDirection === "asc" ? valA - valB : valB - valA;
    });
    return list;
  }, [filteredTests, sortField, sortDirection]);

  // Pagination hook matching Job Assignments
  const pagination = usePagination({
    data: sortedTests,
    initialPageSize: 10,
  });

  // Quick filter counts
  const quickCounts = useMemo(() => {
    const list = reportData?.testBreakdown || [];
    let profitable = 0;
    let loss = 0;
    let tagged = 0;

    list.forEach((t: any) => {
      if (t.grossProfit > 0) profitable++;
      if (t.grossProfit < 0) loss++;
      if (t.taggedExpense > 0) tagged++;
    });

    return {
      all: list.length,
      profitable,
      loss,
      tagged,
    };
  }, [reportData?.testBreakdown]);

  // Aggregate summary totals for currently filtered tests
  const tableSummary = useMemo(() => {
    let totalTests = 0;
    let totalRevenue = 0;
    let totalTaggedExpense = 0;
    let totalCost = 0;
    let grossProfit = 0;

    filteredTests.forEach((t: any) => {
      totalTests += Number(t.testCount || 0);
      totalRevenue += Number(t.revenue || 0);
      totalTaggedExpense += Number(t.taggedExpense || 0);
      totalCost += Number(t.totalCost || 0);
      grossProfit += Number(t.grossProfit || 0);
    });

    const overallMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      totalTests,
      totalRevenue,
      totalTaggedExpense,
      totalCost,
      grossProfit,
      overallMargin,
    };
  }, [filteredTests]);

  // Expenses tagged to tests
  const taggedExpenses = useMemo(() => {
    const exps = data.expenses || [];
    return exps.filter((e: any) => {
      return !!(e.job_entry_test_id || e.job_entry_tests);
    });
  }, [data.expenses]);

  // Handler to record an expense for a specific test
  const handleAddExpenseForTest = (t: any) => {
    const isEnvironmental =
      t.materialGroup?.toLowerCase().includes("env") ||
      t.materialGroup?.toLowerCase().includes("water") ||
      t.materialGroup?.toLowerCase().includes("air") ||
      t.testName?.toLowerCase().includes("water") ||
      t.testName?.toLowerCase().includes("air");
    const testCategory = isEnvironmental ? "Environmental" : "Construction";

    router.push(
      `/accounting/expenses/new?test_id=${t.testId}&type=test&category=${testCategory}&return_url=/accounting/test-financials`
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "testName" ? "asc" : "desc");
    }
  };

  const isFilterActive =
    searchQuery ||
    nablFilter !== "all" ||
    branchFilter !== "all" ||
    selectedPeriod !== "this_month" ||
    quickFilter !== "all";

  return (
    <div className="animate-in fade-in duration-500 mt-2 space-y-6">
      {/* ================= Master KPI Analytics Cards ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Tests Conducted */}
        <div className="p-4.5 bg-gradient-to-br from-white via-slate-50/50 to-orange-50/20 border border-slate-200/90 rounded-2xl shadow-xs hover:shadow-md hover:border-orange-300 transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tests Conducted
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shadow-2xs group-hover:scale-105 transition-transform">
              <FlaskConical className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-[25px] font-black text-slate-900 tracking-tight mt-2 font-mono">
            {Number(reportData?.summary?.totalTests || 0).toLocaleString("en-IN")}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
            <span className="truncate">Active parameters</span>
            <span className="font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full text-[10px]">
              {(reportData?.testBreakdown || []).length} registered
            </span>
          </div>
        </div>

        {/* Card 2: Paid Test Revenue */}
        <div className="p-4.5 bg-gradient-to-br from-emerald-50/30 via-white to-sky-50/20 border border-emerald-200/80 rounded-2xl shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Paid Test Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-[25px] font-black text-emerald-950 tracking-tight mt-2 font-mono">
            {fmt(reportData?.summary?.totalRevenue)}
          </div>
          <div className="flex items-center justify-between text-xs text-emerald-700 mt-2.5 pt-2 border-t border-emerald-100/80">
            <span>Settled invoices</span>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Realized</span>
            </span>
          </div>
        </div>

        {/* Card 3: Direct Costs */}
        <div className="p-4.5 bg-gradient-to-br from-indigo-50/30 via-white to-purple-50/20 border border-indigo-200/80 rounded-2xl shadow-xs hover:shadow-md hover:border-indigo-300 transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
              Direct Costs
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-2xs group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-[25px] font-black text-indigo-950 tracking-tight mt-2 font-mono">
            {fmt(reportData?.summary?.totalTaggedExpense)}
          </div>
          <div className="flex items-center justify-between text-xs text-indigo-700 mt-2.5 pt-2 border-t border-indigo-100/80">
            <span>Test-specific costs</span>
            <span className="text-[10px] font-semibold text-indigo-800 bg-indigo-100/70 px-2 py-0.5 rounded-full">
              {taggedExpenses.length} tagged
            </span>
          </div>
        </div>

        {/* Card 4: Total Testing Costs */}
        <div className="p-4.5 bg-gradient-to-br from-rose-50/30 via-white to-orange-50/20 border border-rose-200/80 rounded-2xl shadow-xs hover:shadow-md hover:border-rose-300 transition-all duration-200 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
              Total Testing Costs
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shadow-2xs group-hover:scale-105 transition-transform">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-[25px] font-black text-rose-950 tracking-tight mt-2 font-mono">
            {fmt(reportData?.summary?.totalCost)}
          </div>
          <div className="flex items-center justify-between text-xs text-rose-700 mt-2.5 pt-2 border-t border-rose-100/80">
            <span>Direct + Overheads</span>
            <span className="text-[10px] font-semibold text-rose-800 bg-rose-100/70 px-2 py-0.5 rounded-full">
              Direct + Lab
            </span>
          </div>
        </div>

        {/* Card 5: Gross Profit & Margin */}
        <div
          className={`p-4.5 rounded-2xl border shadow-xs hover:shadow-md transition-all duration-200 group ${
            (reportData?.summary?.grossProfit || 0) >= 0
              ? "bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/20 border-emerald-200/90 hover:border-emerald-300 text-emerald-950"
              : "bg-gradient-to-br from-rose-50/40 via-white to-orange-50/20 border-rose-200/90 hover:border-rose-300 text-rose-950"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                (reportData?.summary?.grossProfit || 0) >= 0 ? "text-emerald-800" : "text-rose-800"
              }`}
            >
              Gross Profit & Margin
            </span>
            <div
              className={`w-8 h-8 rounded-xl border flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform ${
                (reportData?.summary?.grossProfit || 0) >= 0
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-rose-50 border-rose-200 text-rose-700"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-[25px] font-black tracking-tight mt-2 font-mono">
            {fmt(reportData?.summary?.grossProfit)}
          </div>
          <div
            className={`flex items-center justify-between text-xs mt-2.5 pt-2 border-t ${
              (reportData?.summary?.grossProfit || 0) >= 0
                ? "border-emerald-100 text-emerald-700"
                : "border-rose-100 text-rose-700"
            }`}
          >
            <span>Realized Return</span>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded-full text-[10px] ${
                (reportData?.summary?.grossProfit || 0) >= 0
                  ? "bg-emerald-100/80 text-emerald-800"
                  : "bg-rose-100/80 text-rose-800"
              }`}
            >
              {Number(reportData?.summary?.overallMargin || 0).toFixed(1)}% Margin
            </span>
          </div>
        </div>
      </div>

      {/* ================= Filter Card (Following Job Assignments Filter UI) ================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <SlidersHorizontal className="w-5 h-5 text-orange-500" />
            <span>Filter Assignments</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              onClick={handleExportExcel}
              variant="outline"
              className="text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50 shadow-sm rounded-xl h-9 px-3 text-xs font-semibold flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Excel</span>
            </Button>
            <Button
              onClick={() => onOpenRecordExpense(undefined, { defaultExpenseType: "inward" })}
              className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Record Test Expense</span>
            </Button>
          </div>
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
                placeholder="Search Job Card, Material, Date, Assignee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-8 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors shadow-sm bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
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
              value={quickFilter}
              onChange={(val) => setQuickFilter(val as any)}
              placeholder="All Statuses"
              buttonClassName="bg-white border-slate-200 shadow-sm rounded-xl h-10"
              options={[
                { value: "all", label: "All Statuses" },
                { value: "profitable", label: `Profitable (${quickCounts.profitable})` },
                { value: "loss", label: `Loss-Making (${quickCounts.loss})` },
                { value: "tagged", label: `Direct Costs (${quickCounts.tagged})` },
              ]}
            />
          </div>

          {/* ACCREDITATION */}
          <div className="w-full sm:w-44">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Accreditation</label>
            <Dropdown
              value={nablFilter}
              onChange={(val) => setNablFilter(val as any)}
              placeholder="All Types"
              buttonClassName="bg-white border-slate-200 shadow-sm rounded-xl h-10"
              options={[
                { value: "all", label: "All Types" },
                { value: "nabl", label: "NABL" },
                { value: "non-nabl", label: "Non-NABL" },
              ]}
            />
          </div>

          {/* BRANCH */}
          <div className="w-full sm:w-44">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Branch</label>
            <Dropdown
              value={branchFilter}
              onChange={setBranchFilter}
              placeholder="All Branches"
              buttonClassName="bg-white border-slate-200 shadow-sm rounded-xl h-10"
              options={[
                { value: "all", label: "All Branches" },
                ...branchOptions.map((b: any) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>

          {/* DATE RANGE */}
          <div className="w-full sm:w-44">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date Range</label>
            <Dropdown
              value={selectedPeriod}
              onChange={handlePeriodChange}
              placeholder="All Time"
              buttonClassName="bg-white border-slate-200 shadow-sm rounded-xl h-10"
              options={[
                { value: "this_month", label: "This Month" },
                { value: "last_month", label: "Last Month" },
                { value: "this_quarter", label: "This Quarter" },
                { value: "this_fy", label: "FY" },
                { value: "all", label: "All Time" },
                { value: "custom", label: "Custom Dates..." },
              ]}
            />
          </div>
        </div>

        {/* Custom date range inputs */}
        {selectedPeriod === "custom" && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
              <span>From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-orange-500 shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
              <span>To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-orange-500 shadow-sm"
              />
            </div>
            <Button
              size="sm"
              onClick={() => fetchEconomics(fromDate, toDate)}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-8 px-4 text-xs font-bold shadow-sm"
            >
              Apply
            </Button>
          </div>
        )}
      </div>

      {/* ================= Table (Following Job Assignments Table UI) ================= */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-sm bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/80 text-[11px] uppercase tracking-widest text-slate-400 font-bold border-b border-slate-200/80">
            <tr>
              <th className="px-6 py-4 rounded-tl-2xl">
                <div
                  onClick={() => handleSort("testName")}
                  className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 transition-colors select-none"
                >
                  <span>Job Card (UID) / Test</span>
                  {sortField === "testName" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="w-3.5 h-3.5 text-orange-500" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-orange-500" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                  )}
                </div>
              </th>
              <th className="px-6 py-4">
                <div
                  onClick={() => handleSort("volume")}
                  className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 transition-colors select-none"
                >
                  <span>Material & Volume</span>
                  {sortField === "volume" && (
                    sortDirection === "asc" ? (
                      <ArrowUp className="w-3.5 h-3.5 text-orange-500" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-orange-500" />
                    )
                  )}
                </div>
              </th>
              <th className="px-6 py-4">
                <div
                  onClick={() => handleSort("revenue")}
                  className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 transition-colors select-none"
                >
                  <span>Received Date / Paid Revenue</span>
                  {sortField === "revenue" && (
                    sortDirection === "asc" ? (
                      <ArrowUp className="w-3.5 h-3.5 text-orange-500" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-orange-500" />
                    )
                  )}
                </div>
              </th>
              <th className="px-6 py-4">
                <div
                  onClick={() => handleSort("taggedExpense")}
                  className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 transition-colors select-none"
                >
                  <span>Assigned To / Costs</span>
                  {sortField === "taggedExpense" && (
                    sortDirection === "asc" ? (
                      <ArrowUp className="w-3.5 h-3.5 text-orange-500" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-orange-500" />
                    )
                  )}
                </div>
              </th>
              <th className="px-6 py-4">
                <div
                  onClick={() => handleSort("grossProfit")}
                  className="flex items-center gap-1.5 cursor-pointer hover:text-slate-700 transition-colors select-none"
                >
                  <span>Status / Profit</span>
                  {sortField === "grossProfit" && (
                    sortDirection === "asc" ? (
                      <ArrowUp className="w-3.5 h-3.5 text-orange-500" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-orange-500" />
                    )
                  )}
                </div>
              </th>
              <th className="px-6 py-4 rounded-tr-2xl text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loadingReport && !reportData ? (
              <tr>
                <td colSpan={6} className="p-14 text-center text-slate-500">
                  <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
                  <span className="font-bold text-slate-800 text-sm">Aggregating test unit economics...</span>
                  <p className="text-xs text-slate-400 mt-1">
                    Reconciling settled invoices, direct expense tags, and shared lab overheads
                  </p>
                </td>
              </tr>
            ) : pagination.paginatedData.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-14 text-center text-slate-400 font-medium">
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                      <FlaskConical className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">No test records match your filter criteria</span>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Try resetting the filters, selecting &quot;All Time&quot;, or removing search terms.
                    </p>
                    {isFilterActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSearchQuery("");
                          setNablFilter("all");
                          setBranchFilter("all");
                          setPresetRange("this_month");
                          setSelectedPeriod("this_month");
                          setQuickFilter("all");
                        }}
                        className="mt-2 text-xs font-bold text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100 rounded-xl"
                      >
                        Reset All Filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pagination.paginatedData.map((t: any) => {
                const margin = Number(t.grossMargin || 0);
                const isProfit = t.grossProfit > 0;
                const isLoss = t.grossProfit < 0;

                return (
                  <tr
                    key={t.testId}
                    className="hover:bg-orange-50/30 transition-colors group cursor-pointer"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest("button") || target.closest("input") || target.closest("a")) return;
                      setSelectedTestDetail(t);
                    }}
                  >
                    {/* 1. Job Card (UID) / Test Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                          <FlaskConical className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <div className="font-bold text-slate-800 text-[13px] flex items-center gap-1.5 flex-wrap">
                            <span>{t.testName}</span>
                            {t.isNabl ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                NABL
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                Non-NABL
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {t.materialGroup && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/50 text-[10px] font-bold">
                                {t.materialGroup}
                              </span>
                            )}
                            {t.discipline && (
                              <span className="text-[11px] text-slate-400 font-medium">
                                {t.discipline}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Material & Volume */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 truncate max-w-[200px]" title={t.materialGroup || t.testName}>
                          {t.testCount} {t.testCount === 1 ? "test conducted" : "tests conducted"}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
                          {t.inwardCount} {t.inwardCount === 1 ? "inward job" : "inward jobs"} assigned
                        </span>
                      </div>
                    </td>

                    {/* 3. Received Date / Paid Revenue */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-[13px] font-mono tabular-nums">
                          {fmt(t.revenue)}
                        </span>
                        {t.paidInvoices && t.paidInvoices.length > 0 ? (
                          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{t.paidInvoices.length} paid invoice{t.paidInvoices.length !== 1 ? "s" : ""}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                            Unsettled / Pending
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. Assigned To / Costs */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm bg-indigo-100 text-indigo-700">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800 text-[13px] font-mono tabular-nums">
                              {fmt(t.taggedExpense)}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-bold uppercase tracking-wider border border-indigo-100">
                              Direct
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            Total: <span className="font-mono text-slate-600 font-semibold">{fmt(t.totalCost)}</span>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 5. Status / Profit */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <div
                          className={`font-bold text-[13px] font-mono tabular-nums ${
                            isProfit ? "text-emerald-700" : isLoss ? "text-rose-700" : "text-slate-700"
                          }`}
                        >
                          {fmt(t.grossProfit)}
                        </div>
                        {isProfit ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                            Profitable ({margin.toFixed(0)}%)
                          </Badge>
                        ) : isLoss ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold">
                            Loss ({margin.toFixed(0)}%)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-bold">
                            Break-even
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* 6. Actions */}
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTestDetail(t);
                          }}
                          size="sm"
                          variant="outline"
                          className="text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100 shadow-sm rounded-xl h-8 w-8 p-0 flex items-center justify-center transition-all cursor-pointer"
                          title="View Test Breakdown"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddExpenseForTest(t);
                          }}
                          size="sm"
                          variant="outline"
                          className="text-orange-600 hover:text-white border-orange-200 hover:bg-orange-500 hover:border-orange-500 shadow-sm rounded-xl h-8 px-4 text-xs font-bold transition-all cursor-pointer"
                        >
                          Add Cost
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Table Footer: Summary Totals */}
          {sortedTests.length > 0 && (
            <tfoot className="bg-slate-50/80 border-t border-slate-200/80 text-xs font-bold text-slate-800">
              <tr>
                <td className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs uppercase tracking-wider text-slate-500">
                      Summary Totals
                    </span>
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-full">
                      {sortedTests.length} Parameters
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-mono font-bold text-slate-800 text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
                    {tableSummary.totalTests} tests
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                    {fmt(tableSummary.totalRevenue)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-mono font-bold text-indigo-950 text-sm tabular-nums">
                      {fmt(tableSummary.totalTaggedExpense)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Total Cost: {fmt(tableSummary.totalCost)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div
                    className={`font-mono font-black text-sm tabular-nums ${
                      tableSummary.grossProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {fmt(tableSummary.grossProfit)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {Number(tableSummary.overallMargin || 0).toFixed(1)}% Margin
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-[10px] text-slate-400 font-medium">Auto-aggregated</span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination Component matching Job Assignments */}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
        itemLabel="tests"
      />

      {/* ================= Test Detail Modal ================= */}
      {selectedTestDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col relative overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-sm">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-800">
                      {selectedTestDetail.testName}
                    </h3>
                    {selectedTestDetail.isNabl ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        NABL
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                        Non-NABL
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedTestDetail.materialGroup} • {selectedTestDetail.discipline || "General"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTestDetail(null)}
                className="text-slate-400 hover:text-slate-700 bg-white shadow-sm border border-slate-200 hover:bg-slate-100 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Metric Cards Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Volume</span>
                  <div className="text-lg font-bold text-slate-900 mt-1 font-mono">
                    {selectedTestDetail.testCount} Tests
                  </div>
                  <span className="text-[10px] text-slate-400">{selectedTestDetail.inwardCount} Inward Jobs</span>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Paid Revenue</span>
                  <div className="text-lg font-bold text-emerald-950 mt-1 font-mono">
                    {fmt(selectedTestDetail.revenue)}
                  </div>
                  <span className="text-[10px] text-emerald-700">Realized</span>
                </div>
                <div className="bg-rose-50/50 border border-rose-200/80 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Total Cost</span>
                  <div className="text-lg font-bold text-rose-950 mt-1 font-mono">
                    {fmt(selectedTestDetail.totalCost)}
                  </div>
                  <span className="text-[10px] text-rose-700">Direct + Overheads</span>
                </div>
                <div className="bg-orange-50/50 border border-orange-200/80 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider block">Gross Profit</span>
                  <div className="text-lg font-bold text-orange-950 mt-1 font-mono">
                    {fmt(selectedTestDetail.grossProfit)}
                  </div>
                  <span className="text-[10px] text-orange-700">{Number(selectedTestDetail.grossMargin || 0).toFixed(1)}% Margin</span>
                </div>
              </div>

              {/* Paid Invoices Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Paid Invoices ({selectedTestDetail.paidInvoices?.length || 0})</span>
                  </h4>
                </div>
                {selectedTestDetail.paidInvoices && selectedTestDetail.paidInvoices.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Invoice #</th>
                          <th className="px-3 py-2 text-right">Test Revenue</th>
                          <th className="px-3 py-2 text-center">Status</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedTestDetail.paidInvoices.map((inv: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-semibold text-slate-800">{inv.invoiceNo}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">{fmt(inv.testRevenue)}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                {inv.status || "Paid"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onOpenViewInvoice({ invoice_no: inv.invoiceNo, id: inv.invoiceId })}
                                className="h-6 px-2 text-[10px] font-semibold text-slate-700 rounded-lg cursor-pointer"
                              >
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-xl text-center text-xs text-slate-400">
                    No paid invoices settled for this test parameter in the selected period.
                  </div>
                )}
              </div>

              {/* Direct Expenses Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    <span>Direct Tagged Costs</span>
                  </h4>
                  <span className="font-mono text-xs font-bold text-indigo-900">
                    {fmt(selectedTestDetail.taggedExpense)}
                  </span>
                </div>
                {taggedExpenses.filter((e: any) => e.job_entry_test_id === selectedTestDetail.testId).length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Expense</th>
                          <th className="px-3 py-2">Category</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {taggedExpenses
                          .filter((e: any) => e.job_entry_test_id === selectedTestDetail.testId)
                          .map((exp: any) => (
                            <tr key={exp.id} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-medium text-slate-800">{exp.title || exp.description || "Cost Entry"}</td>
                              <td className="px-3 py-2 text-slate-500">{exp.category || "Test Expense"}</td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">{fmt(exp.amount)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-xl text-center text-xs text-slate-400">
                    No direct costs tagged to this test. Overheads are computed from shared lab costs.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTestDetail(null)}
                className="rounded-xl border-slate-200 text-slate-700 h-9 px-4 text-xs font-semibold cursor-pointer"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handleAddExpenseForTest(selectedTestDetail);
                  setSelectedTestDetail(null);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-9 px-4 text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Record Cost for this Test</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
