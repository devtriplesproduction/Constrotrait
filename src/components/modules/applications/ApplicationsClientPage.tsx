"use client";

import { useState } from "react";
import { EmployeeApplication } from "@/services/employee-application.service";
import { ApplicationList } from "./ApplicationList";
import { ReviewApplicationList } from "./ReviewApplicationList";
import { ApplicationFormModal } from "./ApplicationFormModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ApplicationsClientPageProps {
  myApplications: EmployeeApplication[];
  canApprove: boolean;
  applicationsToReview: EmployeeApplication[];
  userProfile: {
    first_name: string;
    last_name: string;
    designation: string;
    department: string;
  };
}

export function ApplicationsClientPage({
  myApplications,
  canApprove,
  applicationsToReview,
  userProfile
}: ApplicationsClientPageProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [activeTab, setActiveTab] = useState("my-applications");

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4 border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("my-applications")}
            className={`pb-2 px-1 font-medium text-sm transition-colors ${
              activeTab === "my-applications" 
                ? "border-b-2 border-primary text-primary" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            My Applications
          </button>
          {canApprove && (
            <button
              onClick={() => setActiveTab("review")}
              className={`pb-2 px-1 font-medium text-sm transition-colors ${
                activeTab === "review" 
                  ? "border-b-2 border-primary text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Review Applications
            </button>
          )}
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="mb-2">
          <Plus className="mr-2 h-4 w-4" /> New Application
        </Button>
      </div>

      <div className="mt-4">
        {activeTab === "my-applications" && (
          <ApplicationList applications={myApplications} userProfile={userProfile} />
        )}
        
        {activeTab === "review" && canApprove && (
          <ReviewApplicationList applications={applicationsToReview} />
        )}
      </div>

      <ApplicationFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        userProfile={userProfile}
      />
    </div>
  );
}
