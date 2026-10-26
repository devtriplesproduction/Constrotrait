"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building,
  Calendar,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/use-pagination";

interface InwardProfitabilityLedgerProps {
  inwards: any[];
  expenses: any[];
  receipts: any[];
  onRecordExpense?: (inward: any) => void;
  onCreateProforma?: (inward: any) => void;
}

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export function InwardProfitabilityLedger({
  inwards = [],
  expenses = [],
  receipts = [],
  onRecordExpense,
  onCreateProforma,
}: InwardProfitabilityLedgerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [profitFilter, setProfitFilter] = useState<"all" | "profitable" | "loss">("all");

  // Calculate profitability per inward
  const inwardRows = useMemo(() => {
    return inwards.map((job) => {
      const uid = job.uid_label || (job.uid ? `UID-${job.uid}` : "N/A");
      const clientName = job.clients?.name || "Client";
      const projectName = job.project_name || job.clients?.site_name || "Project";
      const inwardDate = job.inward_on || (job.created_at ? job.created_at.slice(0, 10) : "");

      // Invoiced total
      const linkedInvoices = Array.isArray(job.invoices) ? job.invoices : [];
      const invoicedTotal = linkedInvoices.reduce(
        (sum: number, inv: any) => sum + Number(inv.total_amount || 0),
        0
      );
      const paidTotal = linkedInvoices.reduce(
        (sum: number, inv: any) => sum + Number(inv.paid_amount || 0),
        0
      );

      // Receipts linked to this inward
      const jobReceipts = receipts.filter(
        (r) =>
          r.inward_id === job.id ||
          r.job_entries?.id === job.id ||
          r.invoice_payments?.some((p: any) => p.invoices?.inward_id === job.id)
      );
      const directReceiptsTotal = jobReceipts.reduce(
        (sum: number, r: any) => sum + Number(r.amount || 0),
        0
      );

      // Combined income collected
      const totalIncome = Math.max(paidTotal, directReceiptsTotal);

      // Inward expenses
      const jobExpenses = expenses.filter(
        (e) =>
          e.inward_id === job.id ||
          e.job_entries?.id === job.id ||
          (e.description && e.description.includes(`UID: ${uid}`))
      );
      const approvedExpenses = jobExpenses.filter(
        (e) => (e.approval_status || "approved") === "approved"
      );
      const totalExpenses = approvedExpenses.reduce(
        (sum: number, e: any) => sum + Number(e.amount || 0),
        0
      );

      // Net Margin
      const netProfit = totalIncome - totalExpenses;
      const marginPct = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      return {
        job,
        id: job.id,
        uid,
        clientName,
        projectName,
        inwardDate,
        invoicedTotal,
        totalIncome,
        totalExpenses,
        netProfit,
        marginPct,
        expenseCount: jobExpenses.length,
        hasExpenses: jobExpenses.length > 0,
      };
    });
  }, [inwards, expenses, receipts]);

  // Filtered rows
  const filtered = useMemo(() => {
    return inwardRows.filter((r) => {
      if (profitFilter === "profitable" && r.netProfit <= 0) return false;
      if (profitFilter === "loss" && r.netProfit >= 0) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        r.uid.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.projectName.toLowerCase().includes(q)
      );
    });
  }, [inwardRows, profitFilter, searchTerm]);

  const pagination = usePagination({
    data: filtered,
    initialPageSize: 10,
  });

  // Summary Metrics
  const summary = useMemo(() => {
    let totalInvoiced = 0;
    let totalIncome = 0;
    let totalExpenses = 0;

    inwardRows.forEach((r) => {
      totalInvoiced += r.invoicedTotal;
      totalIncome += r.totalIncome;
      totalExpenses += r.totalExpenses;
    });

    const netProfit = totalIncome - totalExpenses;
    const marginPct = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    return { totalInvoiced, totalIncome, totalExpenses, netProfit, marginPct };
  }, [inwardRows]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Invoiced Revenue
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {fmt(summary.totalInvoiced)}
          </div>
          <span className="text-[11px] text-slate-500">Across all inward jobs</span>
        </div>

        <div className="p-4.5 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Income Realized
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-2">
            {fmt(summary.totalIncome)}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Collections & advances</span>
        </div>

        <div className="p-4.5 bg-white rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Direct Inward Costs
            </span>
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-900 mt-2">
            {fmt(summary.totalExpenses)}
          </div>
          <span className="text-[11px] text-rose-600 font-medium">Job testing, freight & site costs</span>
        </div>

        <div className="p-4.5 bg-white rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              Net Inward Margin
            </span>
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-900 mt-2">
            {fmt(summary.netProfit)}
          </div>
          <span className="text-[11px] text-indigo-700 font-bold">
            {summary.marginPct.toFixed(1)}% Operating Profit Margin
          </span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search Inward UID, Client, or Project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8.5 text-xs bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setProfitFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                profitFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Inwards ({inwardRows.length})
            </button>
            <button
              onClick={() => setProfitFilter("profitable")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                profitFilter === "profitable"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Profitable Only
            </button>
            <button
              onClick={() => setProfitFilter("loss")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                profitFilter === "loss"
                  ? "bg-white text-rose-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Cost Deficit
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-3.5">Inward UID & Date</th>
                <th className="py-3 px-3.5">Client & Project</th>
                <th className="py-3 px-3.5 text-right">Invoiced (₹)</th>
                <th className="py-3 px-3.5 text-right">Income Realized (₹)</th>
                <th className="py-3 px-3.5 text-right">Inward Expenses (₹)</th>
                <th className="py-3 px-3.5 text-right">Net Margin (₹)</th>
                <th className="py-3 px-3.5 text-center">Margin %</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    No inwards match the filter criteria.
                  </td>
                </tr>
              ) : (
                pagination.paginatedData.map((r) => {
                  const isPositive = r.netProfit >= 0;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Inward UID */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-blue-600" />
                          <span>{r.uid}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{r.inwardDate}</div>
                      </td>

                      {/* Client & Project */}
                      <td className="py-3.5 px-3.5">
                        <div className="font-semibold text-slate-800">{r.clientName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                          {r.projectName}
                        </div>
                      </td>

                      {/* Invoiced */}
                      <td className="py-3.5 px-3.5 text-right font-medium text-slate-700">
                        {fmt(r.invoicedTotal)}
                      </td>

                      {/* Income Realized */}
                      <td className="py-3.5 px-3.5 text-right font-bold text-emerald-700">
                        {fmt(r.totalIncome)}
                      </td>

                      {/* Inward Expenses */}
                      <td className="py-3.5 px-3.5 text-right font-bold text-rose-700">
                        <div>{fmt(r.totalExpenses)}</div>
                        <span className="text-[10px] text-slate-400">
                          {r.expenseCount} entry{r.expenseCount === 1 ? "" : "s"}
                        </span>
                      </td>

                      {/* Net Margin */}
                      <td
                        className={`py-3.5 px-3.5 text-right font-black text-sm ${
                          isPositive ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {fmt(r.netProfit)}
                      </td>

                      {/* Margin % */}
                      <td className="py-3.5 px-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            r.marginPct >= 30
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : r.marginPct > 0
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {r.marginPct.toFixed(1)}%
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {onRecordExpense && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onRecordExpense(r.job)}
                              className="h-7.5 px-2.5 text-[11px] font-bold text-rose-700 border-rose-200 hover:bg-rose-50 cursor-pointer"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Expense
                            </Button>
                          )}
                          {r.invoicedTotal === 0 && onCreateProforma && (
                            <Button
                              size="sm"
                              onClick={() => onCreateProforma(r.job)}
                              className="h-7.5 px-2.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                            >
                              Invoice
                            </Button>
                          )}
                        </div>
                      </td>
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
          pageSizeOptions={[10, 25, 50]}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          itemLabel="inwards"
        />
      </div>
    </div>
  );
}
