"use client";

import React, { useState, useEffect } from "react";
import { X, User, Briefcase, CheckCircle, Mail, Phone, Building, ChevronDown, ChevronUp, ChevronRight, ArrowLeft, FlaskConical, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database";
import { getJobEntriesByClientIdAction } from "@/actions/job-entry.actions";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useRouter } from "next/navigation";
import { ClientWizard } from "@/components/modules/clients/ClientWizard";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type JobEntry = Database["public"]["Tables"]["job_entries"]["Row"];
type JobEntryTest = Database["public"]["Tables"]["job_entry_tests"]["Row"];

interface JobEntryWithTests extends JobEntry {
  job_entry_tests: JobEntryTest[];
}

function ProjectJobsList({
  jobEntries,
  isCompleted,
  onEditClick,
  client,
}: {
  jobEntries: JobEntryWithTests[];
  isCompleted: boolean;
  onEditClick: (test: JobEntryTest & { job_entries?: any }, client: Client) => void;
  client: Client;
}) {
  const [view, setView] = useState<"projects" | "jobs" | "tests">("projects");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<(JobEntryWithTests & { matchingTests: JobEntryTest[] }) | null>(null);

  const filteredJobs = jobEntries
    .map((job) => {
      const matchingTests = (job.job_entry_tests || []).filter((t) =>
        isCompleted ? t.ulr_status === "generated" : t.ulr_status !== "generated"
      );
      return { ...job, matchingTests };
    })
    .filter((job) => {
      if (isCompleted) {
        return job.matchingTests.length > 0;
      } else {
        return job.matchingTests.length > 0 || (job.job_entry_tests && job.job_entry_tests.length === 0);
      }
    });

  if (filteredJobs.length === 0) {
    return (
      <div className="text-center p-8 text-slate-500 border border-dashed rounded-xl bg-slate-50">
        No {isCompleted ? "completed" : "current"} projects.
      </div>
    );
  }

  const jobsByProject = filteredJobs.reduce((acc, job) => {
    const projName = job.project_name || "Unnamed project";
    if (!acc[projName]) acc[projName] = [];
    acc[projName].push(job);
    return acc;
  }, {} as Record<string, (JobEntryWithTests & { matchingTests: JobEntryTest[] })[]>);

  const projects = Object.keys(jobsByProject);

  if (view === "projects") {
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300 pr-3 pb-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {projects.map(projName => (
          <div 
            key={projName}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4 cursor-pointer hover:border-orange-300 hover:shadow-md transition-all flex justify-between items-center group"
            onClick={() => { setSelectedProject(projName); setView("jobs"); }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-100 group-hover:bg-orange-100 transition-colors">
                <Briefcase className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-base m-0">{projName}</h4>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  {jobsByProject[projName].length} Job{jobsByProject[projName].length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-orange-50 transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
            </div>
          </div>
        ))}
        </div>
      </div>
    );
  }

  if (view === "jobs" && selectedProject) {
    const projectJobs = jobsByProject[selectedProject] || [];
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <button 
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-600 transition-colors bg-slate-50 hover:bg-orange-50 px-3 py-1.5 rounded-lg border border-slate-100"
            onClick={() => { setSelectedProject(null); setView("projects"); }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Projects
          </button>
          <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-orange-500" /> {selectedProject}
          </div>
        </div>
        
        <div className="pr-3 pb-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {projectJobs.map(job => (
              <div 
                key={job.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4 cursor-pointer hover:border-orange-300 hover:shadow-md transition-all flex justify-between items-center group"
                onClick={() => { setSelectedJob(job); setView("tests"); }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-100 group-hover:bg-orange-100 transition-colors">
                    <Briefcase className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base m-0">Job UID: {job.uid_label || String(job.uid || "") || job.job_entry_tests?.find(t => t.uid_label)?.uid_label || "Missing"}</h4>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      {job.matchingTests.length} Test{job.matchingTests.length !== 1 ? 's' : ''} • Created: {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === "tests" && selectedJob) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <button 
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-600 transition-colors bg-slate-50 hover:bg-orange-50 px-3 py-1.5 rounded-lg border border-slate-100"
            onClick={() => { setSelectedJob(null); setView("jobs"); }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Jobs
          </button>
          <div className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            Job: {selectedJob.uid_label || String(selectedJob.uid || "") || selectedJob.job_entry_tests?.find(t => t.uid_label)?.uid_label || "UID missing"}
          </div>
        </div>

        <div className="pr-3 pb-2">
          <div className="space-y-3">
          {(!selectedJob.job_entry_tests || selectedJob.job_entry_tests.length === 0) ? (
            <div className="text-center p-8 text-slate-500 border border-dashed rounded-xl bg-slate-50">
              This job card does not have any tests assigned yet.
            </div>
          ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {selectedJob.job_entry_tests?.map(test => {
              return (
                <div 
                  key={test.id}
                  className="group relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row p-5 gap-5 overflow-hidden isolate"
                >
                  <div className="absolute top-0 right-0 w-[140px] h-[130px] bg-[#FFF8F3] rounded-bl-[120px] pointer-events-none -z-10 hidden sm:block" />

                  <div className="flex-1 flex flex-col gap-5 relative z-10">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 shrink-0 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                          <FlaskConical className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg leading-tight">
                            UID: {test.uid_label || selectedJob.uid_label || String(selectedJob.uid || "") || "Missing"}
                          </h3>
                          <p className="font-bold text-orange-500 text-sm mt-1">
                            {test.ulr_status === 'generated' ? `ULR: ${test.ulr_number}` : `ULR Pending`}
                          </p>
                        </div>
                      </div>

                      <div className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border border-orange-100/50">
                        <FlaskConical className="w-3.5 h-3.5 shrink-0" /> Test
                      </div>
                    </div>

                    <div className="bg-slate-50/80 rounded-2xl p-4 flex gap-4 border border-slate-100/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Material</p>
                        <p className="text-[14px] font-semibold text-slate-700 truncate" title={test.material_description || "-"}>{test.material_description || "-"}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Method</p>
                        <p className="text-[14px] font-semibold text-slate-700 truncate" title={test.test_method || "-"}>{test.test_method || "-"}</p>
                      </div>
                      <div className="shrink-0 text-center">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Grade</p>
                        <div className="bg-slate-200/50 px-2.5 py-0.5 rounded-md text-[13px] font-bold text-slate-700 inline-block border border-slate-200/60">
                          {test.grade || (test.additional_details_values as any)?.Grade || (test.additional_details_values as any)?.grade || "-"}
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Key Dates</p>
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <div className="text-[13px] font-medium text-slate-600"><span className="font-bold text-slate-800">Cast:</span> {test.date_of_casting ? new Date(test.date_of_casting).toLocaleDateString() : "-"}</div>
                        <div className="text-[13px] font-medium text-slate-600"><span className="font-bold text-slate-800">Recv:</span> {test.date_of_receiving ? new Date(test.date_of_receiving).toLocaleDateString() : "-"}</div>
                        <div className="text-[13px] font-medium text-slate-600"><span className="font-bold text-slate-800">Test:</span> {test.date_of_testing ? new Date(test.date_of_testing).toLocaleDateString() : "-"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="sm:w-[140px] shrink-0 sm:border-l sm:border-slate-100 sm:pl-5 flex flex-row sm:flex-col justify-center gap-3 relative z-10 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <Button
                      className="flex-1 sm:flex-none w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md shadow-orange-500/20 font-bold h-11"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditClick({ ...test, job_entries: selectedJob }, client);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" /> Edit Details
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function ClientDetailsPageContent({
  client,
}: {
  client: Client;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [jobEntries, setJobEntries] = useState<JobEntryWithTests[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [editingTest, setEditingTest] = useState<any | null>(null);

  useEffect(() => {
    const loadJobs = async () => {
      setIsLoadingJobs(true);
      try {
        const res = await getJobEntriesByClientIdAction(client.id);
        if (res.success && res.data) {
          setJobEntries(res.data as JobEntryWithTests[]);
        }
      } catch (error) {
        console.error("Failed to load job entries", error);
      } finally {
        setIsLoadingJobs(false);
      }
    };
    loadJobs();
  }, [client.id]);

  const handleEditClick = (test: JobEntryTest & { job_entries?: any }, client: Client) => {
    setEditingTest({ test, client });
  };

  const initials = client.name
    ? client.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="space-y-6">
      <div className="w-full shadow-sm rounded-2xl overflow-hidden bg-white border border-slate-200 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 border border-orange-300/50 flex items-center justify-center shadow-sm">
              <span className="text-orange-700 font-bold text-lg tracking-wider">
                {initials}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{client.name}</h2>
              <p className="text-sm text-slate-500 font-medium">Client Details & Projects</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => router.push('/clients')}
            className="rounded-full shadow-sm bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Clients
          </Button>
        </div>

        <div className="px-6 py-5 bg-slate-50/30">
          <div className="flex items-center justify-center mb-5">
            {[1, 2, 3].map((s, idx) => (
              <React.Fragment key={s}>
                <div
                  className={clsx(
                    "flex flex-col items-center gap-2 cursor-pointer transition-all duration-300",
                    step === s ? "opacity-100 scale-110" : "opacity-50 hover:opacity-80"
                  )}
                  onClick={() => setStep(s)}
                >
                  <div
                    className={clsx(
                      "w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm transition-colors duration-300",
                      step === s
                        ? "bg-orange-500 text-white border-2 border-orange-200 ring-4 ring-orange-50"
                        : step > s
                        ? "bg-orange-100 text-orange-600 border-2 border-orange-200"
                        : "bg-white text-slate-400 border-2 border-slate-200"
                    )}
                  >
                    {s === 1 ? (
                      <User className="w-3.5 h-3.5" />
                    ) : s === 2 ? (
                      <Briefcase className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span
                    className={clsx(
                      "text-[11px] font-bold uppercase tracking-wider",
                      step === s ? "text-orange-600" : "text-slate-400"
                    )}
                  >
                    {s === 1 ? "Details" : s === 2 ? "Current Projects" : "Completed"}
                  </span>
                </div>
                {idx < 2 && (
                  <div
                    className={clsx(
                      "w-12 sm:w-20 h-0.5 mx-1 rounded-full transition-colors duration-300",
                      step > s ? "bg-orange-300" : "bg-slate-200"
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col">
            {step === 1 && (
              <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Building className="w-5 h-5 text-orange-500" /> Client Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <User className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Client Name</p>
                          <p className="text-sm font-semibold text-slate-700">{client.name || "-"}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <Mail className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Email</p>
                          <p className="text-sm font-semibold text-slate-700">{client.email || "-"}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <Phone className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Phone</p>
                          <p className="text-sm font-semibold text-slate-700">{client.mobile || "-"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <Building className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Company</p>
                          <p className="text-sm font-semibold text-slate-700">{client.company_name || "-"}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <Briefcase className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Project / Site Name</p>
                          <p className="text-sm font-semibold text-slate-700">
                            {client.project_name || client.site_name || "Unnamed project"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-full border-t border-slate-100 pt-4 mt-2">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">Address</p>
                      <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {client.address || "No address provided."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in slide-in-from-right-4 fade-in duration-300 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 shrink-0 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-orange-500" /> Current Projects
                </h3>
                {isLoadingJobs ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  </div>
                ) : (
                  <div>
                    <ProjectJobsList
                      jobEntries={jobEntries}
                      isCompleted={false}
                      onEditClick={handleEditClick}
                      client={client}
                    />
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="animate-in slide-in-from-right-4 fade-in duration-300 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 shrink-0 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" /> Completed Projects
                </h3>
                {isLoadingJobs ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  </div>
                ) : (
                  <div>
                    <ProjectJobsList
                      jobEntries={jobEntries}
                      isCompleted={true}
                      onEditClick={handleEditClick}
                      client={client}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
            disabled={step === 1}
            className="text-slate-600"
          >
            Previous
          </Button>
          <div className="flex gap-2">
            {step < 3 ? (
              <Button
                onClick={() => setStep((prev) => Math.min(3, prev + 1))}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Next
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      
      {editingTest && (
        <ClientWizard
          mode="edit"
          initialData={{
            client: editingTest.client,
            jobEntryTest: editingTest.test,
          }}
          onClose={() => setEditingTest(null)}
          onSuccess={() => {
            setEditingTest(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
