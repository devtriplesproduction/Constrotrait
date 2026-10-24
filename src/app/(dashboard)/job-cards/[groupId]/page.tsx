import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobEntryService } from "@/services/job-entry.service";
import { Briefcase } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/modules/PageHeader";
import { InwardDetailsView } from "@/components/modules/inward/InwardDetailsView";
import { BackToJobCardButton } from "@/components/modules/inward/BackToJobCardButton";

export default async function JobCardDetailsPage(props: {
  params: Promise<{ groupId: string }>;
  searchParams?: Promise<{ assignmentId?: string; returnUrl?: string; jobEntryId?: string }>;
}) {
  const params = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : {};
  const decodedGroupId = decodeURIComponent(params.groupId);
  const assignmentId = searchParams.assignmentId || null;
  const returnUrl = searchParams.returnUrl || null;
  const jobEntryId = searchParams.jobEntryId || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch complete job entry record directly
  let jobEntry = await JobEntryService.getJobEntryByUidOrId(decodedGroupId);
  if (!jobEntry && jobEntryId) {
    jobEntry = await JobEntryService.getJobEntryByUidOrId(jobEntryId);
  }

  let jobGroup: any[] = [];
  let client: any = null;
  let branch: any = null;

  if (jobEntry) {
    jobGroup = jobEntry.job_entry_tests || [];
    client = jobEntry.clients;
    branch = jobEntry.branches;
  } else {
    // Fallback: Fetch all tests and filter
    const allTests = await JobEntryService.getAllJobEntryTests();
    jobGroup = allTests
      .filter((t: any) => (t.uid_label || t.id) === decodedGroupId || (jobEntryId && t.job_entry_id === jobEntryId))
      .sort((a: any, b: any) => {
        const dateA = a.date_of_testing ? new Date(a.date_of_testing).getTime() : Infinity;
        const dateB = b.date_of_testing ? new Date(b.date_of_testing).getTime() : Infinity;
        if (dateA !== dateB) return dateA - dateB;

        const dayA = parseInt(a.testing_day || a.testing_age || "0") || 0;
        const dayB = parseInt(b.testing_day || b.testing_age || "0") || 0;
        return dayA - dayB;
      });

    if (jobGroup.length > 0) {
      client = jobGroup[0].job_entries?.clients;
      branch = jobGroup[0].job_entries?.branches;
      jobEntry = jobGroup[0].job_entries;
    }
  }

  if (!jobEntry && jobGroup.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 text-center max-w-lg mx-auto">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Inward Details Not Found</h2>
          <p className="text-slate-500 mb-6">
            The inward record you are looking for does not exist or you do not have permission to view it.
          </p>
          <BackToJobCardButton assignmentId={assignmentId} returnUrl={returnUrl} label="Back to Job Card" />
        </div>
      </div>
    );
  }

  const primaryJob = jobEntry || jobGroup[0]?.job_entries || {};

  return (
    <div className="w-full max-w-screen-2xl mx-auto min-h-screen flex flex-col gap-6 pb-12">
      {/* Top Page Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>
              Inward Details:{" "}
              <span className="text-orange-500 font-mono">{primaryJob.uid_label || decodedGroupId}</span>
            </span>
          </div>
        }
        subtitle="Complete record of customer, site, project, material, and testing specifications entered at inward desk."
        icon={Briefcase}
        iconClassName="text-orange-500"
        actions={
          <BackToJobCardButton
            assignmentId={assignmentId}
            returnUrl={returnUrl}
            label="Back to Job Card"
          />
        }
      />

      {/* Comprehensive & Attractive Inward Details View */}
      <InwardDetailsView
        jobEntry={primaryJob}
        tests={jobGroup}
        client={client}
        branch={branch}
        assignmentId={assignmentId}
        returnUrl={returnUrl}
      />
    </div>
  );
}
