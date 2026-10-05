"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { updateAssignmentStatusAction } from "@/actions/job-assignment.actions";
import { downloadJobCardAction } from "@/actions/job-card-pdf.actions";
import { Loader2, Check, X, ClipboardList, Download, Tag, Calendar, Beaker, AlertCircle, FileText, Zap, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/modules/PageHeader";
import { createClient } from "@/lib/supabase/client";
import { JobStageStepper } from "@/components/ui/JobStageStepper";
import { Dropdown } from "@/components/ui/Dropdown";
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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const router = useRouter();

  const myAssignments = React.useMemo(() => {
    return assignments.filter((a: any) => {
      let isMine = false;
      if (a.assigned_to === userId) isMine = true;
      if (a.teams?.team_members?.some((m: any) => m.employee_id === userId)) isMine = true;
      
      if (!isMine) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const empName = `${a.assigned_to_profile?.first_name || ""} ${a.assigned_to_profile?.last_name || ""}`.toLowerCase();
        const teamName = a.teams?.name ? String(a.teams?.name).toLowerCase() : "";
        const assigneeStr = a.team_id ? teamName : empName;
        
        const je = a.job_entry_tests;
        const uidLabel = je?.uid_label || je?.job_entries?.uid_label || je?.job_entries?.uid;
        const uidStr = uidLabel ? String(uidLabel).toLowerCase() : "";
        
        const materialName = je?.material_description || je?.test_master?.material_product || "";
        const materialStr = String(materialName).toLowerCase();
        
        const receivedDateObj = je?.job_entries?.created_at ? new Date(je?.job_entries?.created_at) : null;
        const receivedStr = receivedDateObj ? receivedDateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).toLowerCase() : '-';

        const dueDateObj = a.due_date ? new Date(a.due_date) : null;
        const dueStr = dueDateObj ? dueDateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).toLowerCase() : '-';

        if (!assigneeStr.includes(q) && !uidStr.includes(q) && !materialStr.includes(q) && !receivedStr.includes(q) && !dueStr.includes(q)) {
          return false;
        }
      }
      
      return true;
    });
  }, [assignments, userId, filterStatus, searchQuery]);

  const groupedMyAssignments = React.useMemo(() => {
    const groups = new Map<string, any>();
    myAssignments.forEach(a => {
      const je = a.job_entry_tests;
      const uidLabel = je?.uid_label || je?.job_entries?.uid_label || je?.job_entries?.uid;
      let key = uidLabel ? `${je?.job_entry_id}-${uidLabel}` : (je?.job_entry_id ? `je-${je.job_entry_id}` : `test-${a.id}`);
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
  }, [myAssignments]);

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
    const ulrLabel = a.job_entry_tests?.ulr_number ? ` | ULR - ${a.job_entry_tests.ulr_number}` : '';
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 4,
      theme: "plain",
      styles: { lineWidth: 0.1, lineColor: 0, cellPadding: 2, fontSize: 10, fontStyle: 'bold' },
      body: [
        [`Product Test Name - ${prodName}`, `UID - ${uidLabel}${ulrLabel}`]
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
    const sampleName = a.job_entry_tests?.material_description || 
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



  const handleStatusGroupUpdate = async (assignments: any[], status: string, payload?: any) => {
    if (!assignments || assignments.length === 0) return;
    setLoadingId(assignments[0].id);
    let hasError = false;
    for (const asg of assignments) {
      const res = await updateAssignmentStatusAction(asg.id, status, payload);
      if (!res.success) {
        alert("Error: " + res.error);
        hasError = true;
      }
    }
    setLoadingId(null);
    if (!hasError) router.refresh();
  };

  const getAggregateStatus = (assignments: any[]) => {
    if (!assignments || assignments.length === 0) return 'unknown';
    if (assignments.every(asg => asg.status === 'approved')) return 'completed';
    if (assignments.some(asg => asg.status === 'rejected')) return 'working';
    if (assignments.some(asg => asg.status === 'in_review')) return 'in_review';
    if (assignments.some(asg => asg.status === 'report_uploaded')) return 'report_uploaded';
    if (assignments.some(asg => asg.status === 'in_testing')) return 'in_testing';
    if (assignments.some(asg => asg.status === 'accepted')) return 'accepted';
    return 'assigned';
  };

return (
    <div className="space-y-6 animate-in fade-in duration-500 mt-2">
      <div className="flex justify-start mb-4">
        <div className="w-full sm:w-80 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search Job Card, Material, Date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors shadow-sm bg-white"
          />
        </div>
      </div>

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
                <th className="px-6 py-4 rounded-tl-2xl whitespace-nowrap">Job Card (UID)</th>
                <th className="px-6 py-4 whitespace-nowrap">Material</th>
                <th className="px-6 py-4 whitespace-nowrap">Received Date</th>
                <th className="px-6 py-4 whitespace-nowrap">Assigned To</th>
                <th className="px-6 py-4 whitespace-nowrap">Due Date</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 rounded-tr-2xl text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupedMyAssignments.map((a: any) => {
                const uid = uidOf(a);
                const dueDate = a.due_date ? new Date(a.due_date) : null;
                const dueStr = dueDate ? dueDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : '-';
                
                const receivedRawDate = a.grouped_tests[0]?.job_entries?.created_at;
                const receivedDateObj = receivedRawDate ? new Date(receivedRawDate) : null;
                const receivedStr = receivedDateObj ? receivedDateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : '-';

                const assignedName = a.team_id 
                    ? a.teams?.name 
                    : `${a.assigned_to_profile?.first_name || ""} ${a.assigned_to_profile?.last_name || ""}`;
                const avatarLetter = a.team_id ? "T" : (assignedName.charAt(0) || "?");
                
                const materialName = a.grouped_tests[0]?.material_description || a.grouped_tests[0]?.test_master?.material_product || "N/A";
                const testCount = a.grouped_tests.length;

                return (
                  <tr key={a.id} onClick={() => router.push(`/job-assignments/${a.id}`)} className="hover:bg-orange-50/30 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                          <ClipboardList className="w-4 h-4" />
                        </div>
                        <div className="font-bold text-slate-800 text-[13px]">
                          {uid ? `UID: ${uid}` : 'UID missing'}
                          {a.grouped_tests[0]?.ulr_number && (
                            <div className="text-emerald-600 text-[11px] mt-0.5 font-semibold">ULR: {a.grouped_tests[0].ulr_number}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 truncate max-w-[200px]" title={materialName}>{materialName}</span>
                        <span className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
                          {testCount} test{testCount !== 1 ? 's' : ''} assigned
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-[13px]">
                          {receivedStr}
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

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-[13px]">
                          {dueStr}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${
                        getAggregateStatus(assignments.filter((allA: any) => allA.job_entry_tests?.job_entry_id === a.job_entry_tests?.job_entry_id)) === 'in_testing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        getAggregateStatus(assignments.filter((allA: any) => allA.job_entry_tests?.job_entry_id === a.job_entry_tests?.job_entry_id)) === 'report_uploaded' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' :
                        getAggregateStatus(assignments.filter((allA: any) => allA.job_entry_tests?.job_entry_id === a.job_entry_tests?.job_entry_id)) === 'in_review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        getAggregateStatus(assignments.filter((allA: any) => allA.job_entry_tests?.job_entry_id === a.job_entry_tests?.job_entry_id)) === 'accepted' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        getAggregateStatus(assignments.filter((allA: any) => allA.job_entry_tests?.job_entry_id === a.job_entry_tests?.job_entry_id)) === 'working' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        getAggregateStatus(assignments.filter((allA: any) => allA.job_entry_tests?.job_entry_id === a.job_entry_tests?.job_entry_id)) === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {String(getAggregateStatus(assignments.filter((allA: any) => allA.job_entry_tests?.job_entry_id === a.job_entry_tests?.job_entry_id)) || '').replace('_', ' ')}
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
                        {getAggregateStatus(a.all_assignments) === 'assigned' && (
                          <div className="w-[95px]" onClick={e => e.stopPropagation()}>
                            {loadingId === a.id ? (
                              <div className="flex items-center justify-center h-8 bg-slate-50 border border-slate-200 rounded-lg text-slate-500">
                                <Loader2 className="w-4 h-4 animate-spin" />
                              </div>
                            ) : (
                              <Dropdown
                                placeholder={
                                  <div className="flex items-center gap-1 text-orange-600">
                                    <Zap className="w-3 h-3" /> Action
                                  </div>
                                }
                                options={[
                                  { label: "Accept", value: "accept" },
                                  { label: "Reject", value: "reject" }
                                ]}
                                align="right"
                                buttonClassName="h-7 py-0 px-2 bg-white shadow-sm border-slate-200 font-medium text-[11px]"
                                value=""
                                onChange={async (val) => {
                                  if (val === "accept") {
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
                                  } else if (val === "reject") {
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
                                  }
                                }}
                              />
                            )}
                          </div>
                        )}



                        {getAggregateStatus(a.all_assignments) === 'report_uploaded' && (
                          <Button size="sm" onClick={() => handleStatusGroupUpdate(a.all_assignments, 'in_review')} disabled={loadingId === a.id} className="bg-fuchsia-50 text-fuchsia-600 hover:bg-fuchsia-500 hover:text-white border border-fuchsia-200 shadow-sm rounded-lg h-8 px-3 font-bold text-[11px]">
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
