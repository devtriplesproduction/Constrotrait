"use client";

import { useState } from "react";
import { CheckCircle2, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface RecentEODLogItemProps {
  eod: any;
}

export function RecentEODLogItem({ eod }: RecentEODLogItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const eodDate = new Date(eod.report_date);
  const tasks = eod.tasks_accomplished.split('\n').filter((t: string) => t.trim().length > 0);
  const taskLines = tasks.length;

  return (
    <div 
      className="flex flex-col p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="flex items-center">
        {/* Date Block */}
        <div className="flex flex-col items-center justify-center min-w-[50px] mr-4 text-orange-600 font-bold leading-tight">
          <span className="text-xl">{eodDate.getDate()}</span>
          <span className="text-[10px] uppercase tracking-wider">{eodDate.toLocaleString('default', { month: 'short' })}</span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-800 truncate">
            {eodDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {taskLines} tasks &bull; {eod.office_hours}h logged
          </p>
        </div>

        {/* Status Badge */}
        <div className="ml-3 flex-shrink-0 flex items-center gap-3">
          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border flex items-center gap-1 ${eod.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
            eod.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' :
              'bg-amber-50 text-amber-600 border-amber-200'
            }`}>
            {eod.status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
            {eod.status === 'Pending' && <Clock className="w-3 h-3" />}
            {eod.status}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
          )}
        </div>
      </div>
      
      {/* Expanded Content */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600 text-left">
          <h5 className="font-semibold text-slate-800 mb-2">Tasks Accomplished:</h5>
          <ul className="list-disc pl-5 space-y-1">
            {tasks.map((task: string, idx: number) => (
              <li key={idx} className="break-words">{task}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
