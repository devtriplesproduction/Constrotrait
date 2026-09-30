import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAssignmentByIdAction } from "@/actions/job-assignment.actions";
import { PageHeader } from "@/components/modules/PageHeader";
import { ClipboardList, ArrowLeft, FileText, User, Calendar } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { JobStageStepper } from "@/components/ui/JobStageStepper";
import { JobStage } from "@/config/jobTransitions";

function assignmentUid(assignment: any) {
  const t = assignment.job_entry_tests;
  if (t?.uid_label) return `UID: ${t.uid_label}`;
  const testDate = t?.date_of_testing ? new Date(t.date_of_testing).toLocaleDateString() : '-';
  return `UID queued (test date: ${testDate})`;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "assigned": return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Assigned</Badge>;
    case "in_testing": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">In Testing</Badge>;
    case "report_uploaded": return <Badge variant="outline" className="bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200">Report Uploaded</Badge>;
    case "in_review": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">In Review</Badge>;
    case "approved": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
    case "accepted": return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Accepted</Badge>;
    case "rejected": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

export default async function JobAssignmentDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const res = await getAssignmentByIdAction(params.id);
  if (!res.success || !res.data) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Assignment Not Found</h2>
          <p className="text-slate-500 mb-6">The job assignment you are looking for does not exist or you do not have permission to view it.</p>
          <Link href="/job-assignments" className="text-orange-500 hover:underline">
            &larr; Back to Job Assignments
          </Link>
        </div>
      </div>
    );
  }

  const assignment = res.data;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/job-assignments" className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-white border border-slate-200/80 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <PageHeader title="Job Card Details" subtitle="View complete details and progress flow for this assignment." icon={ClipboardList} className="mb-0" />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200/60 overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-orange-400 via-pink-500 to-indigo-500" />
        <div className="p-6 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
            {/* Left side details */}
            <div className="lg:col-span-2 space-y-8">
              <div className="relative bg-gradient-to-br from-slate-50 to-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden group hover:border-indigo-100 transition-colors">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <FileText className="w-24 h-24" />
                </div>
                
                <div className="relative z-10 space-y-6">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><ClipboardList className="w-4 h-4 text-orange-400" /> Job Card</p>
                    <p className="font-extrabold text-slate-800 text-xl tracking-tight">{assignmentUid(assignment)}</p>
                  </div>
                  
                  <div className="w-full h-px bg-gradient-to-r from-slate-200 to-transparent" />
                  
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><FileText className="w-4 h-4 text-blue-400" /> Test Details</p>
                    <p className="font-bold text-slate-800 text-base">{assignment.job_entry_tests?.test_master?.component_parameter || "N/A"}</p>
                    <p className="text-sm text-slate-500 font-medium mt-1">{assignment.job_entry_tests?.test_master?.specific_test || "N/A"}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-2">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><User className="w-4 h-4 text-emerald-400" /> Assigned To</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm leading-tight">
                            {assignment.team_id 
                              ? assignment.teams?.name 
                              : `${assignment.assigned_to_profile?.first_name || ""} ${assignment.assigned_to_profile?.last_name || ""}`}
                          </p>
                          {assignment.team_id && (
                            <span className="text-[10px] text-indigo-500 font-bold uppercase">Team</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-purple-400" /> Due Date</p>
                      <p className="font-bold text-slate-800 text-sm mt-1">
                        {assignment.due_date ? format(new Date(assignment.due_date), "dd MMM, yyyy") : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-px bg-gradient-to-r from-slate-200 to-transparent" />

                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Status</p>
                    <div className="inline-block scale-110 origin-left">{getStatusBadge(assignment.status)}</div>
                  </div>
                </div>
              </div>

              {assignment.notes && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-6 rounded-3xl border border-amber-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <ClipboardList className="w-16 h-16 text-amber-500" />
                  </div>
                  <h4 className="font-bold text-amber-900 mb-3 flex items-center gap-2 relative z-10">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    Notes & Instructions
                  </h4>
                  <div className="text-amber-800/90 text-sm leading-relaxed font-medium relative z-10">
                    {assignment.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Right side Progress */}
            <div className="lg:col-span-3 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">Progress Flow</h4>
                  <p className="text-sm text-slate-500 font-medium">Track the current stage of this job card</p>
                </div>
              </div>
              <div className="flex-1 bg-gradient-to-b from-slate-50/50 to-white border border-slate-100 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] p-6 sm:p-10 rounded-3xl flex flex-col justify-center">
                <JobStageStepper currentStage={assignment.status as JobStage} isRejected={assignment.status === 'rejected'} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
