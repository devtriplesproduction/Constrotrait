"use client";

import React from "react";
import Link from "next/link";
import { ClipboardList, ExternalLink, ArrowRight, Receipt, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JobCardInwardTriggerProps {
  assignment: any;
  jobEntry?: any;
  client?: any;
  branch?: any;
  allJobEntryTests?: any[];
  variant?: "card" | "button";
}

export function JobCardInwardTrigger({
  assignment,
  jobEntry: directJobEntry,
  client: directClient,
  branch: directBranch,
  allJobEntryTests = [],
  variant = "card",
}: JobCardInwardTriggerProps) {
  const t = assignment?.job_entry_tests;
  const jobEntry = directJobEntry || t?.job_entries || {};

  const uidStr = t?.uid_label || jobEntry?.uid_label || (jobEntry?.uid ? `Job #${jobEntry.uid}` : "UID missing");
  const reportClass = t?.report_class ? `Class: ${t.report_class}` : (jobEntry?.uid ? `Job #${jobEntry.uid}` : "Standard");

  // Determine target groupId for URL
  const groupId = jobEntry?.uid_label || t?.uid_label || jobEntry?.id || assignment?.job_entry_id;
  const queryParams = new URLSearchParams();
  if (assignment?.id) {
    queryParams.set("assignmentId", assignment.id);
  }
  if (jobEntry?.id) {
    queryParams.set("jobEntryId", jobEntry.id);
  }
  const queryString = queryParams.toString();
  const targetUrl = `/job-cards/${encodeURIComponent(groupId)}${queryString ? `?${queryString}` : ""}`;

  if (variant === "button") {
    return (
      <Link href={targetUrl}>
        <Button
          variant="outline"
          className="group flex-shrink-0 flex items-center gap-2.5 px-4 h-12 rounded-2xl bg-white border border-slate-200/80 hover:border-orange-300/80 hover:bg-orange-50/60 hover:shadow-md transition-all shadow-sm text-slate-700 hover:text-orange-600 font-bold text-xs"
        >
          <Receipt className="w-4 h-4 text-orange-500" />
          <span>View Inward Details</span>
          <ArrowRight className="w-3.5 h-6 text-slate-400 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
        </Button>
      </Link>
    );
  }

  return (
    <Link
      href={targetUrl}
      className="flex-1 min-w-0 group rounded-xl p-1.5 -m-1.5 hover:bg-orange-50/70 transition-all duration-200 relative block border border-transparent hover:border-orange-200/70 hover:shadow-sm"
      title="Click to view all inward details on full page"
    >
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-[10px] font-bold text-slate-400 group-hover:text-orange-600 uppercase tracking-wider flex items-center gap-1.5 transition-colors">
          <ClipboardList className="w-3.5 h-3.5 text-orange-500" /> Job Card
        </p>
        <span className="text-[10px] font-bold text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          Open Details <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>

      <p className="font-bold text-slate-800 group-hover:text-orange-600 text-sm truncate flex items-center gap-1.5 transition-colors">
        <span>{uidStr.startsWith("UID:") ? uidStr : `UID: ${uidStr}`}</span>
        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-500 transition-colors shrink-0" />
      </p>

      <p className="text-[11px] text-slate-500 font-medium truncate group-hover:text-slate-700 transition-colors">
        {reportClass}
      </p>
    </Link>
  );
}
