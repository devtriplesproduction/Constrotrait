"use client";

import React, { useState, useEffect, useRef, useTransition, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Filter,
  FileSpreadsheet,
  Plus,
  Package,
  Layers,
  Calendar,
  RefreshCw,
  RefreshCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  Receipt,
  CheckCircle2,
  Clock,
  ChevronRight,
  Eye,
  AlertCircle,
  Building,
  Sparkles,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
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

const fmt = (n: number | string | undefined | null) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function TestBillingExpensesTab({
  data,
  onOpenCreateProforma,
  onOpenRecordExpense,
  onOpenViewInvoice,
  onRefresh,
  onRegisterExportExcel,
}: TestBillingExpensesTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

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

  // Filters (matching Image 2)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [nablFilter, setNablFilter] = useState<"all" | "nabl" | "non-nabl">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  // Date picker dropdown popover state
  const [isDateOpen, setIsDateOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setIsDateOpen(false);
      }
    };
    if (isDateOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDateOpen]);

  const periodDisplayLabel = useMemo(() => {
    if (selectedPeriod === "this_month") return "This Month";
    if (selectedPeriod === "last_month") return "Last Month";
    if (selectedPeriod === "this_quarter") return "This Quarter";
    if (selectedPeriod === "this_fy") return "FY";
    if (selectedPeriod === "all") return "All Time";
    if (fromDate && toDate) return `${fromDate} – ${toDate}`;
    return "Select Dates";
  }, [selectedPeriod, fromDate, toDate]);

  // Expanded row IDs for details dropdown
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});

  const toggleRow = (testId: string) => {
    setExpandedRowIds((prev) => ({
      ...prev,
      [testId]: !prev[testId],
    }));
  };

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
        "Tagged Direct Test Cost (INR)",
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

  // Distinct category options extracted from test breakdown
  const categoryOptions = useMemo(() => {
    const list = new Set<string>();
    (reportData?.testBreakdown || []).forEach((t: any) => {
      if (t.category && typeof t.category === "string" && t.category.trim()) {
        list.add(t.category.trim());
      }
      if (t.discipline && typeof t.discipline === "string" && t.discipline.trim()) {
        list.add(t.discipline.trim());
      }
    });
    return Array.from(list).sort();
  }, [reportData?.testBreakdown]);

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

  // Filtered unit economics tests based on Search, NABL, Category, and Branch
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

      // 3. Category filter
      if (categoryFilter !== "all") {
        const catMatch =
          t.category?.toLowerCase() === categoryFilter.toLowerCase() ||
          t.discipline?.toLowerCase() === categoryFilter.toLowerCase();
        if (!catMatch) return false;
      }

      // 4. Branch filter
      if (branchFilter !== "all") {
        if (t.branchId && t.branchId !== branchFilter) return false;
      }

      return true;
    });
  }, [reportData?.testBreakdown, searchQuery, nablFilter, categoryFilter, branchFilter]);

  // Expenses tagged to a specific test
  const taggedExpenses = useMemo(() => {
    const exps = data.expenses || [];
    return exps.filter((e: any) => {
      return !!(e.job_entry_test_id || e.job_entry_tests);
    });
  }, [data.expenses]);

  // Handler to record an expense for a specific test
  const handleAddExpenseForTest = (t: any) => {
    const inwards = data.recentInwards || [];
    const matchingInward = inwards.find((inv: any) =>
      (inv.job_entry_tests || []).some((jet: any) => {
        const tm = jet.test_master;
        const name = tm?.component_parameter || tm?.specific_test || jet.material_description || "";
        const mat = tm?.material_product || tm?.discipline_group || "";
        return (
          (tm?.id && tm.id === t.testId) ||
          (jet.id === t.testId) ||
          (name.toLowerCase() === t.testName.toLowerCase() && mat.toLowerCase() === t.materialGroup.toLowerCase())
        );
      })
    );

    if (matchingInward) {
      const matchingTest = (matchingInward.job_entry_tests || []).find((jet: any) => {
        const tm = jet.test_master;
        const name = tm?.component_parameter || tm?.specific_test || jet.material_description || "";
        const mat = tm?.material_product || tm?.discipline_group || "";
        return (
          (tm?.id && tm.id === t.testId) ||
          (jet.id === t.testId) ||
          (name.toLowerCase() === t.testName.toLowerCase() && mat.toLowerCase() === t.materialGroup.toLowerCase())
        );
      });

      router.push(
        `/accounting/expenses/new?inward_id=${matchingInward.id}&test_id=${matchingTest?.id || ""}&type=inward&return_url=/accounting/test-financials`
      );
    } else {
      router.push(`/accounting/expenses/new?type=inward&return_url=/accounting/test-financials`);
    }
  };

  return (
    <div className="space-y-6">
      {/* ================= Master KPI Analytics Cards ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Tests Conducted */}
        <div className="p-5 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 border border-slate-200/90 rounded-2xl shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tests Conducted
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs group-hover:scale-105 transition-transform">
              <FlaskConical className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-[26px] font-black text-slate-900 tracking-tight mt-2 font-mono">
            {Number(reportData?.summary?.totalTests || 0).toLocaleString("en-IN")}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
            <span className="truncate">Active parameters</span>
            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-[10px]">
              {(reportData?.testBreakdown || []).length} registered
            </span>
          </div>
        </div>

        {/* Card 2: Paid Test Revenue */}
        <div className="p-5 bg-gradient-to-br from-blue-50/40 via-white to-sky-50/30 border border-blue-200/90 rounded-2xl shadow-xs hover:shadow-md hover:border-blue-400 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Paid Test Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-700 shadow-2xs group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-[26px] font-black text-blue-950 tracking-tight mt-2 font-mono">
            {fmt(reportData?.summary?.totalRevenue)}
          </div>
          <div className="flex items-center justify-between text-xs text-blue-700 mt-2.5 pt-2 border-t border-blue-100/80">
            <span>Settled invoices</span>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Realized</span>
            </span>
          </div>
        </div>

        {/* Card 3: Direct Tagged Costs */}
        <div className="p-5 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30 border border-indigo-200/90 rounded-2xl shadow-xs hover:shadow-md hover:border-indigo-400 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
              Direct Tagged Costs
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-100/80 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-2xs group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-[26px] font-black text-indigo-950 tracking-tight mt-2 font-mono">
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
        <div className="p-5 bg-gradient-to-br from-rose-50/40 via-white to-red-50/30 border border-rose-200/90 rounded-2xl shadow-xs hover:shadow-md hover:border-rose-400 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
              Total Testing Costs
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-100/80 border border-rose-200 flex items-center justify-center text-rose-700 shadow-2xs group-hover:scale-105 transition-transform">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-[26px] font-black text-rose-950 tracking-tight mt-2 font-mono">
            {fmt(reportData?.summary?.totalCost)}
          </div>
          <div className="flex items-center justify-between text-xs text-rose-700 mt-2.5 pt-2 border-t border-rose-100/80">
            <span>Direct + Overheads</span>
            <span className="text-[10px] font-semibold text-rose-800 bg-rose-100/70 px-2 py-0.5 rounded-full">
              Tagged + Lab
            </span>
          </div>
        </div>

        {/* Card 5: Gross Profit & Margin */}
        <div
          className={`p-5 rounded-2xl border shadow-xs hover:shadow-md transition-all duration-300 group ${
            (reportData?.summary?.grossProfit || 0) >= 0
              ? "bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 border-emerald-200/90 hover:border-emerald-400 text-emerald-950"
              : "bg-gradient-to-br from-rose-50/50 via-white to-orange-50/30 border-rose-200/90 hover:border-rose-400 text-rose-950"
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
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform ${
                (reportData?.summary?.grossProfit || 0) >= 0
                  ? "bg-emerald-100/80 border-emerald-200 text-emerald-700"
                  : "bg-rose-100/80 border-rose-200 text-rose-700"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-[26px] font-black tracking-tight mt-2 font-mono">
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
              className={`font-mono font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                (reportData?.summary?.grossProfit || 0) >= 0
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {Number(reportData?.summary?.overallMargin || 0).toFixed(1)}% Margin
            </span>
          </div>
        </div>
      </div>

      {/* ================= Test Economics & Profitability Hub ================= */}
      <div className="space-y-4">
        {/* Filter Tests Section */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-50 to-amber-100 border border-orange-200/80 flex items-center justify-center shadow-2xs">
                <SlidersHorizontal className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm tracking-tight">Filter Tests</h3>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
                    {filteredTests.length} tests found
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Refine by parameters, discipline, branches, or date range</p>
              </div>
            </div>

            {(searchQuery || nablFilter !== "all" || categoryFilter !== "all" || branchFilter !== "all" || selectedPeriod !== "this_month") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setNablFilter("all");
                  setCategoryFilter("all");
                  setBranchFilter("all");
                  setPresetRange("this_month");
                  setSelectedPeriod("this_month");
                }}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100/80 border border-orange-200/70 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-105"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
            {/* SEARCH */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Search className="w-3 h-3 text-slate-400" />
                <span>Search</span>
              </label>
              <div className="relative group">
                <Input
                  type="text"
                  placeholder="Search test or material..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-3.5 pr-8 h-10 border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl text-xs transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* NABL STATUS */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">NABL Status</label>
              <Select
                value={nablFilter}
                onValueChange={(val) => setNablFilter(val as any)}
                buttonClassName="h-10 bg-slate-50/50 hover:bg-white focus:bg-white rounded-xl border-slate-200/90 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
              >
                <SelectItem value="all">All NABL</SelectItem>
                <SelectItem value="nabl">NABL Only</SelectItem>
                <SelectItem value="non-nabl">NON-NABL</SelectItem>
              </Select>
            </div>

            {/* CATEGORY */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
              <Select
                value={categoryFilter}
                onValueChange={(val) => setCategoryFilter(val)}
                buttonClassName="h-10 bg-slate-50/50 hover:bg-white focus:bg-white rounded-xl border-slate-200/90 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
              >
                <SelectItem value="all">All Categories</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </Select>
            </div>

            {/* BRANCH */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Branch</label>
              <Select
                value={branchFilter}
                onValueChange={(val) => setBranchFilter(val)}
                buttonClassName="h-10 bg-slate-50/50 hover:bg-white focus:bg-white rounded-xl border-slate-200/90 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
              >
                <SelectItem value="all">All Branches</SelectItem>
                {branchOptions.map((b: { id: string; name: string }) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </Select>
            </div>

            {/* DATE RANGE */}
            <div className="space-y-1.5 relative" ref={datePickerRef}>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Date Range
              </label>
              <button
                type="button"
                onClick={() => setIsDateOpen(!isDateOpen)}
                className="w-full h-10 px-3.5 bg-slate-50/50 hover:bg-white rounded-xl border border-slate-200/90 text-xs font-semibold text-slate-700 flex items-center justify-between shadow-2xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2 truncate">
                  <Calendar className="w-4 h-4 text-orange-500 shrink-0 group-hover:text-orange-600" />
                  <span className="truncate">{periodDisplayLabel}</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isDateOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Popover */}
              {isDateOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-3.5 space-y-3 animate-in fade-in-0 zoom-in-95 duration-150">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Quick Presets
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: "this_month", label: "This Month" },
                        { id: "last_month", label: "Last Month" },
                        { id: "this_quarter", label: "This Quarter" },
                        { id: "this_fy", label: "FY" },
                        { id: "all", label: "All Time" },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            handlePeriodChange(p.id);
                            setIsDateOpen(false);
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                            selectedPeriod === p.id
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
                          value={fromDate}
                          onChange={(e) => {
                            setFromDate(e.target.value);
                            setSelectedPeriod("custom");
                          }}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                          To:
                        </label>
                        <input
                          type="date"
                          value={toDate}
                          onChange={(e) => {
                            setToDate(e.target.value);
                            setSelectedPeriod("custom");
                          }}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => {
                        setIsDateOpen(false);
                        fetchEconomics(fromDate, toDate);
                      }}
                      className="w-full h-8 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow-xs cursor-pointer gap-1.5 mt-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingReport ? "animate-spin" : ""}`} />
                      <span>Apply Dates</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= Test Economics Table ================= */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50/90 text-slate-600 font-bold text-[10.5px] uppercase sticky top-0 z-10 border-b border-slate-200/80 backdrop-blur-xs">
                <tr>
                  <th className="py-3.5 px-4 text-left">Test Parameter & Material</th>
                  <th className="py-3.5 px-4 text-center">Volume</th>
                  <th className="py-3.5 px-4 text-right">
                    Paid Revenue (₹)
                    <span className="block text-[9px] font-normal text-slate-400">Settled Invoices</span>
                  </th>
                  <th className="py-3.5 px-4 text-right">
                    Total Cost (₹)
                    <span className="block text-[9px] font-normal text-slate-400">Direct + Shared</span>
                  </th>
                  <th className="py-3.5 px-4 text-right">
                    Gross Profit & Margin
                    <span className="block text-[9px] font-normal text-slate-400">Realized Profit</span>
                  </th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingReport && !reportData ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">
                      <RefreshCw className="w-7 h-7 text-orange-500 animate-spin mx-auto mb-2" />
                      <span className="font-semibold text-slate-700">Aggregating test unit economics...</span>
                      <p className="text-xs text-slate-400 mt-1">Calculating realized revenue and direct cost allocations</p>
                    </td>
                  </tr>
                ) : filteredTests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-medium">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FlaskConical className="w-8 h-8 text-slate-300" />
                        <span className="text-sm font-bold text-slate-700">No test records match the selected filters</span>
                        <p className="text-xs text-slate-400">Try broadening your search term or selecting &quot;All Time&quot;.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTests.map((t: any) => {
                    const margin = Number(t.grossMargin || 0);
                    const marginClass =
                      margin >= 50
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : margin >= 20
                        ? "bg-blue-50 text-blue-800 border-blue-300"
                        : margin >= 0
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : "bg-rose-50 text-rose-800 border-rose-300";

                    const isExpanded = !!expandedRowIds[t.testId];

                    return (
                      <React.Fragment key={t.testId}>
                        <tr className="hover:bg-slate-50/80 transition-colors group">
                          {/* 1. Test Parameter & Material */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-200/80">
                                {t.materialGroup}
                              </span>
                              {t.isNabl && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  NABL
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-slate-900 text-sm mt-1 tracking-tight group-hover:text-orange-600 transition-colors">
                              {t.testName}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>Discipline: <strong className="font-semibold text-slate-700">{t.discipline}</strong></span>
                              <span>·</span>
                              <span>Linked to <strong className="font-semibold text-slate-700">{t.inwardCount}</strong> Inward Jobs</span>
                            </div>
                          </td>

                          {/* 2. Volume */}
                          <td className="py-4 px-4 text-center">
                            <span className="inline-block px-3 py-1 rounded-xl bg-slate-100 text-slate-800 font-mono font-black text-xs border border-slate-200/80 shadow-2xs">
                              {t.testCount}
                            </span>
                          </td>

                          {/* 3. Paid Revenue */}
                          <td className="py-4 px-4 text-right">
                            {t.revenue > 0 ? (
                              <div>
                                <div className="font-mono font-bold text-blue-950 text-sm tracking-tight">
                                  {fmt(t.revenue)}
                                </div>
                                {t.paidInvoices && t.paidInvoices.length > 0 && (
                                  <div
                                    className="text-[10px] text-emerald-700 font-semibold flex items-center justify-end gap-1 mt-1"
                                    title={t.paidInvoices
                                      .map((p: any) => `${p.invoiceNo}: ${fmt(p.testRevenue)} (${p.status})`)
                                      .join(" | ")}
                                  >
                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span className="truncate max-w-[140px] font-mono">
                                        {t.paidInvoices.map((p: any) => p.invoiceNo).join(", ")}
                                      </span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="text-slate-400 font-mono text-xs">₹0.00</span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">Pending collection</span>
                              </div>
                            )}
                          </td>

                          {/* 4. Total Testing Cost */}
                          <td className="py-4 px-4 text-right">
                            <div className="font-mono font-bold text-rose-700 text-sm tracking-tight">
                              {fmt(t.totalCost)}
                            </div>
                            {t.taggedExpense > 0 ? (
                              <span className="inline-block text-[10px] text-indigo-700 font-semibold bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-md mt-1">
                                Tagged: {fmt(t.taggedExpense)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Shared / Lab
                              </span>
                            )}
                          </td>

                          {/* 5. Gross Profit & Margin */}
                          <td className="py-4 px-4 text-right">
                            <div
                              className={`font-mono font-bold text-sm tracking-tight ${
                                t.grossProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {fmt(t.grossProfit)}
                            </div>
                            <div className="mt-1 flex justify-end">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${marginClass}`}
                              >
                                {margin.toFixed(1)}% Margin
                              </span>
                            </div>
                          </td>

                          {/* 6. Actions & Details Dropdown Toggle */}
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleRow(t.testId)}
                                className={`h-8 px-3 text-xs font-bold rounded-xl gap-1.5 cursor-pointer transition-all shadow-2xs ${
                                  isExpanded
                                    ? "bg-indigo-100 text-indigo-900 border border-indigo-200"
                                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                }`}
                                title="View complete cost breakdown and paid invoice details"
                              >
                                <span>Details</span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                    isExpanded ? "rotate-180 text-indigo-600" : "text-slate-500"
                                  }`}
                                />
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddExpenseForTest(t)}
                                className="h-8 px-3 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200 rounded-xl gap-1.5 cursor-pointer shadow-2xs hover:scale-105 transition-all"
                                title={`Allocate direct test cost for ${t.testName}`}
                              >
                                <Plus className="w-3.5 h-3.5 text-rose-600" />
                                <span>Add Cost</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }
