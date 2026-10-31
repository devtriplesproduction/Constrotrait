"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Copy,
  Check,
  FileText,
  Loader2,
  Scroll,
  History,
  AlertCircle,
  Eye,
  Edit3,
  RefreshCw,
  Building,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  ChevronDown,
  User,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { numberToWordsINR } from "@/utils/numberToWords";
import { convertQuotationToProformaAction, getQuotationVersionsAction } from "@/actions/accounting.actions";
import { QuotationApprovalPanel } from "./QuotationApprovalPanel";

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
  id?: string | null;
  name?: string | null;
  address?: string | null;
  gstin?: string | null;
  contact_person?: string | null;
  mobile?: string | null;
  gst_no?: string | null;
  email?: string | null;
  [key: string]: unknown;
}

export interface QuotationProject {
  id?: string | null;
  name?: string | null;
  location?: string | null;
  status?: string | null;
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
  quotation_items?: any;
  items?: any;
  clauses?: any;
  subtotal?: number | null;
  discount_amount?: number | null;
  gst_rate?: number | null;
  gst_amount?: number | null;
  total_amount?: number | null;
  remarks?: string | null;
  [key: string]: unknown;
}

interface QuotationViewPageClientProps {
  quotation: QuotationData;
  returnUrl?: string;
  initialTab?: "document" | "history";
}

