"use client";

import { useState } from "react";
import { updateAssignmentStatusAction } from "@/actions/job-assignment.actions";
import { downloadJobCardAction } from "@/actions/job-card-pdf.actions";
import { Loader2, Check, X, ClipboardList, Download, Tag, Calendar, Beaker, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/modules/PageHeader";
import { createClient } from "@/lib/supabase/client";
import { JobStageStepper } from "@/components/ui/JobStageStepper";

function uidOf(a: any) {
  const t = a.job_entry_tests;
  if (t?.uid_label) return t.uid_label;
  return null;
}

export function MyAssignmentsTab({ assignments, userId, filterStatus }: { assignments: any[], userId: string, filterStatus: string }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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
        alert("Failed to download Job Card PDF.");
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Error generating Job Card.");
    } finally {
      setDownloadingId(null);
    }
  };

  const myAssignments = assignments.filter((a: any) => {
    let isMine = false;
    if (a.assigned_to === userId) isMine = true;
    if (a.teams?.team_members?.some((m: any) => m.employee_id === userId)) isMine = true;
    
    if (!isMine) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    
    return true;
  });

  const handleStatusUpdate = async (id: string, status: string, payload?: any) => {
    setLoadingId(id);
    const res = await updateAssignmentStatusAction(id, status, payload);
    if (!res.success) alert("Error: " + res.error);
    setLoadingId(null);
  };

