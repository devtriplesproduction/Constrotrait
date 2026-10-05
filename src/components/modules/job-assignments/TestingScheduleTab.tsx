"use client";

import { useMemo } from "react";
import { Calendar, ClipboardList, Beaker, Clock } from "lucide-react";
import { DownloadAllotmentButton } from "@/components/modules/job-assignments/DownloadAllotmentButton";

function uidOf(a: any) {
  const t = a.job_entry_tests;
  if (t?.uid_label || t?.job_entries?.uid_label || t?.job_entries?.uid) {
    return t?.uid_label || t?.job_entries?.uid_label || t?.job_entries?.uid;
  }
  return null;
}

export function TestingScheduleTab({ assignments, userId, filterStatus = 'all', currentUserProfile }: { assignments: any[], userId: string, filterStatus?: string, currentUserProfile?: any }) {
  // Filter only my assignments first
  const myAssignments = useMemo(() => {
    return assignments.filter((a: any) => {
      let isMine = false;
      if (a.assigned_to === userId) isMine = true;
      if (a.teams?.team_members?.some((m: any) => m.employee_id === userId)) isMine = true;
      
      return isMine;
    });
  }, [assignments, userId]);

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
      upcoming: [],
      overdue: [],
    };

    myAssignments.forEach((a) => {
      // Due date is usually the testing date constraint
      const dueDateStr = a.job_entry_tests?.date_of_testing || a.due_date;
      if (!dueDateStr) {
        groups.upcoming.push(a);
        return;
      }
      
      const due = new Date(dueDateStr);
      due.setHours(0, 0, 0, 0);

      const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
      
      if (diffDays === 0) {
        groups.today.push(a);
      } else if (diffDays < 0) {
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
    
    if (items.length > 0) {
      const groupedByTest: Record<string, { uids: Set<string>, testGroup: string, assignments: any[] }> = {};
      items.forEach(a => {
        const uid = uidOf(a) || 'No UID';
        const specificTest = a.job_entry_tests?.test_master?.specific_test || a.job_entry_tests?.test_master?.component_parameter || 'Unknown Test';
        const key = specificTest;
        if (!groupedByTest[key]) {
          groupedByTest[key] = { uids: new Set(), testGroup: specificTest, assignments: [] };
        }
        groupedByTest[key].uids.add(uid);
        groupedByTest[key].assignments.push(a);
      });

      content = Object.values(groupedByTest).map((group, idx) => {
        const uidString = Array.from(group.uids).join(', ');
        return (
        <div key={idx} className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 flex flex-col">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-3">
                 <h4 className="font-bold text-lg text-slate-800 tracking-tight">{group.testGroup}</h4>
                 <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">{group.assignments.length} Samples</span>
              </div>
              <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
                 <span className="font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-md shadow-sm">UIDs: {uidString}</span> 
              </p>
            </div>
            <div className="shrink-0 bg-white shadow-sm rounded-xl border border-slate-100 p-1">
              <DownloadAllotmentButton 
                testGroup={group.testGroup} 
                uid={uidString} 
                assignments={group.assignments} 
                currentUserProfile={currentUserProfile} 
              />
            </div>
          </div>
          <div className="grid gap-2">
            {group.assignments.map(a => (
              <div key={a.id} className="flex flex-col md:flex-row md:items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:border-orange-200 hover:shadow-md transition-all group ring-1 ring-slate-900/5">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100/50 text-orange-500 flex items-center justify-center shrink-0 border border-orange-100 group-hover:scale-110 transition-transform shadow-inner">
                  <Beaker className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-700 text-sm truncate group-hover:text-orange-700 transition-colors">{a.job_entry_tests?.additional_details_values?.sample_code_no || a.job_entry_tests?.material_details_location || 'No Code'}</p>
                    {a.job_entry_tests?.ulr_number ? (
                      <span className="text-xs font-semibold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md border border-teal-200 shadow-sm shrink-0">
                        ULR: {a.job_entry_tests.ulr_number}
                      </span>
                    ) : a.job_entry_tests?.qc_number ? (
                      <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200 shadow-sm shrink-0">
                        QC: {a.job_entry_tests.qc_number}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400 italic bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm shrink-0">
                        Doc No: Pending
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-slate-500 truncate">{a.job_entry_tests?.material_description || 'No Description'}</p>
                    {(!isToday && (a.job_entry_tests?.date_of_testing || a.due_date)) && (
                      <span className="text-[10px] font-medium text-orange-600 flex items-center gap-1 bg-orange-50/80 border border-orange-100 px-1.5 py-0.5 rounded shadow-sm">
                        <Calendar className="w-3 h-3 text-orange-400" />
                        {new Date(a.job_entry_tests?.date_of_testing || a.due_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    a.status === 'pending' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                    a.status === 'assigned' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                    a.status === 'accepted' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                    a.status === 'in_testing' ? 'bg-teal-100 text-teal-700 border border-teal-200' :
                    a.status === 'report_uploaded' ? 'bg-cyan-100 text-cyan-700 border border-cyan-200' :
                    a.status === 'in_review' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                    a.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                    a.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                    'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {a.status ? a.status.replace('_', ' ') : 'Unknown'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        );
      });
    }

    return (
      <div className="mb-10 last:mb-0">
        {title !== "Today's Tests" && (
          <div className={`flex items-center gap-3 mb-6 p-4 rounded-2xl border ${bgColor} ${textColor} shadow-sm backdrop-blur-md`}>
            <div className="p-2.5 bg-white/80 rounded-xl shadow-sm border border-white/40">
               {icon}
            </div>
            <h3 className="font-bold text-xl tracking-tight">{title}</h3>
            <span className="ml-auto bg-white px-3.5 py-1.5 rounded-full text-sm font-bold shadow-sm border border-black/5">{items.length} Tests</span>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {content}
          {items.length === 0 && (
            <div className="bg-white/40 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300 p-8 flex flex-col items-center justify-center text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                 <Clock className="w-6 h-6 text-slate-400" />
              </div>
              <span className="text-base font-medium">No tests scheduled for this group.</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 mt-2">
      {myAssignments.length === 0 ? (
         <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
           <div className="w-20 h-20 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-5 shadow-inner border border-slate-200">
             <ClipboardList className="w-10 h-10" />
           </div>
           <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">No assignments found</h3>
           <p className="text-slate-500 max-w-md text-base">You don't have any job assignments in your current schedule. Tests assigned to you will appear here.</p>
         </div>
      ) : (
        <>
          {(!filterStatus || filterStatus === 'all' || filterStatus === 'today') && renderGroup("Today's Tests", groupedAssignments.today, <Calendar className="w-5 h-5 text-emerald-600" />, "bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-emerald-200/60", "text-emerald-800", true)}
          {(!filterStatus || filterStatus === 'all' || filterStatus === 'overdue') && renderGroup("Older Overdue Tests", groupedAssignments.overdue, <Clock className="w-5 h-5 text-red-600" />, "bg-gradient-to-r from-red-500/10 to-red-500/5 border-red-200/60", "text-red-800")}
          {(!filterStatus || filterStatus === 'all' || filterStatus === 'upcoming') && renderGroup("Upcoming Tasks", groupedAssignments.upcoming, <Calendar className="w-5 h-5 text-slate-600" />, "bg-gradient-to-r from-slate-500/10 to-slate-500/5 border-slate-200/60", "text-slate-800")}
        </>
      )}
    </div>
  );
}
