"use client";

import { useState, useRef } from "react";
import { EmployeeApplication, EmployeeApplicationStatus } from "@/services/employee-application.service";
import { updateApplicationStatus } from "@/actions/employee-application.actions";
import { Button } from "@/components/ui/button";
import { PrintableApplication } from "./PrintableApplication";
import { format } from "date-fns";
import { 
  Printer, 
  X, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  MessageSquare, 
  ShieldCheck, 
  Send,
  Eye,
  RotateCcw,
  UserCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { printElement } from "@/lib/print";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/use-pagination";

interface ReviewApplicationListProps {
  applications: EmployeeApplication[];
  hasFiltersActive?: boolean;
  onResetFilters?: () => void;
}

export function ReviewApplicationList({ 
  applications,
  hasFiltersActive,
  onResetFilters
}: ReviewApplicationListProps) {
  const [selectedApp, setSelectedApp] = useState<EmployeeApplication | null>(null);
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedData: paginatedApplications,
    setCurrentPage,
    setPageSize,
  } = usePagination({
    data: applications,
    initialPageSize: 10,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/70 shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/70 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Action
          </span>
        );
    }
  };

  const handleAction = async (status: EmployeeApplicationStatus) => {
    if (!selectedApp) return;
    setLoading(true);

    try {
      const res = await updateApplicationStatus(selectedApp.id, status, remark);
      if (res.success) {
        toast({ title: `Application ${status} successfully`, variant: "success" });
        setSelectedApp(null);
        setRemark("");
      } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (printRef.current) {
      printElement(printRef.current, `Application_${selectedApp?.profiles?.first_name || 'Review'}`);
    }
  };

  const closeModal = () => {
    setSelectedApp(null);
    setRemark("");
  };

  return (
    <div>
      {/* Table Container */}
      <div className="w-full overflow-hidden bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Subject & Details
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4 ring-8 ring-orange-50/50 shadow-inner">
                        <UserCheck className="w-8 h-8 stroke-[1.5]" />
                      </div>
                      <h4 className="text-base font-bold text-slate-800">
                        {hasFiltersActive ? "No Matching Review Requests" : "Review Queue Clear"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1.5 mb-4 leading-relaxed">
                        {hasFiltersActive
                          ? "No applications match your search or status filter."
                          : "Great job! All team applications have been reviewed and processed."}
                      </p>
                      {hasFiltersActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onResetFilters}
                          className="rounded-xl border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedApplications.map((app) => {
                  const firstName = app.profiles?.first_name || "Employee";
                  const lastName = app.profiles?.last_name || "";
                  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "E";
                  const isPending = app.status === "pending";

                  return (
                    <tr key={app.id} className="hover:bg-orange-50/20 transition-colors group">
                      {/* Employee Info */}
                      <td className="px-6 py-4.5 align-top whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-xs shadow-2xs border border-orange-200/50 shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">
                              {firstName} {lastName}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {app.profiles?.designation || "Staff"}
                              {app.profiles?.department && (
                                <span className="text-slate-400"> • {app.profiles.department}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4.5 whitespace-nowrap align-top">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-semibold text-slate-700">
                            {format(new Date(app.application_date), "MMM dd, yyyy")}
                          </span>
                        </div>
                      </td>

                      {/* Subject */}
                      <td className="px-6 py-4.5 align-top max-w-sm">
                        <p className="font-semibold text-slate-900 text-sm line-clamp-1 group-hover:text-orange-600 transition-colors" title={app.subject}>
                          {app.subject}
                        </p>
                        {app.approval_for && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1 leading-relaxed" title={app.approval_for}>
                            <span className="font-medium text-slate-600">Request:</span> {app.approval_for}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4.5 whitespace-nowrap align-top">
                        {getStatusBadge(app.status)}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4.5 text-right whitespace-nowrap align-top">
                        <Button
                          size="sm"
                          onClick={() => setSelectedApp(app)}
                          className={`rounded-xl text-xs h-8.5 px-4 font-semibold shadow-2xs gap-1.5 ${
                            isPending
                              ? "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-500/20"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {isPending ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Review</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {applications.length > 0 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50]}
            itemLabel="review requests"
          />
        </div>
      )}

      {/* Review Modal Dialog */}
      {!!selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="print:hidden p-5 border-b border-slate-200/80 bg-white/95 backdrop-blur flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
                  {selectedApp.profiles?.first_name?.[0] || "A"}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    Review Application: {selectedApp.profiles?.first_name} {selectedApp.profiles?.last_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">
                      {selectedApp.profiles?.designation || "Staff"} • {format(new Date(selectedApp.application_date), "dd MMM yyyy")}
                    </span>
                    <span className="text-slate-300">•</span>
                    {getStatusBadge(selectedApp.status)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePrint}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs h-9 px-4 gap-2 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print PDF</span>
                </Button>
                <button
                  onClick={closeModal}
                  className="w-9 h-9 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="p-4 sm:p-6 bg-white overflow-y-auto flex-1">
              <PrintableApplication ref={printRef} application={selectedApp} />
            </div>

            {/* Action Bar */}
            {selectedApp.status === "pending" ? (
              <div className="print:hidden p-5 border-t border-slate-200/80 bg-white space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                    Reviewer Feedback / Remark (Optional)
                  </label>
                  <textarea
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="Enter any comments, notes, or instructions for the employee..."
                    className="w-full min-h-[70px] p-3 text-sm rounded-xl border border-slate-200 bg-slate-50/50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400 font-medium">
                    This decision will be officially logged and visible to the applicant.
                  </span>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleAction("rejected")}
                      disabled={loading}
                      className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-10 px-5 font-semibold text-xs"
                    >
                      <XCircle className="w-4 h-4 mr-1.5" /> Reject
                    </Button>
                    <Button
                      onClick={() => handleAction("approved")}
                      disabled={loading}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-6 font-semibold text-xs shadow-md shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve Application
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="print:hidden border-t border-slate-200/80 bg-slate-50/90 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3 w-full sm:w-auto">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedApp.status === "approved"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200/60"
                      : "bg-rose-100 text-rose-700 border border-rose-200/60"
                  }`}>
                    {selectedApp.status === "approved" ? <CheckCircle2 className="w-4.5 h-4.5" /> : <XCircle className="w-4.5 h-4.5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Application marked as {selectedApp.status.toUpperCase()}
                    </p>
                    {selectedApp.reviewer_remark ? (
                      <div className="mt-1.5 bg-white p-3 rounded-xl border border-slate-200 shadow-xs max-w-xl">
                        <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block mb-1 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Reviewer Remark
                        </span>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {selectedApp.reviewer_remark}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5">
                        No remark was entered for this decision.
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeModal}
                  className="rounded-xl border-slate-200 text-xs font-medium self-end sm:self-center shrink-0"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
