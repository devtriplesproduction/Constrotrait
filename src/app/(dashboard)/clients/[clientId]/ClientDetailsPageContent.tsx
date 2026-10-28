"use client";

import React, { useState, useEffect } from "react";
import { X, User, Briefcase, CheckCircle, Mail, Phone, Building, ChevronDown, ChevronUp, ChevronRight, ArrowLeft, FlaskConical, Edit, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database";
import { getJobEntriesByClientIdAction } from "@/actions/job-entry.actions";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useRouter } from "next/navigation";
import { ClientWizard } from "@/components/modules/clients/ClientWizard";
import { compareJobCardsByUidRecentFirst, isNablJob } from "@/utils/uid-sort";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type JobEntry = Database["public"]["Tables"]["job_entries"]["Row"];
type JobEntryTest = Database["public"]["Tables"]["job_entry_tests"]["Row"] & {
  test_master?: Database["public"]["Tables"]["test_master"]["Row"] | null;
};

interface JobEntryWithTests extends JobEntry {
  job_entry_tests: JobEntryTest[];
}

function UnifiedJobCard({
  job,
  client,
  onEditClick,
  router,
}: {
  job: JobEntryWithTests & { matchingTests?: JobEntryTest[] };
  client: Client;
  onEditClick: (test: JobEntryTest & { job_entries?: any }, client: Client) => void;
  router: any;
}) {
  const tests = job.job_entry_tests || [];
  const totalTests = tests.length;
  const isNabl = isNablJob(job);
  
  const primaryMaterial =
    tests[0]?.material_description && tests[0].material_description.trim() !== "-"
      ? tests[0].material_description
      : (tests[0]?.test_master?.material_product || tests[0]?.material_id || "-");
      
  const primaryGrade =
    tests[0]?.grade ||
    (tests[0]?.additional_details_values as any)?.Grade ||
    (tests[0]?.additional_details_values as any)?.grade ||
    "-";

  const castDate = tests[0]?.date_of_casting;
  const recvDate = tests[0]?.date_of_receiving;
  const testDate = tests[0]?.date_of_testing;

  const gid = job.uid_label || String(job.uid || "") || tests.find(t => t.uid_label)?.uid_label || job.id;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden isolate flex flex-col">
      {/* Header */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-orange-50/50 via-white to-slate-50/40 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25 shrink-0">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-bold text-slate-800 text-xl tracking-tight">
                Job UID: {job.uid_label || String(job.uid || "") || "Missing"}
              </h3>
              {isNabl ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  NABL
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                  Non-NABL
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold text-xs">
                {totalTests} Test{totalTests !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Project: <strong className="text-slate-700">{job.project_name || "Project"}</strong> • Created: {new Date(job.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-sm flex items-center gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              const firstTest = tests[0];
              onEditClick(firstTest ? { ...firstTest, job_entries: job } : ({ job_entries: job } as any), client);
            }}
          >
            <Edit className="w-3.5 h-3.5" /> Edit Inward
          </Button>
          <Button
            variant="outline"
            className="border-orange-200 text-orange-600 hover:bg-orange-50 font-bold h-9 px-4 rounded-xl text-xs flex items-center gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/job-cards/${encodeURIComponent(gid)}`);
            }}
          >
            <Receipt className="w-3.5 h-3.5" /> View Inward
          </Button>
        </div>
      </div>

      {/* Sample Specification Summary */}
      <div className="p-4 sm:px-6 sm:py-4 bg-slate-50/70 border-b border-slate-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Material / Sample</p>
            <p className="text-sm font-semibold text-slate-800 truncate" title={primaryMaterial}>{primaryMaterial}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Grade</p>
            <div className="bg-white px-2.5 py-0.5 rounded-md text-xs font-bold text-slate-700 inline-block border border-slate-200/80 shadow-2xs">
              {primaryGrade}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Receiving Date</p>
            <p className="text-sm font-medium text-slate-700">{recvDate ? new Date(recvDate).toLocaleDateString() : "-"}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Testing Date</p>
            <p className="text-sm font-medium text-slate-700">{testDate ? new Date(testDate).toLocaleDateString() : "-"}</p>
          </div>
        </div>
      </div>

      {/* All Tests in One Section */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3.5">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-orange-500" />
            All Tests Included in this Job ({totalTests})
          </h4>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            All parameters tested under Job UID: {job.uid_label || job.uid}
          </span>
        </div>

        {totalTests === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No test parameters assigned to this job card yet.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/90 text-[11px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">Test Parameter</th>
                    <th className="py-2.5 px-4">Testing Method</th>
                    <th className="py-2.5 px-4">Discipline</th>
                    <th className="py-2.5 px-4">ULR Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {tests.map((test, index) => {
                    const testName =
                      test.test_master?.component_parameter ||
                      test.test_master?.specific_test ||
                      (test as any)?.test_name ||
                      `Test Parameter ${index + 1}`;
                    const method = test.test_method || test.test_master?.test_method || "-";
                    const discipline = test.test_master?.discipline_group || test.test_master?.specific_test || "Physical";
                    const isGenerated = test.ulr_status === "generated";

                    return (
                      <tr key={test.id} className="hover:bg-orange-50/30 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-slate-400 text-xs">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                            <span>{testName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-600 text-xs">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 font-mono">
                            {method}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs font-medium">
                          {discipline}
                        </td>
                        <td className="py-3 px-4">
                          {isGenerated ? (
                            <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              {test.ulr_number}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
                              ULR Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
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
  const router = useRouter();
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
    const projectJobs = (jobsByProject[selectedProject] || []).slice().sort(compareJobCardsByUidRecentFirst);
    return (
      <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col">
        <div className="flex items-center justify-between mb-1 shrink-0">
          <button 
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-600 transition-colors bg-slate-50 hover:bg-orange-50 px-3 py-1.5 rounded-lg border border-slate-100"
            onClick={() => { setSelectedProject(null); setView("projects"); }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Projects
          </button>
          <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-orange-500" /> {selectedProject}
            <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              {projectJobs.length} Job{projectJobs.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        <div className="space-y-6 pr-3 pb-2">
          {projectJobs.map(job => (
            <UnifiedJobCard
              key={job.id}
              job={job}
              client={client}
              onEditClick={onEditClick}
              router={router}
            />
          ))}
        </div>
      </div>
    );
  }

  if (view === "tests" && selectedJob) {
    return (
      <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col">
        <div className="flex items-center justify-between mb-1 shrink-0">
          <button 
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-600 transition-colors bg-slate-50 hover:bg-orange-50 px-3 py-1.5 rounded-lg border border-slate-100"
            onClick={() => { setSelectedJob(null); setView("jobs"); }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Jobs
          </button>
          <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-orange-500" /> {selectedProject || selectedJob.project_name || "Project"}
          </div>
        </div>

        <div className="pr-3 pb-2">
          <UnifiedJobCard
            job={selectedJob}
            client={client}
            onEditClick={onEditClick}
            router={router}
          />
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

  useEffect(() => {
    loadJobs();
  }, [client.id]);

  const handleEditClick = (test: JobEntryTest & { job_entries?: any }, client: Client) => {
    const job = test.job_entries || jobEntries.find(j => j.id === test.job_entry_id);
    const allTests = (job?.job_entry_tests && job.job_entry_tests.length > 0)
      ? job.job_entry_tests
      : [test];
    setEditingTest({
      test,
      allTests,
      jobEntry: job,
      client,
    });
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setEditingTest(null)}
          />

          <div className="relative z-10 w-full max-w-7xl mx-auto shadow-2xl rounded-2xl overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-4 right-4 z-[60]">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingTest(null)}
                className="h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-red-50 hover:text-red-600 text-slate-500 shadow-sm"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>

            <ClientWizard
              mode="edit"
              initialData={{
                client: editingTest.client,
                jobEntry: editingTest.jobEntry,
                jobEntryTest: editingTest.test,
                jobEntryTests: editingTest.allTests,
              }}
              onClose={() => setEditingTest(null)}
              onSuccess={() => {
                setEditingTest(null);
                loadJobs();
                router.refresh();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
