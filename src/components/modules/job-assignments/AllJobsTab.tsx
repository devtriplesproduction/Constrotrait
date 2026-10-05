"use client";

import { useState, Fragment, useMemo } from "react";
import { format, isSameDay, isThisWeek, isThisMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/Dropdown";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ClipboardList, X, Search, Calendar, FileText, User, Download, Loader2 } from "lucide-react";
import { AssignJobsTab } from "./AssignJobsTab";
import { updateAssignmentStatusAction, deleteAssignmentAction } from "@/actions/job-assignment.actions";
import { downloadJobCardAction } from "@/actions/job-card-pdf.actions";
import { JobStageStepper } from "@/components/ui/JobStageStepper";
import { toast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

function assignmentUid(assignment: any) {
  const t = assignment.job_entry_tests;
  const uid = t?.uid_label || t?.job_entries?.uid_label || t?.job_entries?.uid;
  if (uid) return `UID: ${uid}`;
  const testDate = t?.date_of_testing ? new Date(t.date_of_testing).toLocaleDateString() : '-';
  return `Test ID missing`;
}

export function AllJobsTab({ assignments, branches, employees, filterStatus }: { assignments: any[], branches: any[], employees: any[], filterStatus: string }) {
  const router = useRouter();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [initialAssignment, setInitialAssignment] = useState<any>(null);
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("today");
  const [searchEmployee, setSearchEmployee] = useState<string>("");
  const [remarkObj, setRemarkObj] = useState<{ id: string; remark: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;
    try {
      setDeletingId(id);
      const res = await deleteAssignmentAction(id);
      if (res.success) {
        toast({ title: "Success", description: "Assignment deleted successfully.", variant: "success" });
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error || "Failed to delete assignment.", variant: "error" });
      }
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast({ title: "Error", description: "Failed to delete assignment.", variant: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadPdf = async (testId: string, uid: string) => {
    try {
      setDownloadingId(testId);
      const res = await downloadJobCardAction(testId);
      if (res.success && res.data) {
        // Convert base64 to blob
        const byteCharacters = atob(res.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        // Trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `JobCard_${uid}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        console.error("Failed to download PDF:", res.error);
        toast({ title: "Error", description: "Failed to download Job Card PDF.", variant: "error" });
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({ title: "Error", description: "Error generating Job Card.", variant: "error" });
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterBranch !== "all") {
      const emp = employees.find((e: any) => e.id === a.assigned_to);
      if (!emp || emp.branch_id !== filterBranch) return false;
    }
    if (searchEmployee.trim() !== "") {
      const empName = `${a.assigned_to_profile?.first_name || ""} ${a.assigned_to_profile?.last_name || ""}`.toLowerCase();
      if (!empName.includes(searchEmployee.toLowerCase())) return false;
    }
    if (filterDate !== "all") {
      const dateStr = a.due_date || a.created_at;
      const date = new Date(dateStr);
      const today = new Date();
      if (filterDate === "today" && !isSameDay(date, today)) return false;
      if (filterDate === "week" && !isThisWeek(date)) return false;
      if (filterDate === "month" && !isThisMonth(date)) return false;
    }
    return true;
  });

  const groupedAssignments = useMemo(() => {
    const groups = new Map<string, any>();
    filteredAssignments.forEach(a => {
      const je = a.job_entry_tests;
      const uidLabel = je?.uid_label || je?.job_entries?.uid_label || je?.job_entries?.uid;
      let key = uidLabel ? `${je?.job_entry_id}-${uidLabel}` : (je?.job_entry_id ? `je-${je.job_entry_id}` : `test-${a.id}`);
      if (a.status !== 'assigned') {
        key = `test-${a.id}`;
      }
      if (!groups.has(key)) {
        groups.set(key, {
          ...a,
          grouped_tests: [je],
          all_assignments: [a]
        });
      } else {
        const existing = groups.get(key);
        existing.grouped_tests.push(je);
        existing.all_assignments.push(a);
      }
    });
    return Array.from(groups.values());
  }, [filteredAssignments]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "assigned":
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Assigned</Badge>;
      case "in_testing":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">In Testing</Badge>;
      case "report_uploaded":
        return <Badge variant="outline" className="bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200">Report Uploaded</Badge>;
      case "in_review":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">In Review</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Accepted</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="w-full md:w-80 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search employee..."
            value={searchEmployee}
            onChange={(e) => setSearchEmployee(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors shadow-sm bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-4 items-center justify-end flex-1">
          <div className="w-48">
            <Dropdown value={filterBranch} onChange={setFilterBranch} placeholder="Filter by Branch" buttonClassName="bg-white" options={[
              { value: "all", label: "All Branches" },
              ...branches.map((b: any) => ({ value: b.id, label: b.name })),
            ]} />
          </div>
          <div className="w-48">
            <Dropdown value={filterDate} onChange={setFilterDate} placeholder="Filter by Date" buttonClassName="bg-white" options={[
              { value: "today", label: "Today" },
              { value: "week", label: "This Week" },
              { value: "month", label: "This Month" },
              { value: "all", label: "All Time" },
            ]} />
          </div>
          <Button onClick={() => { setInitialAssignment(null); setIsAssignModalOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Assign Jobs
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-sm bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/80 text-[11px] uppercase tracking-widest text-slate-400 font-bold border-b border-slate-200/80">
            <tr>
              <th className="px-6 py-4 rounded-tl-2xl">Job Card (UID)</th>
              <th className="px-6 py-4">Test Details</th>
              <th className="px-6 py-4">Assigned To</th>
              <th className="px-6 py-4">Due Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 rounded-tr-2xl text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groupedAssignments.map((assignment) => {
              const assignedName = assignment.team_id 
                ? assignment.teams?.name 
                : `${assignment.assigned_to_profile?.first_name || ""} ${assignment.assigned_to_profile?.last_name || ""}`;
              const avatarLetter = assignment.team_id ? "T" : (assignedName.charAt(0) || "?");
              
              const aggregatedParameters = assignment.grouped_tests.map((t: any) => t?.test_master?.component_parameter || t?.test_parameters || 'N/A').filter(Boolean).join(', ');
              const aggregatedSpecifics = assignment.grouped_tests.map((t: any) => t?.test_master?.specific_test || 'N/A').filter(Boolean).join(', ');

              return (
                <Fragment key={assignment.id}>
                  <tr 
                    className="hover:bg-orange-50/30 transition-colors group cursor-pointer"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('button') || target.closest('input') || target.closest('a')) return;
                      router.push(`/job-assignments/${assignment.id}`);
                    }}
                  >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <ClipboardList className="w-4 h-4" />
                      </div>
                      <div className="font-bold text-slate-800 text-[13px]">{assignmentUid(assignment)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700 truncate max-w-[200px]" title={aggregatedParameters}>{aggregatedParameters}</span>
                      <span className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]" title={aggregatedSpecifics}>
                        {aggregatedSpecifics}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm ${assignment.team_id ? "bg-indigo-100 text-indigo-700" : "bg-blue-100 text-blue-700"}`}>
                        {avatarLetter.toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800 text-[13px]">{assignedName}</span>
                          {assignment.team_id && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-bold uppercase tracking-wider border border-indigo-100">Team</span>
                          )}
                        </div>
                        {assignment.report_url && (
                          <a href={assignment.report_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-500 hover:text-blue-700 font-semibold hover:underline mt-0.5">View Report &rarr;</a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-[13px]">
                        {assignment.due_date ? format(new Date(assignment.due_date), "dd MMM, yyyy") : "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>{getStatusBadge(assignment.status)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2 items-end">
                      <div className="flex gap-2">
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPdf(assignment.job_entry_test_id, assignment.job_entry_tests?.uid_label || 'Unknown');
                          }}
                          size="sm" 
                          variant="outline" 
                          disabled={downloadingId === assignment.job_entry_test_id}
                          className="text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100 shadow-sm rounded-xl h-8 w-8 p-0 flex items-center justify-center transition-all"
                          title="Download Job Card"
                        >
                          {downloadingId === assignment.job_entry_test_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                        <Button onClick={() => {
                          setInitialAssignment({
                            job_entry_test_id: assignment.job_entry_test_id,
                            uid: assignment.job_entry_tests?.job_entries?.uid,
                            assigned_to: assignment.assigned_to,
                            team_id: assignment.team_id,
                            due_date: assignment.due_date,
                            notes: assignment.notes,
                          });
                          setIsAssignModalOpen(true);
                        }} size="sm" variant="outline" className="text-orange-600 hover:text-white border-orange-200 hover:bg-orange-500 hover:border-orange-500 shadow-sm rounded-xl h-8 px-4 text-xs font-bold transition-all">
                          Edit
                        </Button>
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAssignment(assignment.id);
                          }}
                          size="sm" 
                          variant="outline" 
                          disabled={deletingId === assignment.id}
                          className="text-red-600 hover:text-red-900 border-red-200 hover:bg-red-50 shadow-sm rounded-xl h-8 w-8 p-0 flex items-center justify-center transition-all"
                          title="Delete Assignment"
                        >
                          {deletingId === assignment.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      
                      {assignment.status === 'in_review' && (
                        <div className="flex flex-col gap-2 mt-1">
                          {remarkObj && remarkObj.id === assignment.id ? (
                            <div className="flex flex-col gap-1 items-end">
                              <input
                                type="text"
                                autoFocus
                                placeholder="Remark (required for reject)"
                                className="text-xs border border-slate-300 rounded-md px-2 py-1.5 w-40 focus:outline-none focus:border-orange-400 shadow-sm"
                                value={remarkObj.remark}
                                onChange={(e) => setRemarkObj({ ...remarkObj, remark: e.target.value })}
                              />
                              <div className="flex gap-1.5 justify-end w-full">
                                <Button size="sm" onClick={async () => {
                                  const res = await updateAssignmentStatusAction(assignment.id, 'approved', { reviewer_remark: remarkObj.remark });
                                  if (res.success) {
                                    toast({ title: "Success", description: "Status updated successfully", variant: "success" });
                                  } else {
                                    toast({ title: "Error", description: res.error, variant: "error" });
                                  }
                                  setRemarkObj(null);
                                  router.refresh();
                                }} className="bg-emerald-500 hover:bg-emerald-600 h-7 text-[10px] px-2.5 rounded-lg text-white font-bold shadow-sm">Approve</Button>
                                <Button size="sm" variant="outline" onClick={async () => {
                                  if (!remarkObj.remark) return toast({ title: 'Error', description: 'Remark required for rejection', variant: 'error' });
                                  const res = await updateAssignmentStatusAction(assignment.id, 'rejected', { reviewer_remark: remarkObj.remark });
                                  if (res.success) {
                                    toast({ title: "Success", description: "Status updated successfully", variant: "success" });
                                  } else {
                                    toast({ title: "Error", description: res.error, variant: "error" });
                                  }
                                  setRemarkObj(null);
                                  router.refresh();
                                }} className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 h-7 text-[10px] px-2.5 rounded-lg font-bold shadow-sm">Reject</Button>
                                <Button size="sm" variant="ghost" onClick={() => setRemarkObj(null)} className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-3.5 h-3.5" /></Button>
                              </div>
                            </div>
                          ) : (
                            <Button size="sm" onClick={() => setRemarkObj({ id: assignment.id, remark: "" })} className="bg-amber-500 hover:bg-amber-600 h-7 text-[10px] px-3 text-white rounded-lg font-bold shadow-sm">Review Report</Button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              </Fragment>
              );
            })}
            {groupedAssignments.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-500 bg-slate-50/50">
                <div className="flex flex-col items-center gap-2">
                  <ClipboardList className="w-8 h-8 text-slate-300" />
                  <span className="font-semibold text-slate-600">No assignments found</span>
                  <span className="text-xs text-slate-400">Adjust your filters to see more results.</span>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Assignment Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 sm:p-6 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col relative overflow-hidden border border-slate-100">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-orange-500" />
                Assign Job
              </h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white shadow-sm border border-slate-200 hover:bg-slate-100 p-1.5 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <AssignJobsTab employees={employees} branches={branches} initialAssignment={initialAssignment} onSuccess={() => { setIsAssignModalOpen(false); router.refresh(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
