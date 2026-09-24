"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Select, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { updateAssignmentStatusAction } from "@/actions/job-assignment.actions";
import { useRouter } from "next/navigation";

export function AssignmentsListTab({ assignments, teams, employees }: { assignments: any[], teams: any[], employees: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");

  const filteredAssignments = assignments.filter((a) => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterTeam !== "all" && a.team_id !== filterTeam) return false;
    return true;
  });

  const handleStatusChange = async (id: string, newStatus: string) => {
    setLoading(true);
    const res = await updateAssignmentStatusAction(id, newStatus);
    if (!res.success) {
      alert("Error updating status: " + res.error);
    } else {
      router.refresh();
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Assigned</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Job Assignments</h2>
        
        <div className="flex gap-4">
          <div className="w-48">
            <Select 
              value={filterStatus} 
              onValueChange={setFilterStatus}
              placeholder="Filter by Status"
              buttonClassName="bg-white"
            >
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </Select>
          </div>
          <div className="w-48">
            <Select 
              value={filterTeam} 
              onValueChange={setFilterTeam}
              placeholder="Filter by Team"
              buttonClassName="bg-white"
            >
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-4">Job Card (UID)</th>
              <th className="px-6 py-4">Test</th>
              <th className="px-6 py-4">Assigned To</th>
              <th className="px-6 py-4">Due Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredAssignments.map((assignment) => (
              <tr key={assignment.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">
                  {assignment.job_entry_tests?.uid ? `UID: ${assignment.job_entry_tests.uid}` : 'Unknown'}
                  <div className="text-xs text-slate-400 mt-1" title={assignment.job_entry_test_id}>UUID: {assignment.job_entry_test_id.slice(0,8)}...</div>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {assignment.job_entry_tests?.test_master ? `${assignment.job_entry_tests.test_master.component_parameter || ''} - ${assignment.job_entry_tests.test_master.specific_test || ''}` : 'N/A'}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {assignment.team_id ? (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{assignment.teams?.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">Team</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">
                        {assignment.assigned_to_profile?.first_name} {assignment.assigned_to_profile?.last_name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">Employee</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {assignment.due_date ? format(new Date(assignment.due_date), 'dd MMM, yyyy') : '-'}
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(assignment.status)}
                </td>
                <td className="px-6 py-4">
                  <Select 
                    value={assignment.status} 
                    onValueChange={(val) => handleStatusChange(assignment.id, val)}
                    disabled={loading}
                    placeholder="Update Status"
                    buttonClassName="w-[130px] h-8 text-xs"
                  >
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </Select>
                </td>
              </tr>
            ))}
            {filteredAssignments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  No assignments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
