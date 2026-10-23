"use client";

import React, { useState, useTransition } from "react";
import { X, Printer, Share2, CreditCard, ArrowRight, CheckCircle2, Clock, Building2, Landmark, Check, Copy, Scroll, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { convertProformaToTaxInvoiceAction } from "@/actions/accounting.actions";

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  onRecordPayment?: (invoice: any) => void;
  onRefresh?: () => void;
  onViewReceipt?: (receipt: any) => void;
  onCreateRemainingInvoice?: (inward: any, options?: any) => void;
}

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export function InvoiceViewModal({
  isOpen,
  onClose,
  invoice,
  onRecordPayment,
  onRefresh,
  onViewReceipt,
  onCreateRemainingInvoice,
}: InvoiceViewModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isOpen || !invoice) return null;

  const isProforma = invoice.invoice_type === "proforma";
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const payments = Array.isArray(invoice.invoice_payments) ? invoice.invoice_payments : [];
  const client = invoice.clients;
  const jobEntry = invoice.job_entries;
  const prevInvoice = invoice.previousInvoice;
  const childInvoice = invoice.childInvoice;

  const totalAmount = Number(invoice.total_amount || 0);
  const paidAmount = Number(invoice.paid_amount || 0);
  const currentBalance = Number(invoice.balance_amount || 0);

  const prevBalance = prevInvoice?.balance_amount
    ? Number(prevInvoice.balance_amount)
    : Number(invoice.previous_balance_amount || 0);

  const totalDueOverall = currentBalance + prevBalance;

  // Check if remaining invoice has already been created for this invoice
  const hasRemainingInvoiceGenerated = Boolean(
    childInvoice ||
    (jobEntry?.invoices && Array.isArray(jobEntry.invoices) && jobEntry.invoices.some((other: any) =>
      other.id !== invoice.id && (
        other.previous_invoice_id === invoice.id ||
        other.notes?.includes(invoice.invoice_no) ||
        (Array.isArray(other.items) && other.items.some((it: any) => it.description?.includes(invoice.invoice_no)))
      )
    ))
  );

  const canInvoiceRemaining = Boolean(
    paidAmount > 0 &&
    currentBalance > 0 &&
    !hasRemainingInvoiceGenerated &&
    onCreateRemainingInvoice
  );

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const lines = [
      `*${isProforma ? "PROFORMA INVOICE" : "TAX INVOICE"}: ${invoice.invoice_no}*`,
      `Client: ${client?.name || "Customer"}`,
      `Date: ${invoice.invoice_date || "N/A"}`,
      jobEntry?.uid_label ? `Inward UID: ${jobEntry.uid_label}` : "",
      "---------------------------",
      `Current Invoice Amount: ${fmt(totalAmount)}`,
      paidAmount > 0 ? `Amount Paid: ${fmt(paidAmount)}` : "",
      `Current Invoice Balance: ${fmt(currentBalance)}`,
    ];

    if (prevInvoice) {
      lines.push("---------------------------");
      lines.push(`*Previous Invoice (${prevInvoice.invoice_no}):*`);
      lines.push(`Previous Total: ${fmt(prevInvoice.total_amount)}`);
      lines.push(`Previous Paid: ${fmt(prevInvoice.paid_amount || 0)}`);
      lines.push(`Previous Outstanding: ${fmt(prevBalance)}`);
    }

    if (prevBalance > 0) {
      lines.push("===========================");
      lines.push(`*Total Outstanding Due: ${fmt(totalDueOverall)}*`);
    }

    const text = lines.filter(Boolean).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied to Clipboard", description: "Summary copied. You can paste it into WhatsApp or Email." });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConvertToTaxInvoice = () => {
    if (!confirm(`Convert Proforma Invoice ${invoice.invoice_no} into a permanent Tax Invoice?`)) return;

    startTransition(async () => {
      const res = await convertProformaToTaxInvoiceAction(invoice.id);
      if (res.success && "data" in res) {
        toast({ title: "Converted to Tax Invoice", description: `New Tax Invoice Number: ${res.data?.invoice_no}` });
        onRefresh?.();
        onClose();
      } else {
        toast({ title: "Conversion Failed", description: res.error || "Could not convert proforma", variant: "error" });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity no-print" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[94vh]">
        {/* Top Control Bar (Hidden on print) */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
              isProforma
                ? "bg-blue-100 text-blue-800 border border-blue-200"
                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
            }`}>
              {isProforma ? "Proforma Invoice" : "Tax Invoice"}
            </span>
            <span className="text-xs text-slate-500 font-medium">#{invoice.invoice_no}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Share Summary"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </Button>

            {isProforma && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleConvertToTaxInvoice}
                disabled={isPending}
                className="h-8 text-xs font-semibold text-purple-700 border-purple-200 hover:bg-purple-50 cursor-pointer"
              >
                Convert to Tax Invoice
              </Button>
            )}

            {canInvoiceRemaining && onCreateRemainingInvoice && (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onCreateRemainingInvoice(
                    jobEntry || { id: invoice.inward_id, client_id: invoice.client_id, clients: client },
                    {
                      isRemainingBalance: true,
                      defaultBalanceAmount: currentBalance,
                      previousInvoice: invoice,
                    }
                  );
                }}
                className="h-8 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white gap-1.5 cursor-pointer shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Invoice Remaining ({fmt(currentBalance)})</span>
              </Button>
            )}

            {hasRemainingInvoiceGenerated && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Remaining Invoiced {childInvoice?.invoice_no ? `(${childInvoice.invoice_no})` : ""}</span>
              </span>
            )}

            {currentBalance > 0 && onRecordPayment && (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onRecordPayment(invoice);
                }}
                className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Receive Payment</span>
              </Button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Document Body */}
        <div id="invoice-printable-area" className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 text-slate-800 bg-white">
          {/* Document Header */}
          <div className="flex justify-between items-start pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-base">
                  CT
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-950">CONSTROTRAIT</h1>
                  <p className="text-[10px] text-slate-500 font-medium tracking-wide">TESTING LAB & QUALITY CONSULTANCY</p>
                </div>
              </div>
              <div className="text-xs text-slate-600 mt-2 space-y-0.5 max-w-sm">
                <div>Pune - Solapur Highway, Maharashtra, India</div>
                <div>Email: accounts@constrotrait.com | Phone: +91 98765 43210</div>
                <div>GSTIN: 27AABCC1234F1Z5</div>
              </div>
            </div>

            <div className="text-right">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {isProforma ? "PROFORMA INVOICE" : "TAX INVOICE"}
              </h2>
              <div className="text-xs space-y-1 mt-2">
                <div>Invoice No: <strong className="text-slate-900 text-sm">{invoice.invoice_no}</strong></div>
                <div>Date: <strong>{invoice.invoice_date || "N/A"}</strong></div>
                {invoice.due_date && <div>Due Date: <strong>{invoice.due_date}</strong></div>}
                {jobEntry?.uid_label && (
                  <div className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold mt-1">
                    Inward UID: {jobEntry.uid_label}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Billed To / Job Info Grid */}
          <div className="grid sm:grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Billed To</span>
              <div className="font-bold text-slate-900 text-sm">{client?.name || "Customer"}</div>
              {client?.address && <div className="text-slate-600 mt-0.5">{client.address}</div>}
              {client?.gst_no && <div className="text-slate-700 font-medium mt-1">GSTIN: {client.gst_no}</div>}
              {client?.contact_person && <div className="text-slate-600">Attn: {client.contact_person}</div>}
              {client?.mobile && <div className="text-slate-600">Mobile: {client.mobile}</div>}
            </div>

            <div className="border-t sm:border-t-0 sm:border-l border-slate-200 sm:pl-6 pt-3 sm:pt-0">
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Project / Site Reference</span>
              <div className="font-semibold text-slate-900 text-sm">
                {jobEntry?.project_name || client?.site_name || "General Project"}
              </div>
              {jobEntry?.division && <div className="text-slate-600">Division: {jobEntry.division}</div>}
              {jobEntry?.inward_on && <div className="text-slate-600">Sample Inward Date: {jobEntry.inward_on}</div>}
              <div className="mt-2 inline-flex items-center gap-1.5 font-semibold">
                <span>Payment Status:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                  invoice.status === "paid"
                    ? "bg-emerald-100 text-emerald-800"
                    : invoice.status === "partial"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800"
                }`}>
                  {invoice.status === "partial" ? "Partially Paid" : invoice.status}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 text-left w-12">#</th>
                  <th className="py-2.5 px-3 text-left">Description of Test / Service</th>
                  <th className="py-2.5 px-3 text-center w-16">Qty</th>
                  <th className="py-2.5 px-3 text-right w-24">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right w-28">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">No items listed</td>
                  </tr>
                ) : (
                  items.map((it: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-500 font-medium">{i + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{it.description}</td>
                      <td className="py-2.5 px-3 text-center">{it.qty}</td>
                      <td className="py-2.5 px-3 text-right">{fmt(it.rate)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{fmt(it.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Current Financials Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
            <div className="text-xs text-slate-500 space-y-1.5 flex-1">
              <div className="font-semibold text-slate-700">Bank Details for Payment:</div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-slate-600 text-[11px]">
                <div>Bank Name: <strong>HDFC Bank Ltd.</strong></div>
                <div>Account Name: <strong>CONSTROTRAIT TESTING SERVICES</strong></div>
                <div>Account No: <strong>50200012345678</strong></div>
                <div>IFSC Code: <strong>HDFC0001234</strong> (Branch: Pune)</div>
              </div>
              {invoice.notes && (
                <div className="pt-2 text-[11px] text-slate-600">
                  <span className="font-semibold">Notes: </span>{invoice.notes}
                </div>
              )}
            </div>

            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between py-1 text-slate-600 border-b border-slate-100">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">{fmt(invoice.subtotal || invoice.amount)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600 border-b border-slate-100">
                <span>GST (18%)</span>
                <span className="font-semibold text-slate-900">{fmt(invoice.gst_amount || 0)}</span>
              </div>
              {Number(invoice.tds_amount || 0) > 0 && (
                <div className="flex justify-between py-1 text-slate-600 border-b border-slate-100">
                  <span>Less: TDS</span>
                  <span className="font-semibold text-slate-900">-{fmt(invoice.tds_amount)}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 text-sm font-bold text-slate-950 border-b-2 border-slate-900">
                <span>Total Invoice Amount</span>
                <span>{fmt(totalAmount)}</span>
              </div>

              {/* Partial Payment Tracking on this invoice */}
              <div className="flex justify-between py-1 text-emerald-700 font-medium">
                <span>Amount Received (Paid)</span>
                <span>{fmt(paidAmount)}</span>
              </div>
              <div className="flex justify-between py-1 text-sm font-bold text-slate-900">
                <span>Current Balance Due</span>
                <span className={currentBalance > 0 ? "text-amber-700" : "text-emerald-700"}>
                  {fmt(currentBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Payments Received on Current Invoice Table */}
          {payments.length > 0 && (
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Payments Received Against This Invoice ({invoice.invoice_no})</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[11px] text-emerald-800 border-b border-emerald-200/60 pb-1">
                    <th className="py-1">Payment Date</th>
                    <th className="py-1">Mode & Reference</th>
                    <th className="py-1">Official Receipt</th>
                    <th className="py-1 text-right">Amount Received</th>
                    <th className="py-1 text-right print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100">
                  {payments.map((p: any) => {
                    const rec = p.inward_receipts;
                    const recNo = rec?.receipt_no || (p.receipt_id ? "Receipt" : null);

                    return (
                      <tr key={p.id}>
                        <td className="py-1.5 font-medium">{p.payment_date || "Date N/A"}</td>
                        <td className="py-1.5 text-slate-600">
                          {p.payment_mode ? p.payment_mode.toUpperCase() : "BANK"}
                          {p.remarks ? ` · ${p.remarks}` : ""}
                        </td>
                        <td className="py-1.5">
                          {recNo ? (
                            <span className="font-mono text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                              {recNo}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Direct</span>
                          )}
                        </td>
                        <td className="py-1.5 text-right font-bold text-emerald-700">{fmt(p.amount)}</td>
                        <td className="py-1.5 text-right print:hidden">
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
                                  party_name: client?.name,
                                  client_address: client?.address,
                                  client_gst: client?.gst_no,
                                  invoice_no: invoice.invoice_no,
                                  inward_uid: jobEntry?.uid_label,
                                  total_invoice_amount: totalAmount,
                                  remaining_balance: currentBalance,
                                });
                              }}
                              className="h-6 px-2 text-[10px] font-semibold text-slate-700 hover:bg-emerald-100/70 cursor-pointer"
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
          )}

          {/* CRITICAL REQUIREMENT: PREVIOUS INVOICE PAYMENT DETAILS & OUTSTANDING BALANCE STATEMENT */}
          {prevInvoice && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/90 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Customer Previous Invoice & Payment Statement
                  </span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-200/70 text-amber-900">
                  Ref: {prevInvoice.invoice_no} ({prevInvoice.invoice_date || "Date N/A"})
                </span>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/80">
                  <span className="text-slate-500 block text-[11px]">Previous Invoice Total</span>
                  <span className="font-bold text-slate-900">{fmt(prevInvoice.total_amount)}</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/80">
                  <span className="text-slate-500 block text-[11px]">Amount Received on Prev Invoice</span>
                  <span className="font-bold text-emerald-700">{fmt(prevInvoice.paid_amount || 0)}</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/80">
                  <span className="text-slate-500 block text-[11px]">Previous Balance Still Due</span>
                  <span className="font-bold text-amber-800">{fmt(prevBalance)}</span>
                </div>
              </div>

              {/* Previous Payments History */}
              {prevInvoice.invoice_payments && prevInvoice.invoice_payments.length > 0 && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-amber-900 block mb-1">
                    Previous Invoice Payment History:
                  </span>
                  <div className="space-y-1">
                    {prevInvoice.invoice_payments.map((pp: any) => (
                      <div key={pp.id} className="flex justify-between items-center text-xs bg-white/70 px-3 py-1.5 rounded border border-amber-200/60">
                        <span className="text-slate-600">
                          {pp.payment_date} · {pp.payment_mode ? pp.payment_mode.toUpperCase() : "BANK"} {pp.remarks ? `(${pp.remarks})` : ""}
                        </span>
                        <span className="font-bold text-emerald-700">+{fmt(pp.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Balance Carried Forward Highlight */}
              {prevBalance > 0 && (
                <div className="pt-2 border-t border-amber-200/70 flex justify-between items-center text-xs font-bold text-amber-950">
                  <span>Previous Invoice Outstanding Balance:</span>
                  <span className="text-sm font-black text-amber-900">{fmt(prevBalance)}</span>
                </div>
              )}
            </div>
          )}

          {/* GRAND TOTAL OUTSTANDING STATEMENT */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-center gap-3">
            <div>
              <div className="text-xs text-slate-400 font-medium">TOTAL OUTSTANDING DUE FROM CUSTOMER</div>
              <div className="text-xs text-slate-300 mt-0.5">
                Current Due ({fmt(currentBalance)}) {prevBalance > 0 ? `+ Previous Due (${fmt(prevBalance)})` : ""}
              </div>
            </div>
            <div className="text-2xl font-black text-amber-400 tracking-tight">
              {fmt(totalDueOverall)}
            </div>
          </div>

          {/* TERMS & CONDITIONS (MaleeHouse-style) */}
          {((invoice.clauses && invoice.clauses.length > 0) || invoice.notes) && (
            <div className="border-t border-slate-200 pt-5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Scroll className="w-3.5 h-3.5 text-blue-600" />
                <span>Terms & Conditions</span>
              </div>
              <div className="space-y-1.5 pl-3 border-l-2 border-blue-500">
                {invoice.clauses && invoice.clauses.length > 0 ? (
                  invoice.clauses.map((clause: any, index: number) => (
                    <div key={index} className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800">{clause.display_order || index + 1}. {clause.title}:</strong>{" "}
                      <span>{clause.content}</span>
                    </div>
                  ))
                ) : (
                  (invoice.notes || "").split("\n").map((line: string, idx: number) => line.trim() ? (
                    <div key={idx} className="text-xs text-slate-600 leading-relaxed font-medium">
                      {line}
                    </div>
                  ) : null)
                )}
              </div>
            </div>
          )}

          {/* Signatory Footer */}
          <div className="pt-8 flex justify-between items-end text-xs text-slate-500">
            <div>
              <div>This is a computer-generated document.</div>
              <div>Thank you for choosing ConstroTrait Testing Services!</div>
            </div>
            <div className="text-center">
              <div className="w-40 border-b border-slate-300 pb-1 mb-1 font-semibold text-slate-800">
                ConstroTrait Labs
              </div>
              <div>Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
