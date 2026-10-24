"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import {
  User,
  Building2,
  Calendar,
  FileText,
  Phone,
  Mail,
  Receipt,
  Truck,
  Package,
  Layers,
  Award,
  Clock,
  Tag,
  CheckCircle2,
  Download,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  Briefcase,
  MapPin,
  FlaskConical,
  Loader2,
  ChevronRight,
  ArrowUp,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { downloadJobCardAction, getJobCardPdfAction } from "@/actions/job-card-pdf.actions";
import { useToast } from "@/hooks/use-toast";
import { BackToJobCardButton } from "./BackToJobCardButton";

export interface InwardDetailsViewProps {
  jobEntry: any;
  tests?: any[];
  client?: any;
  branch?: any;
  assignmentId?: string | null;
  returnUrl?: string | null;
  onClose?: () => void;
  showBackButton?: boolean;
}

export function InwardDetailsView({
  jobEntry,
  tests = [],
  client: directClient,
  branch: directBranch,
  assignmentId,
  returnUrl,
  onClose,
  showBackButton = true,
}: InwardDetailsViewProps) {
  const { toast } = useToast();
  const [copiedUid, setCopiedUid] = useState(false);
  const [copiedGst, setCopiedGst] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Extract client and branch safely
  const client = directClient || jobEntry?.clients || {};
  const branch = directBranch || jobEntry?.branches || {};

  // Tests can be from props or from jobEntry.job_entry_tests
  const allTests = tests && tests.length > 0 ? tests : jobEntry?.job_entry_tests || [];

  const uidLabel =
    jobEntry?.uid_label || (jobEntry?.uid ? String(jobEntry.uid) : allTests[0]?.uid_label || "N/A");
  const isNabl =
    jobEntry?.is_nabl ?? allTests.some((t: any) => t?.test_master?.is_nabl || t?.is_nabl);

  // Material details from tests or jobEntry
  const primaryTest = allTests[0] || {};
  const addVals = (primaryTest?.additional_details_values as Record<string, any>) || {};

  const materialDesc =
    primaryTest?.material_description ||
    primaryTest?.test_master?.material_product ||
    jobEntry?.material_description ||
    "Not Specified";

  const materialId = primaryTest?.material_id || jobEntry?.material_id || "-";
  const materialLocation =
    primaryTest?.material_details_location || addVals?.sample_code_no || "-";
  const sampleQty =
    primaryTest?.sample_quantity || primaryTest?.test_master?.sample_size || "-";
  const grade = primaryTest?.grade || addVals?.Grade || addVals?.grade || "-";
  const testingDay =
    primaryTest?.testing_day ||
    primaryTest?.testing_age ||
    addVals?.["Testing Age"] ||
    addVals?.["Age in Days"] ||
    "-";

  const castingDateRaw =
    primaryTest?.date_of_casting ||
    addVals?.["Casting date"] ||
    addVals?.["Date of Casting"] ||
    addVals?.["Casting Date"] ||
    addVals?.casting_date;

  const receivingDateRaw =
    primaryTest?.date_of_receiving || jobEntry?.inward_on || jobEntry?.created_at;

  const formatDateSafe = (dateStr?: string | null, formatStr: string = "dd MMM yyyy") => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return !isNaN(d.getTime()) ? format(d, formatStr) : "-";
    } catch {
      return "-";
    }
  };

  const handleCopyUid = () => {
    if (!uidLabel || uidLabel === "N/A") return;
    navigator.clipboard.writeText(uidLabel);
    setCopiedUid(true);
    toast({ title: "Copied!", description: `UID ${uidLabel} copied to clipboard.` });
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleCopyGst = () => {
    if (!client?.gst_no) return;
    navigator.clipboard.writeText(client.gst_no);
    setCopiedGst(true);
    toast({ title: "Copied!", description: `GST No. ${client.gst_no} copied to clipboard.` });
    setTimeout(() => setCopiedGst(false), 2000);
  };

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleDownloadPdf = async () => {
    const testId = primaryTest?.id;
    if (!testId) {
      toast({
        title: "Notice",
        description: "No tests found to generate Job Card PDF.",
        variant: "warning",
      });
      return;
    }
    try {
      setIsDownloading(true);
      const res = await downloadJobCardAction(testId);
      if (res.success && res.data) {
        const byteCharacters = atob(res.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `JobCard_${uidLabel}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast({
          title: "Downloaded",
          description: "Job Card PDF downloaded successfully.",
          variant: "success",
        });
      } else {
        toast({
          title: "Download Failed",
          description: res.error || "Could not generate PDF.",
          variant: "error",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to download Job Card PDF.",
        variant: "error",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintPdf = async () => {
    const testId = primaryTest?.id;
    if (!testId) {
      toast({
        title: "Notice",
        description: "No tests found to preview Job Card PDF.",
        variant: "warning",
      });
      return;
    }
    try {
      setIsPrinting(true);
      const res = await getJobCardPdfAction(testId);
      if (res.success && res.data) {
        const byteCharacters = atob(res.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        toast({
          title: "Error",
          description: res.error || "Could not preview PDF.",
          variant: "error",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to preview Job Card PDF.",
        variant: "error",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="w-full space-y-7 animate-in fade-in duration-300 pb-16">
      
      {/* 1. Top Navigation & Action Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs sticky top-2 z-30">
        <div className="flex items-center gap-3 flex-wrap">
          <BackToJobCardButton
            assignmentId={assignmentId}
            returnUrl={returnUrl}
            variant="primary"
            label="Back to Job Card"
          />

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-medium pl-2">
            <span>Job Assignments</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-600 font-semibold">Job Card Details</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-orange-600 font-bold">Inward Record ({uidLabel})</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={handlePrintPdf}
            disabled={isPrinting}
            variant="outline"
            className="h-10 px-4 rounded-xl bg-white hover:bg-orange-50 border-slate-200 hover:border-orange-300 text-slate-700 hover:text-orange-600 font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
          >
            {isPrinting ? (
              <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
            ) : (
              <Printer className="w-4 h-4 text-orange-500" />
            )}
            <span>Print Job Card</span>
          </Button>

          <Button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="h-10 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all hover:scale-[1.01]"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Download className="w-4 h-4 text-white" />
            )}
            <span>Download Job Card PDF</span>
          </Button>
        </div>
      </div>

      {/* 2. Constrotrait Signature Inward Identity Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col gap-6">
          {/* Top Status & Pill Badges Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-orange-500 text-white shadow-sm shadow-orange-500/25 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" /> Inward Registration Record
              </span>

              {isNabl ? (
                <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> NABL Accredited
                </span>
              ) : (
                <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Non-NABL Testing
                </span>
              )}

              {branch?.name && (
                <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" /> {branch.name} {branch.code ? `(${branch.code})` : ""}
                </span>
              )}

              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                {allTests.length} Test{allTests.length !== 1 ? "s" : ""} Booked
              </span>
            </div>

            {/* Quick Inward Date Badge */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-full">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              <span>Inward Date: <strong className="text-slate-900">{formatDateSafe(jobEntry?.inward_on || jobEntry?.created_at)}</strong></span>
            </div>
          </div>

          {/* UID Title & Customer Quick Strip */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-t border-slate-100 pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3.5 flex-wrap">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200/80 text-orange-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Receipt className="w-6 h-6 text-orange-500" />
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">UID:</span>
                  <span className="text-3xl sm:text-4xl font-black text-orange-500 font-mono tracking-tight">{uidLabel}</span>
                </div>

                <button
                  onClick={handleCopyUid}
                  className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 hover:text-orange-700 transition-all text-xs font-bold flex items-center gap-1.5 border border-orange-200/80 shadow-2xs"
                  title="Copy UID"
                >
                  {copiedUid ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-orange-500" />}
                  <span>{copiedUid ? "Copied!" : "Copy UID"}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-sm text-slate-600 font-medium pl-1">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-orange-500" />
                  <span>Customer: <strong className="text-slate-900 font-bold">{client?.name || "Unknown Customer"}</strong></span>
                </div>

                {jobEntry?.project_name && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 hidden sm:inline">•</span>
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <span>Project: <strong className="text-slate-900 font-bold">{jobEntry.project_name}</strong></span>
                  </div>
                )}

                {jobEntry?.letter_reference && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 hidden sm:inline">•</span>
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Ref: <strong className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">{jobEntry.letter_reference}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Payment Status Pill */}
            <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-1.5 shrink-0 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Status</span>
              <span
                className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-2xs border ${
                  jobEntry?.payment_status?.toLowerCase() === "paid"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {jobEntry?.payment_status || "Pending"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Five-Point Quick Metric Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Customer */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center gap-3.5 hover:border-orange-200 hover:shadow-sm transition-all">
          <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-orange-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Customer</p>
            <p className="text-xs font-extrabold text-slate-900 truncate" title={client?.name}>{client?.name || "-"}</p>
            <p className="text-[11px] text-slate-500 truncate">{client?.company_name || "Individual Customer"}</p>
          </div>
        </div>

        {/* KPI 2: Site / Project */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center gap-3.5 hover:border-blue-200 hover:shadow-sm transition-all">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-blue-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Project & Site</p>
            <p className="text-xs font-extrabold text-slate-900 truncate" title={jobEntry?.project_name}>{jobEntry?.project_name || "-"}</p>
            <p className="text-[11px] text-slate-500 truncate">{jobEntry?.site_name || "Site not specified"}</p>
          </div>
        </div>

        {/* KPI 3: Material & Grade */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center gap-3.5 hover:border-orange-200 hover:shadow-sm transition-all">
          <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-orange-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Material & Grade</p>
            <p className="text-xs font-extrabold text-slate-900 truncate" title={materialDesc}>{materialDesc}</p>
            <p className="text-[11px] font-black text-orange-600 truncate">{grade !== "-" ? `Grade: ${grade}` : `Qty: ${sampleQty}`}</p>
          </div>
        </div>

        {/* KPI 4: Schedule & Age */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center gap-3.5 hover:border-emerald-200 hover:shadow-sm transition-all">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Testing Schedule</p>
            <p className="text-xs font-extrabold text-slate-900 truncate">
              {testingDay !== "-" ? `${testingDay} Testing` : formatDateSafe(primaryTest?.date_of_testing)}
            </p>
            <p className="text-[11px] text-slate-500 truncate">Cast: {formatDateSafe(castingDateRaw)}</p>
          </div>
        </div>

        {/* KPI 5: Tests Count */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center gap-3.5 hover:border-indigo-200 hover:shadow-sm transition-all col-span-2 sm:col-span-1">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <FlaskConical className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tests Booked</p>
            <p className="text-xs font-extrabold text-slate-900 truncate">{allTests.length} Test Parameter{allTests.length !== 1 ? "s" : ""}</p>
            <p className="text-[11px] text-emerald-600 font-bold truncate">
              {allTests.some((t: any) => t?.ulr_number) ? "ULR Generated" : "Standard Queue"}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Three Structured Detail Cards: Customer, Site & Billing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Card 1: Customer Information */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shadow-2xs">
                  <User className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Inward Step 1</span>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">Customer Details</h3>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 text-slate-600 border-slate-200">
                Client Profile
              </Badge>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Customer Name</p>
                <p className="text-sm font-black text-slate-900 leading-snug">{client?.name || "-"}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Company Name</p>
                <p className="text-xs font-bold text-slate-700 leading-snug">{client?.company_name || "-"}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-orange-500" /> Mobile
                  </p>
                  {client?.mobile ? (
                    <a href={`tel:${client.mobile}`} className="text-xs font-bold text-orange-600 hover:underline">
                      {client.mobile}
                    </a>
                  ) : (
                    <p className="text-xs text-slate-500 font-medium">-</p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-orange-500" /> Email
                  </p>
                  {client?.email ? (
                    <a href={`mailto:${client.email}`} className="text-xs font-semibold text-slate-700 hover:text-orange-600 truncate block" title={client.email}>
                      {client.email}
                    </a>
                  ) : (
                    <p className="text-xs text-slate-500 font-medium">-</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">GST Number</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-mono font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded-md border border-slate-200 inline-block">
                      {client?.gst_no || "N/A"}
                    </p>
                    {client?.gst_no && (
                      <button
                        onClick={handleCopyGst}
                        className="text-slate-400 hover:text-orange-500 p-1"
                        title="Copy GST Number"
                      >
                        {copiedGst ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-orange-500" />}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Assigned Branch</p>
                  <p className="text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-200 truncate">
                    {branch?.name || "Main Testing Lab"}
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" /> Registered Customer Address
                </p>
                <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 leading-relaxed font-medium">
                  {client?.address || "No official address registered on client file."}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Site & Project Details */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">

          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-2xs">
                  <Building2 className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Inward Step 2</span>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">Site & Project Details</h3>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200">
                Location & Dispatch
              </Badge>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Project Name</p>
                <p className="text-sm font-black text-slate-900 leading-snug">{jobEntry?.project_name || "-"}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Site Name</p>
                  <p className="text-xs font-bold text-slate-800 leading-snug">{jobEntry?.site_name || client?.site_name || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Division</p>
                  <p className="text-xs font-semibold text-slate-700">{jobEntry?.division || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Agency / Contractor</p>
                  <p className="text-xs font-semibold text-slate-700 leading-snug">{jobEntry?.agency || client?.agency_name || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Contact Person</p>
                  <p className="text-xs font-semibold text-slate-700">{jobEntry?.contact_person || client?.contact_person || "-"}</p>
                </div>
              </div>

              <div className="pt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-blue-500" /> Mode of Report Dispatch
                </p>
                <p className="text-xs font-bold text-slate-800 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                  {jobEntry?.collected_by || "Customer Direct / Laboratory Dispatch"}
                </p>
              </div>

              <div className="pt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dispatch Attention & Delivery Address</p>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1">
                  <p className="text-xs font-black text-slate-900">{jobEntry?.dispatch_name || client?.dispatch_name || client?.name || "-"}</p>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {jobEntry?.dispatch_address || client?.dispatch_address || client?.address || "Same as customer address."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Inward References, Billing & Meta */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">

          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-2xs">
                  <Receipt className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Inward Step 3</span>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">References & Billing</h3>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                Official Records
              </Badge>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Customer Letter Reference</p>
                <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200/80 flex items-center justify-between">
                  <p className="text-xs font-mono font-black text-emerald-900 truncate">
                    {jobEntry?.letter_reference || "No Letter Reference Provided"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Invoice Number</p>
                  <p className="text-xs font-bold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80">
                    {jobEntry?.invoice_no || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Invoice Date</p>
                  <p className="text-xs font-semibold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80">
                    {formatDateSafe(jobEntry?.invoice_date)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Payment Status</p>
                  <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                    {jobEntry?.payment_status || "Pending"}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Inward Registered</p>
                  <p className="text-xs font-semibold text-slate-700">
                    {formatDateSafe(jobEntry?.inward_on || jobEntry?.created_at, "dd MMM yyyy, hh:mm a")}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-orange-500" /> Sample Material Overview
                </p>
                <div className="bg-orange-50/50 p-3 rounded-2xl border border-orange-100 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Material:</span>
                    <span className="font-extrabold text-slate-900 text-right truncate max-w-[170px]">{materialDesc}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Grade / Quantity:</span>
                    <span className="font-bold text-orange-600">{grade} • {sampleQty}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Testing Schedule:</span>
                    <span className="font-semibold text-slate-800">{testingDay}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 5. Detailed Material & Sample Properties (Step 4 Data) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shadow-2xs">
              <Package className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Inward Step 4</span>
              <h3 className="font-extrabold text-slate-900 text-lg">Material & Sample Properties</h3>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Recorded at Inward Desk
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-1">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 hover:border-orange-200 transition-colors">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Material ID</p>
            <p className="text-sm font-extrabold text-slate-900 truncate">{materialId}</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 hover:border-orange-200 transition-colors">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sampling Location / Code</p>
            <p className="text-sm font-extrabold text-slate-900 truncate" title={materialLocation}>{materialLocation}</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 hover:border-orange-200 transition-colors">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sample Quantity</p>
            <p className="text-sm font-extrabold text-slate-900 truncate">{sampleQty}</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 hover:border-orange-200 transition-colors">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Grade</p>
            <p className="text-base font-black text-orange-600 truncate">{grade}</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 hover:border-orange-200 transition-colors">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Casting Date</p>
            <p className="text-sm font-extrabold text-slate-900 truncate">{formatDateSafe(castingDateRaw)}</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 hover:border-orange-200 transition-colors">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date of Receiving</p>
            <p className="text-sm font-extrabold text-slate-900 truncate">{formatDateSafe(receivingDateRaw)}</p>
          </div>
        </div>
      </div>

      {/* 6. All Tests & Dynamic Inward Additional Specifications (Step 3 & 5 Showcase) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shadow-2xs">
              <FlaskConical className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Inward Step 3 & 5</span>
              <h3 className="font-extrabold text-slate-900 text-xl tracking-tight">Tests Included in Inward</h3>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-4 py-1.5 rounded-xl shadow-2xs self-start sm:self-auto">
            Total {allTests.length} Test Parameter{allTests.length !== 1 ? "s" : ""}
          </span>
        </div>

        {allTests.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 text-slate-500">
            <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-700 text-base">No individual tests found for this inward.</p>
            <p className="text-xs text-slate-400 mt-1">This inward entry may be pending test allocation or draft mode.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {allTests.map((t: any, idx: number) => {
              const testMaster = t?.test_master || {};
              const testAddVals = (t?.additional_details_values as Record<string, any>) || {};
              const assignment = t?.job_assignments && t?.job_assignments.length > 0 ? t.job_assignments[0] : null;

              // Extract all dynamic additional details excluding already shown standard keys
              const dynamicKeys = Object.keys(testAddVals).filter((k) => {
                const lower = k.toLowerCase().replace(/[^a-z0-9]/g, "");
                return ![
                  "grade",
                  "castingdate",
                  "dateofcasting",
                  "testingage",
                  "testingday",
                  "quantity",
                  "samplequantity",
                ].includes(lower);
              });

              return (
                <div
                  key={t.id || idx}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 hover:border-orange-300 hover:shadow-md transition-all space-y-4"
                >
                  {/* Test Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="bg-orange-100 text-orange-800 text-xs font-black px-3 py-1 rounded-lg">
                          Test #{idx + 1}
                        </span>
                        <h4 className="font-black text-slate-900 text-lg sm:text-xl leading-tight">
                          {testMaster?.component_parameter || t?.component_parameter || t?.test_name || "Test Parameter"}
                        </h4>

                        {testMaster?.is_nabl && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> NABL Test
                          </span>
                        )}

                        {testMaster?.category && (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            {testMaster.category}
                          </span>
                        )}
                      </div>

                      {testMaster?.specific_test && (
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 pl-1">
                          {testMaster.specific_test}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {assignment?.status ? (
                        <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 capitalize shadow-2xs">
                          {assignment.status.replace("_", " ")}
                        </span>
                      ) : (
                        <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Unassigned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Standard Test Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 pt-2">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Standard Method</p>
                      <p className="text-xs font-extrabold text-slate-900 truncate" title={t?.test_method || testMaster?.test_method || "-"}>
                        {t?.test_method || testMaster?.test_method || "-"}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Testing Date</p>
                      <p className="text-xs font-extrabold text-slate-900">
                        {formatDateSafe(t?.date_of_testing)}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Testing Age</p>
                      <p className="text-xs font-extrabold text-slate-900">
                        {t?.testing_day || t?.testing_age || testingDay || "-"}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ULR No.</p>
                      <p className="text-xs font-black text-emerald-700 truncate">
                        {t?.ulr_number || (t?.ulr_status === "generated" ? "Generated" : "Awaiting Generation")}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">QC No.</p>
                      <p className="text-xs font-bold text-blue-700 truncate">
                        {t?.qc_number || "-"}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sample Code</p>
                      <p className="text-xs font-bold text-slate-900 truncate" title={t?.sample_code_no || t?.material_details_location || "-"}>
                        {t?.sample_code_no || t?.material_details_location || "-"}
                      </p>
                    </div>
                  </div>

                  {/* Material Description for this specific test */}
                  {t?.material_description && (
                    <div className="pt-1 text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                      <strong className="text-slate-900 font-extrabold mr-1.5">Material Description:</strong>
                      {t.material_description}
                    </div>
                  )}

                  {/* Dynamic Additional Specifications (Entered at Inward Step 5) */}
                  {dynamicKeys.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 space-y-2.5">
                      <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-orange-500" /> Additional Specifications Entered at Inward
                      </p>
                      <div className="flex flex-wrap gap-2.5">
                        {dynamicKeys.map((key) => {
                          const val = testAddVals[key];
                          if (val === undefined || val === null || val === "") return null;
                          return (
                            <div
                              key={key}
                              className="bg-orange-50/70 hover:bg-orange-100/70 px-3.5 py-1.5 rounded-xl border border-orange-200 text-xs flex items-center gap-2 shadow-2xs transition-colors"
                            >
                              <span className="text-orange-950/60 font-bold uppercase text-[10px] tracking-wider">{key}:</span>
                              <span className="font-extrabold text-slate-900">{String(val)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Review Remark / Note */}
                  {assignment?.reviewer_remark && (
                    <div className="pt-1 text-xs text-amber-900 bg-amber-50 p-3 rounded-2xl border border-amber-200">
                      <strong className="font-extrabold mr-1.5">Reviewer Remark:</strong>
                      {assignment.reviewer_remark}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. Bottom Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <BackToJobCardButton
          assignmentId={assignmentId}
          returnUrl={returnUrl}
          variant="footer"
          label="Back to Job Card"
        />

        <div className="flex items-center gap-3">
          <Button
            onClick={scrollToTop}
            variant="outline"
            className="h-11 px-4 rounded-xl border-slate-200 text-slate-700 hover:text-orange-600 hover:bg-orange-50 font-bold text-xs flex items-center gap-2"
          >
            <ArrowUp className="w-4 h-4 text-orange-500" />
            <span>Back to Top</span>
          </Button>

          <Button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="h-11 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Download className="w-4 h-4" />}
            <span>Download Job Card</span>
          </Button>
        </div>
      </div>

    </div>
  );
}
