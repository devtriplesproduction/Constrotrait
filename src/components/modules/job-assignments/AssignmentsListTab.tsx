"use client";

import { useState } from "react";
import { format, isSameDay, isThisWeek, isThisMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/Dropdown";
import { Button } from "@/components/ui/button";
import { updateAssignmentStatusAction } from "@/actions/job-assignment.actions";
import { useRouter } from "next/navigation";
import { ClipboardList, X, Search } from "lucide-react";
import { AssignJobsTab } from "./AssignJobsTab";
import { PageHeader } from "@/components/modules/PageHeader";

export function AssignmentsListTab({ assignments, branches, employees, userId, isManager }: { assignments: any[], branches: any[], employees: any[], userId?: string, isManager?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("today");
  const [searchEmployee, setSearchEmployee] = useState<string>("");

  const filteredAssignments = assignments.filter((a) => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;

    if (filterBranch !== "all") {
      const emp = employees.find(e => e.id === a.assigned_to);
      if (!emp || emp.branch_id !== filterBranch) return false;
    }

    if (searchEmployee.trim() !== "") {
      const empName = `${a.assigned_to_profile?.first_name || ""} ${a.assigned_to_profile?.last_name || ""}`.toLowerCase();
      if (!empName.includes(searchEmployee.toLowerCase())) return false;
    }

    if (filterDate !== "all") {
      const dateStr = a.due_date || a.created_at;
      const date = new Date(dateStr);
      const today = new Date();
      if (filterDate === "today" && !isSameDay(date, today)) return false;
      if (filterDate === "week" && !isThisWeek(date)) return false;
      if (filterDate === "month" && !isThisMonth(date)) return false;
    }

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
      case 'accepted':
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="w-full md:w-80 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search employee..."
            value={searchEmployee}
            onChange={(e) => setSearchEmployee(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors shadow-sm bg-white"
          />
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-end flex-1">
          <div className="w-48">
            <Dropdown
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="Filter by Status"
              buttonClassName="bg-white"
              options={[
                { value: "all", label: "All Statuses" },
                { value: "assigned", label: "Assigned" },
                { value: "accepted", label: "Accepted" },
                { value: "in_progress", label: "In Progress" },
                { value: "completed", label: "Completed" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
          </div>
          <div className="w-48">
            <Dropdown
              value={filterBranch}
              onChange={setFilterBranch}
              placeholder="Filter by Branch"
              buttonClassName="bg-white"
              options={[
                { value: "all", label: "All Branches" },
                ...branches.map(b => ({ value: b.id, label: b.name }))
              ]}
            />
          </div>
          <div className="w-48">
            <Dropdown
              value={filterDate}
              onChange={setFilterDate}
              placeholder="Filter by Date"
              buttonClassName="bg-white"
              options={[
                { value: "today", label: "Today" },
                { value: "week", label: "This Week" },
                { value: "month", label: "This Month" },
                { value: "all", label: "All Time" },
              ]}
            />
          </div>
          <Button
            onClick={() => setIsAssignModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
          >
            <ClipboardList className="w-4 h-4" />
            Assign Jobs
          </Button>
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
                  <Button
                    onClick={() => setIsAssignModalOpen(true)}
                    size="sm"
                    variant="outline"
                    className="text-orange-600 hover:text-orange-700 border-orange-200 hover:bg-orange-50"
                  >
                    Edit
                  </Button>
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

      {isAssignModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 sm:p-6 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Assign Job</h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <AssignJobsTab employees={employees} branches={branches} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
