"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Eye,
  CreditCard,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpRight,
  Check,
  Hash,
  IndianRupee,
  FilePlus2,
  Printer,
  Copy,
  X,
  Calendar,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/Dropdown";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/use-pagination";

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
  onConvertToTaxInvoice,
  onViewReceipt,
  onCreateRemainingInvoice,
}: InvoicesListTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "proforma" | "tax_invoice">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "partial" | "paid">("all");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [copiedInvoiceNo, setCopiedInvoiceNo] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedInvoiceNo(text);
    setTimeout(() => setCopiedInvoiceNo(null), 2000);
  };

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
      const uidMatch = inv.job_entries?.uid_label?.toLowerCase().includes(q);
      const notesMatch = inv.notes?.toLowerCase().includes(q);

      return noMatch || clientMatch || uidMatch || notesMatch;
    });
  }, [invoices, searchTerm, typeFilter, statusFilter]);

  const pagination = usePagination({
    data: filteredInvoices,
    initialPageSize: 10,
  });

  // Aggregate stats for filtered set
  const totalBilled = filteredInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalReceived = filteredInvoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
  const totalOutstanding = filteredInvoices.reduce((s, i) => s + Number(i.balance_amount || 0), 0);

  // Status counts
  const unpaidCount = invoices.filter((i) => i.status === "unpaid").length;
  const partialCount = invoices.filter((i) => i.status === "partial").length;
  const paidCount = invoices.filter((i) => i.status === "paid").length;

  const hasActiveFilters = searchTerm.trim() !== "" || typeFilter !== "all" || statusFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Search and Filters Hub */}
      <div className="p-4.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search by invoice #, client name, UID, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9.5 pr-8 h-10 text-xs bg-slate-50/60 hover:bg-white focus:bg-white border-slate-200/90 rounded-xl focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Groups */}
          <div className="flex flex-wrap items-center gap-2.5 justify-start lg:justify-end">
            {/* Type Filter */}
            <div className="flex bg-slate-100/80 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  typeFilter === "all" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Types
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("proforma")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  typeFilter === "proforma" ? "bg-white text-indigo-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Proforma
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("tax_invoice")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  typeFilter === "tax_invoice" ? "bg-white text-emerald-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tax Invoices
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex bg-slate-100/80 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === "all" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("unpaid")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === "unpaid" ? "bg-white text-rose-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Unpaid</span>
                <span className="text-[10px] opacity-70">({unpaidCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("partial")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === "partial" ? "bg-white text-amber-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Partial</span>
                <span className="text-[10px] opacity-70">({partialCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("paid")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === "paid" ? "bg-white text-emerald-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Paid</span>
                <span className="text-[10px] opacity-70">({paidCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Filter Summary Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span>
              Showing <strong className="font-mono text-slate-900">{filteredInvoices.length}</strong> of{" "}
              <strong className="font-mono text-slate-900">{invoices.length}</strong> invoices
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setTypeFilter("all");
                  setStatusFilter("all");
                }}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer ml-1"
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium">
            <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/60 font-semibold shadow-2xs">
              Filtered Total: <strong className="font-mono text-slate-900 font-bold">{fmt(totalBilled)}</strong>
            </span>
            <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200/70 font-semibold shadow-2xs">
              Collected: <strong className="font-mono text-emerald-700 font-bold">{fmt(totalReceived)}</strong>
            </span>
            <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200/70 font-semibold shadow-2xs">
              Balance: <strong className="font-mono text-amber-700 font-bold">{fmt(totalOutstanding)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/90 text-slate-600 font-bold uppercase tracking-wider text-[10.5px] border-b border-slate-200/80 backdrop-blur-xs">
              <tr>
                <th className="py-3.5 px-4">Invoice # / Date</th>
                <th className="py-3.5 px-4">Customer & Inward UID</th>
                <th className="py-3.5 px-4 text-right">Total Amount</th>
                <th className="py-3.5 px-4 text-right">Amount Received</th>
                <th className="py-3.5 px-4 text-right">Outstanding Balance</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-slate-300" />
                      <p className="font-bold text-sm text-slate-700">No invoices match your filters</p>
                      <p className="text-xs text-slate-400">Try adjusting your search query or reset filter options.</p>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchTerm("");
                            setTypeFilter("all");
                            setStatusFilter("all");
                          }}
                          className="mt-2 text-xs h-8 cursor-pointer rounded-xl"
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

                  return (
                    <React.Fragment key={inv.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors group">
                        {/* Invoice # & Date */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-sm text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                              {inv.invoice_no}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(inv.invoice_no)}
                              title="Copy invoice #"
                              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                              {copiedInvoiceNo === inv.invoice_no ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span
                              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-2xs ${
                                isProforma
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                              }`}
                            >
                              {isProforma ? "Proforma" : "Tax"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{inv.invoice_date || "Date N/A"}</span>
                            {inv.due_date && (
                              <span className="text-slate-400 font-medium">· Due {inv.due_date}</span>
                            )}
                          </div>
                        </td>

                        {/* Customer & Inward UID */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900 text-xs truncate max-w-xs">
                            {inv.clients?.name || "Customer"}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                            {inv.job_entries?.uid_label && (
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold border border-slate-200/80 shadow-2xs">
                                <Hash className="w-3 h-3 text-blue-500" />
                                <span>UID: {inv.job_entries.uid_label}</span>
                              </span>
                            )}
                            {inv.job_entries?.project_name && (
                              <span className="truncate max-w-[150px] text-slate-600 font-medium">
                                {inv.job_entries.project_name}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td className="py-4 px-4 text-right font-mono font-black text-slate-900 text-sm tracking-tight">
                          {fmt(total)}
                        </td>

                        {/* Amount Received (Paid) with Progress */}
                        <td className="py-4 px-4 text-right">
                          <div className="font-mono font-black text-emerald-700 text-sm tracking-tight">
                            {fmt(paid)}
                          </div>
                          <div className="flex items-center justify-end gap-1.5 mt-1.5">
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

                          {/* Quick Payment Count Toggle */}
                          {payments.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                              className="text-[10px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-full font-medium ml-auto mt-1.5 flex items-center justify-end gap-1 cursor-pointer transition-colors shadow-2xs"
                            >
                              <span>
                                {payments.length} payment{payments.length !== 1 ? "s" : ""}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3 text-slate-500" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-slate-500" />
                              )}
                            </button>
                          )}
                        </td>

                        {/* Outstanding Balance */}
                        <td className="py-4 px-4 text-right">
                          <div className="font-mono font-black text-sm text-slate-900 tracking-tight">
                            {fmt(bal)}
                          </div>
                          {bal <= 0 ? (
                            <span className="inline-flex items-center gap-1 mt-0.5 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 rounded-full border border-emerald-200/80 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Paid in Full</span>
                            </span>
                          ) : (
                            <span className="inline-block mt-0.5 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-50 rounded-full border border-amber-200/80 shadow-2xs">
                              Due
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasChildRemainingInvoice && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/80 shadow-2xs">
                                Bal Invoiced
                              </span>
                            )}

                            <Dropdown
                              placeholder="Actions"
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
                              buttonClassName="h-8 py-0 px-3 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs rounded-xl transition-all text-slate-700 cursor-pointer group"
                              iconClassName="text-slate-400 group-hover:text-slate-600 w-3.5 h-3.5"
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
                        </td>
                      </tr>

                      {/* Expandable Payment History Accordion */}
                      {isExpanded && payments.length > 0 && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={6} className="p-4 pl-12">
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 space-y-2 shadow-xs">
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
                                  <tr className="text-left text-[11px] text-slate-500 border-b border-slate-100 pb-1">
                                    <th className="py-1">Payment Date</th>
                                    <th className="py-1">Payment Mode</th>
                                    <th className="py-1">Reference / Remarks</th>
                                    <th className="py-1">Receipt #</th>
                                    <th className="py-1 text-right">Amount Received</th>
                                    <th className="py-1 text-right">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {payments.map((p: any) => {
                                    const rec = p.inward_receipts;
                                    const recNo = rec?.receipt_no || (p.receipt_id ? "Receipt" : null);

                                    return (
                                      <tr key={p.id}>
                                        <td className="py-1.5 font-medium text-slate-900">{p.payment_date || "Date N/A"}</td>
                                        <td className="py-1.5 uppercase text-slate-600">{p.payment_mode || "BANK"}</td>
                                        <td className="py-1.5 text-slate-500">{p.remarks || "—"}</td>
                                        <td className="py-1.5">
                                          {recNo ? (
                                            <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                              {recNo}
                                            </span>
                                          ) : (
                                            <span className="text-slate-400 text-[10px]">Direct</span>
                                          )}
                                        </td>
                                        <td className="py-1.5 text-right font-bold text-emerald-700">{fmt(p.amount)}</td>
                                        <td className="py-1.5 text-right">
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
                                              className="h-6 px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                                            >
                                              <Printer className="w-3 h-3 mr-1" />
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
    </div>
  );
}
