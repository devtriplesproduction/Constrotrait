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
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Plus,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  // Aggregate stats
  const totalAmount = filteredReceipts
    .filter((r) => r.status !== "cancelled")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const bankAmount = filteredReceipts
    .filter((r) => r.status !== "cancelled" && ["bank", "neft", "rtgs"].includes((r.payment_mode || "").toLowerCase()))
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const cashAmount = filteredReceipts
    .filter((r) => r.status !== "cancelled" && (r.payment_mode || "").toLowerCase() === "cash")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const upiAmount = filteredReceipts
    .filter((r) => r.status !== "cancelled" && (r.payment_mode || "").toLowerCase() === "upi")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const getModeBadge = (mode: string) => {
    const m = (mode || "BANK").toUpperCase();
    if (m === "CASH") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Banknote className="w-3 h-3 text-emerald-600" />
          <span>CASH</span>
        </span>
      );
    }
    if (m === "UPI") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
          <Smartphone className="w-3 h-3 text-purple-600" />
          <span>UPI / QR</span>
        </span>
      );
    }
    if (m === "CHEQUE") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <FileText className="w-3 h-3 text-amber-600" />
          <span>CHEQUE</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
        <Landmark className="w-3 h-3 text-blue-600" />
        <span>{m}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Receipts Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Receipts
            </span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">
              {filteredReceipts.length}
            </span>
            <span className="text-[11px] text-slate-400">
              {receipts.length} total in system
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">
              Total Collection
            </span>
            <span className="text-xl font-bold text-emerald-700 mt-0.5 block">
              {fmt(totalAmount)}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">
              Confirmed Inward Funds
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block">
              Bank / NEFT / RTGS
            </span>
            <span className="text-xl font-bold text-blue-700 mt-0.5 block">
              {fmt(bankAmount)}
            </span>
            <span className="text-[11px] text-blue-600 font-medium">Direct Bank Transfers</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Landmark className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider block">
              Cash & UPI
            </span>
            <span className="text-xl font-bold text-purple-700 mt-0.5 block">
              {fmt(cashAmount + upiAmount)}
            </span>
            <span className="text-[11px] text-purple-600 font-medium">
              Cash: {fmt(cashAmount)} · UPI: {fmt(upiAmount)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search receipt #, client, invoice #, remarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs border-slate-300 w-full"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Status
              </button>
              <button
                onClick={() => setStatusFilter("received")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === "received" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Received
              </button>
              <button
                onClick={() => setStatusFilter("cancelled")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === "cancelled" ? "bg-white text-rose-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Cancelled
              </button>
            </div>

            {/* Create Receipt Button */}
            {onOpenCreateReceipt && (
              <Button
                size="sm"
                onClick={onOpenCreateReceipt}
                className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Receipt</span>
              </Button>
            )}
          </div>
        </div>

        {/* Mode Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Mode:
          </span>
          {[
            { id: "all", label: "All Modes" },
            { id: "bank", label: "Bank / NEFT / RTGS" },
            { id: "upi", label: "UPI" },
            { id: "cash", label: "Cash" },
            { id: "cheque", label: "Cheque" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setModeFilter(m.id)}
              className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                modeFilter === m.id
                  ? "bg-slate-800 text-white font-semibold"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Receipts Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Receipt # & Date</th>
                <th className="py-3 px-4">Customer / Received From</th>
                <th className="py-3 px-4">Reference / Against Invoice</th>
                <th className="py-3 px-4">Payment Mode & Account</th>
                <th className="py-3 px-4 text-right">Amount Received</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="w-8 h-8 text-slate-300" />
                      <p className="font-medium text-sm">No payment receipts found</p>
                      <p className="text-xs text-slate-400">
                        {searchTerm || modeFilter !== "all" || statusFilter !== "all"
                          ? "Try clearing or adjusting your search filters."
                          : "Payments recorded against invoices or direct inward receipts will appear here automatically."}
                      </p>
                      {(searchTerm || modeFilter !== "all" || statusFilter !== "all") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchTerm("");
                            setModeFilter("all");
                            setStatusFilter("all");
                          }}
                          className="mt-2 text-xs h-8 cursor-pointer"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((r) => {
                  const payments = Array.isArray(r.invoice_payments) ? r.invoice_payments : [];
                  const firstPayment = payments.length > 0 ? payments[0] : null;
                  const inv = firstPayment?.invoices;
                  const invNo = inv?.invoice_no || r.remarks?.match(/(?:INV|PI)\/[^\s,]+/)?.[0];
                  const inwardUid = inv?.job_entries?.uid_label;
                  const isCancelled = r.status === "cancelled";

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isCancelled ? "bg-rose-50/20 opacity-75" : ""
                      }`}
                    >
                      {/* Receipt # & Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                            {r.receipt_no}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{r.receipt_date || r.created_at?.slice(0, 10)}</span>
                        </div>
                      </td>

                      {/* Customer / Received From */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {r.party_name || r.clients?.name || "Customer"}
                        </div>
                        {r.clients?.contact_person && (
                          <div className="text-[11px] text-slate-500">
                            Attn: {r.clients.contact_person}
                          </div>
                        )}
                        {r.clients?.mobile && (
                          <div className="text-[11px] text-slate-400">{r.clients.mobile}</div>
                        )}
                        {!r.clients && r.party_type && (
                          <span className="inline-block mt-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                            {r.party_type.toUpperCase()}
                          </span>
                        )}
                      </td>

                      {/* Reference / Against Invoice */}
                      <td className="py-3.5 px-4">
                        {invNo ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <span>Against {invNo}</span>
                            </span>
                            {inwardUid && (
                              <div className="text-[11px] text-slate-500">
                                Inward: <span className="font-semibold">{inwardUid}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">
                            Direct Inward Receipt
                          </span>
                        )}
                        {r.remarks && (
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 italic max-w-xs">
                            {r.remarks}
                          </div>
                        )}
                      </td>

                      {/* Payment Mode & Account */}
                      <td className="py-3.5 px-4">
                        <div>{getModeBadge(r.payment_mode)}</div>
                        {r.financial_accounts?.name && (
                          <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1">
                            <Landmark className="w-3 h-3 text-slate-400" />
                            <span>{r.financial_accounts.name}</span>
                          </div>
                        )}
                      </td>

                      {/* Amount Received */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-extrabold text-sm text-slate-900">
                          {fmt(r.amount)}
                        </div>
                        {Number(r.gst_amount || 0) > 0 && (
                          <div className="text-[10px] text-slate-400">
                            Incl. GST: {fmt(r.gst_amount)}
                          </div>
                        )}
                        {Number(r.tds_amount || 0) > 0 && (
                          <div className="text-[10px] text-amber-600">
                            TDS: -{fmt(r.tds_amount)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            <span>Cancelled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Received</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewReceipt(r)}
                            className="h-7 px-2.5 text-xs font-semibold gap-1 hover:bg-slate-100 text-slate-700 cursor-pointer"
                          >
                            <Printer className="w-3 h-3 text-slate-500" />
                            <span>View Receipt</span>
                          </Button>

                          {!isCancelled && onCancelReceipt && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const reason = prompt(`Reason for cancelling receipt ${r.receipt_no}?`);
                                if (reason && reason.trim()) {
                                  onCancelReceipt(r.id, reason.trim());
                                }
                              }}
                              className="h-7 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                            >
                              Cancel
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
      </div>
    </div>
  );
}
