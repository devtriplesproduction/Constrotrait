import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobEntryService } from "@/services/job-entry.service";
import { Briefcase, Activity, Calendar, ClipboardList, User, MapPin, Send, UserCircle, Phone, Mail, Info, Target, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { JobStageStepper } from "@/components/ui/JobStageStepper";
import { JobStage } from "@/config/jobTransitions";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { EditTestModal } from "../components/EditTestModal";

export default async function JobCardDetailsPage(props: {
  params: Promise<{ groupId: string }>;
}) {
  const params = await props.params;
  const decodedGroupId = decodeURIComponent(params.groupId);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all tests and filter
  const allTests = await JobEntryService.getAllJobEntryTests();
  const jobGroup = allTests.filter((t: any) => (t.uid_label || t.id) === decodedGroupId);

  if (!jobGroup || jobGroup.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Job Card Not Found</h2>
          <p className="text-slate-500 mb-6">The job card you are looking for does not exist or you do not have permission to view it.</p>
          <Link href="/clients" className="text-orange-500 hover:underline font-bold">
            &larr; Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  const primaryTest = jobGroup[0];
  const client = primaryTest.job_entries?.clients;

  // Extract all unique dates
  const inwardDates = jobGroup
    .map((t: any) => t.job_entries?.inward_on || t.date_of_receiving)
    .filter(Boolean)
    .sort();
    
  const testingDates = jobGroup
    .map((t: any) => t.date_of_testing)
    .filter(Boolean)
    .sort();
    
  const castingDates = jobGroup
    .map((t: any) => t.additional_details_values?.['Casting date'] || 
           t.additional_details_values?.['Date of Casting'] || 
           t.additional_details_values?.['Casting Date'])
    .filter(Boolean)
    .sort();

  const getDisplayDate = (dates: string[]) => {
    if (!dates || dates.length === 0) return "-";
    const uniqueDates = Array.from(new Set(dates));
    if (uniqueDates.length === 1) {
      return format(new Date(uniqueDates[0]), "dd MMM yyyy");
    }
    return `${format(new Date(uniqueDates[0]), "dd MMM")} - ${format(new Date(uniqueDates[uniqueDates.length - 1]), "dd MMM yyyy")}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-screen-xl mx-auto min-h-screen bg-[#FFF9F5] flex flex-col gap-4">
      
      {/* Back Navigation */}
      <div>
        <Link href="/job-cards" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-orange-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Job Cards
        </Link>
      </div>

      {/* 1. Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex items-center justify-between p-6 pl-0 relative">
        <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-orange-500" />
        <div className="flex items-center gap-5 pl-8">
          <div className="w-14 h-14 rounded-full bg-orange-50 border-[2px] border-orange-300 flex items-center justify-center shrink-0">
             <Briefcase className="w-6 h-6 text-orange-500" strokeWidth={2} />
          </div>
          <div>
             <div className="flex items-center gap-3">
               <h1 className="text-[28px] font-bold text-slate-900 tracking-tight leading-none">Job Card {decodedGroupId}</h1>
               <div className="bg-orange-100 text-orange-700 px-3.5 py-1 rounded-full text-xs font-bold shadow-sm">
                 Pending
               </div>
             </div>
             <p className="text-slate-500 mt-2 flex items-center gap-2 font-medium text-sm">
               {client?.name || "Unknown Client"} &middot; {jobGroup.length} tests
             </p>
          </div>
        </div>
        
        <div className="hidden lg:flex items-center gap-3">
          <div className="bg-[#F8F9FA] rounded-xl p-4 flex items-center gap-4">
            <Calendar className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-[11px] text-slate-400 mb-0.5">Received</p>
              <p className="text-sm font-bold text-slate-700">
                {getDisplayDate(inwardDates)}
              </p>
            </div>
          </div>
          <div className="bg-[#F8F9FA] rounded-xl p-4 flex items-center gap-4">
            <Calendar className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-[11px] text-slate-400 mb-0.5">Cast</p>
              <p className="text-sm font-bold text-slate-700">
                {getDisplayDate(castingDates)}
              </p>
            </div>
          </div>
          <div className="bg-[#F8F9FA] rounded-xl p-4 flex items-center gap-4">
            <Calendar className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-[11px] text-slate-400 mb-0.5">Test</p>
              <p className="text-sm font-bold text-slate-700">
                {getDisplayDate(testingDates)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Client Details (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-orange-500" strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5 font-medium">Customer</p>
            <p className="text-base font-bold text-slate-900">{client?.name || "-"}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5 text-orange-500" strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5 font-medium">Phone</p>
            <p className="text-base font-bold text-slate-900">{client?.mobile || "-"}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-orange-500" strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5 font-medium">Email</p>
            <p className="text-base font-bold text-slate-900">{client?.email || "-"}</p>
          </div>
        </div>
      </div>

      {/* 3. Tests */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {jobGroup.map((test: any, index: number) => {
          const latestAssignment = test.job_assignments && test.job_assignments.length > 0 ? test.job_assignments[0] : null;
          const status = (latestAssignment?.status as JobStage | 'rejected') || "pending";
          
          let dayText = test.testing_day || test.testing_age || '-';
          if (dayText !== '-' && !dayText.toString().toLowerCase().includes('day')) {
             dayText = `${dayText} Day${Number(dayText) > 1 ? 's' : ''}`;
          }

          return (
            <div key={test.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row relative">
              
              {/* Right absolute badge */}
              <div className="absolute top-5 right-5">
                <div className="bg-orange-500 text-white px-3.5 py-1 rounded-full font-bold text-[12px] shadow-sm">
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </div>
              </div>
              
              <div className="sm:w-[260px] md:w-[280px] flex-shrink-0 sm:border-r border-slate-200 sm:pr-6 flex flex-col">
                <div className="flex items-center justify-between mb-1.5 pr-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <span className="text-[13px] font-bold text-orange-500 uppercase tracking-widest">TEST {index + 1}</span>
                  </div>
                  <EditTestModal client={client} test={test} />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 mb-5">{test.material_description || "XX"}</h3>
                
                <div className="space-y-2.5 mb-5">
                  <div className="flex items-center">
                    <div className="w-8 flex justify-center shrink-0"><Info className="w-[16px] h-[16px] text-orange-600/80" /></div>
                    <span className="w-24 text-[11px] font-bold text-slate-500 uppercase tracking-widest">METHOD</span>
                    <span className="text-[13px] font-medium text-slate-900">{test.test_method || '-'}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-8 flex justify-center shrink-0"><Target className="w-[16px] h-[16px] text-orange-600/80" /></div>
                    <span className="w-24 text-[11px] font-bold text-slate-500 uppercase tracking-widest">PARAMETERS</span>
                    <span className="text-[13px] font-medium text-slate-900 truncate" title={test.test_master?.component_parameter || '-'}>{test.test_master?.component_parameter || '-'}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-8 flex justify-center shrink-0"><User className="w-[16px] h-[16px] text-orange-600/80" /></div>
                    <span className="w-24 text-[11px] font-bold text-slate-500 uppercase tracking-widest">SAMPLES</span>
                    <span className="text-[13px] font-medium text-slate-900">{test.sample_quantity || '-'}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-8 flex justify-center shrink-0"><Clock className="w-[16px] h-[16px] text-orange-600/80" /></div>
                    <span className="w-24 text-[11px] font-bold text-slate-500 uppercase tracking-widest">DAY</span>
                    <span className="text-[13px] font-medium text-slate-900">{dayText}</span>
                  </div>
                </div>
                
                {/* Grade Block */}
                <div className="bg-orange-50/50 rounded-xl p-3 flex items-center gap-3 w-fit pr-8 border border-orange-100/50">
                   <div className="w-8 h-8 rounded-full border-[1.5px] border-orange-300 flex items-center justify-center shrink-0">
                     <Briefcase className="w-4 h-4 text-orange-400" /> {/* Ribbon icon proxy */}
                   </div>
                   <div>
                     <p className="text-[9px] font-bold text-orange-500 uppercase tracking-widest mb-0.5">GRADE</p>
                     <p className="text-xl font-bold text-orange-500 leading-none">{test.grade || (test.additional_details_values as any)?.Grade || (test.additional_details_values as any)?.grade || "-"}</p>
                   </div>
                </div>
              </div>
              
              {/* Right Column: Workflow */}
              <div className="flex-1 sm:pl-6 pt-6 sm:pt-0">
                <JobStageStepper currentStage={status} isRejected={status === 'rejected'} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
