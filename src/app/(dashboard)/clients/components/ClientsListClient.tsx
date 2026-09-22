"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getJobEntriesByClientIdAction } from "@/actions/job-entry.actions";
import { Database } from "@/types/database";
import { ClientWizard } from "@/components/modules/clients/ClientWizard";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type JobEntry = Database["public"]["Tables"]["job_entries"]["Row"];
type JobEntryTest = Database["public"]["Tables"]["job_entry_tests"]["Row"];

interface JobEntryWithTests extends JobEntry {
  job_entry_tests: JobEntryTest[];
}

export default function ClientsListClient({
  initialClients,
}: {
  initialClients: Client[];
}) {
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [jobEntries, setJobEntries] = useState<JobEntryWithTests[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  
  const [editingTest, setEditingTest] = useState<JobEntryTest | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const toggleClient = async (clientId: string) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null);
      return;
    }

    setExpandedClientId(clientId);
    setIsLoadingJobs(true);
    try {
      const res = await getJobEntriesByClientIdAction(clientId);
      if (res.success && res.data) {
        setJobEntries(res.data as JobEntryWithTests[]);
      }
    } catch (error) {
      console.error("Failed to load job entries", error);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const handleEditClick = (test: JobEntryTest, client: Client) => {
    setEditingTest(test);
    setEditingClient(client);
  };

  const onWizardClose = () => {
    setEditingTest(null);
    setEditingClient(null);
    
    // Refresh the expanded client's job entries
    if (expandedClientId) {
      // Small delay to let DB reflect changes
      setTimeout(() => {
        toggleClient(expandedClientId).then(() => toggleClient(expandedClientId));
      }, 500);
    }
  };

  return (
    <div className="space-y-4">
      {initialClients.map((client) => (
        <Card key={client.id} className="p-4">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleClient(client.id)}
          >
            <div>
              <h2 className="text-lg font-semibold">{client.name}</h2>
              <div className="text-sm text-muted-foreground">
                {client.email} {client.mobile ? `| ${client.mobile}` : ""}
              </div>
            </div>
            <Button variant="ghost" size="icon">
              {expandedClientId === client.id ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </Button>
          </div>

          {expandedClientId === client.id && (
            <div className="mt-4 border-t pt-4">
              {isLoadingJobs ? (
                <div className="text-center text-muted-foreground py-4">
                  Loading inwards...
                </div>
              ) : jobEntries.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No inwards found for this client.
                </div>
              ) : (
                <div className="space-y-4">
                  {jobEntries.map((job) => (
                    <div key={job.id} className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground bg-secondary/20 p-2 rounded">
                        Job Entry: {new Date(job.created_at).toLocaleDateString()}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-2 font-medium">UID</th>
                              <th className="px-4 py-2 font-medium">Material</th>
                              <th className="px-4 py-2 font-medium">Method</th>
                              <th className="px-4 py-2 font-medium">Grade</th>
                              <th className="px-4 py-2 font-medium">Dates</th>
                              <th className="px-4 py-2 font-medium text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {job.job_entry_tests && job.job_entry_tests.length > 0 ? (
                              job.job_entry_tests.map((test) => (
                                <tr key={test.id} className="border-b">
                                  <td className="px-4 py-3 font-semibold text-primary">
                                    {test.uid}
                                  </td>
                                  <td className="px-4 py-3">{test.material_description || "-"}</td>
                                  <td className="px-4 py-3">{test.test_method || "-"}</td>
                                  <td className="px-4 py-3">{test.grade || "-"}</td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground">
                                    C: {test.date_of_casting ? new Date(test.date_of_casting).toLocaleDateString() : "-"}
                                    <br />
                                    R: {test.date_of_receiving ? new Date(test.date_of_receiving).toLocaleDateString() : "-"}
                                    <br />
                                    T: {test.date_of_testing ? new Date(test.date_of_testing).toLocaleDateString() : "-"}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditClick(test, client);
                                      }}
                                      className="h-8"
                                    >
                                      <Edit className="h-4 w-4 mr-2" /> Edit
                                    </Button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-sm border-b">
                                  No tests in this job entry.
                                </td>
                                <td className="px-4 py-3 text-right border-b">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditClick({} as JobEntryTest, client);
                                    }}
                                    className="h-8"
                                  >
                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                  </Button>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      ))}

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
