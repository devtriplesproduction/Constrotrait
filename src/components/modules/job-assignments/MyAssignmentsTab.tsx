"use client";

import { useState } from "react";
import { updateAssignmentStatusAction } from "@/actions/job-assignment.actions";
import { downloadJobCardAction } from "@/actions/job-card-pdf.actions";
import { Loader2, Check, X, ClipboardList, Download, Tag, Calendar, Beaker, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/modules/PageHeader";
import { createClient } from "@/lib/supabase/client";
import { JobStageStepper } from "@/components/ui/JobStageStepper";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  const handleDownloadAllotmentPdf = (a: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header Border
    doc.rect(14, 15, pageWidth - 28, 15);
    
    // Header Texts
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CONSTROTRAIT MATERIAL TESTING AND SERVICES LLP WAI", pageWidth / 2, 24, { align: "center" });
    
    // Info Table
    const docNo = a.job_entry_tests?.test_master?.datasheet_qr || "";
    autoTable(doc, {
      startY: 32,
      theme: "plain",
      styles: { lineWidth: 0.1, lineColor: 0, cellPadding: 2, fontSize: 10, fontStyle: 'bold' },
      body: [
        [`Doc No. : ${docNo}`, "Record As per ISO/IEC 17025:2017", "Doc Name: Sample Allotment Form"]
      ],
      columnStyles: {
        0: { cellWidth: "30%" },
        1: { cellWidth: "40%", halign: "center" },
        2: { cellWidth: "30%", halign: "right" }
      }
    });

    const receivedDate = a.job_entry_tests?.job_entries?.created_at ? new Date(a.job_entry_tests.job_entries.created_at).toLocaleDateString() : '';
    const dueDate = a.due_date ? new Date(a.due_date).toLocaleDateString() : '';
    const allottedDate = a.created_at ? new Date(a.created_at).toLocaleDateString() : '';
    const assignedName = a.team_id ? a.teams?.name : `${a.assigned_to_profile?.first_name || ""} ${a.assigned_to_profile?.last_name || ""}`;
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 4,
      theme: "plain",
      styles: { lineWidth: 0.1, lineColor: 0, cellPadding: 2, fontSize: 10 },
      body: [
        [`Sample Received: ${receivedDate}`, `Date of Sample Allotted: ${allottedDate}`],
        [`Due Date: ${dueDate}`, `Issue To: ${assignedName}`]
      ]
    });
    
    const prodName = a.job_entry_tests?.test_master?.material_product || '';
    const uidLabel = a.job_entry_tests?.uid_label || '';
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 4,
      theme: "plain",
      styles: { lineWidth: 0.1, lineColor: 0, cellPadding: 2, fontSize: 10, fontStyle: 'bold' },
      body: [
        [`Product Test Name - ${prodName}`, `UID - ${uidLabel}`]
      ]
    });

    let count = 1;
    const sq = a.job_entry_tests?.job_entries?.sample_quantity || a.job_entry_tests?.test_master?.sample_size || '';
    const match = sq.toString().match(/\d+/);
    if (match) count = parseInt(match[0], 10);
    if (count < 1) count = 1;

    const cat = (a.job_entry_tests?.test_master?.category || 'NA').substring(0, 3).toUpperCase();
    const short = (a.job_entry_tests?.test_master?.component_parameter || 'NA').substring(0, 3).toUpperCase();
    const fy = new Date(a.created_at || Date.now()).getFullYear();
    const romanMap = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];

    const tableRows = [];
    const testParams = a.job_entry_tests?.test_master?.component_parameter || '';
    const method = a.job_entry_tests?.test_master?.test_method || '';
    
    for (let i = 0; i < count; i++) {
        let scode = `CMTS/${cat}/${short}/${fy}/${uidLabel}`;
        if (count > 1) {
            scode += `-${romanMap[i] || (i+1)}`;
        }
        tableRows.push([scode, prodName, testParams, method, sq, ""]);
    }
    
    for (let i = tableRows.length; i < 5; i++) {
      tableRows.push(["", "", "", "", "", ""]);
    }

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 4,
      theme: "plain",
      styles: { lineWidth: 0.1, lineColor: 0, cellPadding: 3, fontSize: 9 },
      headStyles: { fontStyle: "bold", halign: "center" },
      head: [["Sample Code No.", "Sample Name", "Test Parameters", "Method", "Sample Details", "Remark"]],
      body: tableRows
    });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Sample Received By-", 14, (doc as any).lastAutoTable.finalY + 20);

    const today = new Date().toLocaleDateString();
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 25,
      theme: "plain",
      styles: { lineWidth: 0.1, lineColor: 0, cellPadding: 2, fontSize: 9 },
      body: [
        ["Issue No. : 01", "Amendment No & Date :02 & 08.06.2026", "Page No: 1-1"],
        [`Issue Date: ${today}`, "Prepared by : ", "Reviewed & Approved by: "]
      ]
    });

    doc.save(`Sample_Allotment_Form_${uidLabel}.pdf`);
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
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No assignments found</h3>
          <p className="text-slate-500 max-w-sm text-sm">You don't have any job assignments matching the current criteria. Check back later.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {myAssignments.map((a: any) => {
            const uid = uidOf(a);
            
            // Derive created/updated dates
            const createdDate = a.created_at ? new Date(a.created_at) : null;
            const updatedDate = a.updated_at ? new Date(a.updated_at) : new Date();
            
            // Format dates
            const createdStr = createdDate ? createdDate.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '-';
            const updatedHours = Math.round((new Date().getTime() - updatedDate.getTime()) / (1000 * 60 * 60));
            const updatedStr = updatedHours < 24 ? `${updatedHours} hours ago` : updatedHours < 48 ? '1 day ago' : `${Math.floor(updatedHours/24)} days ago`;
            const dueDate = a.due_date ? new Date(a.due_date) : null;
            const dueStr = dueDate ? dueDate.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '-';
            
            // Calculate overdue
            let isOverdue = false;
            let overdueDays = 0;
            if (dueDate && new Date() > dueDate && a.status !== 'approved' && a.status !== 'rejected') {
                isOverdue = true;
                overdueDays = Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            }
            
            const assignedName = a.team_id 
                ? a.teams?.name 
                : `${a.assigned_to_profile?.first_name || ""} ${a.assigned_to_profile?.last_name || ""}`;
            
            const specificTest = a.job_entry_tests?.test_master?.specific_test || a.job_entry_tests?.test_master?.component_parameter || 'N/A';

            return (
            <div key={a.id} className="relative bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              
              {/* Left Edge Accent & Top Gradient */}
              <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500 z-10"></div>
              <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-orange-50/50 to-transparent pointer-events-none"></div>

              {/* Top Header Row */}
              <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 relative z-10">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-orange-100 text-orange-600 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">
                    {uid || 'UID missing'}
                  </div>

                  <div className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm border uppercase tracking-wide ${
                    a.status === 'in_testing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    a.status === 'report_uploaded' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' :
                    a.status === 'in_review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    a.status === 'accepted' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                    a.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                    a.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      a.status === 'in_testing' ? 'bg-blue-500' :
                      a.status === 'report_uploaded' ? 'bg-fuchsia-500' :
                      a.status === 'in_review' ? 'bg-amber-500' :
                      a.status === 'accepted' ? 'bg-indigo-500' :
                      a.status === 'approved' ? 'bg-green-500' :
                      a.status === 'rejected' ? 'bg-red-500' :
                      'bg-slate-400'
                    }`}></div>
                    {String(a.status || '').replace('_', ' ')}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Created on</p>
                      <p className="font-semibold text-slate-700">{createdStr}</p>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Updated</p>
                      <p className="font-semibold text-slate-700">{updatedStr}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Body */}
              <div className="px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                {/* Left - Test Request Details */}
                <div className="lg:col-span-5 flex gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 border border-orange-100">
                    <Beaker className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Test Request</p>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 leading-tight">{specificTest}</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 text-xs font-semibold">Concrete</span>
                      <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-semibold">NDT</span>
                      <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-semibold">Quality Control</span>
                    </div>
                  </div>
                </div>

                {/* Middle - Due Date */}
                <div className="lg:col-span-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Due Date</p>
                  </div>
                  <p className="text-base font-bold text-slate-800 mb-2">{dueStr}</p>
                  {isOverdue && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Overdue by {overdueDays} day{overdueDays !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Right - Progress Stepper */}
                <div className="lg:col-span-4 flex flex-col justify-center">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Progress</p>
                  <JobStageStepper currentStage={a.status} isRejected={a.status === 'rejected'} orientation="horizontal" />
                </div>
              </div>

              {a.reviewer_remark && (
                <div className="mx-6 mb-6 bg-red-50/80 p-4 rounded-xl border border-red-100 text-sm">
                  <span className="flex items-center gap-2 font-semibold text-red-800 mb-1">
                    <AlertCircle className="w-4 h-4" /> Reviewer Remark
                  </span>
                  <span className="text-red-700">{a.reviewer_remark}</span>
                </div>
              )}

              {/* Bottom Footer */}
              <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
                <div className="flex flex-wrap items-center gap-6 sm:gap-8 w-full sm:w-auto text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-100/50 text-orange-600 flex items-center justify-center border border-orange-200/50">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-0.5">Assigned To</p>
                      <p className="font-bold text-slate-800">{assignedName}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {a.report_url && (
                    <a href={a.report_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700 bg-orange-100 hover:bg-orange-200 px-4 py-2 rounded-lg transition-colors border border-orange-200 shadow-sm flex-1 sm:flex-none h-10">
                      <Download className="w-4 h-4" /> View Uploaded Report
                    </a>
                  )}

                  <Button 
                    variant="outline" 
                    onClick={() => handleDownloadPdf(a.job_entry_test_id, a.job_entry_tests?.uid_label || 'Unknown')}
                    disabled={downloadingId === a.job_entry_test_id}
                    className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm rounded-lg h-10 w-10 p-0 flex items-center justify-center shrink-0"
                    title="Download Job Card PDF"
                  >
                    {downloadingId === a.job_entry_test_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-5 h-5" />}
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={() => handleDownloadAllotmentPdf(a)}
                    className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm rounded-lg h-10 w-10 p-0 flex items-center justify-center shrink-0"
                    title="Download Allotment Form"
                  >
                    <FileText className="w-5 h-5" />
                  </Button>

                  {/* Actions based on status */}
                  {a.status === 'assigned' && (
                    <div className="flex gap-2">
                      <Button onClick={() => handleStatusUpdate(a.id, 'accepted')} disabled={loadingId === a.id} className="bg-orange-500 hover:bg-orange-600 shadow-sm rounded-lg px-4 h-10 text-white text-sm font-bold">
                        {loadingId === a.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-1" />}
                        Accept
                      </Button>
                      <Button variant="outline" onClick={() => {
                        const remark = window.prompt("Please enter a reason for rejection:");
                        if (remark !== null) {
                          if (!remark.trim()) return alert("Remark is required to reject.");
                          handleStatusUpdate(a.id, 'rejected', { reviewer_remark: remark });
                        }
                      }} disabled={loadingId === a.id} className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg h-10 text-sm font-bold">
                        Reject
                      </Button>
                    </div>
                  )}

                  {(a.status === 'accepted' || a.status === 'rejected') && (
                    <Button onClick={() => handleStatusUpdate(a.id, 'in_testing')} disabled={loadingId === a.id} className="bg-orange-500 hover:bg-orange-600 shadow-sm rounded-lg px-4 h-10 text-white text-sm font-bold">
                      {loadingId === a.id && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Start Testing
                    </Button>
                  )}

                  {a.status === 'in_testing' && (
                    <>
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
                      <Button disabled={loadingId === a.id} onClick={() => document.getElementById(`file-${a.id}`)?.click()} className="bg-orange-500 hover:bg-orange-600 shadow-sm rounded-lg px-4 h-10 text-white text-sm font-bold">
                        {loadingId === a.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                        Upload Report
                      </Button>
                    </>
                  )}

                  {a.status === 'report_uploaded' && (
                    <Button onClick={() => handleStatusUpdate(a.id, 'in_review')} disabled={loadingId === a.id} className="bg-orange-500 hover:bg-orange-600 shadow-sm text-white rounded-lg px-4 h-10 text-sm font-bold">
                      {loadingId === a.id && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Submit for Review
                    </Button>
                  )}
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
