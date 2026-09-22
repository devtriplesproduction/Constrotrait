"use client";

import React, { useState } from "react";
import { X, Users, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database";
import { ClientWizard } from "@/components/modules/clients/ClientWizard";
import ClientsTab from "./ClientsTab";
import AllJobsTab from "./AllJobsTab";
import NewInwardModalButton from "./NewInwardModalButton";
import { PageHeader } from "@/components/modules/PageHeader";
import { clsx } from "clsx";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type JobEntryTest = Database["public"]["Tables"]["job_entry_tests"]["Row"];

export default function ClientInwardManager({
  initialClients,
}: {
  initialClients: Client[];
}) {
  const [activeTab, setActiveTab] = useState<"clients" | "all-jobs">("clients");

  // Global editing state for the Wizard modal
  const [editingTest, setEditingTest] = useState<JobEntryTest | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Trigger refresh in child tabs after edit
  const [triggerRefresh, setTriggerRefresh] = useState(0);

  const handleEditClick = (test: JobEntryTest, client: Client) => {
    setEditingTest(test);
    setEditingClient(client);
  };

  const onWizardClose = () => {
    setEditingTest(null);
    setEditingClient(null);
    // Trigger refresh in whichever tab is active
    setTimeout(() => {
      setTriggerRefresh((prev) => prev + 1);
    }, 500); // Give DB time to save
  };

  const TabNavigation = (
    <div className="flex bg-slate-100/50 p-1 rounded-xl w-fit mr-2">
      <button
        onClick={() => setActiveTab("clients")}
        className={clsx(
          "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all",
          activeTab === "clients"
            ? "bg-white text-primary shadow-sm ring-1 ring-slate-200/50"
            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
        )}
      >
        <Users className="h-4 w-4" />
        Clients
      </button>
      <button
        onClick={() => setActiveTab("all-jobs")}
        className={clsx(
          "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all",
          activeTab === "all-jobs"
            ? "bg-white text-primary shadow-sm ring-1 ring-slate-200/50"
            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
        )}
      >
        <Briefcase className="h-4 w-4" />
        All Jobs
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Inward"
        subtitle="View all clients and their associated inwards."
        actions={
          <div className="flex items-center">
            {TabNavigation}
            <NewInwardModalButton />
          </div>
        }
      />

      {/* Tab Content */}
      <div className="animate-in fade-in duration-300">
        {activeTab === "clients" ? (
          <ClientsTab 
            initialClients={initialClients} 
            onEditClick={handleEditClick}
            triggerRefresh={triggerRefresh}
          />
        ) : (
          <AllJobsTab 
            onEditClick={handleEditClick}
            triggerRefresh={triggerRefresh}
          />
        )}
      </div>

      {/* Unified Edit Modal */}
      {editingTest && editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onWizardClose}
          />

          <div className="relative z-10 w-full max-w-5xl mx-auto shadow-2xl rounded-2xl overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-4 right-4 z-[60]">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 bg-slate-100/50 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                onClick={onWizardClose}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>

            <ClientWizard
              mode="edit"
              initialData={{ client: editingClient, jobEntryTest: editingTest }}
              onSuccess={onWizardClose}
            />
          </div>
        </div>
      )}
    </div>
  );
}
