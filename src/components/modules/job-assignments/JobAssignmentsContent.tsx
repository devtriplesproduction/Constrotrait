"use client";

import { useState, useEffect } from "react";
import { JobAssignmentsTabsClient } from "@/components/modules/job-assignments/JobAssignmentsTabsClient";


import { AllJobsTab } from "@/components/modules/job-assignments/AllJobsTab";
import { MyAssignmentsTab } from "@/components/modules/job-assignments/MyAssignmentsTab";
import { Dropdown } from "@/components/ui/Dropdown";

interface JobAssignmentsContentProps {
  initialTab: string;
  isManager: boolean;
  userId: string;
  branches: any[];
  assignments: any[];
  employees: any[];
}

import { PageHeader } from "@/components/modules/PageHeader";

export function JobAssignmentsContent({
  initialTab,
  isManager,
  userId,
  branches,
  assignments,
  employees
}: JobAssignmentsContentProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Sync with URL changes if needed, or just handle tab changes locally
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.history.pushState(null, '', `?tab=${tab}`);
  };

  return (
    <>
      <PageHeader
        title="Job Assignments"
        className="mb-6"
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-48 hidden md:block">
              <Dropdown value={filterStatus} onChange={setFilterStatus} placeholder="Filter by Status" buttonClassName="bg-white !h-[48px] rounded-xl" options={[
                { value: "all", label: "All Statuses" },
                { value: "assigned", label: "Assigned" },
                { value: "accepted", label: "Accepted" },
                { value: "in_testing", label: "In Testing" },
                { value: "report_uploaded", label: "Report Uploaded" },
                { value: "in_review", label: "In Review" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ]} />
            </div>
            <JobAssignmentsTabsClient 
              activeTab={activeTab} 
              isManager={isManager} 
              onTabChange={handleTabChange} 
            />
          </div>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">

        {isManager && activeTab === "list" && (
          <AllJobsTab assignments={assignments} branches={branches} employees={employees} filterStatus={filterStatus} />
        )}
        {activeTab === "my" && (
          <MyAssignmentsTab assignments={assignments} userId={userId} filterStatus={filterStatus} />
        )}
      </div>
    </>
  );
}
