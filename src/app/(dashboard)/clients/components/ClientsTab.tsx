"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Edit, User, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getJobEntriesByClientIdAction } from "@/actions/job-entry.actions";
import { Database } from "@/types/database";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type JobEntry = Database["public"]["Tables"]["job_entries"]["Row"];
type JobEntryTest = Database["public"]["Tables"]["job_entry_tests"]["Row"];

interface JobEntryWithTests extends JobEntry {
  job_entry_tests: JobEntryTest[];
}

export default function ClientsTab({
  initialClients,
  onEditClick,
  triggerRefresh, // Used to re-fetch if needed
}: {
  initialClients: Client[];
  onEditClick: (test: JobEntryTest, client: Client) => void;
  triggerRefresh: number;
}) {
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [jobEntries, setJobEntries] = useState<JobEntryWithTests[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  // Watch for triggerRefresh changes if a client is expanded, to reload
  React.useEffect(() => {
    if (expandedClientId && triggerRefresh > 0) {
      loadJobs(expandedClientId);
    }
  }, [triggerRefresh]);

  const loadJobs = async (clientId: string) => {
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

  const toggleClient = async (clientId: string) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null);
      return;
    }
    setExpandedClientId(clientId);
    await loadJobs(clientId);
  };

  return (
    <div className="space-y-4">
      {initialClients.map((client) => (
        <Card key={client.id} className="overflow-hidden border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300">
          <div
            className="flex items-center justify-between cursor-pointer p-4 hover:bg-slate-50/80 transition-colors"
            onClick={() => toggleClient(client.id)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full pr-4 items-center">
              <div className="flex flex-col group">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary/70" /> Client Name
                </span>
                <h2 className="text-sm font-semibold text-slate-800 truncate group-hover:text-primary transition-colors" title={client.name}>
                  {client.name}
                </h2>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary/70" /> Email
                </span>
                <div className="text-sm text-slate-600 truncate font-medium" title={client.email || ""}>
                  {client.email || "-"}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-primary/70" /> Contact Number
                </span>
                <div className="text-sm text-slate-600 truncate font-medium" title={client.mobile || ""}>
                  {client.mobile || "-"}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary/70" /> Address
                </span>
                <div className="text-sm text-slate-600 truncate font-medium" title={client.address || ""}>
                  {client.address || "-"}
                </div>
              </div>
            </div>
            <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-slate-100/80 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors">
              {expandedClientId === client.id ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </div>
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
                                        onEditClick(test, client);
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
                                      onEditClick({} as JobEntryTest, client);
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
    </div>
  );
}
