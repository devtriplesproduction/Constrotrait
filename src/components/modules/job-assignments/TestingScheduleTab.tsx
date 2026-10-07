"use client";

import { useMemo, useState } from "react";
import { Calendar, ClipboardList, Beaker, Clock, SlidersHorizontal, RefreshCcw, Search } from "lucide-react";
import { DownloadAllotmentButton } from "@/components/modules/job-assignments/DownloadAllotmentButton";
import { Dropdown } from "@/components/ui/Dropdown";
import { Button } from "@/components/ui/button";

function uidOf(a: any) {
  const t = a.job_entry_tests;
  if (t?.uid_label || t?.job_entries?.uid_label || t?.job_entries?.uid) {
    return t?.uid_label || t?.job_entries?.uid_label || t?.job_entries?.uid;
  }
  return null;
}

function getSampleCode(a: any) {
  if (a.job_entry_tests?.sample_code_no) return a.job_entry_tests.sample_code_no;
  const details = a.job_entry_tests?.additional_details_values;
  if (details) {
    if (details.sample_code_no) return details.sample_code_no;
    const codeKey = Object.keys(details).find(k => {
      const lower = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      return lower.includes('samplecode') || lower === 'code';
    });
    if (codeKey && details[codeKey]) return details[codeKey];
  }
  return a.job_entry_tests?.material_details_location || 'No Code';
}

