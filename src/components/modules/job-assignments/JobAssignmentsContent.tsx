"use client";

import { useState, useEffect } from "react";
import { JobAssignmentsTabsClient } from "@/components/modules/job-assignments/JobAssignmentsTabsClient";


import { AssignmentsListTab } from "@/components/modules/job-assignments/AssignmentsListTab";
import { MyAssignmentsTab } from "@/components/modules/job-assignments/MyAssignmentsTab";

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
          <JobAssignmentsTabsClient 
            activeTab={activeTab} 
            isManager={isManager} 
            onTabChange={handleTabChange} 
          />
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">

        {isManager && activeTab === "list" && (
          <AssignmentsListTab assignments={assignments} branches={branches} employees={employees} userId={userId} />
        )}
        {activeTab === "my" && (
          <MyAssignmentsTab assignments={assignments} userId={userId} />
        )}
      </div>
    </>
  );
}
