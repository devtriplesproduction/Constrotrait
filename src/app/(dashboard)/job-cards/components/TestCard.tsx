"use client";

import React, { useState } from "react";
import { Activity, Info, User, Clock, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import { JobStageStepper } from "@/components/ui/JobStageStepper";
import { JobStage } from "@/config/jobTransitions";
import { EditTestModal } from "./EditTestModal";

interface TestCardProps {
  test: any;
  client: any;
}

export function TestCard({ test, client }: TestCardProps) {
  const [showWorkflow, setShowWorkflow] = useState(false);

  const latestAssignment = test.job_assignments && test.job_assignments.length > 0 ? test.job_assignments[0] : null;
  const status = (latestAssignment?.status as JobStage | 'rejected') || "pending";
  
  let dayText = test.testing_day || test.testing_age || '-';
  if (dayText !== '-' && !dayText.toString().toLowerCase().includes('day')) {
     dayText = `${dayText} Day${Number(dayText) > 1 ? 's' : ''}`;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col relative transition-all duration-300">
      
      {/* Content Row: Title & Actions */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <h3 className="text-xl font-bold text-slate-800 pt-1 flex items-center gap-2.5">
          <Activity className="w-6 h-6 text-orange-500" />
          {test.test_master?.component_parameter || "Unknown Parameter"}
        </h3>
        
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-orange-500 text-white px-3.5 h-8 flex items-center justify-center rounded-full font-bold text-[12px] shadow-sm">
            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
          </div>
          <EditTestModal client={client} test={test} />
          <button 
            onClick={() => setShowWorkflow(!showWorkflow)}
            className="flex items-center justify-center text-slate-500 hover:text-orange-500 bg-white border border-slate-200 hover:border-orange-200 w-8 h-8 rounded-full shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            title={showWorkflow ? "Hide Workflow" : "Show Workflow"}
          >
            {showWorkflow ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {/* KPIs Row */}
      <div className="flex flex-col">
        
        <div className="flex flex-wrap items-center bg-[#F8F9FA] border border-slate-100 rounded-2xl p-1.5 gap-1 shadow-sm w-full">
          
          {/* KPI: Method */}
          <div className="flex-1 flex items-center gap-3 px-3 py-1.5 hover:bg-white rounded-xl transition-colors">
            <div className="w-9 h-9 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 shadow-sm">
              <Info className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex flex-col flex-1 border-r border-slate-200/80 pr-2">
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-0.5">Method</span>
              <span className="text-[13px] font-extrabold text-slate-700 truncate">{test.test_method || '-'}</span>
            </div>
          </div>

          {/* KPI: Samples */}
          <div className="flex-1 flex items-center gap-3 px-3 py-1.5 hover:bg-white rounded-xl transition-colors">
            <div className="w-9 h-9 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 shadow-sm">
              <User className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex flex-col flex-1 border-r border-slate-200/80 pr-2">
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-0.5">Samples</span>
              <span className="text-[13px] font-extrabold text-slate-700 truncate">{test.sample_quantity || '-'}</span>
            </div>
          </div>

          {/* KPI: Day */}
          <div className="flex-1 flex items-center gap-3 px-3 py-1.5 hover:bg-white rounded-xl transition-colors">
            <div className="w-9 h-9 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 shadow-sm">
              <Clock className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex flex-col flex-1 border-r border-slate-200/80 pr-2">
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-0.5">Day</span>
              <span className="text-[13px] font-extrabold text-slate-700 truncate">{dayText}</span>
            </div>
          </div>

          {/* KPI: Grade */}
          <div className="flex-1 flex items-center gap-3 px-3 py-1.5 hover:bg-white rounded-xl transition-colors">
            <div className="w-9 h-9 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 shadow-sm">
              <Briefcase className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex flex-col flex-1 border-r border-slate-200/80 pr-2">
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-0.5">Grade</span>
              <span className="text-[14px] font-black text-orange-600 leading-none truncate">{test.grade || (test.additional_details_values as any)?.Grade || (test.additional_details_values as any)?.grade || "-"}</span>
            </div>
          </div>

          {/* KPI: ULR / QC */}
          {test.ulr_number ? (
            <div className="flex-1 flex items-center gap-3 px-3 py-1.5 hover:bg-white rounded-xl transition-colors">
              <div className="w-9 h-9 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 shadow-sm">
                <Info className="w-4 h-4 text-orange-500" />
              </div>
              <div className="flex flex-col flex-1 pr-2">
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-0.5">ULR No.</span>
                <span className="text-[13px] font-bold text-emerald-700 truncate">{test.ulr_number}</span>
              </div>
            </div>
          ) : test.qc_number ? (
            <div className="flex-1 flex items-center gap-3 px-3 py-1.5 hover:bg-white rounded-xl transition-colors">
              <div className="w-9 h-9 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 shadow-sm">
                <Info className="w-4 h-4 text-orange-500" />
              </div>
              <div className="flex flex-col flex-1 pr-2">
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-0.5">QC No.</span>
                <span className="text-[13px] font-bold text-slate-700 truncate">{test.qc_number}</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-3 px-3 py-1.5 hover:bg-white rounded-xl transition-colors">
              <div className="w-9 h-9 rounded-full bg-orange-50/50 border border-orange-100/50 flex items-center justify-center shrink-0 shadow-sm">
                <Info className="w-4 h-4 text-orange-300" />
              </div>
              <div className="flex flex-col flex-1 pr-2">
                <span className="text-[10px] font-bold text-orange-300 uppercase tracking-widest mb-0.5">Doc No.</span>
                <span className="text-[13px] font-medium text-slate-400 italic truncate">Pending</span>
              </div>
            </div>
          )}

        </div>
      </div>
      
      {/* Bottom Row: Workflow Stepper */}
      {showWorkflow && (
        <div className="w-full mt-4 bg-slate-50/50 rounded-2xl p-6 border border-slate-100/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] animate-in slide-in-from-top-2 fade-in duration-300">
          <JobStageStepper currentStage={status} isRejected={status === 'rejected'} orientation="horizontal" />
        </div>
      )}
    </div>
  );
}
