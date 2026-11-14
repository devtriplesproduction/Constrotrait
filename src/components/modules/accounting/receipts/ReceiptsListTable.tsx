"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Search,
  Receipt,
  Calendar,
  Landmark,
  FileText,
  Plus,
  Filter,
  Copy,
  Check,
  X,
  Building2,
  Eye,
  Smartphone,
  Banknote,
  XCircle,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const channelOptions = useMemo(
    () => [
      {
        value: "all",
        label: `All Channels (${countsByMode.all})`,
      },
      {
        value: "bank",
        label: `Bank / NEFT / RTGS (${countsByMode.bank})`,
      },
      {
        value: "upi",
        label: `UPI & QR Codes (${countsByMode.upi})`,
      },
      {
        value: "cash",
        label: `Cash (${countsByMode.cash})`,
      },
      {
        value: "cheque",
        label: `Cheque (${countsByMode.cheque})`,
      },
    ],
    [countsByMode]
  );

  const statusOptions = useMemo(
    () => [
      {
        value: "all",
        label: (
          <span className="flex items-center gap-1.5">
            <span>All Statuses</span>
            <span className="text-[10px] opacity-75 font-mono">({countsByStatus.all})</span>
          </span>
        ),
      },
      {
        value: "received",
        label: (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Received</span>
            <span className="text-[10px] opacity-75 font-mono">({countsByStatus.received})</span>
          </span>
        ),
      },
      {
        value: "cancelled",
        label: (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>Cancelled</span>
            <span className="text-[10px] opacity-75 font-mono">({countsByStatus.cancelled})</span>
          </span>
        ),
      },
    ],
    [countsByStatus]
  );

  const getModeBadge = (mode: string) => {
    const m = (mode || "BANK").toUpperCase();
    if (m === "CASH") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <Banknote className="w-3 h-3 text-amber-600" />
          <span>CASH</span>
        </span>
      );
    }
    if (m === "UPI" || m === "QR") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
          <Smartphone className="w-3 h-3 text-purple-600" />
          <span>UPI / QR</span>
        </span>
      );
    }
    if (m === "CHEQUE") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <FileText className="w-3 h-3 text-amber-600" />
          <span>CHEQUE</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
        <Landmark className="w-3 h-3 text-blue-600" />
        <span>{m}</span>
      </span>
    );
  };

  const hasActiveFilters = searchTerm.trim() !== "" || modeFilter !== "all" || statusFilter !== "all";

  return (
    <div className="animate-in fade-in duration-500 mt-2 space-y-5">
      {/* Filter Receipts Hub */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 mb-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <SlidersHorizontal className="w-5 h-5 text-orange-500" />
            <span>Filter Receipts</span>
          </div>

          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setModeFilter("all");
                  setStatusFilter("all");
                }}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}

            {onOpenCreateReceipt && (
              <Button
                variant="custom"
                size="none"
                onClick={onOpenCreateReceipt}
                className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-sm transition-all flex items-center"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>New Receipt</span>
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Search</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search receipt #, client, invoice #, account, remarks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-9 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors shadow-sm bg-white"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="w-full sm:w-52 shrink-0">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Receipt Status</label>
            <Dropdown
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              placeholder="All Statuses"
              options={statusOptions}
              buttonClassName="bg-white border-slate-200 shadow-sm rounded-xl h-10 text-xs font-semibold"
            />
          </div>

          <div className="w-full sm:w-56 shrink-0">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payment Channel</label>
            <Dropdown
              value={modeFilter}
              onChange={(val) => setModeFilter(val)}
              placeholder="All Channels"
              options={channelOptions}
              buttonClassName="bg-white border-slate-200 shadow-sm rounded-xl h-10 text-xs font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-sm bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/80 text-[11px] uppercase tracking-widest text-slate-400 font-bold border-b border-slate-200/80">
            <tr>
              <th className="px-6 py-4 rounded-tl-2xl">Receipt #</th>
              <th className="px-6 py-4">Customer / Received From</th>
              <th className="px-6 py-4">Receipt Date</th>
              <th className="px-6 py-4">Reference / Invoice</th>
              <th className="px-6 py-4">Payment Channel & Account</th>
              <th className="px-6 py-4 text-right">Amount Received</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 rounded-tr-2xl text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredReceipts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-14 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3 py-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                      <Receipt className="w-7 h-7" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-bold text-sm sm:text-base text-slate-800">No payment receipts found</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {hasActiveFilters
                          ? "No receipts match the selected filters. Try clearing your filters."
                          : "Payments recorded against invoices or inward receipts will appear here automatically."}
                      </p>
                    </div>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm("");
                          setModeFilter("all");
                          setStatusFilter("all");
                        }}
                        className="mt-1 text-xs h-8 px-4 cursor-pointer rounded-xl border border-slate-200 hover:border-orange-300 hover:text-orange-600 font-semibold transition-all shadow-sm"
                      >
                        Clear Filters
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

                const partyName = r.party_name || r.clients?.name || "Customer";
                const partyInitial = (partyName.trim().charAt(0) || "C").toUpperCase();

                let receiptDateStr = "—";
                if (r.receipt_date || r.created_at) {
                  try {
                    receiptDateStr = format(new Date(r.receipt_date || r.created_at), "dd MMM, yyyy");
                  } catch {
                    receiptDateStr = String(r.receipt_date || r.created_at).slice(0, 10);
                  }
                }

                return (
                  <tr
                    key={r.id}
                    className={`hover:bg-orange-50/30 transition-colors group cursor-pointer ${
                      isCancelled ? "bg-rose-50/20 opacity-75" : ""
                    }`}
                  >
                    {/* Receipt # */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <div className="font-bold text-slate-800 text-[13px] flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono">{r.receipt_no}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {r.id?.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm bg-blue-100 text-blue-700">
                          {partyInitial}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 text-[13px] truncate max-w-[190px]" title={partyName}>
                            {partyName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium truncate max-w-[190px]">
                            {r.party_type ? r.party_type.toUpperCase() : "Direct Customer"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Receipt Date */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-semibold text-[13px]">{receiptDateStr}</span>
                      </div>
                    </td>

                    {/* Reference / Invoice */}
                    <td className="px-6 py-4">
                      {invNo ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <FileText className="w-3 h-3 text-emerald-600" />
                            <span>Against {invNo}</span>
                          </span>
                          {inwardUid && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              Inward: <strong className="text-slate-700 font-mono">{inwardUid}</strong>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                          Direct Inward Receipt
                        </span>
                      )}
                      {r.remarks && (
                        <div className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic max-w-xs">
                          &quot;{r.remarks}&quot;
                        </div>
                      )}
                    </td>

                    {/* Channel & Account */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <div>{getModeBadge(r.payment_mode)}</div>
                        {r.financial_accounts?.name && (
                          <div className="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                            <Landmark className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[150px]">{r.financial_accounts.name}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Amount Received */}
                    <td className="px-6 py-4 text-right">
                      <div className="font-mono font-bold text-emerald-700 text-[13px] tracking-tight tabular-nums">
                        {fmt(r.amount)}
                      </div>
                      {Number(r.gst_amount || 0) > 0 && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Incl. GST: {fmt(r.gst_amount)}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      {isCancelled ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>Cancelled</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Received</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="w-[92px]">
                          <Dropdown
                            className="w-[92px] space-y-0"
                            placeholder={<span className="font-semibold text-slate-700 text-xs">Actions</span>}
                            options={[
                              {
                                label: (
                                  <span className="flex items-center gap-2 text-slate-700 font-medium">
                                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                                    <span>View Receipt</span>
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
                            menuWidth={160}
                            buttonClassName="h-8 py-0 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded-xl transition-all text-slate-700 cursor-pointer group text-xs font-semibold"
                            iconClassName="text-slate-400 group-hover:text-slate-600 w-3 h-3"
                            itemClassName="text-xs py-2 px-3 hover:bg-slate-50 cursor-pointer"
                            value=""
                            onChange={(val) => {
                              if (val === "view") {
                                onViewReceipt(r);
                              } else if (val === "cancel") {
                                const reason = prompt(`Reason for cancelling receipt ${r.receipt_no}?`);
                                if (reason && reason.trim()) {
                                  onCancelReceipt(r.id, reason.trim());
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
  );
}
