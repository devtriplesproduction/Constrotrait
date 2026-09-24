"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardList, Calendar, User, FileText, StickyNote, ArrowLeft, Edit2 } from "lucide-react";
import { assignJobCardAction, getAssignmentsAction, getUnassignedJobCardsAction } from "@/actions/job-assignment.actions";
import { useRouter } from "next/navigation";
import { Dropdown } from "@/components/ui/Dropdown";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";
import { toast } from "@/hooks/use-toast";

export function AssignJobsTab({ employees, teams, branches }: { employees: any[], teams?: any[], branches?: any[] }) {
  const router = useRouter();
  const [showAssignmentsView, setShowAssignmentsView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [jobEntryTestId, setJobEntryTestId] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [assignType, setAssignType] = useState<"employee" | "team">("employee");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const [existingAssignments, setExistingAssignments] = useState<any[]>([]);
  const [unassignedJobCards, setUnassignedJobCards] = useState<any[]>([]);

  const fetchExisting = async () => {
    const res = await getAssignmentsAction();
    if (res.success && res.data) {
      setExistingAssignments(res.data);
    }
    const unassignedRes = await getUnassignedJobCardsAction();
    if (unassignedRes.success && unassignedRes.data) {
      setUnassignedJobCards(unassignedRes.data);
    }
  };

  useEffect(() => {
    fetchExisting();
  }, []);

  const allJobCards = [
    ...unassignedJobCards.map(uc => ({
      id: uc.id,
      uid: uc.uid,
      name: uc.test_master ? `${uc.test_master.component_parameter || ''} - ${uc.test_master.specific_test || ''}` : "Unknown Test",
      category: uc.test_master?.category || "Unknown Category",
      status: "Unassigned",
      isAssigned: false
    })),
    ...existingAssignments.map(ea => ({
      id: ea.job_entry_test_id,
      uid: ea.job_entry_tests?.uid,
      name: ea.job_entry_tests?.test_master ? `${ea.job_entry_tests.test_master.component_parameter || ''} - ${ea.job_entry_tests.test_master.specific_test || ''}` : "Unknown Test",
      category: ea.job_entry_tests?.test_master?.category || "Unknown Category",
      status: ea.status || "Assigned",
      isAssigned: true,
      assignmentDetails: ea
    }))
  ];

  const relevantAssignments = existingAssignments.filter(a => {
    if (dueDate && (!a.due_date || !a.due_date.startsWith(dueDate))) return false;
    if (assignType === "employee" && selectedEmployee && a.assigned_to !== selectedEmployee) return false;
    if (assignType === "team" && selectedTeam && a.team_id !== selectedTeam) return false;
    return true;
  });

  const filteredEmployees = employees.filter(emp => {
    if (selectedBranch && emp.branch_id !== selectedBranch) return false;
    return true;
  });

  const handleAssign = async () => {
    if (!jobEntryTestId) return toast({ title: "Validation Error", description: "Please enter a Job Entry Test UID (or UUID).", variant: "warning" });
    if (assignType === "employee" && !selectedEmployee) return toast({ title: "Validation Error", description: "Please select an employee.", variant: "warning" });
    if (assignType === "team" && !selectedTeam) return toast({ title: "Validation Error", description: "Please select a team.", variant: "warning" });

    const alreadyAssigned = existingAssignments.find(a => a.job_entry_test_id === jobEntryTestId || (a.job_entry_tests?.uid && a.job_entry_tests.uid.toString() === jobEntryTestId));
    
    let isJustUpdate = false;
    let updateMessage = "Job Card reassigned successfully!";

    if (alreadyAssigned) {
      if ((assignType === "employee" && alreadyAssigned.assigned_to === selectedEmployee) ||
          (assignType === "team" && alreadyAssigned.team_id === selectedTeam)) {
        isJustUpdate = true;
        const oldDate = alreadyAssigned.due_date ? alreadyAssigned.due_date.substring(0, 10) : "";
        const newDate = dueDate ? dueDate.substring(0, 10) : "";
        const oldNotes = alreadyAssigned.notes || "";
        const newNotes = notes || "";

        if (oldDate !== newDate && oldNotes !== newNotes) {
          updateMessage = "Due date and notes updated successfully!";
        } else if (oldDate !== newDate) {
          updateMessage = "Due date updated successfully!";
        } else if (oldNotes !== newNotes) {
          updateMessage = "Notes updated successfully!";
        } else {
          updateMessage = "Assignment details updated successfully!";
        }
      } else {
        if (!confirm(`This job is already assigned to another employee. Reassign?`)) {
          return;
        }
      }
    }

    setLoading(true);
    const data = {
      job_entry_test_id: alreadyAssigned ? alreadyAssigned.job_entry_test_id : jobEntryTestId,
      assigned_to: assignType === "employee" ? selectedEmployee : undefined,
      team_id: assignType === "team" ? selectedTeam : undefined,
      due_date: dueDate || undefined,
      notes: notes || undefined,
    };

    const res = await assignJobCardAction(data);
    if (res.success) {
      const msg = alreadyAssigned 
         ? (isJustUpdate ? updateMessage : "Job Card reassigned successfully!") 
         : "Job Card assigned successfully!";
      toast({ title: "Success", description: msg, variant: "success" });
      fetchExisting();
      setJobEntryTestId("");
    } else {
      toast({ title: "Error", description: res.error, variant: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="w-full">
      {!showAssignmentsView ? (
        <>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 mb-6">
            <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" />
              Assignment Details
            </h4>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Select Job Card</label>
                <Dropdown 
                  value={jobEntryTestId} 
                  onChange={setJobEntryTestId} 
                  placeholder="Select a Job Card"
                  buttonClassName="w-full bg-white border-slate-200"
                  options={allJobCards.map(jc => ({
                    value: jc.uid?.toString() || "",
                    label: `${jc.category} , ${jc.name} UID: ${jc.uid} (${jc.status})`
                  }))}
                />
              </div>

              {branches && branches.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                    Filter by Branch (Optional)
                  </label>
                  <Dropdown 
                    value={selectedBranch}
                    onChange={(val) => {
                      setSelectedBranch(val);
                      setSelectedEmployee(""); // Reset employee when branch changes
                    }}
                    placeholder="All Branches"
                    buttonClassName="w-full bg-white border-slate-200"
                    options={[
                      { value: "", label: "All Branches" },
                      ...branches.map(b => ({
                        value: b.id,
                        label: b.name
                      }))
                    ]}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        name="assignType" 
                        checked={assignType === "employee"} 
                        onChange={() => {
                          setAssignType("employee");
                          setSelectedTeam("");
                        }}
                        className="accent-orange-500"
                      />
                      Employee
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        name="assignType" 
                        checked={assignType === "team"} 
                        onChange={() => {
                          setAssignType("team");
                          setSelectedEmployee("");
                        }}
                        className="accent-orange-500"
                      />
                      Team
                    </label>
                  </div>
                  
                  {assignType === "employee" ? (
                    <>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Assign To Employee
                      </label>
                      <Dropdown 
                        value={selectedEmployee}
                        onChange={setSelectedEmployee}
                        placeholder="Select Employee"
                        buttonClassName="w-full bg-white border-slate-200"
                        options={filteredEmployees.map(emp => ({
                          value: emp.id,
                          label: `${emp.first_name} ${emp.last_name}`
                        }))}
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Assign To Team
                      </label>
                      <Dropdown 
                        value={selectedTeam}
                        onChange={setSelectedTeam}
                        placeholder="Select Team"
                        buttonClassName="w-full bg-white border-slate-200"
                        options={(teams || []).map(t => ({
                          value: t.id,
                          label: t.name
                        }))}
                      />
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Due Date (Optional)
                  </label>
                  <div className="relative">
                    <PremiumDatePicker 
                      value={dueDate}
                      onChange={setDueDate}
                      align="right"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5" /> Notes (Optional)
                </label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all duration-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 hover:border-slate-300 text-slate-800 resize-none"
                  placeholder="Add any instructions or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => setShowAssignmentsView(true)}
              className="w-full h-12 text-sm font-semibold rounded-xl text-slate-700 border-slate-200 hover:bg-slate-50"
            >
              View Current Assignments
            </Button>

            <Button 
              onClick={handleAssign} 
              disabled={loading} 
              className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-sm font-semibold rounded-xl shadow-md shadow-orange-500/20 transition-all hover:shadow-lg hover:shadow-orange-500/30"
            >
              {loading ? "Processing..." : (allJobCards.find(jc => jc.uid?.toString() === jobEntryTestId)?.isAssigned ? "Reassign Job Card" : "Confirm Assignment")}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col h-[480px]">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-5 mb-4 shadow-md text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div>
              <h3 className="font-bold flex items-center gap-2 text-lg">
                <ClipboardList className="w-5 h-5 text-white/90" />
                Employee Assignments
              </h3>
              <p className="text-white/80 text-xs mt-1">
                View and manage currently assigned job cards
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowAssignmentsView(false)}
              className="text-xs h-9 bg-white text-orange-600 hover:bg-orange-50 font-semibold shadow-sm w-full sm:w-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Back to Form
            </Button>
          </div>
          
          <div className="flex-1 min-h-0 bg-slate-50/50 rounded-xl border border-slate-100 p-2">
            {((assignType === "employee" && !selectedEmployee) || (assignType === "team" && !selectedTeam)) && !dueDate ? (
              <div className="bg-white rounded-xl p-8 text-center border border-slate-200 border-dashed h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                  <User className="w-8 h-8" />
                </div>
                <h4 className="text-slate-700 font-semibold mb-1">Select {assignType === "employee" ? "an Employee" : "a Team"}</h4>
                <p className="text-slate-500 text-sm max-w-[250px]">Please select {assignType === "employee" ? "an employee" : "a team"} or date from the form to view their assignments.</p>
              </div>
            ) : relevantAssignments.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-slate-200 border-dashed h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                  <ClipboardList className="w-8 h-8" />
                </div>
                <h4 className="text-slate-700 font-semibold mb-1">No Assignments Found</h4>
                <p className="text-slate-500 text-sm max-w-[250px]">There are no job cards assigned for this selection.</p>
              </div>
            ) : (
              <div className="space-y-3 h-full overflow-y-auto pr-2 custom-scrollbar">
                {relevantAssignments.map((a: any) => (
                  <div 
                    key={a.id} 
                    className="p-4 bg-white border border-slate-200 rounded-xl flex flex-wrap lg:flex-nowrap items-center gap-4 lg:gap-6 cursor-pointer hover:border-orange-400 hover:shadow-md transition-all duration-300 group"
                    onClick={() => {
                      setJobEntryTestId(a.job_entry_tests?.uid.toString());
                      if (a.team_id) {
                        setAssignType("team");
                        setSelectedTeam(a.team_id);
                        setSelectedEmployee("");
                      } else {
                        setAssignType("employee");
                        setSelectedEmployee(a.assigned_to || "");
                        setSelectedTeam("");
                      }
                      setDueDate(a.due_date || "");
                      setNotes(a.notes || "");
                      setShowAssignmentsView(false);
                    }}
                  >
                    {/* TEST NAME */}
                    <div className="flex items-center gap-3 min-w-[200px] flex-1">
                      <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Test Name</div>
                        <div className="font-semibold text-slate-800 text-sm truncate" title={a.job_entry_tests?.test_master ? `${a.job_entry_tests.test_master.component_parameter || 'Unknown'} - ${a.job_entry_tests.test_master.specific_test || 'Test'}` : `Job Card #${a.job_entry_tests?.uid}`}>
                          {a.job_entry_tests?.test_master ? `${a.job_entry_tests.test_master.component_parameter || 'Unknown'} - ${a.job_entry_tests.test_master.specific_test || 'Test'}` : `Job Card #${a.job_entry_tests?.uid}`}
                        </div>
                      </div>
                    </div>

                    {/* UID */}
                    <div className="flex items-center gap-3 shrink-0 lg:border-l lg:border-slate-100 lg:pl-6">
                      <div className="w-9 h-9 rounded-full bg-orange-50 text-orange-400 flex items-center justify-center shrink-0">
                        <ClipboardList className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">UID</div>
                        <div className="font-semibold text-slate-800 text-sm">{a.job_entry_tests?.uid}</div>
                      </div>
                    </div>

                    {/* ASSIGNED */}
                    <div className="flex items-center gap-3 shrink-0 lg:border-l lg:border-slate-100 lg:pl-6">
                      <div className="w-9 h-9 rounded-full bg-orange-50 text-orange-400 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Assigned</div>
                        <div className="font-semibold text-slate-800 text-sm">{new Date(a.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {/* DUE DATE */}
                    <div className="flex items-center gap-3 shrink-0 lg:border-l lg:border-slate-100 lg:pl-6">
                      <div className="w-9 h-9 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Due Date</div>
                        <div className="font-semibold text-slate-800 text-sm">{a.due_date ? new Date(a.due_date).toLocaleDateString() : 'N/A'}</div>
                      </div>
                    </div>

                    {/* STATUS */}
                    <div className="flex items-center gap-3 shrink-0 lg:border-l lg:border-slate-100 lg:pl-6">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Status</div>
                        <div className="font-semibold text-slate-800 text-sm capitalize">{a.status}</div>
                      </div>
                    </div>

                    {/* EDIT BUTTON */}
                    <div className="shrink-0 lg:border-l lg:border-slate-100 lg:pl-6 ml-auto lg:ml-0">
                      <Button size="sm" className="bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white border-0 shadow-none transition-colors duration-300 shrink-0 h-9 px-4 flex items-center gap-1.5">
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
