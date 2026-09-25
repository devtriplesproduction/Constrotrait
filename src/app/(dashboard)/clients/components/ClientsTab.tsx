"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, User, Mail, Phone, MapPin, FileText, Search, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getJobEntriesByClientIdAction } from "@/actions/job-entry.actions";
import { downloadJobCardAction } from "@/actions/job-card-pdf.actions";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPdf = async (testId: string, uid: number) => {
    try {
      setDownloadingId(testId);
      const res = await downloadJobCardAction(testId);
      if (res.success && res.data) {
        const byteCharacters = atob(res.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `JobCard_${uid}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        console.error("Failed to download PDF:", res.error);
        alert("Failed to download Job Card PDF.");
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Error generating Job Card.");
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredClients = initialClients.filter((client) => {
    const query = searchQuery.toLowerCase();
    return (
      client.name?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.mobile?.toLowerCase().includes(query)
    );
  });

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
      {/* Search / Filter Card */}
      <div className="relative bg-white/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200/80 transition-all duration-300 hover:shadow-md hover:border-orange-200/80 group overflow-hidden">
        {/* Subtle gradient accent */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-orange-400 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out" />
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <div className="bg-orange-50 p-1.5 rounded-lg border border-orange-100/50 text-orange-500 shadow-sm group-hover:bg-orange-100 transition-colors duration-300">
              <Search className="h-4 w-4" />
            </div>
            Search Clients
          </h3>

          <div className="w-full sm:max-w-md">
            <Input
              placeholder="Search by name, email, or contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-orange-500/20 focus-visible:border-orange-400 hover:border-orange-300 transition-all shadow-sm rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
      {filteredClients.map((client) => {
        // Get client initials for avatar
        const initials = client.name
          ? client.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
          : "?";

        return (
          <Card 
            key={client.id} 
            className="group relative overflow-hidden border border-slate-200/80 bg-gradient-to-r from-white to-slate-50/80 backdrop-blur-xl shadow-sm hover:shadow-md hover:border-orange-200/80 hover:scale-[1.002] hover:-translate-y-[1px] transition-all duration-300 ease-in-out rounded-2xl"
          >
            {/* Subtle gradient strip on the left */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-orange-400 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out" />
            
            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer py-1 px-3 hover:bg-slate-50/70 transition-colors duration-300 ease-in-out"
              onClick={() => toggleClient(client.id)}
            >
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 w-full pr-2 items-center">
                
                {/* Client Name with Avatar */}
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 border border-orange-300/50 flex items-center justify-center shadow-sm">
                    <span className="text-orange-700 font-bold text-[11px] tracking-wider">
                      {initials}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0 justify-center">
                    <span className="text-[10px] leading-tight uppercase tracking-widest text-slate-400 font-bold">
                      Client Name
                    </span>
                    <h2 className="text-sm font-bold leading-tight text-slate-800 truncate group-hover:text-orange-600 transition-colors duration-300 ease-in-out" title={client.name}>
                      {client.name}
                    </h2>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-2.5">
                  <div className="bg-orange-50 border border-orange-100/50 shadow-sm p-1 rounded-lg text-orange-500 group-hover:bg-orange-100 transition-colors duration-300">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0 justify-center">
                    <span className="text-[10px] leading-tight uppercase tracking-widest text-slate-400 font-bold">
                      Email
                    </span>
                    <div className="text-[13px] leading-tight text-slate-700 truncate font-semibold" title={client.email || "No Email"}>
                      {client.email || "-"}
                    </div>
                  </div>
                </div>

                {/* Contact Number */}
                <div className="flex items-center gap-2.5">
                  <div className="bg-orange-50 border border-orange-100/50 shadow-sm p-1 rounded-lg text-orange-500 group-hover:bg-orange-100 transition-colors duration-300">
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0 justify-center">
                    <span className="text-[10px] leading-tight uppercase tracking-widest text-slate-400 font-bold">
                      Contact Number
                    </span>
                    <div className="text-[13px] leading-tight text-slate-700 truncate font-semibold" title={client.mobile || "No Contact"}>
                      {client.mobile || "-"}
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-center gap-2.5">
                  <div className="bg-orange-50 border border-orange-100/50 shadow-sm p-1 rounded-lg text-orange-500 group-hover:bg-orange-100 transition-colors duration-300">
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0 justify-center">
                    <span className="text-[10px] leading-tight uppercase tracking-widest text-slate-400 font-bold">
                      Address
                    </span>
                    <div className="text-[13px] leading-tight text-slate-700 truncate font-semibold" title={client.address || "No Address"}>
                      {client.address || "-"}
                    </div>
                  </div>
                </div>

                {/* GST */}
                <div className="flex items-center gap-2.5">
                  <div className="bg-orange-50 border border-orange-100/50 shadow-sm p-1 rounded-lg text-orange-500 group-hover:bg-orange-100 transition-colors duration-300">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0 justify-center">
                    <span className="text-[10px] leading-tight uppercase tracking-widest text-slate-400 font-bold">
                      GST No
                    </span>
                    <div className="text-[13px] leading-tight text-slate-700 truncate font-semibold" title={client.gst_no || "No GST"}>
                      {client.gst_no || "-"}
                    </div>
                  </div>
                </div>

              </div>
              
              <div className="shrink-0 flex items-center justify-center w-6 h-6 mt-3 sm:mt-0 rounded-full bg-slate-100 text-slate-500 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors duration-300 ease-in-out shadow-sm">
                {expandedClientId === client.id ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </div>
            </div>

          {expandedClientId === client.id && (
            <div className="mt-4 border-t border-slate-100 pt-4 px-6 pb-6 bg-slate-50/50 rounded-b-2xl animate-in fade-in slide-in-from-top-2 duration-300">
              {isLoadingJobs ? (
                <div className="flex items-center justify-center space-x-2 text-muted-foreground py-8">
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce [animation-delay:-.3s]" />
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce [animation-delay:-.5s]" />
                  <span className="ml-2 font-medium text-slate-500">Loading inwards...</span>
                </div>
              ) : jobEntries.length === 0 ? (
                <div className="text-center text-slate-500 font-medium py-8 bg-white rounded-xl border border-dashed border-slate-200">
                  No inwards found for this client.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {jobEntries.flatMap((job) => 
                    job.job_entry_tests && job.job_entry_tests.length > 0 ? (
                      job.job_entry_tests.map((test) => (
                        <div key={test.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-300 group relative overflow-hidden flex flex-col h-full">
                          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex items-center justify-center font-black text-orange-600 bg-gradient-to-br from-orange-50 to-orange-100/50 px-2.5 py-1 rounded-lg border border-orange-200/50 shadow-sm group-hover:scale-105 transition-transform text-sm">
                                UID: {test.uid}
                              </span>
                              <span className={`inline-flex items-center justify-center font-black px-2.5 py-1 rounded-lg border shadow-sm group-hover:scale-105 transition-transform text-[11px] ${test.ulr_status === 'generated' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
                                {test.ulr_status === 'generated' ? `ULR: ${test.ulr_number}` : `ULR Pending (${test.date_of_testing ? new Date(test.date_of_testing).toLocaleDateString() : '-'})`}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-50/80 px-2 py-1 rounded-md border border-slate-200/60 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                {new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPdf(test.id, test.uid);
                                }}
                                disabled={downloadingId === test.id}
                                className="h-8 w-8 text-slate-400 bg-white hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 shadow-sm rounded-full transition-all duration-300"
                              >
                                {downloadingId === test.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Download className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditClick(test, client);
                                }}
                                className="h-8 w-8 text-slate-400 bg-white hover:text-orange-600 hover:bg-orange-50 border border-slate-200 shadow-sm rounded-full transition-all duration-300"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-3 flex-grow">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Material</span>
                              {test.material_description ? <span className="font-semibold text-slate-700 text-[13px]">{test.material_description}</span> : <span className="text-slate-400 text-[11px] italic">N/A</span>}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Method</span>
                                {test.test_method ? <span className="font-medium text-slate-600 text-[13px]">{test.test_method}</span> : <span className="text-slate-400 text-[11px] italic">N/A</span>}
                              </div>
                              
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Grade</span>
                                {test.grade ? <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-bold border border-slate-200/60 shadow-sm inline-block">{test.grade}</span> : <span className="text-slate-400 text-[11px] italic">N/A</span>}
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-3 border-t border-slate-100/80">
                            <div className="grid grid-cols-3 gap-1.5">
                              <div className="flex flex-col items-center py-1.5 px-1 rounded-md bg-blue-50/50 border border-blue-100/50">
                                <span className="text-[9px] font-bold text-blue-600 mb-0.5">Cast</span>
                                <span className="text-[11px] font-medium text-slate-600 text-center">{test.date_of_casting ? new Date(test.date_of_casting).toLocaleDateString() : '-'}</span>
                              </div>
                              <div className="flex flex-col items-center py-1.5 px-1 rounded-md bg-emerald-50/50 border border-emerald-100/50">
                                <span className="text-[9px] font-bold text-emerald-600 mb-0.5">Recv</span>
                                <span className="text-[11px] font-medium text-slate-600 text-center">{test.date_of_receiving ? new Date(test.date_of_receiving).toLocaleDateString() : '-'}</span>
                              </div>
                              <div className="flex flex-col items-center py-1.5 px-1 rounded-md bg-purple-50/50 border border-purple-100/50">
                                <span className="text-[9px] font-bold text-purple-600 mb-0.5">Test</span>
                                <span className="text-[11px] font-medium text-slate-600 text-center">{test.date_of_testing ? new Date(test.date_of_testing).toLocaleDateString() : '-'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div key={job.id} className="col-span-1 p-6 text-center bg-gradient-to-b from-slate-50/80 to-slate-100/50 rounded-2xl border border-dashed border-slate-300 hover:border-orange-300 hover:bg-orange-50/50 transition-all duration-300 flex flex-col items-center justify-center gap-4 shadow-sm group min-h-[220px]">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100 group-hover:border-orange-200 group-hover:text-orange-700 transition-colors">
                          <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-orange-500 transition-colors" />
                          Job Entry: {new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-[0_4px_14px_0_rgba(0,0,0,0.05)] border border-slate-100 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ease-out">
                          <FileText className="h-5 w-5 text-slate-400 group-hover:text-orange-500 transition-colors" />
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-slate-700 text-sm font-semibold">Empty Job Entry</p>
                          <p className="text-slate-400 text-xs font-medium">No tests have been added here yet.</p>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditClick({} as JobEntryTest, client);
                          }}
                          className="mt-2 h-9 bg-white text-orange-600 border-orange-200 hover:bg-orange-500 hover:text-white hover:border-orange-500 hover:shadow-md hover:shadow-orange-500/20 transition-all duration-300 rounded-xl shadow-sm text-xs font-bold px-4"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Add First Test
                        </Button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      );
    })}
    {filteredClients.length === 0 && (
      <div className="text-center py-8 text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
        No clients match your search criteria.
      </div>
    )}
    </div>
    </div>
  );
}
