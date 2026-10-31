"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Printer,
  Copy,
  Check,
  FileText,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Scroll,
  History,
  AlertCircle,
  Eye,
  Download,
  Building,
  Briefcase,
  Receipt,
  CreditCard,
  Mail,
  Phone,
  Award,
  ShieldCheck,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { numberToWordsINR } from "@/utils/numberToWords";
import { convertQuotationToProformaAction } from "@/actions/accounting.actions";
import { QuotationApprovalPanel } from "./QuotationApprovalPanel";
import { QuotationVersionHistory } from "./QuotationVersionHistory";
import { printElement } from "@/lib/print";

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
  name?: string | null;
  address?: string | null;
  gstin?: string | null;
  contact_person?: string | null;
  mobile?: string | null;
  gst_no?: string | null;
  [key: string]: unknown;
}

export interface QuotationProject {
  name?: string | null;
  location?: string | null;
  [key: string]: unknown;
}

export interface QuotationData {
  id: string;
  quotation_no?: string | null;
  version_number?: number | null;
  status?: string | null;
  rework_notes?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
  valid_until?: string | null;
  client?: QuotationClient | null;
  clients?: QuotationClient | null;
  project?: QuotationProject | null;
  projects?: QuotationProject | null;
  accounting_projects?: QuotationProject | null;
  quotation_items?: QuotationItem[] | null;
  items?: QuotationItem[] | null;
  clauses?: QuotationClause[] | null;
  subtotal?: number | null;
  discount_amount?: number | null;
  gst_rate?: number | null;
  gst_amount?: number | null;
  total_amount?: number | null;
  remarks?: string | null;
  category?: string | null;
  department?: string | null;
  inward_id?: string | null;
  [key: string]: unknown;
}

