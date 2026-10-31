"use client";

import React, { useState, useEffect, useTransition, useCallback, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Printer,
  Scale,
  FileSpreadsheet,
  MessageCircle,
  ShieldCheck,
  RefreshCw,
  Clock,
  FlaskConical,
  Package,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  getComprehensiveFinancialReportsAction,
  getTestWiseProfitabilityReportAction,
} from "@/actions/accounting.actions";

export interface ExpenseCategoryBreakdown {
  name: string;
  amount: number;
  count?: number;
}

export interface PnLReport {
  totalIncome?: number;
  inwardRevenue?: number;
  directClientIncome?: number;
  directInwardExpenses?: number;
  inhouseLabExpenses?: number;
  grossProfit?: number;
  grossMargin?: number;
  companyOverheads?: number;
  totalExpenses?: number;
  netProfit?: number;
  netMargin?: number;
  expenseCategories?: ExpenseCategoryBreakdown[];
}

export interface AccountBalanceItem {
  id: string;
  name: string;
  account_type: string;
  bank_name: string;
  current_balance: number;
}

export interface BalanceSheetReport {
  bankAccountsBalance?: number;
  cashAccountsBalance?: number;
  totalLiquidCashBank?: number;
  tradeReceivables?: number;
  totalCurrentAssets?: number;
  pendingLiabilities?: number;
  netWorkingCapital?: number;
  accountsList?: AccountBalanceItem[];
}

export interface ClientAgingItem {
  clientId: string;
  clientName: string;
  contactPerson?: string;
  mobile?: string;
  totalDue: number;
  current: number;
  days31to60: number;
  days61to90: number;
  days90Plus: number;
  invoiceCount: number;
  oldestDate: string;
}

export interface AgingBuckets {
  current?: number;
  days31to60?: number;
  days61to90?: number;
  days90Plus?: number;
}

export interface AgingReport {
  totalOutstanding?: number;
  agingBuckets?: AgingBuckets;
  clientAgingList?: ClientAgingItem[];
}

export interface GSTInvoiceItem {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceType: string;
  clientName: string;
  clientGst: string;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
}

export interface GSTReport {
  totalTaxableTurnover?: number;
  totalOutputGst?: number;
  totalInputGst?: number;
  netGstPayable?: number;
  gstInvoiceBreakdown?: GSTInvoiceItem[];
}

export interface FinancialReportsResponse {
  dateRange: { fromDate: string | null; toDate: string | null };
  pnl: PnLReport;
  balanceSheet: BalanceSheetReport;
  aging: AgingReport;
  gst: GSTReport;
}