export function TestingScheduleTab({ assignments, userId, filterStatus = 'all', setFilterStatus, currentUserProfile }: { assignments: any[], userId: string, filterStatus?: string, setFilterStatus?: (s: string) => void, currentUserProfile?: any }) {
  const [filterDate, setFilterDate] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  const scheduleAssignments = useMemo(() => {
    return assignments.filter(a => {
      if (a.status === 'approved') return false;
      
      if (filterDate !== "all") {
        const dueDateStr = a.job_entry_tests?.date_of_testing || a.due_date;
        if (!dueDateStr) return false;
        const d = new Date(dueDateStr);
        const today = new Date();
        if (filterDate === "today") {
          if (d.toDateString() !== today.toDateString()) return false;
        } else if (filterDate === "week") {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (d < weekAgo) return false;
        } else if (filterDate === "month") {
          if (d.getMonth() !== today.getMonth() || d.getFullYear() !== today.getFullYear()) return false;
        } else {
          // Specific date string match
          if (d.toDateString() !== filterDate) return false;
        }
      }
      
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const empName = `${a.assigned_to_profile?.first_name || ""} ${a.assigned_to_profile?.last_name || ""}`.toLowerCase();
        const teamName = a.teams?.name ? String(a.teams?.name).toLowerCase() : "";
        const assigneeStr = a.team_id ? teamName : empName;
        
        const je = a.job_entry_tests;
        const uidLabel = je?.uid_label || je?.job_entries?.uid_label || je?.job_entries?.uid;
        const uidStr = uidLabel ? String(uidLabel).toLowerCase() : "";
        
        const materialName = je?.material_description || je?.test_master?.material_product || "";
        const materialStr = String(materialName).toLowerCase();
        
        const specificTest = je?.test_master?.specific_test || je?.test_master?.component_parameter || "";
        const testStr = String(specificTest).toLowerCase();

        if (!assigneeStr.includes(q) && !uidStr.includes(q) && !materialStr.includes(q) && !testStr.includes(q)) {
          return false;
        }
      }
      
      if (filterStatus && filterStatus !== 'all') {
        const dueDateStr = a.job_entry_tests?.date_of_testing || a.due_date;
        if (!dueDateStr && filterStatus !== 'upcoming') return false;
        if (dueDateStr) {
          const due = new Date(dueDateStr);
          due.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
          
          if (filterStatus === 'today' && diffDays !== 0) return false;
          if (filterStatus === 'overdue' && diffDays >= 0) return false;
          if (filterStatus === 'upcoming' && diffDays <= 0) return false;
        }
      }

      return true;
    });
  }, [assignments, filterDate, searchQuery, filterStatus]);

  // Group by specific date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, any[]> = {};
    scheduleAssignments.forEach(a => {
      const dueDateStr = a.job_entry_tests?.date_of_testing || a.due_date;
      const dateKey = dueDateStr ? new Date(dueDateStr).toDateString() : "No Date Assigned";
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(a);
    });
    return groups;
  }, [scheduleAssignments]);

  const sortedDateKeys = useMemo(() => {
    return Object.keys(groupedByDate).sort((a, b) => {
      if (a === "No Date Assigned") return 1;
      if (b === "No Date Assigned") return -1;
      return new Date(b).getTime() - new Date(a).getTime();
    });
  }, [groupedByDate]);

  const specificDateOptions = useMemo(() => {
    const dates = new Set<string>();
    assignments.forEach(a => {
      const d = a.job_entry_tests?.date_of_testing || a.due_date;
      if (d) dates.add(new Date(d).toDateString());
    });
    return Array.from(dates)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(d => ({
        value: d,
        label: new Date(d).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
      }));
  }, [assignments]);

  const renderGroup = (title: string, items: any[], icon: React.ReactNode, bgColor: string, textColor: string, isToday = false) => {
    if (items.length === 0 && title !== "Today's Tests") return null;

    // For Today's tests, group by UID + Test Name to show the allotment form download button
    let content;
    
    if (items.length > 0) {
      content = items.map((a, idx) => {
        const uid = uidOf(a) || 'No UID';
        const specificTest = a.job_entry_tests?.test_master?.specific_test || a.job_entry_tests?.test_master?.component_parameter || 'Unknown Test';
        
        return (
        <div key={a.id || idx} className="bg-white rounded-2xl border border-slate-200/60 p-3 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 flex flex-col">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                 <div className="bg-orange-100 p-1.5 rounded-lg text-orange-600 shrink-0">
                   <Beaker className="w-4 h-4" />
                 </div>
                 <h4 className="font-semibold text-base text-slate-800 tracking-tight shrink-0">{specificTest}</h4>
                 <span className="font-medium text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md shadow-sm">UID: {uid}</span> 
              </div>
            </div>
            <div className="shrink-0 bg-white shadow-sm rounded-xl border border-slate-100 p-1">
              <DownloadAllotmentButton 
                testGroup={specificTest} 
                uid={uid} 
                assignments={[a]} 
                currentUserProfile={currentUserProfile} 
              />
            </div>
          </div>
          <div className="grid gap-2">
              <div className="flex flex-col md:flex-row md:items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm hover:border-orange-200 hover:shadow-md transition-all group ring-1 ring-slate-900/5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {a.job_entry_tests?.test_master?.datasheet_qr ? (
                      <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm shrink-0">
                        Doc No: {a.job_entry_tests.test_master.datasheet_qr}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {(!isToday && (a.job_entry_tests?.date_of_testing || a.due_date)) && (
                      <span className="text-[10px] font-medium text-orange-600 flex items-center gap-1 bg-orange-50/80 border border-orange-100 px-1.5 py-0.5 rounded shadow-sm">
                        <Calendar className="w-3 h-3 text-orange-400" />
                        Due: {new Date(a.job_entry_tests?.date_of_testing || a.due_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    a.status === 'pending' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                    a.status === 'assigned' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                    a.status === 'accepted' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                    a.status === 'in_testing' ? 'bg-orange-500 text-white shadow-sm shadow-orange-200/50 border border-transparent' :
                    a.status === 'report_uploaded' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                    a.status === 'in_review' ? 'bg-orange-200 text-orange-800 border border-orange-300' :
                    a.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                    a.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                    'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {a.status ? a.status.replace('_', ' ') : 'Unknown'}
                  </span>
                </div>
              </div>
          </div>
        </div>
        );
      });
    }

    return (
      <div className="mb-10 last:mb-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <SlidersHorizontal className="w-5 h-5 text-orange-500" />
            <span>Filter Schedule</span>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Search</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search Tests, Job Card, Material..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors shadow-sm bg-white"
              />
            </div>
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Schedule</label>
            <Dropdown 
              value={filterStatus || 'all'} 
              onChange={(val) => setFilterStatus?.(val)} 
              placeholder="All Tests"
              buttonClassName="bg-white border-slate-200 shadow-sm rounded-xl h-10" 
              options={[
                { value: "all", label: "All Tests" },
                { value: "today", label: "Today's Tests" },
                { value: "overdue", label: "Older Overdue Tests" },
                { value: "upcoming", label: "Upcoming Tasks" },
              ]} 
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date Range</label>
            <Dropdown value={filterDate} onChange={setFilterDate} placeholder="All Time" buttonClassName="bg-white border-slate-200 shadow-sm rounded-xl h-10" options={[
              { value: "all", label: "All Time" },
              { value: "today", label: "Today" },
              { value: "week", label: "This Week" },
              { value: "month", label: "This Month" },
              ...specificDateOptions
            ]} />
          </div>
          <div className="w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery("");
                setFilterStatus?.("all");
                setFilterDate("all");
              }}
              className="w-full sm:w-auto h-10 px-4 rounded-xl text-orange-600 border-orange-200 bg-orange-50/50 hover:bg-orange-100 hover:text-orange-700 font-bold text-xs flex items-center gap-2 shadow-sm transition-colors"
            >
              <RefreshCcw className="w-4 h-4" /> Refresh
            </Button>
          </div>
        </div>
      </div>
      {scheduleAssignments.length === 0 ? (
         <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
           <div className="w-20 h-20 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-5 shadow-inner border border-slate-200">
             <ClipboardList className="w-10 h-10" />
           </div>
           <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">No assignments found</h3>
           <p className="text-slate-500 max-w-md text-base">You don't have any job assignments in your current schedule. Tests assigned to you will appear here.</p>
         </div>
      ) : (
        <div className="space-y-8">
          {sortedDateKeys.map(dateKey => {
            const items = groupedByDate[dateKey];
            const isToday = dateKey === new Date().toDateString();
            const formattedTitle = dateKey === "No Date Assigned" 
              ? "No Date Assigned" 
              : new Date(dateKey).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
              
            return (
              <div key={dateKey}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-6 w-1 bg-orange-500 rounded-full"></div>
                  <h3 className="text-sm font-bold text-slate-600 tracking-widest">{formattedTitle}</h3>
                </div>
                {renderGroup(dateKey, items, <Calendar className="w-5 h-5" />, "", "", isToday)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
