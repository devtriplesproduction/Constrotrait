"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { 
  ClipboardList, 
  Calendar, 
  User, 
  FileText, 
  StickyNote, 
  Search, 
  Check, 
  AlertCircle, 
  Loader2, 
  Building2, 
  FlaskConical,
  X,
  ArrowRight,
  ArrowLeft,
  Edit2,
  ListTodo,
  ChevronDown
} from "lucide-react";
import { assignJobCardsBatchAction, getUnassignedJobCardsAction } from "@/actions/job-assignment.actions";
import { Dropdown } from "@/components/ui/Dropdown";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";
import { toast } from "@/hooks/use-toast";
import { isTestEngineer, isSuperAdminOrBranchManager } from "@/config/roles";
import { compareJobCardsByUidRecentFirst } from "@/utils/uid-sort";
import { format } from "date-fns";

interface AssignJobsTabProps {
  employees: any[];
  teams?: any[];
  branches?: any[];
  initialAssignment?: any;
  existingAssignments?: any[];
  initialUnassignedJobCards?: any[];
  onSuccess?: () => void;
  onClose?: () => void;
}

export function AssignJobsTab({ 
  employees, 
  teams = [], 
  branches = [], 
  initialAssignment, 
  existingAssignments = [],
  initialUnassignedJobCards = [],
  onSuccess,
  onClose 
}: AssignJobsTabProps) {
  const isEditMode = !!initialAssignment;
  const [showAssignmentsView, setShowAssignmentsView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingUnassigned, setFetchingUnassigned] = useState(
    !isEditMode && (!initialUnassignedJobCards || initialUnassignedJobCards.length === 0)
  );
  const [unassignedJobCards, setUnassignedJobCards] = useState<any[]>(initialUnassignedJobCards || []);
  
  const [selectedJobEntryId, setSelectedJobEntryId] = useState<string>(
    initialAssignment?.job_entry_id || initialAssignment?.job_entry_tests?.job_entry_id || ""
  );
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>(initialAssignment?.assigned_to || "");
  const [dueDate, setDueDate] = useState<string>(
    initialAssignment?.due_date 
      ? new Date(initialAssignment.due_date).toISOString() 
      : new Date().toISOString()
  );
  const [notes, setNotes] = useState<string>(initialAssignment?.notes || "");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"pending" | "assigned">("pending");
  const [filterAssignmentsToSelectedEmp, setFilterAssignmentsToSelectedEmp] = useState<boolean>(true);
  const [visibleCount, setVisibleCount] = useState<number>(15);
  const [visibleAssignmentsCount, setVisibleAssignmentsCount] = useState<number>(15);

  // Sync initialUnassignedJobCards if it arrives
  useEffect(() => {
    if (initialUnassignedJobCards && initialUnassignedJobCards.length > 0 && !selectedBranch) {
      setUnassignedJobCards(initialUnassignedJobCards);
      setFetchingUnassigned(false);
    }
  }, [initialUnassignedJobCards, selectedBranch]);

  // Reset pagination when search query or mode changes
  useEffect(() => {
    setVisibleCount(15);
  }, [viewMode, searchQuery]);

  useEffect(() => {
    setVisibleAssignmentsCount(15);
  }, [filterAssignmentsToSelectedEmp, selectedEmployee]);

  // Fetch unassigned job cards only if not already loaded or when branch filter changes
  useEffect(() => {
    if (!selectedBranch && initialUnassignedJobCards && initialUnassignedJobCards.length > 0) {
      return;
    }

    let isMounted = true;
    const fetchUnassigned = async () => {
      setFetchingUnassigned(true);
      try {
        const res = await getUnassignedJobCardsAction(selectedBranch || undefined);
        if (isMounted) {
          if (res.success && res.data) {
            setUnassignedJobCards(res.data);
          } else {
            console.error("Failed to load unassigned job cards:", res.error);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Error fetching unassigned job cards:", err);
        }
      } finally {
        if (isMounted) setFetchingUnassigned(false);
      }
    };

    fetchUnassigned();
    return () => { isMounted = false; };
  }, [selectedBranch]);

  // Group unassigned job cards by job_entry_id
  const uniquePendingJobEntries = useMemo(() => {
    const map = new Map<string, any>();
    
    unassignedJobCards.forEach((test: any) => {
      const entryId = test.job_entry_id || test.job_entries?.id;
      if (!entryId) return;

      const je = test.job_entries;
      const client = je?.clients;
      const clientName = client?.company_name || client?.name || "Unknown Client";
      const projectName = je?.project_name || "N/A";
      const uidLabel = test.uid_label || je?.uid_label || (je?.uid ? String(je.uid) : "Pending UID");
      const testName = test.test_master 
        ? `${test.test_master.component_parameter || ''} - ${test.test_master.specific_test || ''}`.replace(/^ - |- $/g, '')
        : test.material_description || "Standard Test";

      if (!map.has(entryId)) {
        map.set(entryId, {
          job_entry_id: entryId,
          uid_label: uidLabel,
          uid: je?.uid,
          client_name: clientName,
          project_name: projectName,
          branch_id: je?.branch_id,
          branch_name: je?.branches?.name || "",
          is_nabl: !!je?.is_nabl,
          created_at: je?.created_at || test.created_at,
          tests: [{ id: test.id, name: testName, category: test.test_master?.category }],
          test_ids: [test.id],
          testCount: 1,
        });
      } else {
        const existing = map.get(entryId);
        existing.tests.push({ id: test.id, name: testName, category: test.test_master?.category });
        existing.test_ids.push(test.id);
        existing.testCount = existing.tests.length;
      }
    });

    return Array.from(map.values()).sort(compareJobCardsByUidRecentFirst);
  }, [unassignedJobCards]);

  // Group assigned job cards by job_entry_id (from props, zero extra network request!)
  const uniqueAssignedJobEntries = useMemo(() => {
    if (!existingAssignments || existingAssignments.length === 0) return [];
    const map = new Map<string, any>();

    existingAssignments.forEach((ea: any) => {
      const jet = ea.job_entry_tests;
      const entryId = jet?.job_entry_id || jet?.job_entries?.id;
      if (!entryId) return;

      const je = jet?.job_entries;
      const client = je?.clients;
      const clientName = client?.company_name || client?.name || "Unknown Client";
      const projectName = je?.project_name || "N/A";
      const uidLabel = jet?.uid_label || je?.uid_label || (je?.uid ? String(je.uid) : "Assigned UID");
      const testName = jet?.test_master 
        ? `${jet.test_master.component_parameter || ''} - ${jet.test_master.specific_test || ''}`.replace(/^ - |- $/g, '')
        : "Test";

      if (!map.has(entryId)) {
        map.set(entryId, {
          job_entry_id: entryId,
          uid_label: uidLabel,
          uid: je?.uid,
          client_name: clientName,
          project_name: projectName,
          branch_id: je?.branch_id,
          branch_name: je?.branches?.name || ea.branches?.name || "",
          is_nabl: !!je?.is_nabl,
          created_at: je?.created_at,
          assigned_to: ea.assigned_to,
          assigned_to_profile: ea.assigned_to_profile,
          due_date: ea.due_date,
          status: ea.status,
          tests: [{ id: jet?.id || ea.job_entry_test_id, name: testName }],
          test_ids: [jet?.id || ea.job_entry_test_id],
          testCount: 1,
        });
      } else {
        const existing = map.get(entryId);
        existing.tests.push({ id: jet?.id || ea.job_entry_test_id, name: testName });
        existing.test_ids.push(jet?.id || ea.job_entry_test_id);
        existing.testCount = existing.tests.length;
      }
    });

    return Array.from(map.values()).sort(compareJobCardsByUidRecentFirst);
  }, [existingAssignments]);

  // Active list based on viewMode
  const activeJobCards = viewMode === "pending" ? uniquePendingJobEntries : uniqueAssignedJobEntries;

  // Filtered job cards based on search query
  const filteredJobCards = useMemo(() => {
    if (!searchQuery.trim()) return activeJobCards;
    const q = searchQuery.toLowerCase().trim();
    return activeJobCards.filter((jc: any) => {
      return (
        jc.uid_label?.toLowerCase().includes(q) ||
        String(jc.uid || "").includes(q) ||
        jc.client_name?.toLowerCase().includes(q) ||
        jc.project_name?.toLowerCase().includes(q) ||
        jc.tests?.some((t: any) => t.name?.toLowerCase().includes(q))
      );
    });
  }, [activeJobCards, searchQuery]);

  // Progressive chunked rendering for job cards (15 per chunk)
  const displayedJobCards = useMemo(() => {
    return filteredJobCards.slice(0, visibleCount);
  }, [filteredJobCards, visibleCount]);

  const hasMore = visibleCount < filteredJobCards.length;

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 60 && hasMore) {
      setVisibleCount(prev => Math.min(prev + 15, filteredJobCards.length));
    }
  };

  // The currently selected job card details
  const selectedJobCard = useMemo(() => {
    if (isEditMode) {
      return {
        job_entry_id: initialAssignment.job_entry_id,
        uid_label: initialAssignment.uid_label || initialAssignment.uid || "N/A",
        client_name: initialAssignment.client_name || "Client Details",
        project_name: initialAssignment.project_name || "Project Details",
        tests: [{ name: initialAssignment.test_name || "Assigned Test" }],
        testCount: initialAssignment.test_ids?.length || 1,
        test_ids: initialAssignment.test_ids || [initialAssignment.job_entry_test_id],
      };
    }

    if (!selectedJobEntryId) return null;
    return (
      uniquePendingJobEntries.find((j: any) => j.job_entry_id === selectedJobEntryId) ||
      uniqueAssignedJobEntries.find((j: any) => j.job_entry_id === selectedJobEntryId) ||
      null
    );
  }, [isEditMode, initialAssignment, selectedJobEntryId, uniquePendingJobEntries, uniqueAssignedJobEntries]);

  // Filter employees for assignment
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (selectedBranch && emp.branch_id !== selectedBranch) return false;
      return isTestEngineer(emp.roles) || isSuperAdminOrBranchManager(emp.roles);
    });
  }, [employees, selectedBranch]);

  // Active engineer name
  const selectedEmployeeObj = useMemo(() => {
    return employees.find(e => e.id === selectedEmployee);
  }, [employees, selectedEmployee]);

  const selectedEmployeeName = selectedEmployeeObj 
    ? `${selectedEmployeeObj.first_name} ${selectedEmployeeObj.last_name}` 
    : "";

  // Assignments filtered for "View Current Assignments"
  const currentEngineerAssignments = useMemo(() => {
    if (!filterAssignmentsToSelectedEmp || !selectedEmployee) {
      return uniqueAssignedJobEntries;
    }
    return uniqueAssignedJobEntries.filter((a: any) => a.assigned_to === selectedEmployee);
  }, [uniqueAssignedJobEntries, selectedEmployee, filterAssignmentsToSelectedEmp]);

  // Progressive chunked rendering for assignments (15 per chunk)
  const displayedAssignments = useMemo(() => {
    return currentEngineerAssignments.slice(0, visibleAssignmentsCount);
  }, [currentEngineerAssignments, visibleAssignmentsCount]);

  const hasMoreAssignments = visibleAssignmentsCount < currentEngineerAssignments.length;

  const handleAssignmentsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 60 && hasMoreAssignments) {
      setVisibleAssignmentsCount(prev => Math.min(prev + 15, currentEngineerAssignments.length));
    }
  };

  // Handle assignment submit
  const handleAssign = async () => {
    if (!selectedJobCard) {
      return toast({ 
        title: "Selection Required", 
        description: "Please select a Job Card to assign.", 
        variant: "warning" 
      });
    }
    if (!selectedEmployee) {
      return toast({ 
        title: "Engineer Required", 
        description: "Please choose an engineer to assign this job card.", 
        variant: "warning" 
      });
    }

    setLoading(true);

    try {
      const testIds = selectedJobCard.test_ids || [];
      if (testIds.length === 0) {
        setLoading(false);
        return toast({ 
          title: "Error", 
          description: "No tests found for this Job Card.", 
          variant: "error" 
        });
      }

      const res = await assignJobCardsBatchAction({
        job_entry_test_ids: testIds,
        assigned_to: selectedEmployee,
        due_date: dueDate || undefined,
        notes: notes || undefined,
        branch_id: selectedBranch || undefined,
      });

      if (res.success) {
        const empName = filteredEmployees.find(e => e.id === selectedEmployee);
        const nameStr = empName ? `${empName.first_name} ${empName.last_name}` : "engineer";
        toast({ 
          title: "Assignment Successful", 
          description: `Job Card UID: ${selectedJobCard.uid_label} assigned to ${nameStr} (${testIds.length} test${testIds.length > 1 ? 's' : ''}).`, 
          variant: "success" 
        });

        if (onSuccess) onSuccess();
      } else {
        toast({ 
          title: "Assignment Failed", 
          description: res.error || "Failed to assign job card.", 
          variant: "error" 
        });
      }
    } catch (err: any) {
      console.error("Assignment submission error:", err);
      toast({ 
        title: "Error", 
        description: err.message || "An unexpected error occurred.", 
        variant: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  // RENDER: Current Assignments View
  if (showAssignmentsView) {
    return (
      <div className="space-y-4">
        {/* Header with Back button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200/80">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-orange-500" />
              {selectedEmployee && filterAssignmentsToSelectedEmp
                ? `Current Assignments for ${selectedEmployeeName}`
                : "All Current Job Assignments"}
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Showing {currentEngineerAssignments.length} active assignment{currentEngineerAssignments.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedEmployee && (
              <button
                type="button"
                onClick={() => setFilterAssignmentsToSelectedEmp(!filterAssignmentsToSelectedEmp)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-white border border-orange-200 text-slate-700 hover:bg-orange-100/50 font-medium transition-colors"
              >
                {filterAssignmentsToSelectedEmp ? "Show All Engineers" : `Filter by ${selectedEmployeeName}`}
              </button>
            )}

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setShowAssignmentsView(false)}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-8 px-3 rounded-lg flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Form
            </Button>
          </div>
        </div>

        {/* Assignments List */}
        <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs">
          {currentEngineerAssignments.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No active assignments</p>
              <p className="text-xs text-slate-400 max-w-xs">
                {selectedEmployee && filterAssignmentsToSelectedEmp
                  ? `${selectedEmployeeName} currently has no active assignments.`
                  : "There are no currently assigned job cards."}
              </p>
            </div>
          ) : (
            <>
              <div 
                onScroll={handleAssignmentsScroll}
                className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar"
              >
                {displayedAssignments.map((a: any) => {
                  const assignedName = a.assigned_to_profile
                    ? `${a.assigned_to_profile.first_name || ""} ${a.assigned_to_profile.last_name || ""}`.trim()
                    : "Unassigned";

                  return (
                    <div 
                      key={a.job_entry_id}
                      className="p-3.5 px-4 hover:bg-orange-50/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-extrabold text-orange-600 text-sm">
                            UID: {a.uid_label}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {a.testCount} {a.testCount === 1 ? "test" : "tests"}
                          </span>
                          {a.status && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 capitalize">
                              {a.status.replace(/_/g, ' ')}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500 font-medium">
                            👤 {assignedName}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-slate-800 truncate" title={a.client_name}>
                          {a.client_name}
                          {a.project_name && a.project_name !== "N/A" && (
                            <span className="text-slate-500 font-normal"> — {a.project_name}</span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-3">
                          <span>{a.tests?.map((t: any) => t.name).join(", ")}</span>
                          {a.due_date && (
                            <span className="text-orange-600 font-medium">
                              Due: {format(new Date(a.due_date), "dd MMM, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedJobEntryId(a.job_entry_id);
                            setSelectedEmployee(a.assigned_to || "");
                            if (a.due_date) setDueDate(new Date(a.due_date).toISOString());
                            setShowAssignmentsView(false);
                          }}
                          className="h-8 px-3 text-xs font-bold text-orange-600 border-orange-200 hover:bg-orange-500 hover:text-white rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMoreAssignments && (
                <div className="p-2.5 text-center bg-slate-50 border-t border-slate-100 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleAssignmentsCount(prev => Math.min(prev + 15, currentEngineerAssignments.length))}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-100/70 px-4 py-1.5 rounded-lg border border-orange-200 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Load More ({currentEngineerAssignments.length - visibleAssignmentsCount} remaining)</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAssignmentsView(false)}
            className="h-10 px-5 text-xs font-semibold rounded-xl text-slate-700"
          >
            Close Assignments View
          </Button>
        </div>
      </div>
    );
  }

  // RENDER: Normal Assign Form
  return (
    <div className="w-full space-y-5">
      {/* 1. JOB CARD SELECTION / PREVIEW */}
      {selectedJobCard ? (
        // Selected Card Summary (Compact & Informative)
        <div className="bg-orange-50/60 border border-orange-200/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-orange-200/60">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-xl bg-orange-500 text-white font-extrabold text-sm shadow-sm tracking-wide">
                UID: {selectedJobCard.uid_label}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-orange-100 text-orange-800 text-xs font-semibold">
                {selectedJobCard.testCount} {selectedJobCard.testCount === 1 ? "Test" : "Tests"}
              </span>
              {selectedJobCard.is_nabl && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  NABL
                </span>
              )}
            </div>

            {!isEditMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedJobEntryId("")}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-100/70 h-8 px-3 text-xs font-semibold rounded-lg self-start sm:self-auto"
              >
                Change Job Card
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Client</span>
              <span className="text-slate-800 font-bold text-sm truncate block" title={selectedJobCard.client_name}>
                {selectedJobCard.client_name || "N/A"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-medium block">Project / Site</span>
              <span className="text-slate-800 font-semibold block truncate" title={selectedJobCard.project_name}>
                {selectedJobCard.project_name || "N/A"}
              </span>
            </div>

            <div className="sm:col-span-2">
              <span className="text-slate-500 font-medium block mb-1">Tests to be assigned</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedJobCard.tests?.map((t: any, idx: number) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-orange-200 text-slate-700 text-xs font-medium shadow-2xs"
                  >
                    <FlaskConical className="w-3 h-3 text-orange-500" />
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Job Card Picker (Clean, fast searchable selector)
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-orange-500" />
              Select Job Card to Assign
            </label>

            {/* Toggle between Pending & Already Assigned */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => { setViewMode("pending"); setSearchQuery(""); }}
                className={`px-3 py-1 rounded-md transition-all ${
                  viewMode === "pending"
                    ? "bg-white text-orange-600 font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pending ({uniquePendingJobEntries.length})
              </button>
              <button
                type="button"
                onClick={() => { setViewMode("assigned"); setSearchQuery(""); }}
                className={`px-3 py-1 rounded-md transition-all ${
                  viewMode === "assigned"
                    ? "bg-white text-orange-600 font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Reassign Existing ({uniqueAssignedJobEntries.length})
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by UID (e.g. 3061), client, project, or test..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors shadow-2xs placeholder:text-slate-400 text-slate-800"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Job Cards List */}
          <div className="border border-slate-200 rounded-2xl bg-slate-50/50 overflow-hidden shadow-2xs">
            {fetchingUnassigned && viewMode === "pending" ? (
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                <p className="text-xs font-semibold text-slate-600">Loading pending job cards...</p>
              </div>
            ) : filteredJobCards.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Check className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {searchQuery ? "No matching job cards found" : viewMode === "pending" ? "All job cards are assigned!" : "No existing assignments"}
                </p>
                <p className="text-xs text-slate-400 max-w-xs">
                  {searchQuery 
                    ? `Try a different keyword or UID number.` 
                    : viewMode === "pending"
                      ? "Great work! There are no inwarded job cards waiting for assignment."
                      : "No assigned job cards available."}
                </p>
              </div>
            ) : (
              <>
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Showing {displayedJobCards.length} of {filteredJobCards.length} cards</span>
                  {hasMore && (
                    <span className="text-[10px] text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded-full font-bold">
                      Scroll down to load more
                    </span>
                  )}
                </div>

                <div 
                  onScroll={handleListScroll}
                  className="max-h-[280px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar bg-white"
                >
                  {displayedJobCards.map((jc: any) => (
                    <div
                      key={jc.job_entry_id}
                      onClick={() => setSelectedJobEntryId(jc.job_entry_id)}
                      className="p-3.5 px-4 hover:bg-orange-50/50 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-extrabold text-orange-600 text-sm group-hover:text-orange-700">
                            UID: {jc.uid_label}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                            {jc.testCount} {jc.testCount === 1 ? "test" : "tests"}
                          </span>
                          {jc.is_nabl && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200">
                              NABL
                            </span>
                          )}
                          {jc.branch_name && (
                            <span className="text-[10px] text-slate-400">
                              • {jc.branch_name}
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-semibold text-slate-800 truncate" title={jc.client_name}>
                          {jc.client_name}
                          {jc.project_name && jc.project_name !== "N/A" && (
                            <span className="text-slate-500 font-normal"> — {jc.project_name}</span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {jc.tests?.map((t: any) => t.name).join(", ")}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-3 text-xs font-bold text-orange-600 group-hover:bg-orange-500 group-hover:text-white rounded-lg transition-colors"
                        >
                          Select
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <div className="p-2.5 text-center bg-slate-50 border-t border-slate-100 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount(prev => Math.min(prev + 15, filteredJobCards.length))}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-100/70 px-4 py-1.5 rounded-lg border border-orange-200 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>Load Next 15 Cards ({filteredJobCards.length - visibleCount} remaining)</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 2. ASSIGNMENT DETAILS (Employee, Due Date, Notes) */}
      <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className={`grid grid-cols-1 ${branches && branches.length > 1 ? "md:grid-cols-3" : "sm:grid-cols-2"} gap-4`}>
          {branches && branches.length > 1 && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Filter by Branch (Optional)
              </label>
              <Dropdown 
                value={selectedBranch}
                onChange={(val) => {
                  setSelectedBranch(val);
                  setSelectedEmployee("");
                }}
                placeholder="All Branches"
                buttonClassName="w-full bg-white border-slate-200 shadow-2xs h-10"
                options={[
                  { value: "", label: "All Branches" },
                  ...branches.map(b => ({ value: b.id, label: b.name }))
                ]}
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-orange-500" />
                Assign To Engineer *
              </label>

              {selectedEmployee && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterAssignmentsToSelectedEmp(true);
                    setShowAssignmentsView(true);
                  }}
                  className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                >
                  View Workload ({uniqueAssignedJobEntries.filter(a => a.assigned_to === selectedEmployee).length})
                </button>
              )}
            </div>

            <Dropdown 
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              placeholder="Choose Test Engineer"
              buttonClassName="w-full bg-white border-slate-200 shadow-2xs h-10"
              options={filteredEmployees.map(emp => ({
                value: emp.id,
                label: `${emp.first_name} ${emp.last_name}`
              }))}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              Due Date
            </label>
            <PremiumDatePicker 
              value={dueDate}
              onChange={setDueDate}
              align="right"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
            <StickyNote className="w-3.5 h-3.5 text-orange-500" />
            Special Instructions / Notes (Optional)
          </label>
          <textarea 
            className="w-full min-h-[70px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 shadow-2xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors resize-none"
            placeholder="Add any specific instructions or requirements for testing..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* 3. MODAL ACTIONS (View Current Assignments + Cancel + Confirm) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setFilterAssignmentsToSelectedEmp(!!selectedEmployee);
            setShowAssignmentsView(true);
          }}
          className="h-11 px-4 text-xs font-semibold rounded-xl text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5 order-2 sm:order-1"
        >
          <ListTodo className="w-4 h-4 text-orange-500" />
          View Current Assignments
          {selectedEmployee && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
              {uniqueAssignedJobEntries.filter(a => a.assigned_to === selectedEmployee).length}
            </span>
          )}
        </Button>

        <div className="flex items-center justify-end gap-2.5 order-1 sm:order-2">
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="h-11 px-5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </Button>
          )}

          <Button 
            type="button"
            onClick={handleAssign} 
            disabled={loading || !selectedJobCard} 
            className="bg-orange-500 hover:bg-orange-600 text-white h-11 px-6 text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all hover:shadow-lg hover:shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Assigning Job Card...</span>
              </>
            ) : isEditMode ? (
              <span>Update Assignment</span>
            ) : (
              <span>Confirm Assignment</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
