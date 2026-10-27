"use client";

import React, { useState, useTransition } from "react";
import {
  X,
  Printer,
  Copy,
  Check,
  FileText,
  ArrowRight,
  Loader2,
  Scroll,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { numberToWordsINR } from "@/utils/numberToWords";
import { updateQuotationStatusAction, convertQuotationToProformaAction } from "@/actions/accounting.actions";

export interface QuotationItem {
  description: string;
  qty: number;
  rate: number;
  amount?: number;
}

export interface QuotationClause {
  title: string;
  content: string;
  display_order?: number;
}

export interface QuotationClient {
  name?: string;
  address?: string;
  gstin?: string;
  contact_person?: string;
  mobile?: string;
  gst_no?: string;
  [key: string]: unknown;
}

export interface QuotationProject {
  name?: string;
  location?: string;
  [key: string]: unknown;
}

export interface QuotationData {
  id: string;
  quotation_no?: string;
  status?: string;
  created_at?: string;
  valid_until?: string;
  client?: QuotationClient;
  clients?: QuotationClient;
  project?: QuotationProject;
  projects?: QuotationProject;
  quotation_items?: QuotationItem[];
  items?: QuotationItem[];
  clauses?: QuotationClause[];
  subtotal?: number;
  discount_amount?: number;
  gst_rate?: number;
  gst_amount?: number;
  total_amount?: number;
  remarks?: string;
  [key: string]: unknown;
}

interface QuotationViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: QuotationData | null;
  onRefresh?: () => void;
  onConvertedToInvoice?: (invoice: Record<string, unknown>) => void;
}

