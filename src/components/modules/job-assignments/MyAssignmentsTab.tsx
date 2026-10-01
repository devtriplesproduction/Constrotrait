"use client";

import { useState } from "react";
import { updateAssignmentStatusAction } from "@/actions/job-assignment.actions";
import { downloadJobCardAction } from "@/actions/job-card-pdf.actions";
import { Loader2, Check, X, ClipboardList, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/modules/PageHeader";
import { createClient } from "@/lib/supabase/client";
import { JobStageStepper } from "@/components/ui/JobStageStepper";

function uidOf(a: any) {
  const t = a.job_entry_tests;
  if (t?.uid_label) return `UID: ${t.uid_label}`;
  const testDate = t?.date_of_testing ? new Date(t.date_of_testing).toLocaleDateString() : '-';
  return `UID missing`;
}

export function MyAssignmentsTab({ assignments, userId }: { assignments: any[], userId: string }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-end mb-6">
        <div className="w-48">
          <select 
            className="w-full h-10 px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-white"
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="assigned">Assigned</option>
            <option value="accepted">Accepted</option>
            <option value="in_testing">In Testing</option>
            <option value="report_uploaded">Report Uploaded</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
      {myAssignments.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">No assignments found.</div>
      ) : (
        <div className="space-y-4">
          {myAssignments.map((a: any) => (
            <div key={a.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md text-sm border border-orange-100">{uidOf(a)}</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                    a.status === 'in_testing' ? 'bg-blue-100 text-blue-700' :
                    a.status === 'report_uploaded' ? 'bg-fuchsia-100 text-fuchsia-700' :
                    a.status === 'in_review' ? 'bg-yellow-100 text-yellow-700' :
                    a.status === 'accepted' ? 'bg-indigo-100 text-indigo-700' :
                    a.status === 'approved' ? 'bg-green-100 text-green-700' :
                    a.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>{String(a.status || '').replace('_', ' ').toUpperCase()}</span>
                </div>
                <p className="text-sm text-slate-600"><span className="font-medium text-slate-800">Test:</span> {a.job_entry_tests?.test_master?.specific_test || a.job_entry_tests?.test_master?.component_parameter || 'N/A'}</p>
                {a.due_date && <p className="text-sm text-slate-600"><span className="font-medium text-slate-800">Due:</span> {new Date(a.due_date).toLocaleDateString()}</p>}
                {a.report_url && (
                  <p className="text-sm text-slate-600 mt-1">
                    <a href={a.report_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Uploaded Report</a>
                  </p>
                )}
                {a.reviewer_remark && (
                  <p className="text-sm text-red-600 mt-1"><span className="font-medium">Reviewer Remark:</span> {a.reviewer_remark}</p>
                )}
                <div className="mt-4 w-full md:w-96">
                  <JobStageStepper currentStage={a.status} isRejected={a.status === 'rejected'} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleDownloadPdf(a.job_entry_test_id, a.job_entry_tests?.uid_label || 'Unknown')}
                  disabled={downloadingId === a.job_entry_test_id}
                  className="text-slate-600 border-slate-200 shadow-sm"
                  title="Download Job Card"
                >
                  {downloadingId === a.job_entry_test_id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
                  Job Card
                </Button>
                {a.status === 'assigned' && (
                  <>
                    <Button size="sm" onClick={() => handleStatusUpdate(a.id, 'accepted')} disabled={loadingId === a.id} className="bg-indigo-600 hover:bg-indigo-700">
                      {loadingId === a.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      const remark = window.prompt("Please enter a reason for rejection:");
                      if (remark !== null) {
                        if (!remark.trim()) return alert("Remark is required to reject.");
                        handleStatusUpdate(a.id, 'rejected', { reviewer_remark: remark });
                      }
                    }} disabled={loadingId === a.id} className="text-red-600 border-red-200">Reject</Button>
                  </>
                )}
                {(a.status === 'accepted' || a.status === 'rejected') && (
                  <Button size="sm" onClick={() => handleStatusUpdate(a.id, 'in_testing')} disabled={loadingId === a.id} className="bg-blue-600 hover:bg-blue-700">Start Testing</Button>
                )}
                {a.status === 'in_testing' && (
                  <div className="flex items-center gap-2">
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
                    <Button size="sm" variant="outline" disabled={loadingId === a.id} onClick={() => document.getElementById(`file-${a.id}`)?.click()}>
                      {loadingId === a.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : "Upload Report"}
                    </Button>
                  </div>
                )}
                {a.status === 'report_uploaded' && (
                  <Button size="sm" onClick={() => handleStatusUpdate(a.id, 'in_review')} disabled={loadingId === a.id} className="bg-yellow-600 hover:bg-yellow-700">Submit for Review</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
