import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/services/auth.service";
import { getAssignmentByIdAction, getRelatedAssignmentsAndTestsAction } from "@/actions/job-assignment.actions";
import { PageHeader } from "@/components/modules/PageHeader";
import { ClipboardList, ArrowLeft, FileText, User, Calendar, Beaker, GitMerge, Clock, Layers, Award, Tag } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { JobStageStepper } from "@/components/ui/JobStageStepper";
import { JobStage } from "@/config/jobTransitions";
import { JobAssignmentActions } from "@/components/modules/job-assignments/JobAssignmentActions";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { JobCardInwardTrigger } from "@/components/modules/job-assignments/JobCardInwardTrigger";

function assignmentUid(assignment: any) {
  const t = assignment.job_entry_tests;
  if (t?.uid_label) return `UID: ${t.uid_label}`;
  const testDate = t?.date_of_testing ? new Date(t.date_of_testing).toLocaleDateString() : '-';
  return `UID missing`;
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
    case "working": return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Working</Badge>;
    case "completed": return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Completed</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

export default async function JobAssignmentDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const user = await getAuthenticatedUser();

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
  const jobEntryId = assignment.job_entry_tests?.job_entry_id;
  let allAssignments: any[] = [];
  let allJobEntryTests: any[] = [];
  if (jobEntryId) {
    const relatedRes = await getRelatedAssignmentsAndTestsAction(jobEntryId);
    if (relatedRes.success && relatedRes.data) {
      allAssignments = relatedRes.data.assignments;
      allJobEntryTests = relatedRes.data.tests;
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <PageHeader title="Job Card Details" subtitle="View complete details and progress flow for this assignment." icon={ClipboardList} className="mb-0" />
        </div>
        <div className="flex items-center gap-3">
          <JobCardInwardTrigger
            assignment={assignment}
            jobEntry={assignment.job_entry_tests?.job_entries}
            client={assignment.job_entry_tests?.job_entries?.clients}
            branch={assignment.branches || assignment.job_entry_tests?.job_entries?.branches}
            allJobEntryTests={allJobEntryTests}
            variant="button"
          />
          <Link href="/job-assignments" className="group flex-shrink-0 flex items-center gap-3 p-1.5 pr-5 rounded-2xl bg-white border border-slate-200/80 hover:border-orange-300/70 hover:bg-orange-50/50 hover:shadow-md transition-all shadow-sm">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-50 text-slate-500 group-hover:bg-orange-100 group-hover:text-orange-500 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="text-slate-700 font-bold text-[14px] group-hover:text-orange-500 transition-colors">Back To My Assignments</span>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200/60 overflow-hidden relative">
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Section: All Tests */}
            <div className="lg:col-span-4 xl:col-span-4 border-r border-slate-100 pr-4 lg:pr-6 flex flex-col min-w-0">
              <div className="flex items-center gap-3 mb-6 pl-2">
                <div className="w-9 h-9 rounded-xl bg-orange-100/50 border border-orange-200/50 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-orange-600" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-lg tracking-tight">All Tests</h4>
              </div>

              <ScrollArea className="flex-1 space-y-1.5 max-h-[800px] pr-2">
                {allAssignments.map((a: any) => {
                  const t = a.job_entry_tests;
                  const isActive = a.id === assignment.id;
                  const hasSpecificTest = t?.test_master?.specific_test && t.test_master.specific_test !== "-" && t.test_master.specific_test.trim() !== "";

                  return (
                    <Link key={a.id} href={`/job-assignments/${a.id}`} className="block group mb-1">
                      <div className={`p-3 transition-all duration-200 relative ${isActive
                          ? 'bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]'
                          : 'bg-transparent hover:bg-slate-50/50 rounded-2xl'
                        }`}>
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange-500 rounded-r-md" />
                        )}

                        <div className="flex gap-2.5 items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isActive
                              ? 'bg-orange-100 text-orange-500'
                              : 'bg-slate-100/80 text-slate-400 group-hover:bg-slate-200/50'
                            }`}>
                            <Beaker className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0 pr-1">
                            <p className={`font-bold text-[13.5px] leading-snug line-clamp-2 transition-colors ${isActive
                                ? 'text-orange-500'
                                : 'text-slate-400 group-hover:text-slate-500'
                              }`}>
                              {t?.test_master?.component_parameter || "Unknown Test"}
                            </p>
                            {hasSpecificTest && (
                              <p className={`text-[11px] mt-0.5 line-clamp-1 font-medium transition-colors ${isActive
                                  ? 'text-orange-400/80'
                                  : 'text-slate-400/70'
                                }`}>
                                {t.test_master.specific_test}
                              </p>
                            )}
                          </div>

                          <div className="flex-shrink-0 scale-[0.80] origin-right">
                            {getStatusBadge(a.status)}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {allAssignments.length === 0 && (
                  <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-100 border-dashed text-slate-500 text-sm font-medium">
                    No other tests found.
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Right Section: Test Details & Workflow */}
            <div className="lg:col-span-8 xl:col-span-8 flex flex-col gap-4 min-w-0">

              {/* Job Card Details */}
              <div className="w-full space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <h4 className="font-bold text-slate-800 text-lg">Test Details</h4>
                </div>

                {(() => {
                  const t = assignment.job_entry_tests;

                  const formatDateSafe = (dateStr?: string | null, formatStr: string = "dd MMM, yyyy") => {
                    if (!dateStr) return null;
                    try {
                      const d = new Date(dateStr);
                      return !isNaN(d.getTime()) ? format(d, formatStr) : null;
                    } catch {
                      return null;
                    }
                  };

                  const addVals = (t?.additional_details_values as Record<string, any> | null) || {};

                  // Casting date
                  const castingDate = t?.date_of_casting ||
                    addVals['Casting date'] ||
                    addVals['Date of Casting'] ||
                    addVals['Casting Date'] ||
                    addVals['casting_date'];

                  const formattedCastingDate = formatDateSafe(castingDate);

                  // Testing Day / Age
                  let dayText = t?.testing_day || t?.testing_age || addVals['Testing Age'] || addVals['Age in Days'] || addVals['Age'] || '';
                  if (dayText && !dayText.toString().toLowerCase().includes('day')) {
                    dayText = `${dayText} Day${Number(dayText) > 1 ? 's' : ''}`;
                  }
                  if (!dayText && castingDate && t?.date_of_testing) {
                    try {
                      const diffTime = Math.abs(new Date(t.date_of_testing).getTime() - new Date(castingDate).getTime());
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      if (!isNaN(diffDays) && diffDays > 0) {
                        dayText = `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
                      }
                    } catch {}
                  }

                  // Sample Quantity & Code
                  const sampleQty = t?.sample_quantity ||
                    t?.test_master?.sample_size ||
                    addVals['Sample Quantity'] ||
                    addVals['Quantity'] ||
                    addVals['quantity'] || '';

                  const sampleCode = t?.sample_code_no ||
                    addVals['sample_code_no'] ||
                    t?.material_details_location || '';

                  // Grade & Material
                  const grade = t?.grade ||
                    addVals['Grade'] ||
                    addVals['grade'] || '';

                  const material = t?.material_description ||
                    t?.test_master?.material_product || '';

                  const testMethod = t?.test_method || t?.test_master?.test_method || '';

                  // Dates
                  const formattedTestingDate = formatDateSafe(t?.date_of_testing);
                  const formattedReceivingDate = formatDateSafe(t?.date_of_receiving);
                  const formattedDueDate = formatDateSafe(assignment.due_date);

                  // ULR & QC
                  const hasUlr = Boolean(t?.ulr_number);
                  const hasQc = Boolean(t?.qc_number);

                  const assigneeName = assignment.team_id
                    ? assignment.teams?.name
                    : `${assignment.assigned_to_profile?.first_name || ""} ${assignment.assigned_to_profile?.last_name || ""}`.trim() || "-";

                  return (
                    <div className="relative bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] w-full">
                      <ScrollArea orientation="horizontal" className="w-full">
                        <div className="min-w-[700px] flex flex-col space-y-4">
                          {/* Row 1: Identification & Material Details */}
                          <div className="flex items-start justify-between gap-4 md:gap-6">
                            {/* 1. Job Card */}
                            <JobCardInwardTrigger
                              assignment={assignment}
                              jobEntry={assignment.job_entry_tests?.job_entries}
                              client={assignment.job_entry_tests?.job_entries?.clients}
                              branch={assignment.branches || assignment.job_entry_tests?.job_entries?.branches}
                              allJobEntryTests={allJobEntryTests}
                              variant="card"
                            />

                            <div className="w-px h-8 bg-slate-100 flex-shrink-0" />

                            {/* 2. ULR No. */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 text-emerald-500" /> ULR No.
                              </p>
                              {hasUlr ? (
                                <>
                                  <p className="font-bold text-emerald-600 text-sm truncate tracking-tight">{t.ulr_number}</p>
                                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 inline-block mt-0.5">
                                    Generated
                                  </span>
                                </>
                              ) : hasQc ? (
                                <>
                                  <p className="font-bold text-blue-600 text-sm truncate">QC: {t.qc_number}</p>
                                  <span className="text-[11px] font-medium text-blue-600">Non-NABL</span>
                                </>
                              ) : (
                                <p className="font-medium text-amber-600 text-sm truncate" title="Awaiting Generation">
                                  Awaiting Generation
                                </p>
                              )}
                            </div>

                            <div className="w-px h-8 bg-slate-100 flex-shrink-0" />

                            {/* 3. Parameter */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-blue-400" /> Parameter
                              </p>
                              <p className="font-bold text-slate-800 text-sm truncate" title={t?.test_master?.component_parameter}>
                                {t?.test_master?.component_parameter || "N/A"}
                              </p>
                              <p className="text-[11px] text-slate-500 font-medium truncate" title={t?.test_master?.specific_test || testMethod}>
                                {t?.test_master?.specific_test || testMethod || "N/A"}
                              </p>
                            </div>

                            <div className="w-px h-8 bg-slate-100 flex-shrink-0" />

                            {/* 4. Sample Quantity */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-cyan-500" /> Sample Qty
                              </p>
                              <p className="font-bold text-slate-800 text-sm truncate">{sampleQty || "-"}</p>
                              <p className="text-[11px] text-slate-500 font-medium truncate" title={sampleCode || "Standard"}>
                                {sampleCode ? `Code: ${sampleCode}` : "Standard Sample"}
                              </p>
                            </div>

                            <div className="w-px h-8 bg-slate-100 flex-shrink-0" />

                            {/* 5. Grade / Material */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5 text-indigo-400" /> Grade / Material
                              </p>
                              <p className="font-bold text-slate-800 text-sm truncate" title={grade || material}>
                                {grade || material || "-"}
                              </p>
                              <p className="text-[11px] text-slate-500 font-medium truncate" title={material}>
                                {grade && material ? material : (testMethod || "-")}
                              </p>
                            </div>
                          </div>

                          {/* Horizontal Divider */}
                          <div className="h-px bg-slate-100/90 w-full" />

                          {/* Row 2: Dates, Assignee & Status */}
                          <div className="flex items-start justify-between gap-4 md:gap-6">
                            {/* 6. Casting Date */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-amber-500" /> Casting Date
                              </p>
                              <p className="font-semibold text-slate-700 text-[13px]">{formattedCastingDate || "-"}</p>
                              <p className="text-[11px] text-slate-500 font-medium truncate">
                                {dayText ? `Age: ${dayText}` : (formattedCastingDate ? "Cast recorded" : "Not specified")}
                              </p>
                            </div>

                            <div className="w-px h-8 bg-slate-100 flex-shrink-0" />

                            {/* 7. Testing Date */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-purple-400" /> Testing Date
                              </p>
                              <p className="font-semibold text-slate-700 text-[13px]">{formattedTestingDate || "-"}</p>
                              <p className="text-[11px] text-slate-500 font-medium truncate">
                                {formattedReceivingDate ? `Recv: ${formattedReceivingDate}` : "Date of testing"}
                              </p>
                            </div>

                            <div className="w-px h-8 bg-slate-100 flex-shrink-0" />

                            {/* 8. Due Date */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-rose-400" /> Due Date
                              </p>
                              <p className="font-semibold text-slate-700 text-[13px]">{formattedDueDate || "-"}</p>
                              <p className="text-[11px] text-slate-500 font-medium truncate">Assignment deadline</p>
                            </div>

                            <div className="w-px h-8 bg-slate-100 flex-shrink-0" />

                            {/* 9. Assigned To */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-emerald-400" /> Assigned To
                              </p>
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
                                  <User className="w-3 h-3 text-slate-400" />
                                </div>
                                <p className="font-semibold text-slate-700 text-[13px] leading-tight truncate">
                                  {assigneeName}
                                </p>
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium truncate pl-6.5">
                                {assignment.team_id ? "Assigned Team" : "Test Analyst"}
                              </p>
                            </div>

                            <div className="w-px h-8 bg-slate-100 flex-shrink-0" />

                            {/* 10. Status */}
                            <div className="flex-1 min-w-0 pr-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Status</p>
                              <div className="inline-block scale-90 origin-left">{getStatusBadge(assignment.status)}</div>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5 capitalize">
                                {assignment.status.replace('_', ' ')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })()}

                {assignment.notes && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 rounded-2xl border border-amber-100 shadow-sm relative overflow-hidden">
                    <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2 relative z-10 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Notes & Instructions
                    </h4>
                    <div className="text-amber-800/90 text-sm leading-relaxed font-medium relative z-10">
                      {assignment.notes}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Flow */}
              <div className="w-full flex flex-col space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <GitMerge className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">Work Flow</h4>
                  </div>
                </div>
                <ScrollArea orientation="horizontal" className="bg-gradient-to-b from-slate-50/50 to-white border border-slate-100 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] p-6 sm:p-10 rounded-2xl flex flex-col justify-center w-full">
                  <div className="min-w-max px-4">
                    <JobStageStepper currentStage={assignment.status as JobStage} isRejected={assignment.status === 'rejected'} orientation="horizontal" />
                  </div>
                </ScrollArea>
              </div>

              <div className="mt-2 border-t border-slate-100 pt-4">
                <JobAssignmentActions assignment={assignment} currentUserId={user.id} allAssignments={allAssignments} />
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
