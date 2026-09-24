"use client";

import { useState, useEffect } from "react";
import { JobAssignmentsTabsClient } from "@/components/modules/job-assignments/JobAssignmentsTabsClient";
import { TeamsTab } from "@/components/modules/job-assignments/TeamsTab";
import { AssignJobsTab } from "@/components/modules/job-assignments/AssignJobsTab";
import { AssignmentsListTab } from "@/components/modules/job-assignments/AssignmentsListTab";
import { MyAssignmentsTab } from "@/components/modules/job-assignments/MyAssignmentsTab";

interface JobAssignmentsContentProps {
  initialTab: string;
  isManager: boolean;
  userId: string;
  teams: any[];
  assignments: any[];
  employees: any[];
}

export function JobAssignmentsContent({
  initialTab,
  isManager,
  userId,
  teams,
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Job Assignments</h1>
        <JobAssignmentsTabsClient activeTab={activeTab} isManager={isManager} onTabChange={handleTabChange} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {isManager && activeTab === "teams" && (
          <TeamsTab initialTeams={teams} employees={employees} />
        )}
        {isManager && activeTab === "assign" && (
          <AssignJobsTab teams={teams} employees={employees} />
        )}
        {isManager && activeTab === "list" && (
          <AssignmentsListTab assignments={assignments} teams={teams} employees={employees} />
        )}
        {activeTab === "my" && (
          <MyAssignmentsTab assignments={assignments} userId={userId} />
        )}
      </div>
    </>
  );
}
