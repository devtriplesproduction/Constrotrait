"use client";

import { useState, useMemo } from "react";
import { EmployeeApplication } from "@/services/employee-application.service";
import { ApplicationList } from "./ApplicationList";
import { ReviewApplicationList } from "./ReviewApplicationList";
import { ApplicationFormModal } from "./ApplicationFormModal";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/modules/PageHeader";
import { Select, SelectItem } from "@/components/ui/select";
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  X, 
  ClipboardCheck, 
  Inbox,
  Filter
} from "lucide-react";

interface ApplicationsClientPageProps {
  myApplications: EmployeeApplication[];
  canApprove: boolean;
  applicationsToReview: EmployeeApplication[];
  userProfile: {
    first_name: string;
    last_name: string;
    designation: string;
    department: string;
  };
}

export function ApplicationsClientPage({
  myApplications,
  canApprove,
  applicationsToReview,
  userProfile
}: ApplicationsClientPageProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"my-applications" | "review">("my-applications");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Metrics for "My Applications"
  const myTotal = myApplications.length;
  const myPending = myApplications.filter(a => a.status === "pending").length;
  const myApproved = myApplications.filter(a => a.status === "approved").length;
  const myRejected = myApplications.filter(a => a.status === "rejected").length;

  // Metrics for "Review Queue"
  const reviewTotal = applicationsToReview.length;
  const reviewPending = applicationsToReview.filter(a => a.status === "pending").length;
  const reviewApproved = applicationsToReview.filter(a => a.status === "approved").length;
  const reviewRejected = applicationsToReview.filter(a => a.status === "rejected").length;

  const isReviewTab = activeTab === "review";

  // Filtered lists
  const filteredMyApplications = useMemo(() => {
    return myApplications.filter(app => {
      if (statusFilter !== "all" && app.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        app.subject?.toLowerCase().includes(q) ||
        app.approval_for?.toLowerCase().includes(q) ||
        app.reason?.toLowerCase().includes(q) ||
        app.reviewer_remark?.toLowerCase().includes(q)
      );
    });
  }, [myApplications, statusFilter, searchQuery]);

  const filteredReviewApplications = useMemo(() => {
    return applicationsToReview.filter(app => {
      if (statusFilter !== "all" && app.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const applicantName = `${app.profiles?.first_name || ""} ${app.profiles?.last_name || ""}`.toLowerCase();
      const designation = (app.profiles?.designation || "").toLowerCase();
      return (
        applicantName.includes(q) ||
        designation.includes(q) ||
        app.subject?.toLowerCase().includes(q) ||
        app.approval_for?.toLowerCase().includes(q) ||
        app.reason?.toLowerCase().includes(q) ||
        app.reviewer_remark?.toLowerCase().includes(q)
      );
    });
  }, [applicationsToReview, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Employee Applications"
        subtitle="Submit, track, and manage official workplace applications and administrative requests."
        icon={FileText}
        actions={
          <Button
            onClick={() => setIsFormOpen(true)}
            className="rounded-2xl bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all hover:-translate-y-0.5 h-11 px-5 font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Application</span>
          </Button>
        }
      />

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Card */}
        <div className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isReviewTab ? "Review Queue" : "Total Applications"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              {isReviewTab ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Inbox className="w-3.5 h-3.5" />}
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {isReviewTab ? reviewTotal : myTotal}
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {isReviewTab ? "Total submissions" : "All-time total"}
            </span>
          </div>
        </div>

        {/* Pending Card */}
        <div className="bg-white/90 backdrop-blur-sm border border-amber-200/80 rounded-xl px-3.5 py-2.5 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Pending Review
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200/60">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold text-amber-700 tracking-tight">
              {isReviewTab ? reviewPending : myPending}
            </span>
            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50">
              Requires attention
            </span>
          </div>
        </div>

        {/* Approved Card */}
        <div className="bg-white/90 backdrop-blur-sm border border-emerald-200/80 rounded-xl px-3.5 py-2.5 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Approved
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200/60">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold text-emerald-700 tracking-tight">
              {isReviewTab ? reviewApproved : myApproved}
            </span>
            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
              Granted
            </span>
          </div>
        </div>

        {/* Rejected Card */}
        <div className="bg-white/90 backdrop-blur-sm border border-rose-200/80 rounded-xl px-3.5 py-2.5 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
              Rejected
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-200/60">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold text-rose-700 tracking-tight">
              {isReviewTab ? reviewRejected : myRejected}
            </span>
            <span className="text-[10px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/50">
              Closed
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar: Tabs + Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
          <button
            onClick={() => setActiveTab("my-applications")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              activeTab === "my-applications"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <span>My Applications</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "my-applications"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {myTotal}
            </span>
          </button>

          {canApprove && (
            <button
              onClick={() => setActiveTab("review")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                activeTab === "review"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <span>Review Applications</span>
              {reviewPending > 0 ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500 text-white animate-pulse">
                  {reviewPending}
                </span>
              ) : (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === "review"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {reviewTotal}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2.5">
          {/* Search Box */}
          <div className="relative w-full sm:w-80 md:w-96 lg:w-[400px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by subject or keyword..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Select */}
          <div className="shrink-0 z-20">
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder="Filter Status"
              buttonClassName="h-9 px-3 text-xs bg-white border border-slate-200 rounded-xl font-medium min-w-[130px]"
            >
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </Select>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div>
        {activeTab === "my-applications" && (
          <ApplicationList
            applications={filteredMyApplications}
            userProfile={userProfile}
            onOpenNewApplication={() => setIsFormOpen(true)}
            hasFiltersActive={Boolean(searchQuery || statusFilter !== "all")}
            onResetFilters={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
          />
        )}

        {activeTab === "review" && canApprove && (
          <ReviewApplicationList
            applications={filteredReviewApplications}
            hasFiltersActive={Boolean(searchQuery || statusFilter !== "all")}
            onResetFilters={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
          />
        )}
      </div>

      {/* Form Modal */}
      <ApplicationFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        userProfile={userProfile}
      />
    </div>
  );
}