interface QuotationViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: QuotationData | null;
  onRefresh?: () => void;
  onConvertedToInvoice?: (invoice: Record<string, unknown>) => void;
  onRevise?: (quotation: QuotationData) => void;
  onConvertToInward?: (quotation: QuotationData) => void;
  isStandalone?: boolean;
  initialHistoryOpen?: boolean;
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
  onRevise,
  onConvertToInward,
  isStandalone = false,
  initialHistoryOpen = false,
}: QuotationViewModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isHistoryOpen, setIsHistoryOpen] = useState(initialHistoryOpen);
  const printableRef = useRef<HTMLDivElement>(null);

  const qtnNo = quotation?.quotation_no || "QTN/—";

  const handlePrint = () => {
    if (printableRef.current) {
      printElement(printableRef.current, `Quotation_${qtnNo.replace(/[/\\?%*:|"<>]/g, "_")}`);
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = () => {
    handlePrint();
  };

  useEffect(() => {
    if (!isOpen || !quotation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, quotation, qtnNo]);

  if (!isOpen || !quotation) return null;

  const versionNum = quotation.version_number || 1;
  const createdDate = quotation.created_at
    ? new Date(quotation.created_at).toLocaleDateString("en-IN")
    : "N/A";
  const validUntil = quotation.valid_until || "30 Days from Issue";
  const client = (quotation.clients || quotation.client) as QuotationClient | undefined;
  const project = (quotation.accounting_projects || quotation.projects || quotation.project) as QuotationProject | undefined;
  const items: QuotationItem[] = Array.isArray(quotation.items) && quotation.items.length > 0
    ? quotation.items
    : Array.isArray(quotation.quotation_items) && quotation.quotation_items.length > 0
    ? quotation.quotation_items
    : [];
  const rawClauses = Array.isArray(quotation.clauses) ? quotation.clauses : [];
  const uniqueClauses: QuotationClause[] = rawClauses.filter((c, idx, arr) => {
    const titleKey = (c.title || "").trim().toLowerCase();
    const contentKey = (c.content || "").trim().toLowerCase();
    return arr.findIndex(o => 
      (o.title || "").trim().toLowerCase() === titleKey && 
      (o.content || "").trim().toLowerCase() === contentKey
    ) === idx;
  });

  const subtotal = Number(quotation.subtotal || quotation.amount || 0);
  const discount = Number(quotation.discount_amount || 0);
  const gstRate = Number(quotation.gst_rate || 18);
  const gstAmount = Number(quotation.gst_amount || 0);
  const totalAmount = Number(quotation.total_amount || quotation.amount || 0);
  const currentStatus = (quotation.status || "draft").toLowerCase();

  const formatValidDate = (val?: string) => {
    if (!val) return "30 Days from Issue";
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        }
      } catch {}
    }
    return val;
  };

  const handleCopySummary = () => {
    const text =
      `*CONSTROTRAIT COMMERCIAL QUOTATION*\n` +
      `Quotation No: ${qtnNo} (V${versionNum})\n` +
      `Client: ${client?.name || "Customer"}\n` +
      `Date: ${createdDate}\n` +
      `Valid Until: ${formatValidDate(validUntil)}\n` +
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
      case "approved":
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Approved
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Sent to Client
          </span>
        );
      case "rework":
      case "revision_requested":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Rework Needed
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Draft
          </span>
        );
    }
  };

  const documentBody = (
    <div
      ref={printableRef}
      id="quotation-printable-area"
      className="quotation-print-body w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8 text-slate-800"
    >
      {/* PAGE 1: Brand Header, Quotation Info, Client/Project, Line Items, Financial Totals */}
      <div className="print-page-1 space-y-6">
        {/* Document Header */}
        <div className="pb-5 border-b border-slate-200 avoid-break space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            {/* Brand Identity & Lab Credentials */}
            <div className="space-y-1.5">
              <img
                src="/constrotrait-logo.png"
                alt="ConstroTrait Logo"
                className="h-14 w-auto max-w-[240px] object-contain"
                onError={(e) => {
                  e.currentTarget.src = "/Constrotriat%20Logo%20PNG%201.png";
                }}
              />
              <div className="text-sm font-bold tracking-tight text-slate-800 uppercase pt-1">
                Advanced Construction Materials Testing & Geotechnical Laboratory
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                <Award className="w-3.5 h-3.5 text-blue-600" />
                <span>NABL Accredited Laboratory | ISO/IEC 17025:2017 Certified</span>
              </div>
            </div>

            {/* Commercial Quotation Card */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/70 border border-slate-200 rounded-2xl p-4 sm:p-5 sm:text-right min-w-[270px] shadow-2xs shrink-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Commercial Quotation
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5 font-mono">
                {qtnNo}
              </div>
              <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-200 flex justify-between gap-4 font-medium">
                <span>Issue: <strong className="text-slate-900 font-bold">{createdDate}</strong></span>
                <span>Valid: <strong className="text-amber-800 font-bold">{formatValidDate(validUntil)}</strong></span>
              </div>
            </div>
          </div>

          {/* Horizontal Contact & Regulatory Strip */}
          <div className="pt-3 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-600">
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 px-3.5 flex items-center gap-3 shadow-2xs">
              <Receipt className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">GSTIN</div>
                <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm">27AABCS1429B1Z8</div>
              </div>
            </div>
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 px-3.5 flex items-center gap-3 shadow-2xs">
              <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">PAN</div>
                <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm">AABCS1429B</div>
              </div>
            </div>
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 px-3.5 flex items-center gap-3 shadow-2xs">
              <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Email</div>
                <div className="font-semibold text-slate-800 text-xs truncate">accounts@constrotrait.com</div>
              </div>
            </div>
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 px-3.5 flex items-center gap-3 shadow-2xs">
              <Phone className="w-4 h-4 text-purple-600 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Phone</div>
                <div className="font-semibold text-slate-800 text-xs">+91 98230 00000</div>
              </div>
            </div>
          </div>
        </div>

        {/* Client & Project Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs avoid-break">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50/90 to-slate-50/40 border border-slate-200 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-600" /> Quotation Issued To
              </span>
              {(client?.gst_no || client?.gstin) && (
                <span className="font-mono text-[11px] font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                  GSTIN: {client?.gst_no || client?.gstin}
                </span>
              )}
            </div>
            <div className="text-xl font-bold text-slate-900 leading-snug pt-0.5">
              {client?.name || "Valued Client"}
            </div>
            {client?.contact_person && (
              <div className="text-slate-700 text-xs flex items-center gap-2">
                <span className="text-slate-400 font-medium">Attn:</span>
                <span className="font-bold text-slate-900 text-sm">{client.contact_person}</span>
              </div>
            )}
            {client?.address && (
              <div className="text-slate-600 text-xs leading-relaxed">
                {client.address}
              </div>
            )}
            {client?.mobile && (
              <div className="text-slate-700 text-xs pt-1 flex items-center gap-2">
                <span className="text-slate-400 font-medium">Mobile:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{client.mobile}</span>
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50/90 to-slate-50/40 border border-slate-200 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-indigo-600" /> Project & Reference Details
              </span>
              <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                Site Reference
              </span>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Project / Site Name</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {project?.name || quotation.remarks || "General Laboratory Testing"}
              </div>
            </div>
            {project?.location && (
              <div className="pt-1 text-xs">
                <span className="text-slate-400 font-medium">Site Location: </span>
                <span className="font-semibold text-slate-800">{project.location}</span>
              </div>
            )}
            {quotation.remarks && project?.name && (
              <div className="pt-1 text-slate-600 text-xs italic bg-white/70 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                <span className="font-semibold not-italic text-slate-700">Remarks: </span>
                {quotation.remarks}
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-3 avoid-break">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <div className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Testing Scope & Rate Breakdown
              </div>
            </div>
            <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              Total Items: <strong className="text-slate-900 font-bold ml-1">{items.length}</strong>
            </div>
          </div>
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 uppercase font-bold text-xs tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-center w-14 border-r border-slate-200">#</th>
                  <th className="py-3 px-4 text-left border-r border-slate-200">Test Parameter / Service Description</th>
                  <th className="py-3 px-4 text-center w-24 border-r border-slate-200">Qty</th>
                  <th className="py-3 px-4 text-right w-36 border-r border-slate-200">Rate (₹)</th>
                  <th className="py-3 px-4 text-right w-40">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                      No specific line items recorded.
                    </td>
                  </tr>
                ) : (
                  items.map((it: QuotationItem, idx: number) => {
                    const rowTotal = Number(it.qty || 1) * Number(it.rate || 0);
                    return (
                      <tr key={idx} className={`transition-colors hover:bg-blue-50/40 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                        <td className="py-3 px-4 text-center text-slate-500 font-bold text-sm border-r border-slate-100">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 text-sm sm:text-base border-r border-slate-100">{it.description}</td>
                        <td className="py-3 px-4 text-center text-slate-800 font-bold text-sm border-r border-slate-100">
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200/60 font-mono">
                            {it.qty}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 font-semibold text-sm border-r border-slate-100 font-mono">{fmt(it.rate)}</td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900 text-base sm:text-lg font-mono">{fmt(rowTotal)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary & Total in Words */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start avoid-break">
          <div className="md:col-span-7 p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200 space-y-2 text-xs shadow-2xs">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" /> Total Amount in Words
            </div>
            <div className="font-bold text-slate-900 italic text-base sm:text-lg leading-relaxed pt-1">
              {numberToWordsINR(totalAmount)}
            </div>
          </div>

          <div className="md:col-span-5 p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2.5 text-xs shadow-2xs">
            <div className="flex justify-between text-slate-600">
              <span className="font-medium text-xs">Subtotal:</span>
              <span className="font-bold text-slate-900 text-sm font-mono">{fmt(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span className="text-xs">Discount:</span>
                <span className="font-bold text-sm font-mono">-{fmt(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span className="font-medium text-xs">GST ({gstRate}%):</span>
              <span className="font-bold text-slate-900 text-sm font-mono">{fmt(gstAmount)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <span className="text-sm font-bold text-slate-900">Total Quotation:</span>
              <span className="text-blue-900 font-extrabold text-xl sm:text-2xl font-mono tracking-tight">{fmt(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual page separator */}
      <div className="flex items-center gap-4 my-6 py-2 text-xs text-slate-400 font-semibold tracking-wider uppercase">
        <div className="h-px bg-slate-200 flex-1" />
        <span className="bg-slate-100 px-3.5 py-1.5 rounded-full text-slate-600 border border-slate-200 shadow-2xs font-bold">
          Page 2 — Terms & Authorization
        </span>
        <div className="h-px bg-slate-200 flex-1" />
      </div>

      {/* Contractual Terms & Specifications + Signatures */}
      <div className="space-y-6">
        {/* Running Header on Page 2 in Print */}
        <div className="hidden print:flex justify-between items-center pb-2 border-b border-slate-200 text-xs text-slate-500 font-medium">
          <span>CONSTROTRAIT — Commercial Quotation: <strong className="text-slate-800 font-bold">{qtnNo}</strong></span>
          <span>Terms, Conditions & Authorization (Page 2 of 2)</span>
        </div>

        {/* Attached Legal Terms & Conditions Clauses */}
        {uniqueClauses.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 space-y-4 avoid-break shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Scroll className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wider">
                    Contractual Terms & Testing Specifications
                  </h4>
                  <p className="text-xs text-slate-500">Standard Operating Terms & Testing Conditions</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                {uniqueClauses.length} Standard Clauses
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniqueClauses.map((c: QuotationClause, idx: number) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-start gap-3 text-xs text-slate-600 leading-relaxed avoid-break">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <strong className="text-slate-900 font-bold text-sm block mb-1">{c.title}</strong>
                    <span className="text-slate-700 text-xs leading-relaxed">{c.content}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature & Authorization Section */}
        <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-end gap-6 text-xs text-slate-600 avoid-break">
          {/* Left: Declarations & Jurisdiction */}
          <div className="space-y-2 text-xs text-slate-600 max-w-lg">
            <div className="font-bold text-slate-800 flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>This is an official computer-generated commercial quotation.</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>Testing conducted strictly as per Bureau of Indian Standards (IS) / ASTM norms.</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>Commercial disputes are subject to Pune jurisdiction.</span>
            </div>
            <div className="text-xs text-slate-400 pt-1 font-medium">
              Issued by: CONSTROTRAIT Commercial & Billing Division
            </div>
          </div>

          {/* Right: Official Authorization Signatory Card */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-gradient-to-br from-slate-50 to-slate-100/60 text-center min-w-[280px] space-y-3 shadow-2xs">
            <div>
              <div className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                For CONSTROTRAIT
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Material Testing & Services LLP
              </div>
            </div>

            {/* Seal & Stamp Space */}
            <div className="h-16 flex items-center justify-center border-y border-dashed border-slate-200 my-1">
              <span className="text-xs italic text-slate-400 font-serif">
                [Authorized Stamp & Sign]
              </span>
            </div>

            <div className="pt-1">
              <div className="text-sm font-bold text-slate-900">
                Authorized Signatory
              </div>
              <div className="text-xs text-slate-600 font-medium">
                Lab In-Charge / Quality Manager
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isStandalone) {
    return (
      <>
        <div className="w-full max-w-[1600px] mx-auto space-y-5">
          {/* Top Header Actions Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 px-6 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xs shadow-xs print:hidden">
            <div className="flex items-center gap-3.5 flex-wrap">
              <Link
                href="/accounting/quotations"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-slate-700 bg-slate-100/90 hover:bg-slate-200/90 border border-slate-200 text-xs font-semibold transition-all hover:shadow-2xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
                <span>Back to Quotations</span>
              </Link>
              <div className="h-7 w-px bg-slate-200 hidden sm:block" />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-lg font-mono tracking-tight">{qtnNo}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    V{versionNum}
                  </span>
                  {quotation?.category && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                      {String(quotation.category)}
                    </span>
                  )}
                  {quotation?.department && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                      {String(quotation.department)}
                    </span>
                  )}
                  {getStatusBadge(currentStatus)}
                </div>
                <p className="text-xs text-slate-500 font-medium">Commercial Quotation & Engineering Proposal • ConstroTrait</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsHistoryOpen(true)}
                className="h-9 px-3.5 text-xs gap-1.5 rounded-xl cursor-pointer hover:bg-purple-50 text-purple-700 border-purple-200/80 font-semibold shadow-2xs"
              >
                <History className="w-4 h-4 text-purple-600" />
                <span>History (V{versionNum})</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopySummary}
                className="h-9 px-3.5 text-xs gap-1.5 rounded-xl cursor-pointer hover:bg-slate-100 font-semibold text-slate-700 border-slate-200 shadow-2xs"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </Button>

              <Button
                size="sm"
                onClick={handleDownloadPdf}
                className="h-9 px-4 text-xs gap-2 rounded-xl cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-xs hover:shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-9 px-3.5 text-xs gap-2 rounded-xl cursor-pointer hover:bg-slate-100 font-bold text-slate-800 border-slate-200 shadow-2xs"
              >
                <Printer className="w-4 h-4 text-slate-700" />
                <span>Print</span>
              </Button>
            </div>
          </div>

          {/* Alert Banners for Rework or Rejection */}
          {quotation.rework_notes && (
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50/30 p-4 px-5 shadow-2xs flex items-start gap-3.5 print:hidden">
              <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Rework Instructions Required</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900 border border-amber-300/60">Action Required</span>
                </div>
                <div className="mt-1.5 text-xs sm:text-sm font-medium text-amber-950 bg-white/80 border border-amber-200/80 rounded-xl p-3 px-4 shadow-2xs leading-relaxed">
                  {quotation.rework_notes}
                </div>
              </div>
            </div>
          )}

          {quotation.rejection_reason && (
            <div className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 via-rose-50/70 to-red-50/30 p-4 px-5 shadow-2xs flex items-start gap-3.5 print:hidden">
              <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-900">Rejection Reason</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200/80 text-rose-900 border border-rose-300/60">Rejected</span>
                </div>
                <div className="mt-1.5 text-xs sm:text-sm font-medium text-rose-950 bg-white/80 border border-rose-200/80 rounded-xl p-3 px-4 shadow-2xs leading-relaxed">
                  {quotation.rejection_reason}
                </div>
              </div>
            </div>
          )}

          {/* Workflow Action Panel */}
          <div className="p-4 px-6 bg-white border border-slate-200 rounded-2xl shadow-xs print:hidden">
            <QuotationApprovalPanel
              quotation={quotation}
              onRefresh={onRefresh}
              onRevise={() => {
                if (onRevise) onRevise(quotation);
              }}
              onConvertToInward={onConvertToInward}
              onConvertToProforma={handleConvertToProforma}
            />
          </div>

          {/* Quotation Document Card */}
          <div className="w-full">
            {documentBody}
          </div>
        </div>

        {/* Version History Modal */}
        <QuotationVersionHistory
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          quotationId={quotation.id}
          quotationNo={qtnNo}
          currentVersion={versionNum}
        />
      </>
    );
  }

  return (
    <>
      <div className="quotation-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 print:static print:p-0 print:bg-white print:z-auto print:block">
        <div className="quotation-modal-card bg-white rounded-2xl max-w-5xl lg:max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden print:max-h-none print:h-auto print:overflow-visible print:shadow-none print:border-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0">
          {/* Top Header Actions Bar (Hidden in Print) */}
          <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 bg-slate-50/70 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">{qtnNo}</h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    V{versionNum}
                  </span>
                  {quotation?.category && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                      {String(quotation.category)}
                    </span>
                  )}
                  {quotation?.department && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                      {String(quotation.department)}
                    </span>
                  )}
                  {getStatusBadge(currentStatus)}
                </div>
                <p className="text-xs text-slate-500">Preview Quotation & Engineering Commercial Proposal</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsHistoryOpen(true)}
                className="h-8 px-3 text-xs gap-1.5 rounded-lg cursor-pointer hover:bg-purple-50 text-purple-700 border-purple-200"
              >
                <History className="w-3.5 h-3.5" />
                <span>History</span>
              </Button>

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
                size="sm"
                onClick={handleDownloadPdf}
                className="h-8 px-3 text-xs gap-1.5 rounded-lg cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-8 px-3 text-xs gap-1.5 rounded-lg cursor-pointer hover:bg-slate-100 font-semibold text-slate-800"
              >
                <Printer className="w-3.5 h-3.5 text-slate-700" />
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

          {/* Alert Banners for Rework or Rejection */}
          {quotation.rework_notes && (
            <div className="p-3 px-6 bg-amber-50/90 border-b border-amber-200 flex items-start gap-2.5 text-xs text-amber-900 print:hidden">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold mr-1">Rework Instructions:</strong>
                <span>{quotation.rework_notes}</span>
              </div>
            </div>
          )}

          {quotation.rejection_reason && (
            <div className="p-3 px-6 bg-rose-50/90 border-b border-rose-200 flex items-start gap-2.5 text-xs text-rose-900 print:hidden">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold mr-1">Rejection Reason:</strong>
                <span>{quotation.rejection_reason}</span>
              </div>
            </div>
          )}

          {/* Workflow Action Panel (MaleeHouse-style: Approve, Reject, Rework, Send, Revise) */}
          <div className="p-3 px-6 bg-slate-50/80 border-b border-slate-200 print:hidden">
            <QuotationApprovalPanel
              quotation={quotation}
              onRefresh={onRefresh}
              onRevise={() => {
                onClose();
                if (onRevise) onRevise(quotation);
              }}
              onConvertToInward={onConvertToInward}
              onConvertToProforma={handleConvertToProforma}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/50 flex justify-center">
            <div className="w-full max-w-4xl">
              {documentBody}
            </div>
          </div>
        </div>
      </div>

      {/* Version History Modal */}
      <QuotationVersionHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        quotationId={quotation.id}
        quotationNo={qtnNo}
        currentVersion={versionNum}
      />
    </>
  );
}