const fmt = (n: number | string | undefined | null) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function ReportsHub() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [activeReportTab, setActiveReportTab] = useState<
    "pnl" | "balancesheet" | "aging" | "gst" | "test_pnl"
  >(() => {
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (tab === "test_pnl" || tab === "pnl" || tab === "balancesheet" || tab === "aging" || tab === "gst") {
        return tab;
      }
    }
    return "pnl";
  });

  const handleSelectReportTab = (tab: "pnl" | "balancesheet" | "aging" | "gst" | "test_pnl") => {
    setActiveReportTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Date filters
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // 1st of current month
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const [reportsData, setReportsData] = useState<FinancialReportsResponse | null>(null);

  // Test-Wise Profitability State
  const [testReportData, setTestReportData] = useState<any>(null);
  const [loadingTests, setLoadingTests] = useState<boolean>(false);
  const [testSearch, setTestSearch] = useState<string>("");
  const [selectedMaterialFilter, setSelectedMaterialFilter] = useState<string>("all");

  const fetchTestProfitability = useCallback((from?: string, to?: string) => {
    setLoadingTests(true);
    const activeFrom = from !== undefined ? from : fromDate;
    const activeTo = to !== undefined ? to : toDate;
    getTestWiseProfitabilityReportAction(activeFrom, activeTo)
      .then((res) => {
        if (res.success && "data" in res && res.data) {
          setTestReportData(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingTests(false));
  }, [fromDate, toDate]);

  const fetchReportData = useCallback((from?: string, to?: string) => {
    startTransition(async () => {
      const activeFrom = from !== undefined ? from : fromDate;
      const activeTo = to !== undefined ? to : toDate;
      const res = await getComprehensiveFinancialReportsAction(activeFrom, activeTo);
      if (res.success && "data" in res && res.data) {
        setReportsData(res.data as unknown as FinancialReportsResponse);
      } else {
        toast({
          title: "Report Error",
          description: ("error" in res ? res.error : undefined) || "Failed to load financial reports.",
          variant: "destructive",
        });
      }
    });
  }, [fromDate, toDate]);

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
      fetchReportData("", "");
      if (activeReportTab === "test_pnl") {
        fetchTestProfitability("", "");
      }
      return;
    }

    const sStr = start.toISOString().slice(0, 10);
    const eStr = end.toISOString().slice(0, 10);
    setFromDate(sStr);
    setToDate(eStr);
    fetchReportData(sStr, eStr);
    if (activeReportTab === "test_pnl") {
      fetchTestProfitability(sStr, eStr);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lazy load test report if switching to test_pnl and not yet fetched
  useEffect(() => {
    if (activeReportTab === "test_pnl" && !testReportData) {
      fetchTestProfitability();
    }
  }, [activeReportTab, testReportData, fetchTestProfitability]);

  const pnl = reportsData?.pnl || {};
  const balanceSheet = reportsData?.balanceSheet || {};
  const aging = reportsData?.aging || {};
  const gst = reportsData?.gst || {};

  // Export Test Profitability to Excel
  const handleExportTestProfitability = () => {
    if (!testReportData || !testReportData.testBreakdown || testReportData.testBreakdown.length === 0) {
      toast({ title: "No Data", description: "No test records found for export.", variant: "warning" });
      return;
    }
    const wb = XLSX.utils.book_new();

    const rows = [
      ["CONSTROTRAIT - TEST-WISE REVENUE & EXPENSE PROFITABILITY ANALYSIS"],
      [`Period: ${fromDate || "All Time"} to ${toDate || "Present"}`],
      [],
      [
        "Material / Product",
        "Specific Test Parameter",
        "Discipline",
        "Test Volume",
        "Inward Jobs",
        "Clients",
        "Revenue (INR)",
        "Direct Cost (INR)",
        "Shared Inward Cost (INR)",
        "In-House Lab Cost (INR)",
        "Total Cost (INR)",
        "Gross Profit (INR)",
        "Gross Margin (%)",
        "Avg Revenue / Test (INR)",
        "Avg Cost / Test (INR)",
      ],
      ...testReportData.testBreakdown.map((t: any) => [
        t.materialGroup,
        t.testName,
        t.discipline,
        t.testCount,
        t.inwardCount,
        t.clientCount,
        t.revenue,
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
        testReportData.summary.totalTests,
        "",
        "",
        testReportData.summary.totalRevenue,
        "",
        "",
        testReportData.summary.totalCost,
        testReportData.summary.grossProfit,
        `${testReportData.summary.overallMargin}%`,
        "",
        "",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Test Profitability");
    XLSX.writeFile(wb, `Constrotrait_Test_Wise_Financials_${fromDate || "all"}_to_${toDate || "present"}.xlsx`);
    toast({ title: "Excel Downloaded", description: "Test-wise profitability report exported successfully." });
  };

  // Export P&L to Excel
  const handleExportPnL = () => {
    if (!reportsData) return;
    const wb = XLSX.utils.book_new();

    const pnlRows = [
      ["CONSTROTRAIT - PROFIT & LOSS STATEMENT"],
      [`Period: ${fromDate || "All Time"} to ${toDate || "Present"}`],
      [],
      ["INCOME / REVENUE", ""],
      ["Inward Testing & Client Lab Fees", pnl.inwardRevenue || 0],
      ["Direct Client Receipts", pnl.directClientIncome || 0],
      ["Total Operating Income", pnl.totalIncome || 0],
      [],
      ["DIRECT OPERATING COSTS", ""],
      ["Inward Direct Expenses (Consumables, Logistics, Tests)", pnl.directInwardExpenses || 0],
      ["Gross Profit", pnl.grossProfit || 0],
      [`Gross Margin (%)`, `${(pnl.grossMargin || 0).toFixed(2)}%`],
      [],
      ["OPERATING OVERHEADS & EXPENSES", ""],
      ...(pnl.expenseCategories || []).map((c: ExpenseCategoryBreakdown) => [c.name, c.amount]),
      ["Total Overheads", pnl.companyOverheads || 0],
      ["Total Expenses", pnl.totalExpenses || 0],
      [],
      ["NET PROFIT / (LOSS)", pnl.netProfit || 0],
      [`Net Profit Margin (%)`, `${(pnl.netMargin || 0).toFixed(2)}%`],
    ];

    const ws = XLSX.utils.aoa_to_sheet(pnlRows);
    XLSX.utils.book_append_sheet(wb, ws, "Profit & Loss");
    XLSX.writeFile(wb, `Constrotrait_PnL_${fromDate || "all"}_to_${toDate || "present"}.xlsx`);
    toast({ title: "Excel Downloaded", description: "Profit & Loss statement exported." });
  };

  // Export Debtors Aging to Excel
  const handleExportAging = () => {
    if (!aging.clientAgingList) return;
    const wb = XLSX.utils.book_new();

    const rows = [
      ["CONSTROTRAIT - CLIENT DEBTORS AGING ANALYSIS"],
      [`Generated: ${new Date().toLocaleDateString("en-IN")}`],
      [],
      ["Client Name", "Contact Person", "Mobile", "Invoices Count", "Oldest Invoice", "Current (0-30d)", "31-60 Days", "61-90 Days", "90+ Days Overdue", "Total Outstanding (₹)"],
      ...aging.clientAgingList.map((c: ClientAgingItem) => [
        c.clientName,
        c.contactPerson,
        c.mobile,
        c.invoiceCount,
        c.oldestDate,
        c.current,
        c.days31to60,
        c.days61to90,
        c.days90Plus,
        c.totalDue,
      ]),
      [],
      ["TOTALS", "", "", "", "", aging.agingBuckets?.current, aging.agingBuckets?.days31to60, aging.agingBuckets?.days61to90, aging.agingBuckets?.days90Plus, aging.totalOutstanding],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Debtors Aging");
    XLSX.writeFile(wb, `Constrotrait_Debtors_Aging_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Excel Downloaded", description: "Debtors aging report exported." });
  };

  // Export GST to Excel
  const handleExportGst = () => {
    if (!gst.gstInvoiceBreakdown) return;
    const wb = XLSX.utils.book_new();

    const rows = [
      ["CONSTROTRAIT - GST SUMMARY REPORT (GSTR-1 & 3B ESTIMATION)"],
      [`Period: ${fromDate || "All Time"} to ${toDate || "Present"}`],
      [],
      ["Invoice No", "Date", "Invoice Type", "Client Name", "Client GSTIN", "Taxable Value (₹)", "GST Amount (₹)", "Total Amount (₹)"],
      ...gst.gstInvoiceBreakdown.map((i: GSTInvoiceItem) => [
        i.invoiceNo,
        i.invoiceDate,
        i.invoiceType,
        i.clientName,
        i.clientGst,
        i.taxableAmount,
        i.gstAmount,
        i.totalAmount,
      ]),
      [],
      ["TOTAL OUTWARD TAXABLE", "", "", "", "", gst.totalTaxableTurnover, gst.totalOutputGst, ""],
      ["TOTAL INPUT TAX CREDIT (ITC)", "", "", "", "", "", gst.totalInputGst, ""],
      ["NET GST PAYABLE", "", "", "", "", "", gst.netGstPayable, ""],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "GST Summary");
    XLSX.writeFile(wb, `Constrotrait_GST_Report_${fromDate || "all"}_to_${toDate || "present"}.xlsx`);
    toast({ title: "Excel Downloaded", description: "GST report exported." });
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls Bar (Hidden in Print) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span>Financial Statements & Intelligence Reports</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive Profit & Loss, Balance Sheet, Debtors Aging, and Statutory GST reporting.
            </p>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setPresetRange("this_month")}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-medium cursor-pointer"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setPresetRange("last_month")}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-medium cursor-pointer"
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => setPresetRange("this_quarter")}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-medium cursor-pointer"
            >
              This Quarter
            </button>
            <button
              type="button"
              onClick={() => setPresetRange("this_fy")}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-medium cursor-pointer"
            >
              Current FY
            </button>
            <button
              type="button"
              onClick={() => setPresetRange("all")}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-medium cursor-pointer"
            >
              All Time
            </button>
          </div>
        </div>

        {/* Date pickers and apply button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold">From:</span>
              <input
                type="date"
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:border-blue-500 outline-none"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold">To:</span>
              <input
                type="date"
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:border-blue-500 outline-none"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <Button
              size="sm"
              onClick={() => {
                fetchReportData();
                if (activeReportTab === "test_pnl") {
                  fetchTestProfitability();
                }
              }}
              disabled={isPending || loadingTests}
              className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs cursor-pointer gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending || loadingTests ? "animate-spin" : ""}`} />
              <span>Apply Filter</span>
            </Button>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-8 px-3 text-xs gap-1.5 rounded-lg cursor-pointer hover:bg-slate-100"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print Statement</span>
            </Button>

            {activeReportTab === "pnl" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPnL}
                className="h-8 px-3 text-xs gap-1.5 rounded-lg text-emerald-700 border-emerald-200 hover:bg-emerald-50 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export P&L</span>
              </Button>
            )}

            {activeReportTab === "aging" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAging}
                className="h-8 px-3 text-xs gap-1.5 rounded-lg text-emerald-700 border-emerald-200 hover:bg-emerald-50 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Aging</span>
              </Button>
            )}

            {activeReportTab === "gst" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportGst}
                className="h-8 px-3 text-xs gap-1.5 rounded-lg text-emerald-700 border-emerald-200 hover:bg-emerald-50 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export GST</span>
              </Button>
            )}

            {activeReportTab === "test_pnl" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportTestProfitability}
                className="h-8 px-3 text-xs gap-1.5 rounded-lg text-emerald-700 border-emerald-200 hover:bg-emerald-50 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Test Financials</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Report Tabs Selector (Hidden in Print) */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl overflow-x-auto no-scrollbar print:hidden">
        <button
          type="button"
          onClick={() => handleSelectReportTab("pnl")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeReportTab === "pnl"
              ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Profit & Loss Statement</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectReportTab("balancesheet")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeReportTab === "balancesheet"
              ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Balance Sheet & Liquidity</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectReportTab("aging")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeReportTab === "aging"
              ? "bg-white text-amber-800 shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Debtors Aging (30/60/90+ Days)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectReportTab("gst")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeReportTab === "gst"
              ? "bg-white text-emerald-800 shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>GST Summary (GSTR-1 & 3B)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectReportTab("test_pnl")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeReportTab === "test_pnl"
              ? "bg-white text-emerald-700 shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
          <span>Test-Wise Revenue & Expense</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. PROFIT & LOSS REPORT VIEW */}
      {/* ============================================================== */}
      {activeReportTab === "pnl" && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Total Operating Revenue</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{fmt(pnl.totalIncome)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Inward Testing: {fmt(pnl.inwardRevenue)}
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Direct Inward Costs</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{fmt(pnl.directInwardExpenses)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Testing consumables & labs</div>
            </div>

            <div className="p-4 bg-white border border-blue-200 rounded-2xl bg-blue-50/20 shadow-xs">
              <div className="text-xs text-blue-700 font-semibold">Gross Profit</div>
              <div className="text-xl font-bold text-blue-900 mt-1">{fmt(pnl.grossProfit)}</div>
              <div className="text-[11px] text-blue-600 font-semibold mt-0.5">
                Gross Margin: {(pnl.grossMargin || 0).toFixed(1)}%
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border shadow-xs ${
                (pnl.netProfit || 0) >= 0
                  ? "bg-emerald-50/30 border-emerald-200 text-emerald-900"
                  : "bg-rose-50/30 border-rose-200 text-rose-900"
              }`}
            >
              <div className="text-xs font-semibold">Net Operating Profit</div>
              <div className="text-xl font-bold mt-1">{fmt(pnl.netProfit)}</div>
              <div className="text-[11px] font-semibold mt-0.5">
                Net Margin: {(pnl.netMargin || 0).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Statement Detailed Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                Statement of Profit and Loss
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                Period: {fromDate || "All Time"} to {toDate || "Present"}
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {/* Revenue Section */}
              <div className="py-3 space-y-2">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  1. Operating Revenue & Inward Receipts
                </div>
                <div className="flex justify-between pl-4 text-slate-600">
                  <span>Client Inward Testing & Laboratory Fees</span>
                  <span className="font-semibold text-slate-800">{fmt(pnl.inwardRevenue)}</span>
                </div>
                <div className="flex justify-between pl-4 text-slate-600">
                  <span>Direct Client Collections & Consultations</span>
                  <span className="font-semibold text-slate-800">{fmt(pnl.directClientIncome)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                  <span>Total Operating Revenue (A)</span>
                  <span>{fmt(pnl.totalIncome)}</span>
                </div>
              </div>

              {/* Direct Expenses */}
              <div className="py-3 space-y-2">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  2. Direct Job & Laboratory Operating Costs
                </div>
                <div className="flex justify-between pl-4 text-slate-600">
                  <span>Direct Inward Testing Costs (Logistics, Site Inspections, External Tests)</span>
                  <span className="font-semibold text-slate-800">{fmt(pnl.directInwardExpenses)}</span>
                </div>
                <div className="flex justify-between pl-4 text-slate-600">
                  <span>In-House Laboratory Operations (Calibration, Consumables, PT/ILC, Lab Power)</span>
                  <span className="font-semibold text-slate-800">{fmt(pnl.inhouseLabExpenses)}</span>
                </div>
                <div className="flex justify-between font-bold text-blue-900 pt-1 border-t border-slate-100 bg-blue-50/50 p-2 rounded-lg">
                  <span>Gross Operating Profit = (A - Direct Costs)</span>
                  <span>{fmt(pnl.grossProfit)} ({(pnl.grossMargin || 0).toFixed(1)}%)</span>
                </div>
              </div>

              {/* Overhead Expenses */}
              <div className="py-3 space-y-2">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  3. Company & Operational Overheads
                </div>
                {(pnl.expenseCategories || []).length === 0 ? (
                  <div className="pl-4 text-slate-400 italic">No overhead expenses recorded in period.</div>
                ) : (
                  (pnl.expenseCategories || []).map((cat: ExpenseCategoryBreakdown, i: number) => (
                    <div key={i} className="flex justify-between pl-4 text-slate-600">
                      <span>{cat.name} ({cat.count || 1} vouchers)</span>
                      <span className="font-semibold text-slate-800">{fmt(cat.amount)}</span>
                    </div>
                  ))
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                  <span>Total Overheads (B)</span>
                  <span>{fmt(pnl.companyOverheads)}</span>
                </div>
              </div>

              {/* Net Profit Summary */}
              <div className="pt-4 flex justify-between items-center text-sm font-black p-3 rounded-xl bg-slate-900 text-white">
                <span>NET OPERATING PROFIT / (LOSS)</span>
                <span>{fmt(pnl.netProfit)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. BALANCE SHEET & LIQUIDITY VIEW */}
      {/* ============================================================== */}
      {activeReportTab === "balancesheet" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Liquid Cash & Bank Balances</div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {fmt(balanceSheet.totalLiquidCashBank)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Bank: {fmt(balanceSheet.bankAccountsBalance)} | Cash: {fmt(balanceSheet.cashAccountsBalance)}
              </div>
            </div>

            <div className="p-4 bg-white border border-amber-200 rounded-2xl bg-amber-50/20 shadow-xs">
              <div className="text-xs text-amber-700 font-semibold">Accounts Receivable (Debtors)</div>
              <div className="text-xl font-bold text-amber-900 mt-1">
                {fmt(balanceSheet.tradeReceivables)}
              </div>
              <div className="text-[11px] text-amber-600 mt-0.5">Pending client payments</div>
            </div>

            <div className="p-4 bg-white border border-blue-200 rounded-2xl bg-blue-50/20 shadow-xs">
              <div className="text-xs text-blue-700 font-semibold">Net Working Capital</div>
              <div className="text-xl font-bold text-blue-900 mt-1">
                {fmt(balanceSheet.netWorkingCapital)}
              </div>
              <div className="text-[11px] text-blue-600 mt-0.5">
                Total Current Assets minus Pending Dues
              </div>
            </div>
          </div>

          {/* Accounts Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Bank & Cash Accounts Liquidity</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase">
                  <tr className="border-b border-slate-200">
                    <th className="p-3 text-left">Account Name</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">Bank Institution</th>
                    <th className="p-3 text-right">Live Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(balanceSheet.accountsList || []).map((acc: AccountBalanceItem) => (
                    <tr key={acc.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{acc.name}</td>
                      <td className="p-3 uppercase text-[10px] font-semibold text-slate-600">
                        {acc.account_type}
                      </td>
                      <td className="p-3 text-slate-600">{acc.bank_name || "Cash In Hand"}</td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {fmt(acc.current_balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. DEBTORS & OUTSTANDING AGING ANALYSIS */}
      {/* ============================================================== */}
      {activeReportTab === "aging" && (
        <div className="space-y-6">
          {/* Aging Buckets Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Current (0 - 30 Days)</div>
              <div className="text-xl font-bold text-emerald-700 mt-1">
                {fmt(aging.agingBuckets?.current)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Within standard terms</div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="text-xs text-slate-500 font-medium">31 - 60 Days Overdue</div>
              <div className="text-xl font-bold text-amber-700 mt-1">
                {fmt(aging.agingBuckets?.days31to60)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">First reminder level</div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="text-xs text-slate-500 font-medium">61 - 90 Days Overdue</div>
              <div className="text-xl font-bold text-orange-700 mt-1">
                {fmt(aging.agingBuckets?.days61to90)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Second reminder level</div>
            </div>

            <div className="p-4 bg-white border border-rose-200 rounded-2xl bg-rose-50/20 shadow-xs">
              <div className="text-xs text-rose-700 font-semibold">90+ Days Critical Overdue</div>
              <div className="text-xl font-bold text-rose-900 mt-1">
                {fmt(aging.agingBuckets?.days90Plus)}
              </div>
              <div className="text-[11px] text-rose-600 mt-0.5">Requires senior intervention</div>
            </div>
          </div>

          {/* Client-wise Aging Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Customer Outstanding Aging Breakdown</h4>
                <p className="text-xs text-slate-500">
                  Total Debtors Outstanding: <strong className="text-slate-900">{fmt(aging.totalOutstanding)}</strong>
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase">
                  <tr className="border-b border-slate-200">
                    <th className="p-3 text-left">Customer Name</th>
                    <th className="p-3 text-center">Invoices</th>
                    <th className="p-3 text-left">Oldest Inv</th>
                    <th className="p-3 text-right">0 - 30d (₹)</th>
                    <th className="p-3 text-right">31 - 60d (₹)</th>
                    <th className="p-3 text-right">61 - 90d (₹)</th>
                    <th className="p-3 text-right">90+ Days (₹)</th>
                    <th className="p-3 text-right">Total Due (₹)</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(aging.clientAgingList || []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No outstanding customer invoices found.
                      </td>
                    </tr>
                  ) : (
                    (aging.clientAgingList || []).map((client: ClientAgingItem) => (
                      <tr key={client.clientId} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{client.clientName}</div>
                          {client.contactPerson && (
                            <div className="text-[11px] text-slate-500">Attn: {client.contactPerson}</div>
                          )}
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-700">
                          {client.invoiceCount}
                        </td>
                        <td className="p-3 text-slate-600 whitespace-nowrap">{client.oldestDate}</td>
                        <td className="p-3 text-right font-medium text-slate-700">{fmt(client.current)}</td>
                        <td className="p-3 text-right font-medium text-amber-700">{fmt(client.days31to60)}</td>
                        <td className="p-3 text-right font-medium text-orange-700">{fmt(client.days61to90)}</td>
                        <td className="p-3 text-right font-bold text-rose-700">{fmt(client.days90Plus)}</td>
                        <td className="p-3 text-right font-black text-slate-900">{fmt(client.totalDue)}</td>
                        <td className="p-3 text-center">
                          {client.mobile ? (
                            <a
                              href={`https://wa.me/91${client.mobile.replace(/\D/g, "")}?text=${encodeURIComponent(
                                `Dear ${client.clientName}, gentle reminder regarding pending balance of ${fmt(client.totalDue)} for ConstroTrait laboratory testing services. Kindly process payment at your earliest.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Send WhatsApp Reminder"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Remind</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 text-[10px]">No Mobile</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. GST TAX SUMMARY VIEW */}
      {/* ============================================================== */}
      {activeReportTab === "gst" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Taxable Outward Supplies</div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {fmt(gst.totalTaxableTurnover)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Net billed turnover</div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Output GST Collected</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{fmt(gst.totalOutputGst)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">CGST + SGST + IGST liability</div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Input Tax Credit (ITC)</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{fmt(gst.totalInputGst)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">GST paid on lab expenses</div>
            </div>

            <div
              className={`p-4 rounded-2xl border shadow-xs ${
                (gst.netGstPayable || 0) >= 0
                  ? "bg-amber-50/30 border-amber-200 text-amber-900"
                  : "bg-emerald-50/30 border-emerald-200 text-emerald-900"
              }`}
            >
              <div className="text-xs font-semibold">Net GST Payable</div>
              <div className="text-xl font-bold mt-1">{fmt(gst.netGstPayable)}</div>
              <div className="text-[11px] font-semibold mt-0.5">
                Output GST minus Eligible ITC
              </div>
            </div>
          </div>

          {/* Invoice-by-Invoice GST Register Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">GSTR-1 Outward Invoices Register</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[420px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase sticky top-0 z-10">
                  <tr className="border-b border-slate-200">
                    <th className="p-3 text-left">Invoice No</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Customer Name</th>
                    <th className="p-3 text-left">Customer GSTIN</th>
                    <th className="p-3 text-right">Taxable Turnover (₹)</th>
                    <th className="p-3 text-right">GST (₹)</th>
                    <th className="p-3 text-right">Total Invoice (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(gst.gstInvoiceBreakdown || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No invoices found in period.
                      </td>
                    </tr>
                  ) : (
                    (gst.gstInvoiceBreakdown || []).map((inv: GSTInvoiceItem) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-900">{inv.invoiceNo}</td>
                        <td className="p-3 text-slate-600 whitespace-nowrap">{inv.invoiceDate}</td>
                        <td className="p-3 font-semibold text-slate-800">{inv.clientName}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-600">{inv.clientGst}</td>
                        <td className="p-3 text-right text-slate-800">{fmt(inv.taxableAmount)}</td>
                        <td className="p-3 text-right font-semibold text-blue-700">{fmt(inv.gstAmount)}</td>
                        <td className="p-3 text-right font-bold text-slate-900">{fmt(inv.totalAmount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. TEST-WISE REVENUE & EXPENSE PROFITABILITY VIEW */}
      {/* ============================================================== */}
      {activeReportTab === "test_pnl" && (
        <div className="space-y-6">
          {loadingTests && !testReportData ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800">Calculating Test-Wise Financial Economics...</p>
              <p className="text-xs text-slate-500 mt-1">Aggregating test volumes, inward direct costs, and in-house lab operations.</p>
            </div>
          ) : (
            <>
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Total Tests Conducted</span>
                    <FlaskConical className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {Number(testReportData?.summary?.totalTests || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Across {(testReportData?.testBreakdown || []).length} registered test parameters
                  </div>
                </div>

                <div className="p-4 bg-white border border-blue-200 bg-blue-50/20 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-xs text-blue-700 font-semibold">
                    <span>Billed Test Revenue</span>
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-900 mt-1">
                    {fmt(testReportData?.summary?.totalRevenue)}
                  </div>
                  <div className="text-[11px] text-blue-600 font-medium mt-0.5">
                    Avg/Test: {fmt((testReportData?.summary?.totalRevenue || 0) / Math.max(1, testReportData?.summary?.totalTests || 1))}
                  </div>
                </div>

                <div className="p-4 bg-white border border-rose-200 bg-rose-50/20 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between text-xs text-rose-700 font-semibold">
                    <span>Direct & In-House Costs</span>
                    <ArrowDownRight className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-2xl font-black text-rose-900 mt-1">
                    {fmt(testReportData?.summary?.totalCost)}
                  </div>
                  <div className="text-[11px] text-rose-600 font-medium mt-0.5">
                    Direct: {fmt(testReportData?.summary?.totalTaggedExpense || 0)} · Shared/Lab: {fmt((testReportData?.summary?.totalCost || 0) - (testReportData?.summary?.totalTaggedExpense || 0))}
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border shadow-xs ${
                  (testReportData?.summary?.grossProfit || 0) >= 0
                    ? "bg-emerald-50/40 border-emerald-200 text-emerald-950"
                    : "bg-rose-50/40 border-rose-200 text-rose-950"
                }`}>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Gross Test Margin</span>
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black mt-1">
                    {fmt(testReportData?.summary?.grossProfit)}
                  </div>
                  <div className="text-[11px] font-bold mt-0.5">
                    Margin: {Number(testReportData?.summary?.overallMargin || 0).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Material / Discipline Filter Bar */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Material / Product Classification
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Filter tests by material category to analyze product group profitability
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search test name or method..."
                      value={testSearch}
                      onChange={(e) => setTestSearch(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 outline-none focus:bg-white"
                    />
                  </div>
                </div>

                {/* Material Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedMaterialFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedMaterialFilter === "all"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All Materials ({(testReportData?.testBreakdown || []).length})
                  </button>
                  {(testReportData?.materialBreakdown || []).map((m: any) => (
                    <button
                      key={m.material}
                      type="button"
                      onClick={() => setSelectedMaterialFilter(m.material)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedMaterialFilter === m.material
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>{m.material}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        selectedMaterialFilter === m.material ? "bg-white/20 text-white" : "bg-white text-slate-700"
                      }`}>
                        {m.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Test Financials Ledger Table */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-blue-600" />
                    <span>Unit Economics & Profitability per Test</span>
                    <span className="text-xs font-normal text-slate-500">
                      ({(testReportData?.testBreakdown || []).filter((t: any) => {
                        if (selectedMaterialFilter !== "all" && t.materialGroup !== selectedMaterialFilter) return false;
                        if (!testSearch.trim()) return true;
                        const q = testSearch.toLowerCase();
                        return (
                          (t.testName || "").toLowerCase().includes(q) ||
                          (t.materialGroup || "").toLowerCase().includes(q)
                        );
                      }).length} tests shown)
                    </span>
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">
                    Apportioned: Inward Direct + In-House Operations
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[520px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="p-3 text-left">Material / Product</th>
                        <th className="p-3 text-left">Specific Test Parameter</th>
                        <th className="p-3 text-center">Volume</th>
                        <th className="p-3 text-right">Revenue (₹)</th>
                        <th className="p-3 text-right">Direct Cost (₹)</th>
                        <th className="p-3 text-right">Shared Inward (₹)</th>
                        <th className="p-3 text-right">In-House Lab (₹)</th>
                        <th className="p-3 text-right">Total Cost (₹)</th>
                        <th className="p-3 text-right">Gross Profit (₹)</th>
                        <th className="p-3 text-center">Margin</th>
                        <th className="p-3 text-right">Avg Rev / Test</th>
                        <th className="p-3 text-right">Avg Cost / Test</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(testReportData?.testBreakdown || [])
                        .filter((t: any) => {
                          if (selectedMaterialFilter !== "all" && t.materialGroup !== selectedMaterialFilter) return false;
                          if (!testSearch.trim()) return true;
                          const q = testSearch.toLowerCase();
                          return (
                            (t.testName || "").toLowerCase().includes(q) ||
                            (t.materialGroup || "").toLowerCase().includes(q)
                          );
                        })
                        .map((t: any) => {
                          const margin = Number(t.grossMargin || 0);
                          const marginClass =
                            margin >= 50
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : margin >= 20
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : margin >= 0
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200";

                          return (
                            <tr key={t.testId} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] font-bold">
                                  {t.materialGroup}
                                </span>
                              </td>
                              <td className="p-3 font-medium text-slate-800">
                                <div className="font-bold text-slate-900">{t.testName}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Discipline: {t.discipline} · Linked to {t.inwardCount} Inwards
                                </div>
                              </td>
                              <td className="p-3 text-center font-bold text-slate-800">
                                {t.testCount}
                              </td>
                              <td className="p-3 text-right font-bold text-blue-900">
                                {fmt(t.revenue)}
                              </td>
                              <td className="p-3 text-right">
                                {t.taggedExpense > 0 ? (
                                  <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                    <FlaskConical className="w-3 h-3 text-indigo-600" />
                                    <span>{fmt(t.taggedExpense)}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono text-[11px]">₹0</span>
                                )}
                              </td>
                              <td className="p-3 text-right text-slate-600">
                                {fmt(t.sharedInwardExpense || 0)}
                              </td>
                              <td className="p-3 text-right text-emerald-700 font-medium">
                                {fmt(t.inhouseExpense)}
                              </td>
                              <td className="p-3 text-right font-semibold text-rose-700">
                                {fmt(t.totalCost)}
                              </td>
                              <td className={`p-3 text-right font-bold ${t.grossProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                {fmt(t.grossProfit)}
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${marginClass}`}>
                                  {margin.toFixed(1)}%
                                </span>
                              </td>
                              <td className="p-3 text-right text-slate-700">
                                {fmt(t.avgRevenuePerTest)}
                              </td>
                              <td className="p-3 text-right text-slate-500 font-mono text-[11px]">
                                {fmt(t.avgCostPerTest)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
