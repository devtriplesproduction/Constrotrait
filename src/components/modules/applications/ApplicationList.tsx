"use client";

import { useState, useRef } from "react";
import { EmployeeApplication } from "@/services/employee-application.service";
import { Button } from "@/components/ui/button";
import { PrintableApplication } from "./PrintableApplication";
import { format } from "date-fns";
import { 
  Printer, 
  X, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Eye, 
  MessageSquare, 
  Plus,
  RotateCcw
} from "lucide-react";
import { printElement } from "@/lib/print";

interface ApplicationListProps {
  applications: EmployeeApplication[];
  userProfile: {
    first_name: string;
    last_name: string;
    designation: string;
    department: string;
  };
  onOpenNewApplication?: () => void;
  hasFiltersActive?: boolean;
  onResetFilters?: () => void;
}

export function ApplicationList({ 
  applications, 
  userProfile, 
  onOpenNewApplication,
  hasFiltersActive,
  onResetFilters 
}: ApplicationListProps) {
  const [selectedApp, setSelectedApp] = useState<EmployeeApplication | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

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
            Pending
          </span>
        );
    }
  };

  const handlePrint = () => {
    if (printRef.current) {
      printElement(printRef.current, `Application_${userProfile?.first_name || 'Form'}`);
    }
  };

  const handleQuickPrint = (app: EmployeeApplication) => {
    setSelectedApp(app);
    setTimeout(() => {
      if (printRef.current) {
        printElement(printRef.current, `Application_${userProfile?.first_name || 'Form'}`);
      }
    }, 150);
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
                  Date
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Subject & Request
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Reviewer Remark
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
                        <FileText className="w-8 h-8 stroke-[1.5]" />
                      </div>
                      <h4 className="text-base font-bold text-slate-800">
                        {hasFiltersActive ? "No Matching Applications" : "No Applications Yet"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1.5 mb-5 leading-relaxed">
                        {hasFiltersActive
                          ? "Try clearing your filters or search keywords to view other records."
                          : "Submit an official application to request leaves, advances, or other workplace approvals."}
                      </p>
                      {hasFiltersActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onResetFilters}
                          className="rounded-xl border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
                        </Button>
                      ) : (
                        onOpenNewApplication && (
                          <Button
                            size="sm"
                            onClick={onOpenNewApplication}
                            className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-md shadow-orange-500/20 gap-1.5 px-4"
                          >
                            <Plus className="w-4 h-4" /> Create First Application
                          </Button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-orange-50/20 transition-colors group">
                    {/* Date */}
                    <td className="px-6 py-4.5 whitespace-nowrap align-top">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {format(new Date(app.application_date), "MMM dd, yyyy")}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {format(new Date(app.application_date), "EEEE")}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Subject & Request */}
                    <td className="px-6 py-4.5 align-top max-w-md">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm line-clamp-1 group-hover:text-orange-600 transition-colors" title={app.subject}>
                          {app.subject}
                        </p>
                        {app.approval_for && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1 leading-relaxed" title={app.approval_for}>
                            <span className="font-medium text-slate-600">Request:</span> {app.approval_for}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4.5 whitespace-nowrap align-top">
                      {getStatusBadge(app.status)}
                    </td>

                    {/* Reviewer Remark */}
                    <td className="px-6 py-4.5 align-top max-w-xs">
                      {app.reviewer_remark ? (
                        <div className="flex items-start gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2" title={app.reviewer_remark}>
                            {app.reviewer_remark}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 font-medium pl-1">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4.5 text-right whitespace-nowrap align-top">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedApp(app)}
                          className="rounded-xl border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50 font-medium text-xs h-8.5 px-3.5 shadow-2xs gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuickPrint(app)}
                          className="rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 h-8.5 w-8.5 p-0"
                          title="Print Application"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog */}
      {!!selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="print:hidden p-5 border-b border-slate-200/80 bg-white/95 backdrop-blur flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100/70 text-orange-600 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    Application Details
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">
                      {format(new Date(selectedApp.application_date), "dd MMM yyyy")}
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
                  <span>Print / Save PDF</span>
                </Button>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="w-9 h-9 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-4 sm:p-6 bg-white overflow-y-auto flex-1">
              <PrintableApplication ref={printRef} application={selectedApp} userProfile={userProfile} />
            </div>

            {/* Review Decision & Remark Section */}
            <div className="print:hidden border-t border-slate-200/80 bg-slate-50/90 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 w-full sm:w-auto">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedApp.status === "approved"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200/60"
                      : selectedApp.status === "rejected"
                      ? "bg-rose-100 text-rose-700 border border-rose-200/60"
                      : "bg-amber-100 text-amber-700 border border-amber-200/60"
                  }`}
                >
                  {selectedApp.status === "approved" ? (
                    <CheckCircle2 className="w-4.5 h-4.5" />
                  ) : selectedApp.status === "rejected" ? (
                    <XCircle className="w-4.5 h-4.5" />
                  ) : (
                    <Clock className="w-4.5 h-4.5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      {selectedApp.status === "pending"
                        ? "Review Status: Pending"
                        : `Review Decision: ${selectedApp.status.toUpperCase()}`}
                    </span>
                  </div>
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
                      {selectedApp.status === "pending"
                        ? "Your application is awaiting review by the management."
                        : "No specific remark was provided by the reviewer."}
                    </p>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedApp(null)}
                className="rounded-xl border-slate-200 text-xs font-medium self-end sm:self-center shrink-0"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
