"use client";

import React, { useState, useEffect } from "react";
import { X, User, Briefcase, CheckCircle, MapPin, Mail, Phone, FileText, Calendar, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database";
import { getJobEntriesByClientIdAction } from "@/actions/job-entry.actions";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type JobEntry = Database["public"]["Tables"]["job_entries"]["Row"];
type JobEntryTest = Database["public"]["Tables"]["job_entry_tests"]["Row"];

interface JobEntryWithTests extends JobEntry {
  job_entry_tests: JobEntryTest[];
}

export default function ClientDetailsWizard({
  client,
  onClose,
}: {
  client: Client;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [jobEntries, setJobEntries] = useState<JobEntryWithTests[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

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

  const allTests = jobEntries.flatMap((job) => job.job_entry_tests || []);
  const workingProjects = allTests.filter((t) => t.ulr_status !== "generated");
  const completedProjects = allTests.filter((t) => t.ulr_status === "generated");

  const initials = client.name
    ? client.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : "?";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-4xl mx-auto shadow-2xl rounded-2xl overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
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
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8 bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {/* Stepper */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((s, idx) => (
              <React.Fragment key={s}>
                <div 
                  className={clsx(
                    "flex flex-col items-center gap-2 cursor-pointer transition-all duration-300",
                    step === s ? "opacity-100 scale-110" : "opacity-50 hover:opacity-80"
                  )}
                  onClick={() => setStep(s)}
                >
                  <div className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm transition-colors duration-300",
                    step === s 
                      ? "bg-orange-500 text-white border-2 border-orange-200 ring-4 ring-orange-50"
                      : step > s 
                        ? "bg-orange-100 text-orange-600 border-2 border-orange-200" 
                        : "bg-white text-slate-400 border-2 border-slate-200"
                  )}>
                    {s === 1 ? <User className="w-4 h-4" /> : s === 2 ? <Briefcase className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </div>
                  <span className={clsx(
                    "text-xs font-bold uppercase tracking-wider",
                    step === s ? "text-orange-600" : "text-slate-400"
                  )}>
                    {s === 1 ? "Details" : s === 2 ? "Working" : "Completed"}
                  </span>
                </div>
                {idx < 2 && (
                  <div className={clsx(
                    "w-16 sm:w-24 h-0.5 mx-2 rounded-full transition-colors duration-300",
                    step > s ? "bg-orange-300" : "bg-slate-200"
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[300px]">
            {step === 1 && (
              <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-6">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Building className="w-5 h-5 text-orange-500" /> Client Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
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
                        <MapPin className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Address</p>
                        <p className="text-sm font-semibold text-slate-700">{client.address || "-"}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <FileText className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">GST Number</p>
                        <p className="text-sm font-semibold text-slate-700">{client.gst_no || "-"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-orange-500" /> Current Working Projects ({workingProjects.length})
                </h3>
                {isLoadingJobs ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
                ) : workingProjects.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 border border-dashed rounded-xl bg-slate-50">No working projects.</div>
                ) : (
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    {workingProjects.map(test => (
                      <div key={test.id} className="relative bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-3 xl:gap-4">
                            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                              <Briefcase className="w-6 h-6 text-white" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-base font-bold text-slate-800 truncate">{test.material_description || "Unknown Material"}</h4>
                              <p className="text-sm font-semibold text-orange-500 truncate">{test.test_method || "-"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 rounded-full border border-orange-100 shrink-0 ml-2">
                            <User className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-xs font-bold text-orange-600">Pending</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 flex flex-wrap gap-x-8 gap-y-4 mb-4 border border-slate-100">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Testing Date</p>
                            <p className="text-sm font-bold text-slate-800">{test.date_of_testing ? new Date(test.date_of_testing).toLocaleDateString() : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">UID Label</p>
                            <div className="bg-slate-200/50 px-3 py-0.5 rounded-lg border border-slate-200/50">
                              <p className="text-sm font-bold text-slate-800">{test.uid_label || "N/A"}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-end mt-auto gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Location</p>
                            <p className="text-sm text-slate-600 font-medium leading-tight line-clamp-2">
                              {test.material_details_location || "Location not provided."}
                            </p>
                          </div>
                          <Button variant="default" className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-sm whitespace-nowrap px-4 h-9">
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" /> Completed Projects ({completedProjects.length})
                </h3>
                {isLoadingJobs ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
                ) : completedProjects.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 border border-dashed rounded-xl bg-slate-50">No completed projects.</div>
                ) : (
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    {completedProjects.map(test => (
                      <div key={test.id} className="relative bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-3 xl:gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                              <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-base font-bold text-slate-800 truncate">{test.material_description || "Unknown Material"}</h4>
                              <p className="text-sm font-semibold text-emerald-600 truncate">{test.test_method || "-"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 shrink-0 ml-2">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-xs font-bold text-emerald-600">Completed</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 flex flex-wrap gap-x-8 gap-y-4 mb-4 border border-slate-100">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Testing Date</p>
                            <p className="text-sm font-bold text-slate-800">{test.date_of_testing ? new Date(test.date_of_testing).toLocaleDateString() : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ULR Number</p>
                            <div className="bg-slate-200/50 px-3 py-0.5 rounded-lg border border-slate-200/50">
                              <p className="text-sm font-bold text-slate-800">{test.ulr_number || "N/A"}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-end mt-auto gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Location</p>
                            <p className="text-sm text-slate-600 font-medium leading-tight line-clamp-2">
                              {test.material_details_location || "Location not provided."}
                            </p>
                          </div>
                          <Button variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-sm whitespace-nowrap px-4 h-9">
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep(prev => Math.max(1, prev - 1))}
            disabled={step === 1}
            className="text-slate-600"
          >
            Previous
          </Button>
          <div className="flex gap-2">
            {step < 3 ? (
              <Button onClick={() => setStep(prev => Math.min(3, prev + 1))} className="bg-orange-500 hover:bg-orange-600 text-white">
                Next
              </Button>
            ) : (
              <Button onClick={onClose} className="bg-orange-500 hover:bg-orange-600 text-white">
                Close Wizard
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