const fmt = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const statusBadgeConfig: Record<string, { label: string; bg: string; icon: React.ReactNode }> = {
  draft: { label: "Draft", bg: "bg-slate-100 text-slate-700 border-slate-200", icon: <Clock className="w-3 h-3 text-slate-500" /> },
  sent: { label: "Sent to Client", bg: "bg-blue-50 text-blue-700 border-blue-200", icon: <Send className="w-3 h-3 text-blue-500" /> },
  approved: { label: "Approved", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" /> },
  accepted: { label: "Accepted", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" /> },
  rejected: { label: "Rejected", bg: "bg-rose-50 text-rose-700 border-rose-200", icon: <XCircle className="w-3 h-3 text-rose-600" /> },
  rework: { label: "Rework Requested", bg: "bg-amber-50 text-amber-700 border-amber-200", icon: <RefreshCw className="w-3 h-3 text-amber-600" /> },
  revision_requested: { label: "Revision Needed", bg: "bg-amber-50 text-amber-700 border-amber-200", icon: <RefreshCw className="w-3 h-3 text-amber-600" /> },
  superseded: { label: "Superseded", bg: "bg-slate-100 text-slate-500 border-slate-200", icon: <History className="w-3 h-3 text-slate-400" /> },
};

export function QuotationViewPageClient({
  quotation,
  returnUrl = "/accounting/quotations",
  initialTab,
}: QuotationViewPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const queryTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"document" | "history">(() => {
    if (queryTab === "history" || initialTab === "history") return "history";
    return "document";
  });

  // History states
  const [versions, setVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "history" && versions.length === 0) {
      setLoadingVersions(true);
      getQuotationVersionsAction(quotation.id)
        .then((res) => {
          if (res.success && res.data) {
            setVersions(res.data);
            if (res.data.length > 0) {
              setExpandedVersionId(res.data[0].id);
            }
          }
        })
        .finally(() => setLoadingVersions(false));
    }
  }, [activeTab, quotation.id, versions.length]);

  const qtnNo = quotation.quotation_no || "QTN/—";
  const versionNum = quotation.version_number || 1;
  const createdDate = quotation.created_at
    ? new Date(quotation.created_at).toLocaleDateString("en-IN")
    : "N/A";
  const validUntil = quotation.valid_until || "30 Days from Issue";
  const client = (quotation.clients || quotation.client) as QuotationClient | undefined;
  const project = (quotation.accounting_projects || quotation.projects || quotation.project) as
    | QuotationProject
    | undefined;
  const items = Array.isArray(quotation.items) ? quotation.items : [];
  const clauses = Array.isArray(quotation.clauses) ? quotation.clauses : [];

  const subtotal = Number(quotation.subtotal || quotation.amount || 0);
  const discount = Number(quotation.discount_amount || 0);
  const gstRate = Number(quotation.gst_rate || 18);
  const gstAmount = Number(quotation.gst_amount || 0);
  const totalAmount = Number(quotation.total_amount || quotation.amount || 0);
  const currentStatus = (quotation.status || "draft").toLowerCase();

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text =
      `*CONSTROTRAIT COMMERCIAL QUOTATION*\n` +
      `Quotation No: ${qtnNo} (V${versionNum})\n` +
      `Client: ${client?.name || "Customer"}\n` +
      `Date: ${createdDate}\n` +
      `Valid Until: ${validUntil}\n` +
      `Status: ${currentStatus.toUpperCase()}\n` +
      `---------------------------\n` +
      `Items:\n` +
      items
        .map((it: QuotationItem, i: number) => ` ${i + 1}. ${it.description} (Qty: ${it.qty}) - ${fmt(it.rate * it.qty)}`)
        .join("\n") +
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
            description: `Generated Invoice ${(res.data as any).invoice_no} and marked quotation as ACCEPTED.`,
          });
          router.refresh();
        } else {
          toast({
            title: "Conversion Failed",
            description: (!res.success && res.error) || "Could not convert to invoice.",
            variant: "error",
          });
        }
      });
    }
  };

  const handleRevise = () => {
    router.push(`/accounting/quotations/new?revise=${quotation.id}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "accepted":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved
          </span>
        );
      case "sent":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-blue-600" /> Sent to Client
          </span>
        );
      case "rework":
      case "revision_requested":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" /> Rework Needed
          </span>
        );
      case "rejected":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" /> Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16 w-full max-w-[1600px] mx-auto">
      {/* Top Header Actions Bar (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-center gap-3.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push(returnUrl)}
            className="h-10 px-3.5 rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Quotations</span>
          </Button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base">{qtnNo}</h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  V{versionNum}
                </span>
                {getStatusBadge(currentStatus)}
              </div>
              <p className="text-xs text-slate-500">Preview Quotation & Engineering Commercial Proposal</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySummary}
            className="h-9 px-3.5 text-xs gap-1.5 rounded-xl cursor-pointer hover:bg-slate-100 text-slate-700 font-bold"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-9 px-3.5 text-xs gap-1.5 rounded-xl cursor-pointer hover:bg-slate-100 text-slate-700 font-bold"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print PDF</span>
          </Button>

          <Button
            variant="custom"
            size="sm"
            onClick={handleRevise}
            className="h-9 px-4 text-xs gap-1.5 rounded-xl cursor-pointer bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Revise (V{versionNum + 1})</span>
          </Button>
        </div>
      </div>

      {/* Alert Banners for Rework or Rejection */}
      {quotation.rework_notes && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900 shadow-xs print:hidden">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold mr-1 text-sm block">Technical Rework Instructions:</strong>
            <p className="mt-0.5 leading-relaxed">{quotation.rework_notes}</p>
          </div>
        </div>
      )}

      {quotation.rejection_reason && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-900 shadow-xs print:hidden">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold mr-1 text-sm block">Rejection Feedback:</strong>
            <p className="mt-0.5 leading-relaxed">{quotation.rejection_reason}</p>
          </div>
        </div>
      )}

      {/* Workflow Action Panel (MaleeHouse-style: Approve, Reject, Rework, Send, Revise) */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <QuotationApprovalPanel
          quotation={quotation}
          onRefresh={() => router.refresh()}
          onRevise={handleRevise}
          onConvertToProforma={handleConvertToProforma}
        />
      </div>

      {/* In-Page View Selector: Proposal Document vs Audited History */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("document")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "document"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Quotation Proposal Document</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "history"
              ? "bg-purple-700 text-white shadow-xs"
              : "bg-white text-purple-700 hover:bg-purple-50 border border-purple-200"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Version History & Audit Log (V{versionNum})</span>
        </button>
      </div>

      {/* VIEW 1: Printable Quotation Document Paper Card */}
      {activeTab === "document" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-12 space-y-8 print:p-0 print:border-none print:shadow-none">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b-2 border-slate-900 gap-4">
            <div>
              <div className="text-3xl font-black tracking-tight text-slate-900">
                CONSTROTRAIT<span className="text-blue-600">.</span>
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                Advanced Construction Materials Testing & Geotechnical Laboratory
              </div>
              <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                <div>NABL Accredited Laboratory | ISO/IEC 17025 Certified</div>
                <div>GSTIN: 27AABCS1429B1Z8 | PAN: AABCS1429B</div>
                <div>Email: accounts@constrotrait.com | Phone: +91 98230 00000</div>
              </div>
            </div>

            <div className="sm:text-right">
              <span className="inline-block px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-black tracking-widest uppercase mb-2">
                COMMERCIAL QUOTATION
              </span>
              <div className="text-sm font-bold text-slate-900">{qtnNo}</div>
              <div className="text-xs text-slate-500 mt-1">Issue Date: {createdDate}</div>
              <div className="text-xs font-semibold text-amber-700 mt-0.5">Valid Until: {validUntil}</div>
            </div>
          </div>

          {/* Client & Project Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Quotation Issued To
              </div>
              <div className="font-bold text-slate-900 text-sm">{client?.name || "Valued Client"}</div>
              {client?.contact_person && (
                <div className="text-slate-600 mt-0.5 font-medium">Attn: {client.contact_person}</div>
              )}
              {client?.address && <div className="text-slate-500 mt-1 leading-relaxed">{client.address}</div>}
              {client?.mobile && <div className="text-slate-500 mt-1">Mobile: {client.mobile}</div>}
              {client?.gst_no && <div className="font-mono text-slate-700 mt-1.5 font-semibold">GSTIN: {client.gst_no}</div>}
            </div>

            <div className="sm:border-l sm:border-slate-200 sm:pl-6">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Project & Reference Details
              </div>
              <div className="font-semibold text-slate-800 text-sm">
                Project/Site: {project?.name || quotation.remarks || "General Laboratory Testing"}
              </div>
              {quotation.remarks && (
                <div className="text-slate-500 mt-2 italic bg-white/70 p-2.5 rounded-xl border border-slate-200/60">
                  Remarks: {quotation.remarks}
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Testing Scope & Rate Breakdown
            </div>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider">
                  <tr className="border-b border-slate-200">
                    <th className="p-3.5 text-center w-12">#</th>
                    <th className="p-3.5 text-left">Test Parameter / Service Description</th>
                    <th className="p-3.5 text-center w-24">Qty</th>
                    <th className="p-3.5 text-right w-32">Rate (₹)</th>
                    <th className="p-3.5 text-right w-36">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                        No specific line items recorded.
                      </td>
                    </tr>
                  ) : (
                    items.map((it: QuotationItem, idx: number) => {
                      const rowTotal = Number(it.qty || 1) * Number(it.rate || 0);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3.5 text-center text-slate-500 font-semibold">{idx + 1}</td>
                          <td className="p-3.5 font-medium text-slate-800">{it.description}</td>
                          <td className="p-3.5 text-center text-slate-700 font-semibold">{it.qty}</td>
                          <td className="p-3.5 text-right text-slate-700">{fmt(it.rate)}</td>
                          <td className="p-3.5 text-right font-bold text-slate-900">{fmt(rowTotal)}</td>
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
            <div className="sm:col-span-7 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Amount in Words
              </div>
              <div className="font-bold text-slate-900 italic text-sm leading-relaxed">
                {numberToWordsINR(totalAmount)}
              </div>
            </div>

            <div className="sm:col-span-5 p-5 rounded-2xl bg-slate-100/70 border border-slate-200 space-y-2.5 text-xs">
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
              <div className="flex justify-between text-base font-black text-blue-700 pt-2.5 border-t border-slate-200">
                <span>Total Quotation:</span>
                <span>{fmt(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Attached Legal Terms & Conditions Clauses */}
          {clauses.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <Scroll className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Contractual Terms & Testing Specifications
                </h4>
              </div>
              <div className="space-y-3 pl-4 border-l-2 border-blue-500">
                {clauses.map((c: QuotationClause, idx: number) => (
                  <div key={idx} className="text-xs text-slate-700 leading-relaxed">
                    <strong className="text-slate-900 font-bold mr-1">
                      {c.display_order || idx + 1}. {c.title}:
                    </strong>
                    <span>{c.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature & Authorization Section */}
          <div className="pt-10 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
            <div>
              <div>This is a computer-generated commercial quotation.</div>
              <div>Subject to Pune jurisdiction.</div>
            </div>

            <div className="text-right space-y-12">
              <div>
                For <strong className="text-slate-900">CONSTROTRAIT</strong>
              </div>
              <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
                Authorized Signatory / Lab In-Charge
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: In-Page Version History & Audit Log */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Audited Version History & Revisions</h2>
                <p className="text-xs text-slate-500">
                  Full version timeline, technical rework logs, approvals, and line item revision snapshots.
                </p>
              </div>
            </div>

            <Button
              variant="custom"
              size="sm"
              onClick={handleRevise}
              className="h-9 px-4 text-xs gap-1.5 rounded-xl cursor-pointer bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Revise (Draft Next Version)</span>
            </Button>
          </div>

          {loadingVersions ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              <span className="text-xs font-semibold">Loading quotation version timeline...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="p-16 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No version snapshots recorded yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Snapshots are automatically created when quotations are drafted, revised, reworked, or approved.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6">
              {/* Timeline bar */}
              <div className="absolute left-2.5 top-2 bottom-4 w-0.5 bg-gradient-to-b from-purple-500 via-slate-200 to-transparent" />

              {versions.map((ver, idx) => {
                const status = (ver.status || "draft").toLowerCase();
                const badge = statusBadgeConfig[status] || statusBadgeConfig.draft;
                const isLatest = idx === 0;
                const isExpanded = expandedVersionId === ver.id;
                const verItems = Array.isArray(ver.items) ? ver.items : [];
                const performerName = ver.performer
                  ? `${ver.performer.first_name || ""} ${ver.performer.last_name || ""}`.trim() || ver.performer.email
                  : "System User";

                return (
                  <div key={ver.id || idx} className="relative group">
                    {/* Timeline node */}
                    <div
                      className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isLatest
                          ? "border-purple-600 bg-purple-600 shadow-sm"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isLatest && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>

                    {/* Card */}
                    <div
                      className={`rounded-2xl border transition-all ${
                        isLatest
                          ? "bg-purple-50/20 border-purple-200 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* Card Header button */}
                      <button
                        type="button"
                        onClick={() => setExpandedVersionId(isExpanded ? null : ver.id)}
                        className="w-full p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left cursor-pointer"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              Version {ver.version_number || 1}
                            </span>
                            {isLatest && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white uppercase tracking-wider">
                                Current
                              </span>
                            )}
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${badge.bg}`}
                            >
                              {badge.icon}
                              <span>{badge.label}</span>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {performerName}
                            </span>
                            <span>•</span>
                            <span>
                              {ver.created_at
                                ? new Date(ver.created_at).toLocaleString("en-IN", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })
                                : "N/A"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 self-end sm:self-center">
                          <div className="text-right">
                            <div className="text-sm font-bold text-slate-900 nums">
                              {fmt(ver.total_amount || 0)}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {verItems.length} line item{verItems.length !== 1 ? "s" : ""}
                            </div>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </button>

                      {/* Action Reason Callout */}
                      {ver.action_reason && (
                        <div className="px-5 pb-4">
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex items-start gap-2.5">
                            <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-slate-900 font-bold mr-1">Action Note:</strong>
                              <span>{ver.action_reason}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expandable Details */}
                      {isExpanded && (
                        <div className="p-5 pt-3 border-t border-slate-100 bg-slate-50/50 space-y-4">
                          {/* Items Table */}
                          {verItems.length > 0 && (
                            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden text-xs shadow-2xs">
                              <div className="bg-slate-100/80 p-2.5 font-bold text-[10px] text-slate-600 uppercase tracking-wider grid grid-cols-12 gap-2">
                                <div className="col-span-6">Description</div>
                                <div className="col-span-2 text-center">Qty</div>
                                <div className="col-span-2 text-right">Rate</div>
                                <div className="col-span-2 text-right">Total</div>
                              </div>
                              <div className="divide-y divide-slate-100">
                                {verItems.map((it: any, i: number) => (
                                  <div key={i} className="p-2.5 grid grid-cols-12 gap-2 text-slate-700 hover:bg-slate-50/50">
                                    <div className="col-span-6 font-medium text-slate-900">{it.description}</div>
                                    <div className="col-span-2 text-center">{it.qty}</div>
                                    <div className="col-span-2 text-right nums">{fmt(it.rate)}</div>
                                    <div className="col-span-2 text-right font-semibold text-slate-900 nums">
                                      {fmt(Number(it.qty || 0) * Number(it.rate || 0))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Financials Breakdown */}
                          <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 p-3 rounded-xl bg-white border border-slate-200">
                            <div>
                              Subtotal: <strong className="text-slate-800 ml-1">{fmt(ver.subtotal || 0)}</strong>
                            </div>
                            {Number(ver.discount_amount || 0) > 0 && (
                              <div className="text-emerald-700 font-semibold">
                                Discount: -{fmt(ver.discount_amount)}
                              </div>
                            )}
                            <div>
                              GST ({ver.gst_rate || 18}%):{" "}
                              <strong className="text-slate-800 ml-1">{fmt(ver.gst_amount || 0)}</strong>
                            </div>
                            <div className="text-sm font-bold text-purple-700">
                              Total: {fmt(ver.total_amount || 0)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
