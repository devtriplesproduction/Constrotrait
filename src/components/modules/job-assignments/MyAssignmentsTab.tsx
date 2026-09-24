"use client";

import { useState } from "react";
import { updateAssignmentStatusAction } from "@/actions/job-assignment.actions";
import { Loader2, Check, X, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/modules/PageHeader";

export function MyAssignmentsTab({ assignments, userId }: { assignments: any[], userId: string }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const myAssignments = assignments.filter((a: any) => {
    if (a.assigned_to === userId) return true;
    if (a.teams?.team_members?.some((m: any) => m.employee_id === userId)) return true;
    return false;
  });

  const handleStatusUpdate = async (id: string, status: string) => {
    setLoadingId(id);
    const res = await updateAssignmentStatusAction(id, status);
    if (!res.success) {
      alert("Error: " + res.error);
    }
    setLoadingId(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader 
        title="My Assignments"
        subtitle="Jobs assigned to you or your team."
        icon={ClipboardList}
        className="mb-8"
      />

      {myAssignments.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
          No assignments found.
        </div>
      ) : (
        <div className="space-y-4">
          {myAssignments.map((a: any) => (
            <div key={a.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md text-sm border border-orange-100">
                    UID: {a.job_entry_tests?.uid}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                    a.status === 'completed' ? 'bg-green-100 text-green-700' :
                    a.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    a.status === 'accepted' ? 'bg-indigo-100 text-indigo-700' :
                    a.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {a.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">Test:</span> {a.job_entry_tests?.test_master?.specific_test || a.job_entry_tests?.test_master?.component_parameter || 'N/A'}
                </p>
                {a.due_date && (
                  <p className="text-sm text-slate-600">
                    <span className="font-medium text-slate-800">Due:</span> {new Date(a.due_date).toLocaleDateString()}
                  </p>
                )}
                {a.notes && (
                  <p className="text-sm text-slate-600 mt-1 italic">"{a.notes}"</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {a.status === 'assigned' && (
                  <>
                    <Button 
                      size="sm" 
                      onClick={() => handleStatusUpdate(a.id, 'accepted')}
                      disabled={loadingId === a.id}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {loadingId === a.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                      Accept
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusUpdate(a.id, 'rejected')}
                      disabled={loadingId === a.id}
                      className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                    >
                      {loadingId === a.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <X className="w-4 h-4 mr-1" />}
                      Reject
                    </Button>
                  </>
                )}
                
                {(a.status === 'accepted' || a.status === 'in_progress') && (
                  <>
                    {a.status === 'accepted' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleStatusUpdate(a.id, 'in_progress')}
                        disabled={loadingId === a.id}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Start Progress
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      onClick={() => handleStatusUpdate(a.id, 'completed')}
                      disabled={loadingId === a.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Mark Complete
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
