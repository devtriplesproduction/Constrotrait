"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Edit, Search, Download, Loader2, Building2, FlaskConical, CalendarDays, FileText, Activity, Layers, Tag, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";
import { getAllJobEntryTestsAction } from "@/actions/job-entry.actions";
import { downloadJobCardAction } from "@/actions/job-card-pdf.actions";
import { generateULRsForDateAction } from "@/actions/ulr.actions";
import { Database } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { JobStageStepper } from "@/components/ui/JobStageStepper";
import { JobStage } from "@/config/jobTransitions";
import { useRouter } from "next/navigation";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type JobEntryTest = Database["public"]["Tables"]["job_entry_tests"]["Row"];

interface JobEntryTestWithRelations extends JobEntryTest {
  job_assignments?: {
    id: string;
    status: string;
    reviewer_remark?: string;
  }[];
  job_entries: {
    id: string;
    uid: number;
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
  const router = useRouter();
  const [allJobs, setAllJobs] = useState<JobEntryTestWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

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

  const handleGenerateULRs = async () => {
    if (!filterDate) {
      toast({ title: "Error", description: "Please select an exact date first.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const res = await generateULRsForDateAction(filterDate);
      if (res.success) {
        toast({ title: "Success", description: "ULRs generated successfully." });
        loadAllJobs();
      } else {
        toast({ title: "Error", description: res.error || "Failed to generate ULRs.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error generating ULRs:", error);
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredJobs = useMemo(() => {
    return allJobs.filter((job) => {
      // UID Filter
      const searchUidLower = searchUid.trim().toLowerCase();
      const uidMatch = searchUidLower === "" || 
        job.uid_label?.toLowerCase().includes(searchUidLower) ||
        job.job_entries?.uid?.toString().includes(searchUidLower) ||
        job.ulr_number?.toLowerCase().includes(searchUidLower);

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

  const groupedJobs = useMemo(() => {
    const groups = new Map<string, typeof filteredJobs>();
    for (const test of filteredJobs) {
      const key = test.uid_label || test.id;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(test);
    }
    return Array.from(groups.values());
  }, [filteredJobs]);

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
        ) : groupedJobs.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            No jobs found matching your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-2">
            {groupedJobs.map((jobGroup) => {
              const primaryTest = jobGroup[0];
              const client = primaryTest.job_entries?.clients;
              const groupId = primaryTest.uid_label || primaryTest.id;
              
              return (
                <div 
                  key={groupId} 
                  className="group relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col p-5 gap-5 overflow-hidden isolate"
                >
                  {/* Top-right curved accent background */}
                  <div className="absolute top-0 right-0 w-[140px] h-[130px] bg-[#FFF8F3] rounded-bl-[120px] pointer-events-none -z-10 hidden sm:block" />

                  {/* Header */}
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 shrink-0 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                        <Briefcase className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight">
                          Job UID: {primaryTest.uid_label || "Missing"}
                        </h3>
                        <p className="font-bold text-orange-500 text-sm mt-1">
                          {jobGroup.length} Test{jobGroup.length !== 1 ? 's' : ''} • Created: {primaryTest.job_entries?.created_at ? new Date(primaryTest.job_entries.created_at).toLocaleDateString() : "-"}
                        </p>
                      </div>
                    </div>

                    {/* Client Badge */}
                    <div className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border border-orange-100/50 max-w-[150px] truncate">
                      <Building2 className="w-3.5 h-3.5 shrink-0" /> 
                      <span className="truncate">{client?.name || "Unknown Client"}</span>
                    </div>
                  </div>

                  {/* View Details Link */}
                  <div className="flex justify-end mt-4 relative z-10">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/job-cards/${encodeURIComponent(groupId)}`);
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
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
