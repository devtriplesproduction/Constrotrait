"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Receipt,
  Printer,
  Calendar,
  IndianRupee,
  Landmark,
  CreditCard,
  Banknote,
  Smartphone,
  XCircle,
  FileText,
  AlertCircle,
  Plus,
  ArrowUpRight,
  Filter,
  Copy,
  Check,
  X,
  RotateCcw,
  Building2,
  Sparkles,
  Eye,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/Dropdown";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/use-pagination";

interface ReceiptsListTableProps {
  receipts: any[];
  onViewReceipt: (receipt: any) => void;
  onCancelReceipt?: (receiptId: string, reason: string) => void;
  onOpenCreateReceipt?: () => void;
}

const fmt = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function ReceiptsListTable({
  receipts = [],
  onViewReceipt,
  onCancelReceipt,
  onOpenCreateReceipt,
}: ReceiptsListTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      // Mode filter
      if (modeFilter !== "all") {
        const mode = (r.payment_mode || "").toLowerCase();
        if (modeFilter === "bank" && !["bank", "neft", "rtgs"].includes(mode)) return false;
        if (modeFilter === "upi" && mode !== "upi") return false;
        if (modeFilter === "cash" && mode !== "cash") return false;
        if (modeFilter === "cheque" && mode !== "cheque") return false;
      }

      // Status filter
      if (statusFilter !== "all" && (r.status || "received") !== statusFilter) {
        return false;
      }

      // Search term
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();

      const rNo = (r.receipt_no || "").toLowerCase();
      const party = (r.party_name || r.clients?.name || "").toLowerCase();
      const remarks = (r.remarks || "").toLowerCase();
      const pMode = (r.payment_mode || "").toLowerCase();
      const acc = (r.financial_accounts?.name || "").toLowerCase();

      // Check linked payments / invoices
      const payments = Array.isArray(r.invoice_payments) ? r.invoice_payments : [];
      const hasInvMatch = payments.some((p: any) => {
        const invNo = (p.invoices?.invoice_no || "").toLowerCase();
        const uid = (p.invoices?.job_entries?.uid_label || "").toLowerCase();
        return invNo.includes(q) || uid.includes(q);
      });

      return (
        rNo.includes(q) ||
        party.includes(q) ||
        remarks.includes(q) ||
        pMode.includes(q) ||
        acc.includes(q) ||
        hasInvMatch
      );
    });
  }, [receipts, searchTerm, modeFilter, statusFilter]);

  const pagination = usePagination({
    data: filteredReceipts,
    initialPageSize: 10,
  });

  // Mode and status counts across entire receipts list
  const countsByMode = useMemo(() => {
    return {
      all: receipts.length,
      bank: receipts.filter((r) =>
        ["bank", "neft", "rtgs"].includes((r.payment_mode || "").toLowerCase())
      ).length,
      upi: receipts.filter((r) => (r.payment_mode || "").toLowerCase() === "upi").length,
      cash: receipts.filter((r) => (r.payment_mode || "").toLowerCase() === "cash").length,
      cheque: receipts.filter((r) => (r.payment_mode || "").toLowerCase() === "cheque").length,
    };
  }, [receipts]);

  const countsByStatus = useMemo(() => {
    return {
      all: receipts.length,
      received: receipts.filter((r) => (r.status || "received") === "received").length,
      cancelled: receipts.filter((r) => r.status === "cancelled").length,
    };
  }, [receipts]);

  // Aggregate stats based on active filtered data
  const activeReceipts = filteredReceipts.filter((r) => r.status !== "cancelled");
  const totalAmount = activeReceipts.reduce((s, r) => s + Number(r.amount || 0), 0);

  const isFiltered = searchTerm.trim() !== "" || modeFilter !== "all" || statusFilter !== "all";

  const getModeBadge = (mode: string) => {
    const m = (mode || "BANK").toUpperCase();
    if (m === "CASH") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs">
          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
          <span>CASH</span>
        </span>
      );
    }
    if (m === "UPI") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200/80 shadow-2xs">
          <Smartphone className="w-3.5 h-3.5 text-purple-600" />
          <span>UPI / QR</span>
        </span>
      );
    }
    if (m === "CHEQUE") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
          <FileText className="w-3.5 h-3.5 text-amber-600" />
          <span>CHEQUE</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200/80 shadow-2xs">
        <Landmark className="w-3.5 h-3.5 text-blue-600" />
        <span>{m}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-slate-200/90 rounded-2xl space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search receipt #, client, invoice #, account, remarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs border-slate-200 bg-slate-50/50 rounded-xl focus:bg-white transition-colors w-full"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/50 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Segmented Buttons */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl text-xs font-bold border border-slate-200/50">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === "all"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>All</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700">
                  {countsByStatus.all}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("received")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === "received"
                    ? "bg-white text-emerald-800 shadow-xs border border-emerald-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Received</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                  {countsByStatus.received}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("cancelled")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === "cancelled"
                    ? "bg-white text-rose-800 shadow-xs border border-rose-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Cancelled</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800">
                  {countsByStatus.cancelled}
                </span>
              </button>
            </div>

            {/* Create Receipt Primary Button */}
            {onOpenCreateReceipt && (
              <Button
                size="sm"
                onClick={onOpenCreateReceipt}
                className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-xs hover:shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Receipt</span>
              </Button>
            )}
          </div>
        </div>

        {/* Mode Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2.5 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 mr-1.5 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" /> Channel:
          </span>
          {[
            { id: "all", label: "All Channels", count: countsByMode.all, icon: null },
            { id: "bank", label: "Bank / NEFT / RTGS", count: countsByMode.bank, icon: Landmark },
            { id: "upi", label: "UPI / QR", count: countsByMode.upi, icon: Smartphone },
            { id: "cash", label: "Cash", count: countsByMode.cash, icon: Banknote },
            { id: "cheque", label: "Cheque", count: countsByMode.cheque, icon: FileText },
          ].map((m) => {
            const Icon = m.icon;
            const isSelected = modeFilter === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setModeFilter(m.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                {Icon && <Icon className="w-3 h-3 opacity-75" />}
                <span>{m.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {m.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Filter Feedback Ribbon */}
        {isFiltered && (
          <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 mt-2">
            <div className="flex items-center gap-2 text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>
                Showing <strong className="text-slate-900">{filteredReceipts.length}</strong> of{" "}
                <strong className="text-slate-900">{receipts.length}</strong> receipts
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Filtered Realized Value:{" "}
                <strong className="font-mono text-emerald-700">{fmt(totalAmount)}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setModeFilter("all");
                setStatusFilter("all");
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Receipts Data Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/90 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Receipt # & Date</th>
                <th className="py-3 px-4">Customer / Received From</th>
                <th className="py-3 px-4">Reference / Against Invoice</th>
                <th className="py-3 px-4">Payment Channel & Account</th>
                <th className="py-3 px-4 text-right">Amount Received</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-800 text-sm">No payment receipts found</p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {isFiltered
                          ? "No receipts match the selected filters or keyword search. Try clearing filters to see all vouchers."
                          : "Payments recorded against customer invoices or direct inward receipts will be recorded here automatically."}
                      </p>
                      {isFiltered && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchTerm("");
                            setModeFilter("all");
                            setStatusFilter("all");
                          }}
                          className="mt-2 text-xs h-8 rounded-xl font-bold gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Clear Filters</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                pagination.paginatedData.map((r) => {
                  const payments = Array.isArray(r.invoice_payments) ? r.invoice_payments : [];
                  const firstPayment = payments.length > 0 ? payments[0] : null;
                  const inv = firstPayment?.invoices;
                  const invNo = inv?.invoice_no || r.remarks?.match(/(?:INV|PI)\/[^\s,]+/)?.[0];
                  const inwardUid = inv?.job_entries?.uid_label;
                  const isCancelled = r.status === "cancelled";
                  const isCopied = copiedId === `rec-${r.id}`;

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCancelled ? "bg-rose-50/20 opacity-75" : ""
                      }`}
                    >
                      {/* Receipt # & Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100/90 px-2.5 py-1 rounded-md border border-slate-200">
                            {r.receipt_no}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(r.receipt_no, `rec-${r.id}`)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                            title="Copy Receipt #"
                          >
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{r.receipt_date || r.created_at?.slice(0, 10)}</span>
                        </div>
                      </td>

                      {/* Customer / Received From */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {r.party_name || r.clients?.name || "Customer"}
                            </div>
                            {r.clients?.contact_person && (
                              <div className="text-[11px] text-slate-500">
                                Attn: {r.clients.contact_person}
                              </div>
                            )}
                            {r.clients?.mobile && (
                              <div className="text-[11px] text-slate-400 font-mono">
                                {r.clients.mobile}
                              </div>
                            )}
                            {!r.clients && r.party_type && (
                              <span className="inline-block mt-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                {r.party_type.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Reference / Against Invoice */}
                      <td className="py-3.5 px-4">
                        {invNo ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shadow-2xs">
                              <FileText className="w-3 h-3 text-emerald-600" />
                              <span>Against {invNo}</span>
                            </span>
                            {inwardUid && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                <span>Inward:</span>
                                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded">
                                  {inwardUid}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Direct Inward Receipt
                          </span>
                        )}
                        {r.remarks && (
                          <div className="text-[11px] text-slate-500 mt-1 line-clamp-1 italic max-w-xs">
                            &quot;{r.remarks}&quot;
                          </div>
                        )}
                      </td>

                      {/* Payment Channel & Account */}
                      <td className="py-3.5 px-4">
                        <div>{getModeBadge(r.payment_mode)}</div>
                        {r.financial_accounts?.name && (
                          <div className="text-[11px] text-slate-600 mt-1.5 flex items-center gap-1 font-medium bg-slate-50 border border-slate-200/70 px-2 py-0.5 rounded-md w-fit">
                            <Landmark className="w-3 h-3 text-slate-400" />
                            <span>{r.financial_accounts.name}</span>
                          </div>
                        )}
                      </td>

                      {/* Amount Received */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-black text-sm text-slate-900 tracking-tight">
                          {fmt(r.amount)}
                        </div>
                        {Number(r.gst_amount || 0) > 0 && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Incl. GST: {fmt(r.gst_amount)}
                          </div>
                        )}
                        {Number(r.tds_amount || 0) > 0 && (
                          <div className="text-[10px] text-amber-700 font-mono font-bold">
                            TDS: -{fmt(r.tds_amount)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>Cancelled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Received</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                          <div className="w-[84px]" onClick={(e) => e.stopPropagation()}>
                            <Dropdown
                              className="w-[84px] space-y-0"
                              placeholder={
                                <span className="font-semibold text-slate-700 text-xs tracking-tight">
                                  Actions
                                </span>
                              }
                              options={[
                                {
                                  label: (
                                    <span className="flex items-center gap-2 text-slate-700 font-medium">
                                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                                      <span>View</span>
                                    </span>
                                  ),
                                  value: "view",
                                },
                                ...(!isCancelled && onCancelReceipt
                                  ? [
                                      {
                                        label: (
                                          <span className="flex items-center gap-2 text-rose-600 font-semibold">
                                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                            <span>Cancel</span>
                                          </span>
                                        ),
                                        value: "cancel",
                                      },
                                    ]
                                  : []),
                              ]}
                              align="right"
                              menuWidth={150}
                              buttonClassName="h-7 py-0 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs rounded-lg transition-all text-slate-700 cursor-pointer group text-xs font-semibold"
                              iconClassName="text-slate-400 group-hover:text-slate-600 w-3 h-3"
                              itemClassName="text-xs py-2 px-3 hover:bg-slate-50 cursor-pointer"
                              value=""
                              onChange={(val) => {
                                if (val === "view") {
                                  onViewReceipt(r);
                                } else if (val === "cancel") {
                                  const reason = prompt(`Reason for cancelling receipt ${r.receipt_no}?`);
                                  if (reason && reason.trim()) {
                                    onCancelReceipt?.(r.id, reason.trim());
                                  }
                                }
                              }}
                            />
                          </div>
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
          itemLabel="receipts"
        />
      </div>
    </div>
  );
}
