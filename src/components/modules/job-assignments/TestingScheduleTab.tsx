"use client";

import { useMemo } from "react";
import { Calendar, ClipboardList, Beaker, Clock } from "lucide-react";
import { JobStageStepper } from "@/components/ui/JobStageStepper";

import { DownloadAllotmentButton } from "@/components/modules/job-assignments/DownloadAllotmentButton";

function uidOf(a: any) {
  const t = a.job_entry_tests;
  if (t?.uid_label) return t.uid_label;
  return null;
}

export function TestingScheduleTab({ assignments, userId, filterStatus = 'all', currentUserProfile }: { assignments: any[], userId: string, filterStatus?: string, currentUserProfile?: any }) {
  // Filter only my assignments first
  const myAssignments = useMemo(() => {
    return assignments.filter((a: any) => {
      let isMine = false;
      if (a.assigned_to === userId) isMine = true;
      if (a.teams?.team_members?.some((m: any) => m.employee_id === userId)) isMine = true;
      
      if (isMine && filterStatus !== 'all') {
        if (a.status !== filterStatus) {
          return false;
        }
      }
      
      return isMine;
    });
  }, [assignments, userId, filterStatus]);

  // Group by testing date categories
  const groupedAssignments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const groups: Record<string, any[]> = {
      today: [],
      yesterday: [],
      tomorrow: [],
      upcoming: [],
      overdue: [],
    };

    myAssignments.forEach((a) => {
      // Due date is usually the testing date constraint
      const dueDateStr = a.due_date;
      if (!dueDateStr) {
        groups.upcoming.push(a);
        return;
      }
      
      const due = new Date(dueDateStr);
      due.setHours(0, 0, 0, 0);

      const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
      
      if (diffDays === 0) {
        groups.today.push(a);
      } else if (diffDays === -1) {
        groups.yesterday.push(a);
      } else if (diffDays === 1) {
        groups.tomorrow.push(a);
      } else if (diffDays < -1) {
        groups.overdue.push(a);
      } else {
        groups.upcoming.push(a);
      }
    });

    return groups;
  }, [myAssignments]);

  const renderGroup = (title: string, items: any[], icon: React.ReactNode, bgColor: string, textColor: string, isToday = false) => {
    if (items.length === 0 && title !== "Today's Tests") return null;

    // For Today's tests, group by UID + Test Name to show the allotment form download button
    let content;
    
    if (isToday && items.length > 0) {
      const groupedByUidAndTest: Record<string, { uid: string, testGroup: string, assignments: any[] }> = {};
      items.forEach(a => {
        const uid = uidOf(a) || 'No UID';
        const specificTest = a.job_entry_tests?.test_master?.specific_test || a.job_entry_tests?.test_master?.component_parameter || 'Unknown Test';
        const key = `${uid}_${specificTest}`;
        if (!groupedByUidAndTest[key]) {
          groupedByUidAndTest[key] = { uid, testGroup: specificTest, assignments: [] };
        }
        groupedByUidAndTest[key].assignments.push(a);
      });

      content = Object.values(groupedByUidAndTest).map((group, idx) => (
        <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 mb-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-lg text-slate-800">{group.testGroup}</h4>
              <p className="text-sm text-slate-500 mt-1">UID: <span className="font-semibold text-slate-700">{group.uid}</span> &bull; {group.assignments.length} Samples</p>
            </div>
            <DownloadAllotmentButton 
              testGroup={group.testGroup} 
              uid={group.uid} 
              assignments={group.assignments} 
              currentUserProfile={currentUserProfile} 
            />
          </div>
          <div className="grid gap-3">
            {group.assignments.map(a => (
              <div key={a.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 border border-orange-100">
                  <Beaker className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-700 text-sm truncate">{a.additional_details_values?.sample_code_no || a.job_entry_tests?.job_entries?.material_details_location || 'No Code'}</p>
                  <p className="text-xs text-slate-500 truncate">{a.job_entry_tests?.material_description || 'No Description'}</p>
                </div>
                <div className="shrink-0 w-32 md:w-auto">
                  <JobStageStepper currentStage={a.status} isRejected={a.status === 'rejected'} orientation="horizontal" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ));
    } else {
      content = items.map((a: any) => {
        const uid = uidOf(a);
        const specificTest = a.job_entry_tests?.test_master?.specific_test || a.job_entry_tests?.test_master?.component_parameter || 'N/A';
        const dueStr = a.due_date ? new Date(a.due_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '-';
        
        return (
          <div key={a.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center gap-4 hover:border-orange-300 transition-colors">
            <div className="flex-1 flex gap-4 items-center">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 border border-orange-100">
                <Beaker className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">{specificTest}</h4>
                <div className="flex items-center gap-3 mt-1 text-sm font-medium">
                  <span className="text-orange-600 bg-orange-100 px-2 rounded-md">{uid || 'No UID'}</span>
                  <span className="text-slate-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Due: {dueStr}</span>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/3 shrink-0">
              <JobStageStepper currentStage={a.status} isRejected={a.status === 'rejected'} orientation="horizontal" />
            </div>
          </div>
        );
      });
    }

    return (
      <div className="mb-8 last:mb-0">
        <div className={`flex items-center gap-2 mb-4 p-3 rounded-xl border ${bgColor} ${textColor}`}>
          {icon}
          <h3 className="font-bold text-lg">{title}</h3>
          <span className="ml-auto bg-white/60 px-2 py-0.5 rounded-full text-sm font-semibold">{items.length}</span>
        </div>
        <div className="grid gap-4">
          {content}
          {items.length === 0 && (
            <div className="bg-white/50 rounded-2xl border border-dashed border-slate-200 p-6 flex flex-col items-center justify-center text-slate-400">
              <span className="text-sm font-medium">No tests scheduled for this day.</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      {myAssignments.length === 0 ? (
         <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-300">
           <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
             <ClipboardList className="w-8 h-8" />
           </div>
           <h3 className="text-lg font-semibold text-slate-900 mb-1">No assignments found</h3>
           <p className="text-slate-500 max-w-sm text-sm">You don't have any job assignments in your schedule.</p>
         </div>
      ) : (
        <>
          {renderGroup("Today's Tests", groupedAssignments.today, <Calendar className="w-5 h-5" />, "bg-emerald-50 border-emerald-100", "text-emerald-700", true)}
          {renderGroup("Yesterday's Missed Tests", groupedAssignments.yesterday, <Clock className="w-5 h-5" />, "bg-amber-50 border-amber-100", "text-amber-700")}
          {renderGroup("Tomorrow's Tests", groupedAssignments.tomorrow, <Calendar className="w-5 h-5" />, "bg-blue-50 border-blue-100", "text-blue-700")}
          {renderGroup("Older Overdue Tests", groupedAssignments.overdue, <Clock className="w-5 h-5" />, "bg-red-50 border-red-100", "text-red-700")}
          {renderGroup("Upcoming Tests", groupedAssignments.upcoming, <Calendar className="w-5 h-5" />, "bg-slate-50 border-slate-200", "text-slate-700")}
        </>
      )}
    </div>
  );
}
