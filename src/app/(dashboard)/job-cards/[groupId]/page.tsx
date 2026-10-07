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
import { PageHeader } from "@/components/modules/PageHeader";
import { TestCard } from "../components/TestCard";

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
  const jobGroup = allTests
    .filter((t: any) => (t.uid_label || t.id) === decodedGroupId)
    .sort((a: any, b: any) => {
      const dateA = a.date_of_testing ? new Date(a.date_of_testing).getTime() : Infinity;
      const dateB = b.date_of_testing ? new Date(b.date_of_testing).getTime() : Infinity;
      if (dateA !== dateB) return dateA - dateB;
      
      const dayA = parseInt(a.testing_day || a.testing_age || "0") || 0;
      const dayB = parseInt(b.testing_day || b.testing_age || "0") || 0;
      return dayA - dayB;
    });

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

  // Extract unique material names
  const materials = Array.from(new Set(jobGroup.map((t: any) => t.material_description).filter(Boolean)));
  const materialDisplay = materials.length > 0 ? materials.join(", ") : "Unknown Material";

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
    <div className="w-full max-w-screen-xl mx-auto min-h-screen flex flex-col gap-4">
      
      {/* 1. Header Card */}
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>Job Card <span className="text-orange-500">{decodedGroupId}</span></span>
            <div className="bg-orange-100 text-orange-700 px-3.5 py-1 rounded-full text-xs font-bold shadow-sm">
              Pending
            </div>
          </div>
        }
        subtitle={
          <span className="flex items-center gap-2">
            {materialDisplay} &middot; {jobGroup.length} test{jobGroup.length !== 1 ? 's' : ''}
          </span>
        }
        icon={Briefcase}
        iconClassName="text-orange-500"
        actions={
          <Link 
            href="/clients?tab=all-jobs" 
            className="group inline-flex items-center gap-3 text-sm font-bold text-slate-600 hover:text-orange-600 transition-all duration-300 bg-white hover:bg-orange-50/50 px-4 py-2 rounded-xl border border-slate-200 hover:border-orange-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_-2px_rgba(249,115,22,0.12)]"
          >
            <div className="bg-slate-50 group-hover:bg-orange-100 text-slate-400 group-hover:text-orange-500 p-1.5 rounded-lg transition-colors border border-slate-100 group-hover:border-orange-200/50">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-300" strokeWidth={2.5} />
            </div>
            Back to All Jobs
          </Link>
        }
      />

      {/* 2. Client Details (4 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-orange-500" strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5 font-medium">Received Date</p>
            <p className="text-base font-bold text-slate-900">{getDisplayDate(inwardDates)}</p>
          </div>
        </div>
      </div>

      {/* 3. Tests */}
      <div className="flex flex-col gap-6">
        {jobGroup.map((test: any) => (
          <TestCard key={test.id} test={test} client={client} />
        ))}
      </div>
    </div>
  );
}
