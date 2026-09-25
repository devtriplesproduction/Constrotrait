"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Edit, Search, Download, Loader2, Building2, FlaskConical, CalendarDays, FileText, Activity, Layers, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";
import { getAllJobEntryTestsAction } from "@/actions/job-entry.actions";
import { downloadJobCardAction } from "@/actions/job-card-pdf.actions";
import { generateULRsForDateAction } from "@/actions/ulr.actions";
import { Database } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type JobEntryTest = Database["public"]["Tables"]["job_entry_tests"]["Row"];

interface JobEntryTestWithRelations extends JobEntryTest {
  job_entries: {
    id: string;
    created_at: string;
    client_id: string;
    clients: {
      id: string;
      name: string;
      email: string | null;
      mobile: string | null;
    };
  } | null;
}

export default function AllJobsTab({
  onEditClick,
  triggerRefresh,
}: {
  onEditClick: (test: JobEntryTest, client: Client) => void;
  triggerRefresh: number;
}) {
  const [allJobs, setAllJobs] = useState<JobEntryTestWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [searchUid, setSearchUid] = useState("");
  const [searchClient, setSearchClient] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const loadAllJobs = async () => {
    setIsLoading(true);
    try {
      const res = await getAllJobEntryTestsAction();
      if (res.success && res.data) {
        setAllJobs(res.data as JobEntryTestWithRelations[]);
      }
    } catch (error) {
      console.error("Failed to load all jobs", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllJobs();
  }, [triggerRefresh]);

  const handleDownloadPdf = async (testId: string, uid: number) => {
    try {
      setDownloadingId(testId);
      const res = await downloadJobCardAction(testId);
      if (res.success && res.data) {
        // Convert base64 to blob
        const byteCharacters = atob(res.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        // Trigger download
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

  const filteredJobs = useMemo(() => {
    return allJobs.filter((job) => {
      // UID Filter
      const uidMatch = searchUid.trim() === "" || job.uid?.toString().includes(searchUid.trim());

      // Client Name Filter
      const clientName = job.job_entries?.clients?.name?.toLowerCase() || "";
      const clientMatch = searchClient.trim() === "" || clientName.includes(searchClient.toLowerCase().trim());

      // Date Filter (using inward created_at date)
      const inwardDateStr = job.job_entries?.created_at ? new Date(job.job_entries.created_at).toISOString().split('T')[0] : "";
      const dateMatch = filterDate === "" || inwardDateStr === filterDate;

      // Month Filter (YYYY-MM format)
      const monthMatch = filterMonth === "" || inwardDateStr.startsWith(filterMonth);

      return uidMatch && clientMatch && dateMatch && monthMatch;
    });
  }, [allJobs, searchUid, searchClient, filterDate, filterMonth]);

  const handleGenerateULRs = async () => {
    if (!filterDate) {
      toast({
        title: "Date Required",
        description: "Please select an Exact Date first to generate ULRs.",
        variant: "error"
      });
      return;
    }
    
    if (!confirm(`Are you sure you want to generate ULRs for testing date: ${filterDate}? This cannot be undone.`)) {
      return;
    }
    
    setIsGenerating(true);
    try {
      const res = await generateULRsForDateAction(filterDate);
      if (res.success) {
        toast({
          title: "Success",
          description: `ULRs successfully generated for ${filterDate}.`,
        });
        loadAllJobs();
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to generate ULRs.",
          variant: "error"
        });
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message,
        variant: "error"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-white/80 backdrop-blur-xl p-5 rounded-2xl shadow-sm border border-slate-200/80 space-y-5 transition-all duration-300 hover:shadow-md hover:border-orange-200/80 group overflow-hidden">
        {/* Subtle gradient accent */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-orange-400 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out" />



        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <Input
            label="UID"
            placeholder="Search by UID..."
            value={searchUid}
            onChange={(e) => setSearchUid(e.target.value)}
            className="h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-orange-500/20 focus-visible:border-orange-400 hover:border-orange-300 transition-all shadow-sm rounded-xl"
          />
          <Input
            label="Client Name"
            placeholder="Search by Client..."
            value={searchClient}
            onChange={(e) => setSearchClient(e.target.value)}
            className="h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-orange-500/20 focus-visible:border-orange-400 hover:border-orange-300 transition-all shadow-sm rounded-xl"
          />
          <div className="w-full space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
              Exact Date
            </label>
            <PremiumDatePicker
              value={filterDate}
              onChange={(val) => {
                setFilterDate(val);
                if (val) setFilterMonth(""); // Reset month if date is chosen
              }}
              triggerClassName="h-10 bg-slate-50/50 border-slate-200 hover:border-orange-300 transition-all shadow-sm rounded-xl"
            />
          </div>
          <Input
            label="Month"
            type="month"
            value={filterMonth}
            onChange={(e) => {
              setFilterMonth(e.target.value);
              if (e.target.value) setFilterDate(""); // Reset date if month is chosen
            }}
            className="h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-orange-500/20 focus-visible:border-orange-400 hover:border-orange-300 transition-all shadow-sm rounded-xl"
          />
        </div>
        
        {/* Action Bar for ULR Generation */}
        <div className="flex justify-end pt-2 border-t border-slate-100/60 mt-4">
          <Button 
            onClick={handleGenerateULRs} 
            disabled={isGenerating || !filterDate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate ULRs for {filterDate || "Selected Date"}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-10">
            Loading all job entries...
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            No jobs found matching your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
            {filteredJobs.map((test) => {
              const client = test.job_entries?.clients;
              return (
                <div key={test.id} className="bg-white rounded-[20px] p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-slate-100 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.1)] hover:border-orange-100 transition-all duration-300 group">
                  {/* Top Row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="px-3 py-1 bg-gradient-to-br from-orange-50 to-[#FFF8ED] border border-orange-100/80 rounded-xl text-orange-600 font-extrabold text-[12px] tracking-wide shadow-[0_1px_2px_rgba(249,115,22,0.05)]">
                        UID: {test.uid}
                      </div>
                      <div className={`px-3 py-1 rounded-xl font-extrabold text-[12px] tracking-wide shadow-[0_1px_2px_rgba(0,0,0,0.05)] border ${test.ulr_status === 'generated' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {test.ulr_status === 'generated' ? `ULR: ${test.ulr_number}` : `ULR Pending (${test.date_of_testing ? new Date(test.date_of_testing).toLocaleDateString() : '-'})`}
                      </div>
                      <div className="px-3 py-1 bg-slate-50 border border-slate-100/80 rounded-xl text-slate-500 text-[11px] font-semibold flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400/80 shadow-sm"></div>
                        {new Date(test.job_entries?.created_at || "").toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPdf(test.id, test.uid);
                        }}
                        disabled={downloadingId === test.id}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-100 bg-white text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 hover:border-indigo-100 transition-all duration-200 shadow-sm"
                        title="Download PDF"
                      >
                        {downloadingId === test.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (client) {
                            const mockClient = { ...client } as any;
                            onEditClick(test, mockClient);
                          }
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-100 bg-white text-slate-400 hover:text-orange-500 hover:bg-orange-50 hover:border-orange-100 transition-all duration-200 shadow-sm"
                        title="Edit"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <hr className="border-slate-100/60 my-4" />

                  {/* Details Section */}
                  <div className="space-y-4 mb-4 px-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="group/item">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-1.5 group-hover/item:text-slate-500 transition-colors">Client</div>
                        <div className="text-[14px] font-bold text-slate-800 truncate" title={client?.name || "Unknown"}>{client?.name || "Unknown"}</div>
                      </div>

                      <div className="group/item">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-1.5 group-hover/item:text-slate-500 transition-colors">Material</div>
                        <div className="text-[14px] font-bold text-slate-700 truncate" title={test.material_description || "-"}>{test.material_description || "-"}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 group/item">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-1.5 group-hover/item:text-slate-500 transition-colors">Method</div>
                        <div className="text-[14px] font-bold text-slate-700 truncate" title={test.test_method || "-"}>{test.test_method || "-"}</div>
                      </div>
                      <div className="group/item">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-1.5 group-hover/item:text-slate-500 transition-colors">Grade</div>
                        <div className="inline-flex px-2.5 py-1 bg-slate-50 border border-slate-200/60 rounded-md text-[13px] font-bold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-w-[3rem] justify-center">
                          {test.grade || "-"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100/60 my-4" />

                  {/* Dates Section */}
                  <div className="grid grid-cols-3 gap-2.5 px-0.5">
                    <div className="flex flex-col items-center justify-center py-2 bg-gradient-to-b from-[#F8FAFC] to-white border border-[#E2E8F0]/80 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] group-hover:border-blue-100 transition-colors">
                      <div className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wide mb-0.5">Cast</div>
                      <div className="text-[13px] font-semibold text-slate-600">
                        {test.date_of_casting ? new Date(test.date_of_casting).toLocaleDateString() : "-"}
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center py-2 bg-gradient-to-b from-[#F0FDF4] to-white border border-[#DCFCE7]/80 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] group-hover:border-emerald-100 transition-colors">
                      <div className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wide mb-0.5">Recv</div>
                      <div className="text-[13px] font-semibold text-slate-600">
                        {test.date_of_receiving ? new Date(test.date_of_receiving).toLocaleDateString() : "-"}
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center py-2 bg-gradient-to-b from-[#FAF5FF] to-white border border-[#F3E8FF]/80 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] group-hover:border-purple-100 transition-colors">
                      <div className="text-[11px] font-extrabold text-purple-600 uppercase tracking-wide mb-0.5">Test</div>
                      <div className="text-[13px] font-semibold text-slate-600">
                        {test.date_of_testing ? new Date(test.date_of_testing).toLocaleDateString() : "-"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