return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">

      {myAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-20 h-20 bg-orange-50 text-orange-400 rounded-full flex items-center justify-center mb-4">
            <ClipboardList className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No assignments found</h3>
          <p className="text-slate-500 max-w-sm">You don't have any job assignments matching the current criteria. Check back later.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {myAssignments.map((a: any) => {
            const uid = uidOf(a);
            return (
            <div key={a.id} className="group bg-white rounded-3xl border border-slate-200/60 p-6 sm:p-8 shadow-sm hover:shadow-lg hover:border-orange-200 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
              
              {/* Subtle top gradient instead of a solid line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-400 via-amber-500 to-orange-500 opacity-80"></div>

              <div className="flex flex-col gap-8 mt-2">
                {/* Top Section: Info & Stepper */}
                <div className="flex flex-col xl:flex-row gap-8 justify-between">
                  {/* Info Section */}
                  <div className="flex-1 space-y-6">
                    <div className="flex flex-wrap items-center gap-3">
                      {uid ? (
                        <span className="inline-flex items-center gap-1.5 font-bold text-orange-700 bg-orange-50 px-3.5 py-1.5 rounded-xl text-sm tracking-wide border border-orange-200/60 shadow-sm">
                          <Tag className="w-4 h-4 text-orange-500" />
                          UID: {uid}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-500 bg-slate-100 px-3.5 py-1.5 rounded-xl text-sm tracking-wide border border-slate-200 shadow-sm">
                          <AlertCircle className="w-4 h-4 text-slate-400" />
                          UID missing
                        </span>
                      )}
                      
                      <span className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wider uppercase shadow-sm border ${
                        a.status === 'in_testing' ? 'bg-blue-50 text-blue-700 border-blue-200/60' :
                        a.status === 'report_uploaded' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/60' :
                        a.status === 'in_review' ? 'bg-amber-50 text-amber-700 border-amber-200/60' :
                        a.status === 'accepted' ? 'bg-indigo-50 text-indigo-700 border-indigo-200/60' :
                        a.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200/60' :
                        a.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200/60' :
                        'bg-slate-50 text-slate-700 border-slate-200/60'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                          a.status === 'in_testing' ? 'bg-blue-500' :
                          a.status === 'report_uploaded' ? 'bg-fuchsia-500' :
                          a.status === 'in_review' ? 'bg-amber-500' :
                          a.status === 'accepted' ? 'bg-indigo-500' :
                          a.status === 'approved' ? 'bg-green-500' :
                          a.status === 'rejected' ? 'bg-red-500' :
                          'bg-slate-400'
                        }`}></div>
                        {String(a.status || '').replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="bg-slate-50/50 hover:bg-slate-50 transition-colors p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Beaker className="w-4 h-4 text-slate-400" />
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Test Request</p>
                        </div>
                        <p className="text-sm font-bold text-slate-800 pl-6">{a.job_entry_tests?.test_master?.specific_test || a.job_entry_tests?.test_master?.component_parameter || 'N/A'}</p>
                      </div>
                      {a.due_date && (
                        <div className="bg-slate-50/50 hover:bg-slate-50 transition-colors p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Due Date</p>
                          </div>
                          <p className="text-sm font-bold text-slate-800 pl-6">{new Date(a.due_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                        </div>
                      )}
                    </div>

                    {a.reviewer_remark && (
                      <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50 text-sm">
                        <span className="flex items-center gap-2 font-bold text-red-700 uppercase tracking-wide text-xs mb-1">
                          <AlertCircle className="w-4 h-4" /> Reviewer Remark
                        </span>
                        <span className="text-red-600 pl-6 block">{a.reviewer_remark}</span>
                      </div>
                    )}
                  </div>

                  {/* Stepper Section */}
                  <div className="xl:w-[480px]">
                    <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                      <JobStageStepper currentStage={a.status} isRejected={a.status === 'rejected'} orientation="horizontal" />
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  <div className="flex-1 w-full sm:w-auto">
                    {a.report_url && (
                      <a href={a.report_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-5 py-2.5 rounded-xl border border-blue-100 hover:border-blue-200 transition-colors w-full sm:w-auto justify-center">
                        <Download className="w-4 h-4" /> View Uploaded Report
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:justify-end w-full sm:w-auto">
                    <Button 
                      variant="outline" 
                      onClick={() => handleDownloadPdf(a.job_entry_test_id, a.job_entry_tests?.uid_label || 'Unknown')}
                      disabled={downloadingId === a.job_entry_test_id}
                      className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm rounded-xl px-5 h-11 flex-1 sm:flex-none"
                    >
                      {downloadingId === a.job_entry_test_id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardList className="w-4 h-4 mr-2 text-slate-400" />}
                      Job Card
                    </Button>

                    {a.status === 'assigned' && (
                      <>
                        <Button onClick={() => handleStatusUpdate(a.id, 'accepted')} disabled={loadingId === a.id} className="bg-indigo-600 hover:bg-indigo-700 shadow-md rounded-xl px-6 h-11 text-white flex-1 sm:flex-none">
                          {loadingId === a.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                          Accept
                        </Button>
                        <Button variant="outline" onClick={() => {
                          const remark = window.prompt("Please enter a reason for rejection:");
                          if (remark !== null) {
                            if (!remark.trim()) return alert("Remark is required to reject.");
                            handleStatusUpdate(a.id, 'rejected', { reviewer_remark: remark });
                          }
                        }} disabled={loadingId === a.id} className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl h-11 flex-1 sm:flex-none">
                          Reject
                        </Button>
                      </>
                    )}

                    {(a.status === 'accepted' || a.status === 'rejected') && (
                      <Button onClick={() => handleStatusUpdate(a.id, 'in_testing')} disabled={loadingId === a.id} className="bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 rounded-xl px-6 h-11 text-white flex-1 sm:flex-none">
                        {loadingId === a.id && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Start Testing
                      </Button>
                    )}

                    {a.status === 'in_testing' && (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input 
                          type="file" 
                          id={`file-${a.id}`} 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setLoadingId(a.id);
                            try {
                              const supabase = createClient();
                              const fileName = `${a.id}_${Date.now()}_${file.name}`;
                              const { error } = await supabase.storage.from("reports").upload(fileName, file);
                              if (error) throw error;
                              const { data: urlData } = supabase.storage.from("reports").getPublicUrl(fileName);
                              
                              const res = await updateAssignmentStatusAction(a.id, "report_uploaded", { report_url: urlData.publicUrl });
                              if (!res.success) alert("Error: " + res.error);
                            } catch (err: any) {
                              alert("Upload error: " + err.message);
                            }
                            setLoadingId(null);
                          }} 
                        />
                        <Button disabled={loadingId === a.id} onClick={() => document.getElementById(`file-${a.id}`)?.click()} className="bg-fuchsia-600 hover:bg-fuchsia-700 shadow-md shadow-fuchsia-600/20 rounded-xl px-6 h-11 text-white w-full sm:w-auto flex-1 sm:flex-none">
                          {loadingId === a.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                          Upload Report
                        </Button>
                      </div>
                    )}

                    {a.status === 'report_uploaded' && (
                      <Button onClick={() => handleStatusUpdate(a.id, 'in_review')} disabled={loadingId === a.id} className="bg-yellow-500 hover:bg-yellow-600 shadow-md shadow-yellow-500/20 text-white rounded-xl px-6 h-11 flex-1 sm:flex-none">
                        {loadingId === a.id && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Submit for Review
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
    </div>
  );
}
