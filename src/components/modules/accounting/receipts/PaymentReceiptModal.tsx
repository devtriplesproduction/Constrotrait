"use client";

import React, { useRef, useState } from "react";
import { X, Printer, Check, Copy, CheckCircle2, Building, Calendar, Hash, CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { numberToWordsINR } from "@/utils/numberToWords";

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: any;
}

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PaymentReceiptModal({
  isOpen,
  onClose,
  receipt,
}: PaymentReceiptModalProps) {
  const [copied, setCopied] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !receipt) return null;

  const receiptNo = receipt.receipt_no || "REC/—";
  const receiptDate = receipt.receipt_date || receipt.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const amount = Number(receipt.amount || 0);
  const mode = (receipt.payment_mode || "BANK").toUpperCase();
  const partyName = receipt.party_name || receipt.client_name || receipt.clients?.name || "Valued Customer";
  const partyAddress = receipt.client_address || receipt.clients?.address || "";
  const partyGst = receipt.client_gst || receipt.clients?.gst_no || "";
  const invoiceNo = receipt.invoice_no || receipt.invoices?.invoice_no || receipt.remarks?.match(/(?:INV|PI)\/[^\s,]+/)?.[0] || "";
  const inwardUid = receipt.inward_uid || receipt.job_entries?.uid_label || "";
  const projectName = receipt.project_name || receipt.job_entries?.project_name || "";
  const remarks = receipt.remarks || "";

  const totalInvoice = Number(receipt.total_invoice_amount || receipt.invoices?.total_amount || 0);
  const remainingBalance = receipt.remaining_balance !== undefined
    ? Number(receipt.remaining_balance)
    : receipt.invoices?.balance_amount !== undefined
    ? Number(receipt.invoices.balance_amount)
    : null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = `*CONSTROTRAIT MONEY RECEIPT*\n` +
      `Receipt No: ${receiptNo}\n` +
      `Date: ${receiptDate}\n` +
      `Received From: ${partyName}\n` +
      `Amount: ${fmt(amount)} (${numberToWordsINR(amount)})\n` +
      `Payment Mode: ${mode}\n` +
      (invoiceNo ? `Against Invoice: ${invoiceNo}\n` : "") +
      (inwardUid ? `Inward UID: ${inwardUid}\n` : "") +
      (remainingBalance !== null ? `Remaining Balance: ${fmt(remainingBalance)}\n` : "") +
      `Status: Payment Confirmed & Reconciled`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Payment Receipt Voucher
            </span>
            <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {receiptNo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Share"}</span>
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </Button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Voucher Container */}
        <div
          ref={printAreaRef}
          id="receipt-printable-area"
          className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800 bg-white"
        >
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                    C
                  </div>
                  <div>
                    <h1 className="text-lg font-black text-slate-950 tracking-tight leading-none uppercase">
                      Constrotrait Testing & Consultancy
                    </h1>
                    <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase mt-0.5">
                      Civil & Material Testing Laboratory · NABL Accredited Services
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                  <p>Pune - 411001, Maharashtra, India</p>
                  <p>Email: accounts@constrotrait.com · Web: www.constrotrait.com</p>
                  <p className="font-semibold text-slate-700">GSTIN: 27AABCC1234D1Z5</p>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block px-3 py-1 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-md shadow-xs">
                  Official Receipt
                </div>
                <div className="mt-2 text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">Receipt Number</span>
                  <span className="font-mono font-bold text-sm text-slate-950">{receiptNo}</span>
                </div>
                <div className="mt-1 text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">Date of Issue</span>
                  <span className="font-bold text-xs text-slate-900">{receiptDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Received From Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Received With Thanks From
            </div>
            <div className="text-base font-bold text-slate-950">
              {partyName}
            </div>
            {partyAddress && (
              <div className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                {partyAddress}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              {partyGst && <div><strong className="text-slate-800">GSTIN:</strong> {partyGst}</div>}
              {inwardUid && <div><strong className="text-slate-800">Inward UID:</strong> {inwardUid}</div>}
              {projectName && <div><strong className="text-slate-800">Project / Site:</strong> {projectName}</div>}
            </div>
          </div>

          {/* Amount Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50/30 border-2 border-emerald-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                  Amount Received
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight">
                  {fmt(amount)}
                </span>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto bg-white/80 px-3 py-1.5 rounded-lg border border-emerald-200 shadow-xs">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Payment Mode</span>
                  <span className="text-xs font-black text-slate-900">{mode}</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                Amount in Words
              </span>
              <p className="text-sm font-bold text-slate-900 italic mt-0.5">
                {numberToWordsINR(amount)}
              </p>
            </div>
          </div>

          {/* Reference & Ledger Breakdown */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-200">
              Payment & Invoice Allocation Details
            </div>
            <div className="p-4 space-y-2.5">
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Against Invoice #</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {invoiceNo || "Direct Inward Payment"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Payment Reference / Remarks</span>
                  <span className="font-medium text-slate-800">
                    {remarks || "Payment credited against material testing services"}
                  </span>
                </div>
              </div>

              {(totalInvoice > 0 || remainingBalance !== null) && (
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                  {totalInvoice > 0 && (
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Total Invoice</span>
                      <span className="font-bold text-slate-900">{fmt(totalInvoice)}</span>
                    </div>
                  )}
                  <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                    <span className="text-emerald-700 block text-[10px] font-bold">This Receipt</span>
                    <span className="font-bold text-emerald-800">{fmt(amount)}</span>
                  </div>
                  {remainingBalance !== null && (
                    <div className={`p-2 rounded-lg border ${remainingBalance > 0 ? "bg-amber-50/60 border-amber-200 text-amber-900" : "bg-emerald-50/60 border-emerald-200 text-emerald-800"}`}>
                      <span className="block text-[10px] font-bold">
                        {remainingBalance > 0 ? "Remaining Balance Due" : "Settlement Status"}
                      </span>
                      <span className="font-bold">
                        {remainingBalance > 0 ? fmt(remainingBalance) : "Fully Cleared"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer & Authorized Signatory */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs text-slate-500">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified & Authenticated Receipt Voucher</span>
              </div>
              <p className="text-[11px] text-slate-400">
                This is a computer-generated transaction receipt. No signature required.
              </p>
            </div>

            <div className="text-center sm:text-right w-full sm:w-auto">
              <div className="w-44 border-b border-slate-400 pb-12 mb-1.5 mx-auto sm:ml-auto">
                <span className="text-[10px] text-slate-400 italic">Official Seal / Signature</span>
              </div>
              <span className="font-bold text-slate-900 block text-xs">For Constrotrait Testing & Consultancy</span>
              <span className="text-[11px] text-slate-500">Authorized Signatory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
