"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { issueReportsForJobAction, getReportsForJobAction, downloadLabReportAction } from "@/actions/lab-report.actions";

function jobIdOf(assignment: any): string | null {
  return assignment?.job_entry_tests?.job_entry_id
    || assignment?.job_entry_tests?.job_entries?.id
    || null;
}

function uidOf(assignment: any): string {
  const test = assignment?.job_entry_tests;
  return String(test?.uid_label || "UID missing");
}

export function IssueReportButtons({ assignment }: { assignment: any }) {
  const [busy, setBusy] = useState(false);
  const jobId = jobIdOf(assignment);
  if (!jobId) return null;

  const issue = async () => {
    setBusy(true);
    const res = await issueReportsForJobAction(jobId);
    setBusy(false);
    if (!res.success) alert(res.error);
    else alert("Report issued");
  };

  const download = async () => {
    setBusy(true);
    const list = await getReportsForJobAction(jobId);
    if (!list.success || !list.data?.length) {
      setBusy(false);
      alert(list.error || "No report yet — Issue first");
      return;
    }
    for (const r of list.data) {
      const file = await downloadLabReportAction(r.id);
      if (!file.success || !file.data) continue;
      const bin = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
      const blob = new Blob([bin], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.reportNo || r.report_no || "report"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={busy} onClick={issue} className="bg-slate-800 hover:bg-slate-900 text-white">
        Issue report
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={download}>
        Download PDF
      </Button>
      {uidOf(assignment) && <span className="self-center text-xs text-slate-500">UID {uidOf(assignment)}</span>}
    </div>
  );
}
