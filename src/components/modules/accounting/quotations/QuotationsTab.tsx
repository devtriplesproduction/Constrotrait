"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  Send,
  RefreshCw,
  XCircle,
  Clock,
  Search,
  X,
  Plus,
  Eye,
  History,
  Edit3,
  Package,
  Building,
  Briefcase,
  Calendar,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  LayoutGrid,
  List,
  AlertCircle,
  CalendarClock,
  FlaskConical,
  ArrowUpDown,
  Filter,
  Layers,
  FileCheck,
} from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/use-pagination";
import { QuotationApprovalPanel } from "./QuotationApprovalPanel";
import { QuotationViewModal } from "./QuotationViewModal";
import { QuotationVersionHistory } from "./QuotationVersionHistory";
import { useToast } from "@/hooks/use-toast";

interface QuotationsTabProps {
  data: any;
  run?: any;
  pending?: boolean;
  onRefresh?: () => void;
  onOpenViewInvoice?: (invoice: any) => void;
  onOpenCreateQuotation?: (qToRevise?: any) => void;
  onReviseQuotation?: (q: any) => void;
  onOpenCreateProforma?: (inward: any, options?: any) => void;
}

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export function QuotationsTab({
  data,
  onRefresh,
  onOpenViewInvoice,
  onOpenCreateQuotation,
  onReviseQuotation,
  onOpenCreateProforma,
}: QuotationsTabProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_desc" | "amount_asc" | "quote_no">("newest");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [selectedQuotationForView, setSelectedQuotationForView] = useState<any | null>(null);
  const [selectedQuotationForHistory, setSelectedQuotationForHistory] = useState<any | null>(null);

  const rawQuotations: any[] = useMemo(() => data?.quotations || [], [data?.quotations]);

  // Compute summary stats
  const totalCount = rawQuotations.length;
  const totalValue = rawQuotations.reduce((sum, q) => sum + (Number(q.total_amount || q.amount) || 0), 0);
  const draftCount = rawQuotations.filter((q) => (q.status || "draft").toLowerCase() === "draft").length;
  const sentQuotations = rawQuotations.filter((q) => (q.status || "").toLowerCase() === "sent");
  const sentCount = sentQuotations.length;
  const sentValue = sentQuotations.reduce((sum, q) => sum + (Number(q.total_amount || q.amount) || 0), 0);
  const approvedQuotations = rawQuotations.filter(
    (q) => (q.status || "").toLowerCase() === "approved" || (q.status || "").toLowerCase() === "accepted"
  );
  const approvedCount = approvedQuotations.length;
  const approvedValue = approvedQuotations.reduce(
    (sum, q) => sum + (Number(q.total_amount || q.amount) || 0),
    0
  );
  const reworkCount = rawQuotations.filter(
    (q) => (q.status || "").toLowerCase() === "rework" || (q.status || "").toLowerCase() === "revision_requested"
  ).length;
  const rejectedCount = rawQuotations.filter((q) => (q.status || "").toLowerCase() === "rejected").length;
  const conversionRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  // Filter & sort quotations
  const processedQuotations = useMemo(() => {
    let list = rawQuotations.filter((q) => {
      const status = (q.status || "draft").toLowerCase();
      if (statusFilter !== "all") {
        if (statusFilter === "approved" && !(status === "approved" || status === "accepted")) return false;
        if (statusFilter === "rework" && !(status === "rework" || status === "revision_requested")) return false;
        if (statusFilter !== "approved" && statusFilter !== "rework" && status !== statusFilter) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchNo = (q.quotation_no || "").toLowerCase().includes(query);
        const matchClient = (q.clients?.name || q.client?.name || "").toLowerCase().includes(query);
        const matchProject = (q.projects?.name || q.project?.name || "").toLowerCase().includes(query);
        const matchItems =
          Array.isArray(q.items) &&
          q.items.some((it: any) => (it.description || "").toLowerCase().includes(query));
        const matchCategory = (q.category || "").toLowerCase().includes(query);
        const matchDept = (q.department || "").toLowerCase().includes(query);
        return matchNo || matchClient || matchProject || matchItems || matchCategory || matchDept;
      }

      return true;
    });

    list.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      if (sortBy === "amount_desc") {
        return (Number(b.total_amount || b.amount) || 0) - (Number(a.total_amount || a.amount) || 0);
      }
      if (sortBy === "amount_asc") {
        return (Number(a.total_amount || a.amount) || 0) - (Number(b.total_amount || b.amount) || 0);
      }
      if (sortBy === "quote_no") {
        return (a.quotation_no || "").localeCompare(b.quotation_no || "");
      }
      return 0;
    });

    return list;
  }, [rawQuotations, statusFilter, searchQuery, sortBy]);

  const pagination = usePagination({
    data: processedQuotations,
    initialPageSize: 10,
  });

  const handleCopyQuoteNo = (e: React.MouseEvent, quoteNo: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(quoteNo);
    setCopiedId(id);
    toast({
      title: "Quote Number Copied",
      description: `${quoteNo} copied to clipboard.`,
    });
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const toggleItemsExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getStatusBadge = (statusStr: string) => {
    const status = (statusStr || "draft").toLowerCase();
    switch (status) {
      case "approved":
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Approved
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
            <Send className="w-3.5 h-3.5 text-blue-600" />
            Sent to Client
          </span>
        );
      case "rework":
      case "revision_requested":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
            Rework Needed
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Summary Stats Cards (Standard ConstroTrait ERP KPI Hero) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Quotations */}
        <div
          onClick={() => setStatusFilter("all")}
          className={`min-h-[128px] p-4 sm:p-5 bg-gradient-to-b from-blue-50/25 via-white to-white border border-slate-200/90 hover:border-blue-300 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-300 group flex flex-col justify-between relative overflow-hidden cursor-pointer ${
            statusFilter === "all" ? "ring-2 ring-blue-500/30 border-blue-400" : ""
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Total Quotations
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 group-hover:bg-blue-100 transition-all shadow-2xs">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1 font-sans truncate tabular-nums">
              {fmt(totalValue)}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-slate-100/90 gap-1.5 mt-auto">
            <span className="truncate">{totalCount} total quotes</span>
            <span className="font-semibold text-blue-800 bg-blue-50 border border-blue-200/70 px-2.5 py-0.5 rounded-full text-[10px] shrink-0 whitespace-nowrap shadow-2xs">
              Pipeline
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
        </div>

        {/* Approved */}
        <div
          onClick={() => setStatusFilter("approved")}
          className={`min-h-[128px] p-4 sm:p-5 bg-gradient-to-b from-emerald-50/25 via-white to-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-300 group flex flex-col justify-between relative overflow-hidden cursor-pointer ${
            statusFilter === "approved" ? "ring-2 ring-emerald-500/30 border-emerald-400" : ""
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate">Approved Quotes</span>
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 group-hover:bg-emerald-100 transition-all shadow-2xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1 font-sans truncate tabular-nums">
              {fmt(approvedValue)}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-slate-100/90 gap-1.5 mt-auto">
            <span className="truncate">{approvedCount} approved</span>
            <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full text-[10px] shrink-0 whitespace-nowrap shadow-2xs">
              {conversionRate}% Win Rate
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

        {/* Sent to Client */}
        <div
          onClick={() => setStatusFilter("sent")}
          className={`min-h-[128px] p-4 sm:p-5 bg-gradient-to-b from-sky-50/25 via-white to-white border border-slate-200/90 hover:border-sky-300 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-300 group flex flex-col justify-between relative overflow-hidden cursor-pointer ${
            statusFilter === "sent" ? "ring-2 ring-sky-500/30 border-sky-400" : ""
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1.5 truncate">
                <Send className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="truncate">Sent to Client</span>
              </span>
              <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200/70 flex items-center justify-center text-sky-600 shrink-0 group-hover:scale-105 group-hover:bg-sky-100 transition-all shadow-2xs">
                <Send className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1 font-sans truncate tabular-nums">
              {fmt(sentValue)}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-slate-100/90 gap-1.5 mt-auto">
            <span className="truncate">{sentCount} awaiting review</span>
            <span className="font-semibold text-sky-800 bg-sky-50 border border-sky-200/70 px-2.5 py-0.5 rounded-full text-[10px] shrink-0 whitespace-nowrap shadow-2xs">
              In Review
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500" />
        </div>

        {/* Rework Needed */}
        <div
          onClick={() => setStatusFilter("rework")}
          className={`min-h-[128px] p-4 sm:p-5 bg-gradient-to-b from-amber-50/25 via-white to-white border border-slate-200/90 hover:border-amber-300 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-300 group flex flex-col justify-between relative overflow-hidden cursor-pointer ${
            statusFilter === "rework" ? "ring-2 ring-amber-500/30 border-amber-400" : ""
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 truncate">
                <RefreshCw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">Rework Needed</span>
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-105 group-hover:bg-amber-100 transition-all shadow-2xs">
                <RefreshCw className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1 font-sans truncate tabular-nums">
              {reworkCount}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-slate-100/90 gap-1.5 mt-auto">
            <span className="truncate">{reworkCount > 0 ? "Requires edit" : "None pending"}</span>
            <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200/70 px-2.5 py-0.5 rounded-full text-[10px] shrink-0 whitespace-nowrap shadow-2xs">
              {reworkCount > 0 ? "Action Required" : "All Clear"}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400" />
        </div>

        {/* Drafts */}
        <div
          onClick={() => setStatusFilter("draft")}
          className={`min-h-[128px] p-4 sm:p-5 bg-gradient-to-b from-slate-50/40 via-white to-white border border-slate-200/90 hover:border-slate-300 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-300 group flex flex-col justify-between relative overflow-hidden cursor-pointer ${
            statusFilter === "draft" ? "ring-2 ring-slate-500/30 border-slate-400" : ""
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 truncate">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Drafts</span>
              </span>
              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/70 flex items-center justify-center text-slate-600 shrink-0 group-hover:scale-105 group-hover:bg-slate-200 transition-all shadow-2xs">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1 font-sans truncate tabular-nums">
              {draftCount}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-slate-100/90 gap-1.5 mt-auto">
            <span className="truncate">Pending dispatch</span>
            <span className="font-semibold text-slate-700 bg-slate-100 border border-slate-200/70 px-2.5 py-0.5 rounded-full text-[10px] shrink-0 whitespace-nowrap shadow-2xs">
              In Progress
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-400" />
        </div>
      </div>

      {/* 2. Control Bar: Search, Status Tabs, Sorting & View Toggle */}
      <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by quote #, client, project, test item, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-10 pr-9 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 outline-none transition-all placeholder:text-slate-400 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Action Controls: Sort & View Toggle */}
          <div className="flex items-center gap-2.5 self-end lg:self-auto flex-wrap">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort quotations"
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amount_desc">Amount: High to Low</option>
                <option value="amount_asc">Amount: Low to High</option>
                <option value="quote_no">Quotation Number (A-Z)</option>
              </select>
            </div>

            {/* View Switcher: Cards vs Table */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                title="Grid / Cards View"
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Dense Table View"
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Filter Pills Row */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: "all", label: "All Quotations", count: totalCount },
              { id: "draft", label: "Drafts", count: draftCount },
              { id: "sent", label: "Sent", count: sentCount },
              { id: "approved", label: "Approved", count: approvedCount },
              { id: "rework", label: "Rework Needed", count: reworkCount },
              { id: "rejected", label: "Rejected", count: rejectedCount },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      active ? "bg-white/20 text-white" : "bg-white text-slate-700 shadow-2xs"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Result Count and Clear Filters */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-800 font-bold">{processedQuotations.length}</strong> of{" "}
              {totalCount}
            </span>
            {(searchQuery || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
                className="text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer ml-1"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Quotation List Content (Cards or Table) */}
      <div className="space-y-4">
        {processedQuotations.length === 0 ? (
          <div className="py-20 px-4 text-center bg-white border border-dashed border-slate-300 rounded-3xl space-y-4 shadow-2xs">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto shadow-xs">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-900">No Quotations Found</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {searchQuery || statusFilter !== "all"
                  ? "No commercial quotations match your search query or status filter. Try clearing filters or refining your search."
                  : "Get started by generating your first lab commercial quotation with customized test rates, client terms, and NABL specifications."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              {(searchQuery || statusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
              {onOpenCreateQuotation && (
                <button
                  type="button"
                  onClick={() => onOpenCreateQuotation()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition-all hover:scale-105 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create New Quotation
                </button>
              )}
            </div>
          </div>
        ) : viewMode === "cards" ? (
          /* Cards View */
          <div className="space-y-4">
            {pagination.paginatedData.map((q: any) => {
              const status = (q.status || "draft").toLowerCase();
              const versionNum = q.version_number || 1;
              const clientName = q.clients?.name || q.client?.name || "Direct / Walk-in Client";
              const projectName = q.projects?.name || q.project?.name || "General Project / Site";
              const quoteAmount = q.total_amount || q.amount || 0;
              const isApproved = status === "approved" || status === "accepted";
              const isRework = status === "rework" || status === "revision_requested";
              const hasInward = !!q.inward_id || status === "inward_created";
              const itemsList = Array.isArray(q.items) ? q.items : [];
              const isExpanded = !!expandedItems[q.id];

              return (
                <div
                  key={q.id}
                  onClick={() => router.push(`/accounting/quotations/${q.id}`)}
                  className="group relative p-5 bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all duration-200 space-y-4 cursor-pointer"
                >
                  {/* Top Bar: Quotation No, Badges, Total Value */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                    {/* Left: Quote #, Copy, Version, Tags, Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center ring-1 ring-blue-100 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 group-hover:text-blue-600 text-base tracking-tight transition-colors">
                          {q.quotation_no}
                        </span>

                        <button
                          type="button"
                          title="Copy Quote Number"
                          onClick={(e) => handleCopyQuoteNo(e, q.quotation_no, q.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          {copiedId === q.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Version Badge */}
                      <span className="px-2 py-0.5 rounded-lg text-[11px] font-black bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs">
                        v{versionNum}
                      </span>

                      {/* Category Tag */}
                      {q.category && (
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200/80">
                          {q.category}
                        </span>
                      )}

                      {/* Department Tag */}
                      {q.department && (
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                          {q.department}
                        </span>
                      )}

                      {/* Status Badge */}
                      {getStatusBadge(status)}
                    </div>

                    {/* Right: Total Value */}
                    <div className="flex items-center gap-3 sm:text-right shrink-0">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Commercial Value
                        </span>
                        <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-mono">
                          {fmt(quoteAmount)}
                        </span>
                      </div>
                      <span className="text-xs text-blue-600 group-hover:translate-x-1 transition-transform font-bold hidden md:inline-flex items-center gap-1">
                        View <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: 4 Clean Info Tiles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {/* Client Tile */}
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                        <Building className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Client
                        </span>
                        <strong className="text-slate-800 font-bold truncate block" title={clientName}>
                          {clientName}
                        </strong>
                      </div>
                    </div>

                    {/* Project / Site Tile */}
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Project / Site
                        </span>
                        <span className="text-slate-700 font-medium truncate block" title={projectName}>
                          {projectName}
                        </span>
                      </div>
                    </div>

                    {/* Created Date Tile */}
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Date Created
                        </span>
                        <span className="text-slate-700 font-semibold block">
                          {q.created_at
                            ? new Date(q.created_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Validity Tile */}
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                        <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Valid Until
                        </span>
                        <span className="text-slate-700 font-semibold block">
                          {q.valid_until || "Standard 30 Days"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Scope of Testing (Pill list) */}
                  {itemsList.length > 0 && (
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/70 text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-500 font-semibold">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                          <FlaskConical className="w-3.5 h-3.5 text-blue-600" />
                          Testing Scope
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200/80">
                          {itemsList.length} line item{itemsList.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {(isExpanded ? itemsList : itemsList.slice(0, 3)).map((it: any, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200/90 text-[11px] text-slate-800 font-medium shadow-2xs"
                          >
                            <span className="font-semibold text-slate-900">{it.description}</span>
                            <span className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.2 rounded text-[10px]">
                              ×{it.qty || 1}
                            </span>
                          </span>
                        ))}

                        {itemsList.length > 3 && (
                          <button
                            type="button"
                            onClick={(e) => toggleItemsExpand(e, q.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-[11px] text-slate-700 font-bold transition-colors cursor-pointer"
                          >
                            {isExpanded ? (
                              <>
                                Show Less <ChevronUp className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                +{itemsList.length - 3} more <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rework Instructions Banner */}
                  {q.rework_notes && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <strong className="font-bold text-amber-950 block">Rework Required:</strong>
                        <p className="text-amber-800 leading-relaxed">{q.rework_notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason Banner */}
                  {q.rejection_reason && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5 shadow-2xs">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <strong className="font-bold text-rose-950 block">Rejection Reason:</strong>
                        <p className="text-rose-800 leading-relaxed">{q.rejection_reason}</p>
                      </div>
                    </div>
                  )}

                  {/* Bottom Action Strip (Clean & Deduplicated) */}
                  <div
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Left Quick Navigation Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/accounting/quotations/${q.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Details
                      </Link>

                      <Link
                        href={`/accounting/quotations/${q.id}?tab=history`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5" />
                        History (v{versionNum})
                      </Link>

                      {/* Primary Quick Revision for Rework/Rejected */}
                      {(isRework || status === "rejected") && (
                        <Link
                          href={`/accounting/quotations/new?revise=${q.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Revise (Draft v{versionNum + 1})
                        </Link>
                      )}

                      {/* Primary Quick Convert to Inward if Approved and not yet converted */}
                      {isApproved && !q.inward_id && (
                        <button
                          type="button"
                          onClick={() => router.push(`/clients/new?quotation_id=${q.id}`)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
                        >
                          <Package className="w-3.5 h-3.5" />
                          Convert to Inward
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Primary Quick Create Proforma Invoice if inward created */}
                      {(hasInward || status === "accepted") && onOpenCreateProforma && (
                        <button
                          type="button"
                          onClick={() => {
                            const targetInward =
                              (data.recentInwards || []).find((inv: any) => inv.id === q.inward_id) || {
                                id: q.inward_id,
                                client_id: q.client_id,
                                quotation_id: q.id,
                              };
                            onOpenCreateProforma(targetInward, { quotationId: q.id });
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Create Proforma Invoice
                        </button>
                      )}
                    </div>

                    {/* Right: Approval & Status Panel (Omit conversion handlers to avoid duplicates) */}
                    <div className="flex items-center gap-2">
                      <QuotationApprovalPanel quotation={q} onRefresh={onRefresh} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Quote No & Ver</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Project / Site</th>
                    <th className="py-3.5 px-4">Date & Validity</th>
                    <th className="py-3.5 px-4 text-center">Items</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Total Amount</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagination.paginatedData.map((q: any) => {
                    const status = (q.status || "draft").toLowerCase();
                    const versionNum = q.version_number || 1;
                    const clientName = q.clients?.name || q.client?.name || "Direct / Walk-in Client";
                    const projectName = q.projects?.name || q.project?.name || "General Project / Site";
                    const quoteAmount = q.total_amount || q.amount || 0;
                    const itemsCount = Array.isArray(q.items) ? q.items.length : 0;
                    const isApproved = status === "approved" || status === "accepted";

                    return (
                      <tr
                        key={q.id}
                        onClick={() => router.push(`/accounting/quotations/${q.id}`)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        {/* Quote No */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>{q.quotation_no}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                              v{versionNum}
                            </span>
                          </div>
                        </td>

                        {/* Client */}
                        <td className="py-3.5 px-4 font-semibold text-slate-800 max-w-[180px] truncate">
                          {clientName}
                        </td>

                        {/* Project */}
                        <td className="py-3.5 px-4 text-slate-600 max-w-[180px] truncate">
                          {projectName}
                        </td>

                        {/* Date & Validity */}
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          <div>
                            {q.created_at
                              ? new Date(q.created_at).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "N/A"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Until: {q.valid_until || "30 Days"}
                          </div>
                        </td>

                        {/* Items */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                            {itemsCount}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(status)}</td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-4 text-right font-black text-slate-900 font-mono text-sm whitespace-nowrap">
                          {fmt(quoteAmount)}
                        </td>

                        {/* Actions */}
                        <td
                          className="py-3.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/accounting/quotations/${q.id}`}
                              title="View Details"
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            <Link
                              href={`/accounting/quotations/${q.id}?tab=history`}
                              title="Version History"
                              className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 border border-transparent hover:border-purple-200 transition-all"
                            >
                              <History className="w-4 h-4" />
                            </Link>

                            {isApproved && !q.inward_id && (
                              <button
                                type="button"
                                title="Convert to Inward"
                                onClick={() => router.push(`/clients/new?quotation_id=${q.id}`)}
                                className="px-2 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] shadow-2xs transition-all cursor-pointer"
                              >
                                Inward &rarr;
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Pagination */}
        {processedQuotations.length > 0 && (
          <div className="pt-2">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              itemLabel="quotations"
            />
          </div>
        )}
      </div>

      {/* Quotation Detail Modal (Preview, Print, T&C) */}
      {selectedQuotationForView && (
        <QuotationViewModal
          isOpen={!!selectedQuotationForView}
          onClose={() => setSelectedQuotationForView(null)}
          quotation={selectedQuotationForView}
          onRefresh={onRefresh}
          onConvertedToInvoice={(inv) => {
            setSelectedQuotationForView(null);
            if (onOpenViewInvoice) onOpenViewInvoice(inv);
          }}
          onRevise={(q) => {
            setSelectedQuotationForView(null);
            if (onReviseQuotation) onReviseQuotation(q);
          }}
          onConvertToInward={(q) => {
            setSelectedQuotationForView(null);
            router.push(`/clients/new?quotation_id=${q.id}`);
          }}
        />
      )}

      {/* Quotation Version History Modal */}
      {selectedQuotationForHistory && (
        <QuotationVersionHistory
          isOpen={!!selectedQuotationForHistory}
          onClose={() => setSelectedQuotationForHistory(null)}
          quotationId={selectedQuotationForHistory?.id || ""}
          quotationNo={selectedQuotationForHistory?.quotation_no}
          currentVersion={selectedQuotationForHistory?.version_number || 1}
        />
      )}
    </div>
  );
}
