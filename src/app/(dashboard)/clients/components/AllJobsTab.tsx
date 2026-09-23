"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Edit, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";
import { getAllJobEntryTestsAction } from "@/actions/job-entry.actions";
import { Database } from "@/types/database";

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

  const [searchUid, setSearchUid] = useState("");
  const [searchClient, setSearchClient] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/60">
                <tr>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">UID</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Client</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Material</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Method</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Grade</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Dates</th>
                  <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJobs.map((test) => {
                  const client = test.job_entries?.clients;
                  return (
                    <tr key={test.id} className="hover:bg-orange-50/30 transition-colors group">
                      <td className="px-5 py-4">
                        <span className="font-bold text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-md border border-orange-100">
                          {test.uid}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800">{client?.name || "Unknown Client"}</div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                          {new Date(test.job_entries?.created_at || "").toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-700">{test.material_description || "-"}</td>
                      <td className="px-5 py-4 text-slate-600">{test.test_method || "-"}</td>
                      <td className="px-5 py-4 text-slate-600 font-medium">
                        {test.grade ? <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs">{test.grade}</span> : "-"}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5"><span className="w-4 font-semibold text-slate-400">C:</span> {test.date_of_casting ? new Date(test.date_of_casting).toLocaleDateString() : "-"}</div>
                          <div className="flex items-center gap-1.5"><span className="w-4 font-semibold text-slate-400">R:</span> {test.date_of_receiving ? new Date(test.date_of_receiving).toLocaleDateString() : "-"}</div>
                          <div className="flex items-center gap-1.5"><span className="w-4 font-semibold text-slate-400">T:</span> {test.date_of_testing ? new Date(test.date_of_testing).toLocaleDateString() : "-"}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (client) {
                              // Reconstruct full client object (we only fetched a few fields, but the Wizard handles partials well)
                              const mockClient = { ...client } as any;
                              onEditClick(test, mockClient);
                            }
                          }}
                          className="h-8 text-slate-400 hover:text-orange-600 hover:bg-orange-50 opacity-0 group-hover:opacity-100 transition-all duration-200"
                        >
                          <Edit className="h-4 w-4 mr-1.5" /> Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
