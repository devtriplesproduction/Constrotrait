"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardList, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { assignJobCardAction, getAssignmentsAction } from "@/actions/job-assignment.actions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AssignJobsTab({ teams, employees }: { teams: any[], employees: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [jobEntryTestId, setJobEntryTestId] = useState("");
  const [assignType, setAssignType] = useState<"team" | "employee">("team");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const [existingAssignments, setExistingAssignments] = useState<any[]>([]);

  useEffect(() => {
    const fetchExisting = async () => {
      const res = await getAssignmentsAction();
      if (res.success && res.data) {
        setExistingAssignments(res.data);
      }
    };
    fetchExisting();
  }, []);

  const relevantAssignments = existingAssignments.filter(a => {
    if (dueDate) {
      if (!a.due_date || !a.due_date.startsWith(dueDate)) return false;
    }
    if (assignType === "team" && selectedTeam && a.team_id !== selectedTeam) return false;
    if (assignType === "employee" && selectedEmployee && a.assigned_to !== selectedEmployee) return false;
    return true;
  });

  const handleAssign = async () => {
    if (!jobEntryTestId) return alert("Please enter a Job Entry Test UID (or UUID).");
    if (assignType === "team" && !selectedTeam) return alert("Please select a team.");
    if (assignType === "employee" && !selectedEmployee) return alert("Please select an employee.");

    const alreadyAssigned = existingAssignments.find(a => a.job_entry_test_id === jobEntryTestId || (a.job_entry_tests?.uid && a.job_entry_tests.uid.toString() === jobEntryTestId));
    if (alreadyAssigned) {
      if (!confirm(`This job is already assigned to ${alreadyAssigned.team_id ? alreadyAssigned.teams?.name : alreadyAssigned.assigned_to_profile?.first_name}. Reassign?`)) {
        return;
      }
    }

    setLoading(true);
    const data = {
      job_entry_test_id: alreadyAssigned ? alreadyAssigned.job_entry_test_id : jobEntryTestId, // In case they entered UID, use real ID if found. (For real implementation, would need backend lookup if UID not in existing list, but instructions say UUID is used for now)
      team_id: assignType === "team" ? selectedTeam : undefined,
      assigned_to: assignType === "employee" ? selectedEmployee : undefined,
      due_date: dueDate || undefined,
      notes: notes || undefined,
    };

    const res = await assignJobCardAction(data);
    if (res.success) {
      alert("Job Card assigned successfully!");
      // Refresh assignments
      const refreshRes = await getAssignmentsAction();
      if (refreshRes.success && refreshRes.data) {
        setExistingAssignments(refreshRes.data);
      }
      setJobEntryTestId("");
    } else {
      alert("Error: " + res.error);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
          <ClipboardList className="w-6 h-6 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Assign Job Card</h2>
        <p className="text-slate-500 mt-2">Assign a job card to a team or an individual employee.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Job Card ID</label>
          <Input 
            value={jobEntryTestId} 
            onChange={(e) => setJobEntryTestId(e.target.value)} 
            placeholder="Enter Job Entry Test UID (e.g., 202609...)"
            className="w-full"
          />
          <p className="text-xs text-slate-500 mt-1">Note: Enter the numeric UID of the job card. The backend will automatically resolve it.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Assign To</label>
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="assignType" 
                value="team"
                checked={assignType === "team"}
                onChange={() => setAssignType("team")}
                className="text-orange-500 focus:ring-orange-500"
              />
              <span className="text-slate-700">Team</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="assignType" 
                value="employee"
                checked={assignType === "employee"}
                onChange={() => setAssignType("employee")}
                className="text-orange-500 focus:ring-orange-500"
              />
              <span className="text-slate-700">Employee</span>
            </label>
          </div>

          {assignType === "team" ? (
            <select 
              className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <option value="">Select Team</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          ) : (
            <select 
              className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date (Optional)</label>
            <div className="relative">
              <Input 
                type="date" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="pl-10"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
          <textarea 
            className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
            placeholder="Add any instructions or notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <Button 
          onClick={handleAssign} 
          disabled={loading} 
          className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-lg"
        >
          {loading ? "Assigning..." : "Assign Job Card"}
        </Button>
      </div>

      {(selectedTeam || selectedEmployee || dueDate) && (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Current Assignments for Selection</h3>
          {relevantAssignments.length === 0 ? (
            <p className="text-slate-500 text-sm">No assignments found for this selection.</p>
          ) : (
            <div className="space-y-3">
              {relevantAssignments.map((a: any) => (
                <div key={a.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-orange-600 mr-2">UID: {a.job_entry_tests?.uid}</span>
                    <span className="text-sm font-semibold text-slate-700">Status: {a.status}</span>
                  </div>
                  <div className="text-xs text-slate-500 text-right">
                    Assigned: {new Date(a.created_at).toLocaleDateString()} <br/>
                    Due: {a.due_date ? new Date(a.due_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
