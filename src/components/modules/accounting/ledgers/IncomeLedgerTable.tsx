"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Download,
  Printer,
  TrendingUp,
  Landmark,
  Package,
  Eye,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building,
  User,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/use-pagination";
import { useToast } from "@/hooks/use-toast";

interface IncomeLedgerTableProps {
  incomeEntries: any[];
  onViewReceipt?: (receipt: any) => void;
  onRefresh?: () => void;
}

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export function IncomeLedgerTable({
  incomeEntries = [],
  onViewReceipt,
  onRefresh,
}: IncomeLedgerTableProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "inward" | "direct">("all");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Extract unique accounts
  const accounts = useMemo(() => {
    const set = new Set<string>();
    incomeEntries.forEach((r) => {
      if (r.account_name) set.add(r.account_name);
    });
    return Array.from(set).sort();
  }, [incomeEntries]);

  // Filtered income entries
  const filtered = useMemo(() => {
    return incomeEntries.filter((r) => {
      // Type filter
      const isInward = !!r.inward_id || !!r.inward_uid;
      if (typeFilter === "inward" && !isInward) return false;
      if (typeFilter === "direct" && isInward) return false;

      // Mode filter
      if (paymentModeFilter !== "all" && r.payment_mode !== paymentModeFilter) return false;

      // Account filter
      if (accountFilter !== "all" && r.account_name !== accountFilter) return false;

      // Date range filter
      const date = r.date || (r.created_at ? r.created_at.slice(0, 10) : "");
      if (fromDate && date < fromDate) return false;
      if (toDate && date > toDate) return false;

      // Search term
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const voucherMatch = (r.voucher_no || "").toLowerCase().includes(q);
      const partyMatch = (r.party_name || "").toLowerCase().includes(q);
      const uidMatch = (r.inward_uid || "").toLowerCase().includes(q);
      const particularsMatch = (r.particulars || "").toLowerCase().includes(q);

      return voucherMatch || partyMatch || uidMatch || particularsMatch;
    });
  }, [incomeEntries, typeFilter, paymentModeFilter, accountFilter, fromDate, toDate, searchTerm]);

  const pagination = usePagination({
    data: filtered,
    initialPageSize: 10,
  });

  // Summary Metrics
  const summary = useMemo(() => {
    let total = 0;
    let inwardIncome = 0;
    let directIncome = 0;
    let cashIncome = 0;
    let bankIncome = 0;

    filtered.forEach((r) => {
      const amt = Number(r.amount || 0);
      total += amt;
      if (r.inward_id || r.inward_uid) inwardIncome += amt;
      else directIncome += amt;

      if (r.payment_mode === "cash") cashIncome += amt;
      else bankIncome += amt;
    });

    return { total, inwardIncome, directIncome, cashIncome, bankIncome };
  }, [filtered]);

  // Export Excel
  const handleExportExcel = () => {
    if (filtered.length === 0) {
      toast({ title: "No Data", description: "No income records to export.", variant: "warning" });
      return;
    }

    const exportData = filtered.map((r) => ({
      "Date": r.date || "",
      "Voucher / Receipt No": r.voucher_no || "",
      "Type": r.type_label || (r.inward_id ? "Inward Receipt" : "Direct Receipt"),
      "Inward UID": r.inward_uid || "",
      "Party / Client": r.party_name || "",
      "Account / Bank": r.account_name || "",
      "Payment Mode": r.payment_mode || "",
      "Particulars": r.particulars || "",
      "Credit Amount (INR)": Number(r.amount || 0),
      "GST Amount": Number(r.gst_amount || 0),
      "TDS Amount": Number(r.tds_amount || 0),
      "Status": r.status || "received",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet["!cols"] = [
      { wch: 14 }, // Date
      { wch: 22 }, // Voucher / Receipt No
      { wch: 18 }, // Type
      { wch: 16 }, // Inward UID
      { wch: 24 }, // Party / Client
      { wch: 20 }, // Account / Bank
      { wch: 15 }, // Payment Mode
      { wch: 32 }, // Particulars
      { wch: 18 }, // Credit Amount (INR)
      { wch: 12 }, // GST Amount
      { wch: 12 }, // TDS Amount
      { wch: 14 }, // Status
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Income");
    XLSX.writeFile(workbook, `Income_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Success", description: "Excel file exported successfully.", variant: "success" });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <div className="p-3.5 sm:p-4 bg-gradient-to-b from-blue-50/30 via-white to-white rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Recorded Inflows
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 border border-emerald-100/80 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 font-sans">{fmt(summary.total)}</div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500">All cleared credit transactions</div>
        </div>

        <div className="p-3.5 sm:p-4 bg-gradient-to-b from-blue-50/30 via-white to-white rounded-xl border border-slate-200/80 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                Inward Testing Revenue
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 border border-blue-100/80 text-blue-700 flex items-center justify-center">
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 font-sans">{fmt(summary.inwardIncome)}</div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-blue-700 font-medium truncate">Job advances & invoiced collections</div>
        </div>

        <div className="p-3.5 sm:p-4 bg-gradient-to-b from-emerald-50/30 via-white to-white rounded-xl border border-slate-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Bank & Digital Inflows
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 border border-emerald-100/80 text-emerald-700 flex items-center justify-center">
                <Landmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 font-sans">{fmt(summary.bankIncome)}</div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-emerald-700 font-medium truncate">NEFT, RTGS, UPI & Cheques</div>
        </div>

        <div className="p-3.5 sm:p-4 bg-gradient-to-b from-amber-50/30 via-white to-white rounded-xl border border-slate-200/80 hover:border-amber-300 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                Cash Counter Inflows
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 border border-amber-100/80 text-amber-700 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 font-sans">{fmt(summary.cashIncome)}</div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-amber-700 font-medium">Physical cash receipts</div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Type Toggle & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Inflows ({incomeEntries.length})
            </button>
            <button
              onClick={() => setTypeFilter("inward")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                typeFilter === "inward"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Inward Linked</span>
            </button>
            <button
              onClick={() => setTypeFilter("direct")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                typeFilter === "direct"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Direct Receipts</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-8.5 px-3 text-xs font-semibold gap-1.5 text-slate-700"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8.5 px-3 text-xs font-semibold gap-1.5 text-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </Button>
          </div>
        </div>

        {/* Secondary Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1 border-t border-slate-100">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search by receipt no, party, UID, particulars..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8.5 text-xs bg-slate-50/50"
            />
          </div>

          <div>
            <select
              value={paymentModeFilter}
              onChange={(e) => setPaymentModeFilter(e.target.value)}
              className="w-full h-8.5 px-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium outline-none"
            >
              <option value="all">All Payment Modes</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer / NEFT</option>
              <option value="upi">UPI</option>
              <option value="cheque">Cheque</option>
              <option value="rtgs">RTGS</option>
            </select>
          </div>

          <div>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full h-8.5 px-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium outline-none"
            >
              <option value="all">All Accounts / Banks</option>
              {accounts.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <Input
              type="date"
              placeholder="From"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8.5 text-[11px] px-2 bg-slate-50/50"
            />
            <span className="text-slate-400 text-xs">-</span>
            <Input
              type="date"
              placeholder="To"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8.5 text-[11px] px-2 bg-slate-50/50"
            />
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
                <th className="py-3 px-3.5">Voucher / Receipt No</th>
                <th className="py-3 px-3.5">Type & Inward Ref</th>
                <th className="py-3 px-3.5">Client / Party</th>
                <th className="py-3 px-3.5">Deposited Account</th>
                <th className="py-3 px-3.5">Payment Mode</th>
                <th className="py-3 px-3.5">Particulars</th>
                <th className="py-3 px-3.5 text-right">Credit Amount (₹)</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                    No income ledger entries match the selected filters.
                  </td>
                </tr>
              ) : (
                pagination.paginatedData.map((r) => {
                  const isInward = !!r.inward_id || !!r.inward_uid;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-900">
                        {r.date || (r.created_at ? r.created_at.slice(0, 10) : "N/A")}
                      </td>

                      {/* Voucher No */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-blue-700 font-bold">
                        {r.voucher_no || `REC-${r.id.slice(0, 6).toUpperCase()}`}
                      </td>

                      {/* Type & Inward Ref */}
                      <td className="py-3 px-3.5">
                        {isInward ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Package className="w-3 h-3 text-blue-600" />
                              <span>{r.inward_uid || "INWARD"}</span>
                            </span>
                            {r.project_name && (
                              <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                                {r.project_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Landmark className="w-3 h-3 text-emerald-600" />
                            <span>DIRECT RECEIPT</span>
                          </span>
                        )}
                      </td>

                      {/* Client / Party */}
                      <td className="py-3 px-3.5 font-semibold text-slate-800">
                        {r.party_name || "—"}
                      </td>

                      {/* Deposited Account */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-700">
                        {r.account_name || "Cash Drawer"}
                      </td>

                      {/* Mode */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="inline-block uppercase text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {r.payment_mode || "CASH"}
                        </span>
                      </td>

                      {/* Particulars */}
                      <td className="py-3 px-3.5 max-w-[200px] truncate text-slate-600">
                        {r.particulars || "—"}
                      </td>

                      {/* Credit Amount */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-right font-black text-emerald-700 text-sm">
                        {fmt(r.amount)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Received</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-right">
                        {onViewReceipt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewReceipt(r.receipt_id ? { id: r.receipt_id } : r)}
                            className="h-7 px-2 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                        )}
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
          pageSizeOptions={[10, 25, 50, 100]}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          itemLabel="income entries"
        />
      </div>
    </div>
  );
}