const fmt = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function QuotationViewModal({
  isOpen,
  onClose,
  quotation,
  onRefresh,
  onConvertedToInvoice,
}: QuotationViewModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isOpen || !quotation) return null;

  const qtnNo = quotation.quotation_no || "QTN/—";
  const createdDate = quotation.created_at
    ? new Date(quotation.created_at).toLocaleDateString("en-IN")
    : "N/A";
  const validUntil = quotation.valid_until || "30 Days from Issue";
  const client = (quotation.clients || quotation.client) as QuotationClient | undefined;
  const project = (quotation.accounting_projects || quotation.projects || quotation.project) as QuotationProject | undefined;
  const items = Array.isArray(quotation.items) ? quotation.items : [];
  const clauses = Array.isArray(quotation.clauses) ? quotation.clauses : [];

  const subtotal = Number(quotation.subtotal || quotation.amount || 0);
  const discount = Number(quotation.discount_amount || 0);
  const gstRate = Number(quotation.gst_rate || 18);
  const gstAmount = Number(quotation.gst_amount || 0);
  const totalAmount = Number(quotation.total_amount || quotation.amount || 0);
  const currentStatus = quotation.status || "draft";

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text =
      `*CONSTROTRAIT COMMERCIAL QUOTATION*\n` +
      `Quotation No: ${qtnNo}\n` +
      `Client: ${client?.name || "Customer"}\n` +
      `Date: ${createdDate}\n` +
      `Valid Until: ${validUntil}\n` +
      `Status: ${currentStatus.toUpperCase()}\n` +
      `---------------------------\n` +
      `Items:\n` +
      items.map((it: QuotationItem, i: number) => ` ${i + 1}. ${it.description} (Qty: ${it.qty}) - ${fmt(it.rate * it.qty)}`).join("\n") +
      `\n---------------------------\n` +
      `Subtotal: ${fmt(subtotal)}\n` +
      (discount > 0 ? `Discount: -${fmt(discount)}\n` : "") +
      `GST (${gstRate}%): ${fmt(gstAmount)}\n` +
      `*Total Amount: ${fmt(totalAmount)}*\n` +
      `Amount in words: ${numberToWordsINR(totalAmount)}\n` +
      (quotation.remarks ? `Remarks: ${quotation.remarks}\n` : "");

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!", description: "Quotation summary copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusUpdate = (status: "draft" | "sent" | "accepted" | "rejected") => {
    startTransition(async () => {
      const res = await updateQuotationStatusAction(quotation.id, status);
      if (res.success) {
        toast({ title: "Status Updated", description: `Quotation marked as ${status.toUpperCase()}.` });
        quotation.status = status;
        if (onRefresh) onRefresh();
      } else {
        toast({ title: "Update Failed", description: res.error || "Could not update status.", variant: "destructive" });
      }
    });
  };

  const handleConvertToProforma = () => {
    if (confirm(`Convert Quotation ${qtnNo} into a Proforma Invoice?`)) {
      startTransition(async () => {
        const res = await convertQuotationToProformaAction(quotation.id);
        if (res.success && "data" in res && res.data) {
          toast({
            title: "Proforma Invoice Created!",
            description: `Generated Invoice ${res.data.invoice_no} and marked quotation as ACCEPTED.`,
          });
          if (onRefresh) onRefresh();
          if (onConvertedToInvoice) onConvertedToInvoice(res.data as Record<string, unknown>);
          onClose();
        } else {
          toast({
            title: "Conversion Failed",
            description: (!res.success && res.error) || "Could not convert to invoice.",
            variant: "destructive",
          });
        }
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Accepted</span>;
      case "sent":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">Sent to Client</span>;
      case "rejected":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">Rejected</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">Draft</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header Actions Bar (Hidden in Print) */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 bg-slate-50/70 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">{qtnNo}</h3>
                {getStatusBadge(currentStatus)}
              </div>
              <p className="text-xs text-slate-500">Commercial Estimation & Laboratory Quotation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="h-8 px-3 text-xs gap-1.5 rounded-lg cursor-pointer hover:bg-slate-100"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 px-3 text-xs gap-1.5 rounded-lg cursor-pointer hover:bg-slate-100"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </Button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Banner for Conversion & Status (Hidden in Print) */}
        <div className="p-3 px-6 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2 print:hidden text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Workflow Action:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs">
              <button
                type="button"
                disabled={isPending || currentStatus === "draft"}
                onClick={() => handleStatusUpdate("draft")}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  currentStatus === "draft" ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Draft
              </button>
              <button
                type="button"
                disabled={isPending || currentStatus === "sent"}
                onClick={() => handleStatusUpdate("sent")}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  currentStatus === "sent" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sent
              </button>
              <button
                type="button"
                disabled={isPending || currentStatus === "accepted"}
                onClick={() => handleStatusUpdate("accepted")}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  currentStatus === "accepted" ? "bg-emerald-600 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Accepted
              </button>
              <button
                type="button"
                disabled={isPending || currentStatus === "rejected"}
                onClick={() => handleStatusUpdate("rejected")}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  currentStatus === "rejected" ? "bg-rose-600 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Rejected
              </button>
            </div>
          </div>

          <Button
            size="sm"
            disabled={isPending}
            onClick={handleConvertToProforma}
            className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-lg shadow-xs cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowRight className="w-3.5 h-3.5" />
            )}
            <span>Convert to Proforma Invoice</span>
          </Button>
        </div>

        {/* Printable Quotation Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 print:p-0 print:overflow-visible">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b-2 border-slate-900 gap-4">
            <div>
              <div className="text-2xl font-black tracking-tight text-slate-900">
                CONSTROTRAIT<span className="text-blue-600">.</span>
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                Advanced Construction Materials Testing & Geotechnical Laboratory
              </div>
              <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                <div>NABL Accredited Laboratory | ISO/IEC 17025 Certified</div>
                <div>GSTIN: 27AABCS1429B1Z8 | PAN: AABCS1429B</div>
                <div>Email: accounts@constrotrait.com | Phone: +91 98230 00000</div>
              </div>
            </div>

            <div className="sm:text-right">
              <span className="inline-block px-3 py-1 rounded-md bg-slate-900 text-white text-xs font-black tracking-widest uppercase mb-2">
                COMMERCIAL QUOTATION
              </span>
              <div className="text-xs font-bold text-slate-800">{qtnNo}</div>
              <div className="text-xs text-slate-500 mt-0.5">Issue Date: {createdDate}</div>
              <div className="text-xs text-slate-500 font-semibold text-amber-700">
                Valid Until: {validUntil}
              </div>
            </div>
          </div>

          {/* Client & Project Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Quotation Issued To
              </div>
              <div className="font-bold text-slate-900 text-sm">{client?.name || "Valued Client"}</div>
              {client?.contact_person && (
                <div className="text-slate-600 mt-0.5">Attn: {client.contact_person}</div>
              )}
              {client?.address && (
                <div className="text-slate-500 mt-0.5 leading-relaxed">{client.address}</div>
              )}
              {client?.mobile && <div className="text-slate-500 mt-0.5">Mobile: {client.mobile}</div>}
              {client?.gst_no && (
                <div className="font-mono text-slate-700 mt-1 font-semibold">GSTIN: {client.gst_no}</div>
              )}
            </div>

            <div className="sm:border-l sm:border-slate-200 sm:pl-4">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Project & Reference Details
              </div>
              <div className="font-semibold text-slate-800">
                Project/Site: {project?.name || quotation.remarks || "General Laboratory Testing"}
              </div>
              {quotation.remarks && (
                <div className="text-slate-500 mt-1 italic">Remarks: {quotation.remarks}</div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Testing Scope & Rate Breakdown
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider">
                  <tr className="border-b border-slate-200">
                    <th className="p-3 text-center w-12">#</th>
                    <th className="p-3 text-left">Test Parameter / Service Description</th>
                    <th className="p-3 text-center w-20">Qty</th>
                    <th className="p-3 text-right w-28">Rate (₹)</th>
                    <th className="p-3 text-right w-32">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                        No specific line items recorded.
                      </td>
                    </tr>
                  ) : (
                    items.map((it: QuotationItem, idx: number) => {
                      const rowTotal = Number(it.qty || 1) * Number(it.rate || 0);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 text-center text-slate-500 font-semibold">{idx + 1}</td>
                          <td className="p-3 font-medium text-slate-800">{it.description}</td>
                          <td className="p-3 text-center text-slate-700 font-semibold">{it.qty}</td>
                          <td className="p-3 text-right text-slate-700">{fmt(it.rate)}</td>
                          <td className="p-3 text-right font-bold text-slate-900">{fmt(rowTotal)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Summary & Total in Words */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
            <div className="sm:col-span-7 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Amount in Words
              </div>
              <div className="font-bold text-slate-900 italic text-xs leading-relaxed">
                {numberToWordsINR(totalAmount)}
              </div>
            </div>

            <div className="sm:col-span-5 p-4 rounded-xl bg-slate-100/70 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">{fmt(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount:</span>
                  <span>-{fmt(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST ({gstRate}%):</span>
                <span className="font-semibold text-slate-800">{fmt(gstAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-blue-700 pt-2 border-t border-slate-200">
                <span>Total Quotation:</span>
                <span>{fmt(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Attached Legal Terms & Conditions Clauses */}
          {clauses.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <Scroll className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Contractual Terms & Testing Specifications
                </h4>
              </div>
              <div className="space-y-2.5 pl-3 border-l-2 border-blue-500">
                {clauses.map((c: QuotationClause, idx: number) => (
                  <div key={idx} className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-800 font-semibold">
                      {c.display_order || idx + 1}. {c.title}:
                    </strong>{" "}
                    <span>{c.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature & Authorization Section */}
          <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
            <div>
              <div>This is a computer-generated commercial quotation.</div>
              <div>Subject to Pune jurisdiction.</div>
            </div>

            <div className="text-right space-y-12">
              <div>For <strong className="text-slate-900">CONSTROTRAIT</strong></div>
              <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
                Authorized Signatory / Lab In-Charge
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
