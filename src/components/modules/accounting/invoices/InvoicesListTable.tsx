"use client";

import React, { useState, useMemo } from "react";
import { Search, Eye, CreditCard, ChevronDown, ChevronUp, FileText, CheckCircle2, Clock, AlertCircle, ArrowUpRight, Check, Hash, IndianRupee, FilePlus2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  // Aggregate stats
  const totalBilled = filteredInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalReceived = filteredInvoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
  const totalOutstanding = filteredInvoices.reduce((s, i) => s + Number(i.balance_amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Billed</span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">{fmt(totalBilled)}</span>
            <span className="text-[11px] text-slate-400">{filteredInvoices.length} invoices filtered</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">Amount Received</span>
            <span className="text-xl font-bold text-emerald-700 mt-0.5 block">{fmt(totalReceived)}</span>
            <span className="text-[11px] text-emerald-600 font-medium">
              {totalBilled > 0 ? `${Math.round((totalReceived / totalBilled) * 100)}% Collected` : "0%"}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider block">Outstanding Balance</span>
            <span className="text-xl font-bold text-amber-700 mt-0.5 block">{fmt(totalOutstanding)}</span>
            <span className="text-[11px] text-amber-600 font-medium">Balance due from clients</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search invoice #, client, or UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Type Filter */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setTypeFilter("all")}
                className={`px-3 py-1 rounded-md transition-all ${
                  typeFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Types
              </button>
              <button
                onClick={() => setTypeFilter("proforma")}
                className={`px-3 py-1 rounded-md transition-all ${
                  typeFilter === "proforma" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Proforma
              </button>
              <button
                onClick={() => setTypeFilter("tax_invoice")}
                className={`px-3 py-1 rounded-md transition-all ${
                  typeFilter === "tax_invoice" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tax Invoices
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-md transition-all ${
                  statusFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter("unpaid")}
                className={`px-3 py-1 rounded-md transition-all ${
                  statusFilter === "unpaid" ? "bg-white text-rose-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Unpaid
              </button>
              <button
                onClick={() => setStatusFilter("partial")}
                className={`px-3 py-1 rounded-md transition-all ${
                  statusFilter === "partial" ? "bg-white text-amber-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Partial
              </button>
              <button
                onClick={() => setStatusFilter("paid")}
                className={`px-3 py-1 rounded-md transition-all ${
                  statusFilter === "paid" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Paid
              </button>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Invoice # / Date</th>
                <th className="py-3 px-3.5">Client & Inward UID</th>
                <th className="py-3 px-3.5 text-right">Total Amount</th>
                <th className="py-3 px-3.5 text-right">Amount Received</th>
                <th className="py-3 px-3.5 text-right">Outstanding Balance</th>
                <th className="py-3 px-3.5 text-center">Payment Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-medium text-sm">No invoices found matching criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
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
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        {/* Invoice # & Date */}
                        <td className="py-3.5 px-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900">{inv.invoice_no}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              isProforma
                                ? "bg-blue-100 text-blue-700 border border-blue-200"
                                : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            }`}>
                              {isProforma ? "Proforma" : "Tax"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {inv.invoice_date || "Date N/A"}
                            {inv.due_date && <span className="text-slate-400"> · Due {inv.due_date}</span>}
                          </div>
                        </td>

                        {/* Client & Inward UID */}
                        <td className="py-3.5 px-3.5">
                          <div className="font-bold text-slate-900 text-xs truncate max-w-xs">
                            {inv.clients?.name || "Customer"}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                            {inv.job_entries?.uid_label && (
                              <span className="inline-flex items-center gap-0.5 bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                                <Hash className="w-3 h-3 text-blue-500" />
                                <span>UID: {inv.job_entries.uid_label}</span>
                              </span>
                            )}
                            {inv.job_entries?.project_name && (
                              <span className="truncate max-w-[140px]">{inv.job_entries.project_name}</span>
                            )}
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-3.5 text-right font-bold text-slate-900 text-sm">
                          {fmt(total)}
                        </td>

                        {/* Amount Received (Paid) with Progress */}
                        <td className="py-3.5 px-3.5 text-right">
                          <div className="font-bold text-emerald-700 text-sm">
                            {fmt(paid)}
                          </div>
                          <div className="flex items-center justify-end gap-1.5 mt-1">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-semibold">{pct}%</span>
                          </div>
                        </td>

                        {/* Outstanding Balance */}
                        <td className="py-3.5 px-3.5 text-right">
                          <div className={`font-bold text-sm ${bal > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                            {fmt(bal)}
                          </div>
                          {bal > 0 && (
                            <span className="text-[10px] font-semibold text-amber-600 block">Due</span>
                          )}
                        </td>

                        {/* Payment Status Badge */}
                        <td className="py-3.5 px-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            inv.status === "paid"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : inv.status === "partial"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}>
                            {inv.status === "paid" && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {inv.status === "partial" && <Clock className="w-3 h-3 text-amber-600" />}
                            {inv.status === "unpaid" && <AlertCircle className="w-3 h-3 text-rose-600" />}
                            <span>{inv.status === "partial" ? "Partially Paid" : inv.status}</span>
                          </span>

                          {/* Quick Payment Count Toggle */}
                          {payments.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                              className="text-[11px] text-blue-600 hover:text-blue-700 font-medium block mx-auto mt-1 flex items-center justify-center gap-0.5 cursor-pointer"
                            >
                              <span>{payments.length} payment{payments.length !== 1 ? "s" : ""}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onViewInvoice(inv)}
                              className="h-8 text-xs font-semibold gap-1 text-slate-700 hover:bg-slate-100 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View / Print</span>
                            </Button>

                            {canInvoiceBal && (
                              <Button
                                size="sm"
                                onClick={() => onCreateRemainingInvoice(
                                  inv.job_entries || { id: inv.inward_id, client_id: inv.client_id, clients: inv.clients },
                                  {
                                    isRemainingBalance: true,
                                    defaultBalanceAmount: bal,
                                    previousInvoice: inv,
                                  }
                                )}
                                className="h-8 text-xs font-bold gap-1 bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer"
                                title="Create new invoice for remaining unpaid balance of this inward"
                              >
                                <FilePlus2 className="w-3.5 h-3.5" />
                                <span>Invoice Bal</span>
                              </Button>
                            )}

                            {hasChildRemainingInvoice && (
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Bal Invoiced
                              </span>
                            )}

                            {bal > 0 && (
                              <Button
                                size="sm"
                                onClick={() => onRecordPayment(inv)}
                                className="h-8 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Pay</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Payment History Accordion */}
                      {isExpanded && payments.length > 0 && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={7} className="p-4 pl-12">
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
      </div>
    </div>
  );
}
