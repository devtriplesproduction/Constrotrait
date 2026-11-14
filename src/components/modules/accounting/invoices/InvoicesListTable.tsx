"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Search,
  Eye,
  CreditCard,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  Calendar,
  FilePlus2,
  Printer,
  Copy,
  Check,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/Dropdown";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/use-pagination";
import { isNablJob } from "@/utils/uid-sort";

interface InvoicesListTableProps {
  invoices: any[];
  onViewInvoice: (invoice: any) => void;
  onRecordPayment: (invoice: any) => void;
  onConvertToTaxInvoice?: (invoice: any) => void;
  onViewReceipt?: (receipt: any) => void;
  onCreateRemainingInvoice?: (inward: any, options?: any) => void;
}

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export function InvoicesListTable({
  invoices = [],
  onViewInvoice,
  onRecordPayment,
  onViewReceipt,
  onCreateRemainingInvoice,
}: InvoicesListTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "proforma" | "tax_invoice">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "partial" | "paid">("all");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Type filter
      if (typeFilter !== "all") {
        if (typeFilter === "proforma" && inv.invoice_type !== "proforma") return false;
        if (typeFilter === "tax_invoice" && inv.invoice_type === "proforma") return false;
      }

      // Status filter
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;

      // Search term
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const noMatch = inv.invoice_no?.toLowerCase().includes(q);
      const clientMatch = inv.clients?.name?.toLowerCase().includes(q);
      const uidMatch = inv.job_entries?.uid_label?.toLowerCase().includes(q) || String(inv.job_entries?.uid || "").includes(q);
      const notesMatch = inv.notes?.toLowerCase().includes(q);

      return noMatch || clientMatch || uidMatch || notesMatch;
    });
  }, [invoices, searchTerm, typeFilter, statusFilter]);

  const pagination = usePagination({
    data: filteredInvoices,
    initialPageSize: 10,
  });

  // Status counts
  const unpaidCount = invoices.filter((i) => i.status === "unpaid").length;
  const partialCount = invoices.filter((i) => i.status === "partial").length;
  const paidCount = invoices.filter((i) => i.status === "paid").length;

  // Type counts
  const proformaCount = invoices.filter((i) => i.invoice_type === "proforma").length;
  const taxCount = invoices.filter((i) => i.invoice_type !== "proforma").length;

  const hasActiveFilters = searchTerm.trim() !== "" || typeFilter !== "all" || statusFilter !== "all";

  return (
    <div className="animate-in fade-in duration-500 mt-2 space-y-5">
      {/* Filter Invoices Hub */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 mb-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <SlidersHorizontal className="w-5 h-5 text-orange-500" />
            <span>Filter Invoices</span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("all");
                setStatusFilter("all");
              }}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
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
                placeholder="Search invoice #, client name, UID, notes..."
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

          <div className="w-full sm:w-56 shrink-0">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Invoice Type</label>
            <Dropdown
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as any)}
              placeholder="All Types"
              buttonClassName="bg-white border-slate-200 shadow-sm rounded-xl h-10 text-xs font-semibold"
              options={[
                {
                  value: "all",
                  label: (
                    <span className="flex items-center gap-1.5">
                      <span>All Types</span>
                      <span className="text-[10px] opacity-75 font-mono">({invoices.length})</span>
                    </span>
                  ),
                },
                {
                  value: "proforma",
                  label: (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                      <span>Proforma</span>
                      <span className="text-[10px] opacity-75 font-mono">({proformaCount})</span>
                    </span>
                  ),
                },
                {
                  value: "tax_invoice",
                  label: (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>Tax Invoices</span>
                      <span className="text-[10px] opacity-75 font-mono">({taxCount})</span>
                    </span>
                  ),
                },
              ]}
            />
          </div>

          <div className="w-full sm:w-52 shrink-0">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payment Status</label>
            <Dropdown
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as any)}
              placeholder="All Statuses"
              buttonClassName="bg-white border-slate-200 shadow-sm rounded-xl h-10 text-xs font-semibold"
              options={[
                {
                  value: "all",
                  label: (
                    <span className="flex items-center gap-1.5">
                      <span>All Statuses</span>
                      <span className="text-[10px] opacity-75 font-mono">({invoices.length})</span>
                    </span>
                  ),
                },
                {
                  value: "unpaid",
                  label: (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span>Unpaid</span>
                      <span className="text-[10px] opacity-75 font-mono">({unpaidCount})</span>
                    </span>
                  ),
                },
                {
                  value: "partial",
                  label: (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>Partial</span>
                      <span className="text-[10px] opacity-75 font-mono">({partialCount})</span>
                    </span>
                  ),
                },
                {
                  value: "paid",
                  label: (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>Paid</span>
                      <span className="text-[10px] opacity-75 font-mono">({paidCount})</span>
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-sm bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/80 text-[11px] uppercase tracking-widest text-slate-400 font-bold border-b border-slate-200/80">
            <tr>
              <th className="px-6 py-4 rounded-tl-2xl">Invoice #</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Job Card / Project</th>
              <th className="px-6 py-4">Invoice Date</th>
              <th className="px-6 py-4 text-right">Payment Progress</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 rounded-tr-2xl text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3 py-4">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shadow-sm">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-bold text-sm sm:text-base text-slate-800">No invoices match your filters</p>
                      <p className="text-xs text-slate-500 max-w-sm">Try adjusting your search query or reset filter options.</p>
                    </div>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm("");
                          setTypeFilter("all");
                          setStatusFilter("all");
                        }}
                        className="mt-1 text-xs h-8 px-4 cursor-pointer rounded-xl border border-slate-200 hover:border-orange-300 hover:text-orange-600 font-semibold transition-all shadow-sm"
                      >
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pagination.paginatedData.map((inv) => {
                const isProforma = inv.invoice_type === "proforma";
                const total = Number(inv.total_amount || 0);
                const paid = Number(inv.paid_amount || 0);
                const bal = Number(inv.balance_amount || 0);
                const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                const payments = Array.isArray(inv.invoice_payments) ? inv.invoice_payments : [];
                const isExpanded = expandedInvoiceId === inv.id;

                const hasChildRemainingInvoice = invoices.some((other: any) =>
                  other.id !== inv.id && (
                    other.previous_invoice_id === inv.id ||
                    other.notes?.includes(inv.invoice_no) ||
                    (Array.isArray(other.items) && other.items.some((it: any) => it.description?.includes(inv.invoice_no)))
                  )
                );
                const isPartiallyPaid = (paid > 0 && bal > 0) || inv.status === "partial";
                const canInvoiceBal = isPartiallyPaid && !hasChildRemainingInvoice && onCreateRemainingInvoice;

                const clientName = inv.clients?.name || "Customer";
                const clientInitial = (clientName.trim().charAt(0) || "C").toUpperCase();
                const uidLabel = inv.job_entries?.uid_label || (inv.job_entries?.uid ? `UID-${inv.job_entries.uid}` : null);
                const projectName = inv.job_entries?.project_name || "General Project";
                const isNabl = isNablJob(inv.job_entries);

                let invoiceDateStr = "—";
                if (inv.invoice_date || inv.created_at) {
                  try {
                    invoiceDateStr = format(new Date(inv.invoice_date || inv.created_at), "dd MMM, yyyy");
                  } catch {
                    invoiceDateStr = String(inv.invoice_date || inv.created_at).slice(0, 10);
                  }
                }

                return (
                  <React.Fragment key={inv.id}>
                    <tr className="hover:bg-orange-50/30 transition-colors group cursor-pointer">
                      {/* Invoice # */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col items-start gap-1">
                            <div className="font-bold text-slate-800 text-[13px] flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono">{inv.invoice_no}</span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isProforma
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {isProforma ? "Proforma (PI)" : "Tax Invoice (TI)"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm bg-blue-100 text-blue-700">
                            {clientInitial}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 text-[13px] truncate max-w-[190px]" title={clientName}>
                              {clientName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium truncate max-w-[190px]">
                              {inv.clients?.mobile || inv.clients?.email || "No contact info"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Job Card / Project */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          {uidLabel ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-800 text-[12px]">{uidLabel}</span>
                              {isNabl ? (
                                <span className="px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
                                  NABL
                                </span>
                              ) : (
                                <span className="px-2 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold">
                                  Non-NABL
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                          <span className="text-[11px] text-slate-400 font-medium truncate max-w-[180px]" title={projectName}>
                            {projectName}
                          </span>
                        </div>
                      </td>

                      {/* Invoice Date */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-semibold text-[13px]">{invoiceDateStr}</span>
                            {inv.due_date && (
                              <span className="text-[10px] text-slate-400">Due: {inv.due_date}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Payment Progress */}
                      <td className="px-6 py-4 text-right">
                        <div className="font-mono font-bold text-slate-900 text-[13px] tracking-tight tabular-nums">
                          {fmt(total)}
                        </div>
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono font-semibold">
                            {pct}%
                          </span>
                        </div>
                        {payments.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedInvoiceId(isExpanded ? null : inv.id);
                            }}
                            className="text-[10px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-full font-medium ml-auto mt-1 flex items-center justify-end gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <span>{payments.length} payment{payments.length !== 1 ? "s" : ""}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                          </button>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {bal <= 0 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-full border border-emerald-200 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Paid in Full</span>
                          </span>
                        ) : isPartiallyPaid ? (
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="inline-block px-2.5 py-0.5 text-[11px] font-bold text-amber-800 bg-amber-50 rounded-full border border-amber-200 shadow-2xs">
                              Partial Due
                            </span>
                            <span className="text-[10px] font-bold text-amber-700">{fmt(bal)} due</span>
                          </div>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 text-[11px] font-bold text-rose-800 bg-rose-50 rounded-full border border-rose-200 shadow-2xs">
                            Unpaid ({fmt(bal)})
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {bal > 0 && (
                            <Button
                              onClick={() => onRecordPayment(inv)}
                              size="sm"
                              variant="outline"
                              className="text-emerald-700 hover:text-white border-emerald-300 hover:bg-emerald-600 hover:border-emerald-600 shadow-sm rounded-xl h-8 px-3 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Record Pay</span>
                            </Button>
                          )}

                          <div className="w-[92px]">
                            <Dropdown
                              className="w-[92px] space-y-0"
                              placeholder={<span className="font-semibold text-slate-700 text-xs">Actions</span>}
                              options={[
                                {
                                  label: (
                                    <span className="flex items-center gap-2 text-slate-700 font-medium">
                                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                                      <span>View / Print</span>
                                    </span>
                                  ),
                                  value: "view",
                                },
                                ...(bal > 0
                                  ? [
                                      {
                                        label: (
                                          <span className="flex items-center gap-2 text-emerald-700 font-semibold">
                                            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Record Payment</span>
                                          </span>
                                        ),
                                        value: "record_pay",
                                      },
                                    ]
                                  : []),
                                ...(canInvoiceBal
                                  ? [
                                      {
                                        label: (
                                          <span className="flex items-center gap-2 text-amber-700 font-semibold">
                                            <FilePlus2 className="w-3.5 h-3.5 text-amber-600" />
                                            <span>Invoice Bal ({fmt(bal)})</span>
                                          </span>
                                        ),
                                        value: "invoice_bal",
                                      },
                                    ]
                                  : []),
                              ]}
                              align="right"
                              menuWidth={180}
                              buttonClassName="h-8 py-0 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded-xl transition-all text-slate-700 cursor-pointer group text-xs font-semibold"
                              iconClassName="text-slate-400 group-hover:text-slate-600 w-3 h-3"
                              itemClassName="text-xs py-2 px-3 hover:bg-slate-50 cursor-pointer"
                              value=""
                              onChange={(val) => {
                                if (val === "view") {
                                  onViewInvoice(inv);
                                } else if (val === "record_pay") {
                                  onRecordPayment(inv);
                                } else if (val === "invoice_bal") {
                                  onCreateRemainingInvoice?.(
                                    inv.job_entries || {
                                      id: inv.inward_id,
                                      client_id: inv.client_id,
                                      clients: inv.clients,
                                    },
                                    {
                                      isRemainingBalance: true,
                                      defaultBalanceAmount: bal,
                                      previousInvoice: inv,
                                    }
                                  );
                                }
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Payment History Accordion */}
                    {isExpanded && payments.length > 0 && (
                      <tr className="bg-slate-50/90 border-b border-slate-200">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="bg-white p-4 rounded-xl border border-slate-200/90 space-y-3 shadow-sm">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                              <span className="flex items-center gap-1.5">
                                <CreditCard className="w-4 h-4 text-emerald-600" />
                                <span>Payment History for {inv.invoice_no}</span>
                              </span>
                              <span className="text-slate-500 font-normal">
                                Total Invoice: <strong>{fmt(total)}</strong> · Remaining Balance: <strong className="text-amber-700">{fmt(bal)}</strong>
                              </span>
                            </div>

                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100 pb-1">
                                  <th className="py-2">Payment Date</th>
                                  <th className="py-2">Payment Mode</th>
                                  <th className="py-2">Reference / Remarks</th>
                                  <th className="py-2">Receipt #</th>
                                  <th className="py-2 text-right">Amount Received</th>
                                  <th className="py-2 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {payments.map((p: any) => {
                                  const rec = p.inward_receipts;
                                  const recNo = rec?.receipt_no || (p.receipt_id ? "Receipt" : null);

                                  return (
                                    <tr key={p.id}>
                                      <td className="py-2 font-medium text-slate-900">{p.payment_date || "Date N/A"}</td>
                                      <td className="py-2 uppercase text-slate-600">{p.payment_mode || "BANK"}</td>
                                      <td className="py-2 text-slate-500">{p.remarks || "—"}</td>
                                      <td className="py-2">
                                        {recNo ? (
                                          <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                            {recNo}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 text-[10px]">Direct</span>
                                        )}
                                      </td>
                                      <td className="py-2 text-right font-bold text-emerald-700">{fmt(p.amount)}</td>
                                      <td className="py-2 text-right">
                                        {onViewReceipt && (rec || recNo) && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              onViewReceipt(rec || {
                                                id: p.receipt_id,
                                                receipt_no: recNo,
                                                amount: p.amount,
                                                payment_mode: p.payment_mode,
                                                receipt_date: p.payment_date,
                                                party_name: inv.clients?.name,
                                                client_address: inv.clients?.address,
                                                client_gst: inv.clients?.gst_no,
                                                invoice_no: inv.invoice_no,
                                                inward_uid: inv.job_entries?.uid_label,
                                                total_invoice_amount: total,
                                                remaining_balance: bal,
                                              });
                                            }}
                                            className="h-7 px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                                          >
                                            <Printer className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                            <span>Receipt</span>
                                          </Button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
        itemLabel="invoices"
      />
    </div>
  );
}
