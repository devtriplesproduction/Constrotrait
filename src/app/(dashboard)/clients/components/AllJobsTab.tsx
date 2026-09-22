"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Edit, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" /> Filter Jobs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">UID</label>
            <Input
              placeholder="Search by UID..."
              value={searchUid}
              onChange={(e) => setSearchUid(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Client Name</label>
            <Input
              placeholder="Search by Client..."
              value={searchClient}
              onChange={(e) => setSearchClient(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Exact Date</label>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                if (e.target.value) setFilterMonth(""); // Reset month if date is chosen
              }}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Month</label>
            <Input
              type="month"
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value);
                if (e.target.value) setFilterDate(""); // Reset date if month is chosen
              }}
              className="h-9"
            />
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-600">UID</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Client</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Material</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Method</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Grade</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Dates</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((test) => {
                  const client = test.job_entries?.clients;
                  return (
                    <tr key={test.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-primary">
                        {test.uid}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {client?.name || "Unknown Client"}
                        <div className="text-xs text-muted-foreground font-normal">
                          {new Date(test.job_entries?.created_at || "").toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{test.material_description || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{test.test_method || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{test.grade || "-"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 space-y-0.5">
                        <div><span className="font-medium">C:</span> {test.date_of_casting ? new Date(test.date_of_casting).toLocaleDateString() : "-"}</div>
                        <div><span className="font-medium">R:</span> {test.date_of_receiving ? new Date(test.date_of_receiving).toLocaleDateString() : "-"}</div>
                        <div><span className="font-medium">T:</span> {test.date_of_testing ? new Date(test.date_of_testing).toLocaleDateString() : "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (client) {
                              // Reconstruct full client object (we only fetched a few fields, but the Wizard handles partials well)
                              const mockClient = { ...client } as any;
                              onEditClick(test, mockClient);
                            }
                          }}
                          className="h-8 shadow-sm"
                        >
                          <Edit className="h-4 w-4 mr-1.5 text-primary" /> Edit
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
