"use client";

import { useState, useEffect } from "react";
import { JobAssignmentsTabsClient } from "@/components/modules/job-assignments/JobAssignmentsTabsClient";


import { AllJobsTab } from "@/components/modules/job-assignments/AllJobsTab";
import { MyAssignmentsTab } from "@/components/modules/job-assignments/MyAssignmentsTab";
import { TestingScheduleTab } from "@/components/modules/job-assignments/TestingScheduleTab";
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

  const currentUserProfile = employees.find(e => e.id === userId);

  return (
    <>
      <PageHeader
        title="Job Assignments"
        className="mb-6"
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <JobAssignmentsTabsClient 
              activeTab={activeTab} 
              isManager={isManager} 
              onTabChange={handleTabChange} 
            />
          </div>
        }
      />

      <div>

        {isManager && activeTab === "list" && (
          <AllJobsTab assignments={assignments} branches={branches} employees={employees} filterStatus={filterStatus} setFilterStatus={setFilterStatus} />
        )}
        {activeTab === "my" && (
          <MyAssignmentsTab assignments={assignments} userId={userId} filterStatus={filterStatus} setFilterStatus={setFilterStatus} />
        )}
        {activeTab === "schedule" && (
          <TestingScheduleTab assignments={assignments} userId={userId} filterStatus={filterStatus} setFilterStatus={setFilterStatus} currentUserProfile={currentUserProfile} />
        )}
      </div>
    </>
  );
}
