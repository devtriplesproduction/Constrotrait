"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Edit, Search, Download, Loader2, Building2, FlaskConical, CalendarDays, FileText, Activity, Layers, Tag, Briefcase, ArrowRight, SlidersHorizontal, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/Dropdown";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";
import { getAllJobEntriesAction } from "@/actions/job-entry.actions";
import { Database } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type JobEntryTest = Database["public"]["Tables"]["job_entry_tests"]["Row"];

interface JobEntryWithRelations {
  id: string;
  uid: number | null;
  uid_label: string | null;
  created_at: string;
  client_id: string;
  project_name: string | null;
  is_nabl: boolean | null;
  clients: {
    id: string;
    name: string;
    email: string | null;
    mobile: string | null;
  } | null;
  job_entry_tests: (JobEntryTest & {
    job_assignments?: {
      id: string;
      status: string;
      reviewer_remark?: string;
    }[];
  })[];
}

export default function AllJobsTab({
  onEditClick,
  triggerRefresh,
}: {
  onEditClick: (test: JobEntryTest, client: Client) => void;
  triggerRefresh: number;
}) {
  const router = useRouter();
  const [allJobs, setAllJobs] = useState<JobEntryWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchUid, setSearchUid] = useState("");
  const [searchClient, setSearchClient] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterJobType, setFilterJobType] = useState<"all" | "dummy" | "active">("all");
  
  const { toast } = useToast();

  const loadAllJobs = async () => {
    setIsLoading(true);
    try {
      const res = await getAllJobEntriesAction();
      if (res.success && res.data) {
        setAllJobs(res.data as unknown as JobEntryWithRelations[]);
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

  const filteredJobs = useMemo(() => {
    return allJobs.filter((job) => {
      // UID Filter
      const searchUidLower = searchUid.trim().toLowerCase();
      const uidMatch = searchUidLower === "" || 
        job.uid_label?.toLowerCase().includes(searchUidLower) ||
        job.uid?.toString().includes(searchUidLower) ||
        (job.job_entry_tests && job.job_entry_tests.some(t => t.ulr_number?.toLowerCase().includes(searchUidLower)));

      // Client Name Filter
      const clientName = job.clients?.name?.toLowerCase() || "";
      const clientMatch = searchClient.trim() === "" || clientName.includes(searchClient.toLowerCase().trim());

      // Date Filter (using inward created_at date)
      const inwardDateStr = job.created_at ? new Date(job.created_at).toISOString().split('T')[0] : "";
      const dateMatch = filterDate === "" || inwardDateStr === filterDate;

      // Job Type Filter
      let jobTypeMatch = true;
      if (filterJobType === "dummy") {
        jobTypeMatch = (job.job_entry_tests?.length || 0) === 0;
      } else if (filterJobType === "active") {
        jobTypeMatch = (job.job_entry_tests?.length || 0) > 0;
      }

      return uidMatch && clientMatch && dateMatch && jobTypeMatch;
    });
  }, [allJobs, searchUid, searchClient, filterDate, filterJobType]);

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
          <SlidersHorizontal className="w-5 h-5 text-orange-500" />
          Filter Jobs
        </div>

        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <Input
              label="Search UID"
              placeholder="Search by UID..."
              value={searchUid}
              onChange={(e) => setSearchUid(e.target.value)}
              className="h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-orange-500/20 focus-visible:border-orange-400 hover:border-orange-300 transition-all shadow-sm rounded-xl"
            />
          </div>
          <div className="flex-1 w-full">
            <Input
              label="Client Name"
              placeholder="Search by Client..."
              value={searchClient}
              onChange={(e) => setSearchClient(e.target.value)}
              className="h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-orange-500/20 focus-visible:border-orange-400 hover:border-orange-300 transition-all shadow-sm rounded-xl"
            />
          </div>
          <div className="flex-1 w-full space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
              Date
            </label>
            <PremiumDatePicker
              value={filterDate}
              onChange={(val) => {
                setFilterDate(val);
              }}
              triggerClassName="h-10 w-full bg-slate-50/50 border-slate-200 hover:border-orange-300 transition-all shadow-sm rounded-xl"
            />
          </div>
          <div className="flex-1 w-full space-y-1.5">
            <Dropdown
              label="Job Type"
              options={[
                { label: "All Jobs", value: "all" },
                { label: "Dummy Jobs (0 Tests)", value: "dummy" },
                { label: "Active Jobs (1+ Tests)", value: "active" }
              ]}
              value={filterJobType}
              onChange={(val) => setFilterJobType(val as any)}
            />
          </div>
          <div className="w-full md:w-auto shrink-0 mb-0.5">
            <Button
              variant="outline"
              className="h-10 px-5 border-orange-200 text-orange-600 hover:bg-orange-50 bg-orange-50/50 font-semibold rounded-xl flex items-center gap-2 shadow-sm"
              onClick={() => {
                setSearchUid("");
                setSearchClient("");
                setFilterDate("");
                setFilterJobType("all");
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </Button>
          </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {filteredJobs.map((job) => {
              const client = job.clients;
              const testCount = job.job_entry_tests?.length || 0;
              // Pass the UID string exactly as job-cards/[id] expects
              const groupId = job.uid_label || job.id;
              
              return (
                <div 
                  key={job.id} 
                  className="group relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex flex-col p-4 gap-4 overflow-hidden isolate cursor-pointer"
                  onClick={() => router.push(`/job-cards/${encodeURIComponent(groupId)}`)}
                >
                  {/* Accent Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-white to-orange-50/30 -z-10" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/50 rounded-full blur-3xl -z-10 transition-transform group-hover:scale-150" />

                  {/* Header: Icon, UID, Date */}
                  <div className="flex items-start justify-between relative z-10 w-full">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-all">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-800 text-lg tracking-tight">
                            UID: {job.uid_label || "Missing"}
                          </h3>

                        </div>
                      </div>
                    </div>
                    {/* Top Right Date */}
                    <div className="flex items-center text-slate-500 text-sm gap-1.5 font-medium shrink-0 pt-1">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                      {job.created_at ? new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "-"}
                    </div>
                  </div>

                  {/* Body: Client, Project, Test Count */}
                  <div className="bg-white/60 backdrop-blur-md rounded-2xl p-3 border border-slate-100/60 shadow-sm space-y-2">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Client Name</p>
                        <p className="font-semibold text-slate-800 text-sm leading-snug">{client?.name || "Unknown Client"}</p>
                      </div>
                    </div>
                    {job.project_name && (
                      <div className="flex items-start gap-3 pt-2 border-t border-slate-100">
                        <Tag className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Project Name</p>
                          <p className="font-semibold text-slate-800 text-sm leading-snug">{job.project_name}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer: Test Count & View Button */}
                  <div className="mt-auto pt-2 flex items-center justify-between border-t border-slate-100/60">
                     <div className="flex items-center gap-2">
                       <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                         <FlaskConical className="w-3.5 h-3.5" />
                         {testCount} Test{testCount !== 1 ? 's' : ''}
                       </div>
                     </div>
                     <Button 
                       variant="ghost" 
                       className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-bold pr-2 pl-4"
                     >
                       View Details <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
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
