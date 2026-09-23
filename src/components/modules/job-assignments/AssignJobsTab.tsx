"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardList, Calendar } from "lucide-react";
import { assignJobCardAction } from "@/actions/job-assignment.actions";
import { useRouter } from "next/navigation";

export function AssignJobsTab({ teams, employees }: { teams: any[], employees: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [jobEntryTestId, setJobEntryTestId] = useState("");
  const [assignType, setAssignType] = useState<"team" | "employee">("team");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleAssign = async () => {
    if (!jobEntryTestId) return alert("Please enter a Job Entry Test ID (UUID) or UID to search (Implementation needed for UID search, currently expects UUID).");
    if (assignType === "team" && !selectedTeam) return alert("Please select a team.");
    if (assignType === "employee" && !selectedEmployee) return alert("Please select an employee.");

    setLoading(true);
    const data = {
      job_entry_test_id: jobEntryTestId,
      team_id: assignType === "team" ? selectedTeam : undefined,
      assigned_to: assignType === "employee" ? selectedEmployee : undefined,
      due_date: dueDate || undefined,
      notes: notes || undefined,
    };

    const res = await assignJobCardAction(data);
    if (res.success) {
      alert("Job Card assigned successfully!");
      router.push("/job-assignments?tab=list");
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
            placeholder="Enter Job Entry Test UUID"
            className="w-full"
          />
          <p className="text-xs text-slate-500 mt-1">Note: Enter the exact UUID of the job_entry_tests record for now.</p>
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
    </div>
  );
}
