"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
  if (t?.uid_label || t?.job_entries?.uid_label || t?.job_entries?.uid) return t?.uid_label || t?.job_entries?.uid_label || t?.job_entries?.uid;
  return null;
}

export function MyAssignmentsTab({ assignments, userId, filterStatus }: { assignments: any[], userId: string, filterStatus: string }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const router = useRouter();

  const groupedMyAssignments = React.useMemo(() => {
    const groups = new Map<string, any>();
    assignments.forEach(a => {
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
  }, [assignments]);

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
        0: { cellWidth: (pageWidth - 28) * 0.3 },
        1: { cellWidth: (pageWidth - 28) * 0.4, halign: "center" },
        2: { cellWidth: (pageWidth - 28) * 0.3, halign: "right" }
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
    // Extract count ONLY from test's additional_details_values if present.
    // The instruction: "one row per sample only if a numeric sample count is stored on the test. Do not read job_entries.sample_quantity."
    const testSampleCountStr = a.job_entry_tests?.additional_details_values?.sample_quantity || 
                               a.job_entry_tests?.test_master?.sample_size || '';
    const match = testSampleCountStr.toString().match(/\d+/);
    if (match) count = parseInt(match[0], 10);
    if (count < 1 || isNaN(count)) count = 1;

    const cat = (a.job_entry_tests?.test_master?.category || 'NA').substring(0, 3).toUpperCase();
    const short = (a.job_entry_tests?.test_master?.component_parameter || 'NA').substring(0, 3).toUpperCase();
    
    // FY Logic: Apr-Mar
    const creationDate = new Date(a.created_at || Date.now());
    const m = creationDate.getMonth(); // 0-11
    const y = creationDate.getFullYear() % 100;
    const fy = m >= 3 ? `${y}-${y+1}` : `${y-1}-${y}`;
    
    const romanMap = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];

    const tableRows = [];
    const testParams = a.job_entry_tests?.test_master?.component_parameter || '';
    const method = a.job_entry_tests?.test_master?.test_method || '';
    
    // Sample Name = material description or additional_details_values location if present, else blank
    const sampleName = a.job_entry_tests?.job_entries?.material_description || 
                       a.job_entry_tests?.additional_details_values?.location || '';
                       
    // Sample Details = additional detail value if present, else blank. Do not put the quantity.
    const sampleDetails = a.job_entry_tests?.additional_details_values?.location || ''; // Since it's unstructured, location is the main detail usually, or we can just stringify other details excluding quantity?
    // Wait, the instruction says "additional detail value if present".
    // I'll extract a simple string from additional_details_values ignoring 'sample_quantity' and 'sample_code_no'.
    const rawDetails = { ...(a.job_entry_tests?.additional_details_values || {}) };
    delete rawDetails.sample_quantity;
    delete rawDetails.sample_code_no;
    const sampleDetailsStr = Object.values(rawDetails).filter(Boolean).join(', ') || '';
    
    for (let i = 0; i < count; i++) {
        let scode = `CMTS/${cat}/${short}/${fy}/${uidLabel}`;
        if (count > 1) {
            scode += `-${romanMap[i] || (i+1)}`;
        }
        tableRows.push([scode, sampleName, testParams, method, sampleDetailsStr, ""]);
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
        ["Issue No. : 01", "Amendment No & Date : ", "Page No: 1-1"],
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
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">

      {groupedMyAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No assignments found</h3>
          <p className="text-slate-500 max-w-sm text-sm">You don't have any job assignments matching the current criteria. Check back later.</p>
        </div>
      ) : (
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
              {groupedMyAssignments.map((a: any) => {
                const uid = uidOf(a);
                const dueDate = a.due_date ? new Date(a.due_date) : null;
                const dueStr = dueDate ? dueDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : '-';
                
                const assignedName = a.team_id 
                    ? a.teams?.name 
                    : `${a.assigned_to_profile?.first_name || ""} ${a.assigned_to_profile?.last_name || ""}`;
                const avatarLetter = a.team_id ? "T" : (assignedName.charAt(0) || "?");
                
                const aggregatedParameters = a.grouped_tests.map((t: any) => t?.test_master?.component_parameter || t?.test_parameters || 'N/A').filter(Boolean).join(', ');
                const aggregatedSpecifics = a.grouped_tests.map((t: any) => t?.test_master?.specific_test || 'N/A').filter(Boolean).join(', ');

                return (
                  <tr key={a.id} onClick={() => router.push(`/job-assignments/${a.id}`)} className="hover:bg-orange-50/30 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                          <ClipboardList className="w-4 h-4" />
                        </div>
                        <div className="font-bold text-slate-800 text-[13px]">{uid ? `UID: ${uid}` : 'UID missing'}</div>
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
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm ${a.team_id ? "bg-indigo-100 text-indigo-700" : "bg-blue-100 text-blue-700"}`}>
                          {avatarLetter.toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800 text-[13px]">{assignedName}</span>
                            {a.team_id && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-bold uppercase tracking-wider border border-indigo-100">Team</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-[13px]">
                          {dueStr}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${
                        a.status === 'in_testing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        a.status === 'report_uploaded' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' :
                        a.status === 'in_review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        a.status === 'accepted' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        a.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                        a.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {String(a.status || '').replace('_', ' ')}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        {/* Download Job Card */}
                        <Button 
                          variant="outline" 
                          onClick={() => handleDownloadPdf(a.job_entry_test_id, a.job_entry_tests?.uid_label || 'Unknown')}
                          disabled={downloadingId === a.job_entry_test_id}
                          className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm rounded-lg h-8 w-8 p-0 flex items-center justify-center shrink-0"
                          title="Download Job Card PDF"
                        >
                          {downloadingId === a.job_entry_test_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        </Button>

                        {/* Status Actions */}
                        {a.status === 'assigned' && (
                          <>
                            <Button size="sm" onClick={async () => {
                              setLoadingId(a.id);
                              let hasError = false;
                              for (const asg of a.all_assignments) {
                                const res = await updateAssignmentStatusAction(asg.id, 'accepted');
                                if (!res.success) {
                                  alert("Error: " + res.error);
                                  hasError = true;
                                }
                              }
                              setLoadingId(null);
                              if (!hasError) router.refresh();
                            }} disabled={loadingId === a.id} className="bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white border border-orange-200 shadow-sm rounded-lg h-8 px-3 font-bold text-[11px]">
                              {loadingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                              Accept
                            </Button>
                            <Button size="sm" variant="outline" onClick={async () => {
                              const remark = window.prompt("Please enter a reason for rejection:");
                              if (remark !== null) {
                                if (!remark.trim()) return alert("Remark is required to reject.");
                                setLoadingId(a.id);
                                let hasError = false;
                                for (const asg of a.all_assignments) {
                                  const res = await updateAssignmentStatusAction(asg.id, 'rejected', { reviewer_remark: remark });
                                  if (!res.success) {
                                    alert("Error: " + res.error);
                                    hasError = true;
                                  }
                                }
                                setLoadingId(null);
                                if (!hasError) router.refresh();
                              }
                            }} disabled={loadingId === a.id} className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg h-8 px-3 font-bold text-[11px]">
                              Reject
                            </Button>
                          </>
                        )}

                        {(a.status === 'accepted' || a.status === 'rejected') && (
                          <Button size="sm" onClick={() => handleStatusUpdate(a.id, 'in_testing')} disabled={loadingId === a.id} className="bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white border border-orange-200 shadow-sm rounded-lg h-8 px-3 font-bold text-[11px]">
                            {loadingId === a.id && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                            Start
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
                            <Button size="sm" disabled={loadingId === a.id} onClick={() => document.getElementById(`file-${a.id}`)?.click()} className="bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white border border-blue-200 shadow-sm rounded-lg h-8 px-3 font-bold text-[11px]">
                              {loadingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Download className="w-3.5 h-3.5 mr-1" />}
                              Upload
                            </Button>
                          </>
                        )}

                        {a.status === 'report_uploaded' && (
                          <Button size="sm" onClick={() => handleStatusUpdate(a.id, 'in_review')} disabled={loadingId === a.id} className="bg-fuchsia-50 text-fuchsia-600 hover:bg-fuchsia-500 hover:text-white border border-fuchsia-200 shadow-sm rounded-lg h-8 px-3 font-bold text-[11px]">
                            {loadingId === a.id && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                            Review
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
