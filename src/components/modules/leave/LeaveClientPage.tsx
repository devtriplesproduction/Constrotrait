"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LeaveForm } from "./LeaveForm";
import { approveLeaveFirstLevelAction, approveLeaveHRAction, rejectLeaveAction, cancelApprovedLeaveAction, verifyMedicalCertificateAction } from "@/actions/leave.actions";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function LeaveClientPage({ myLeaves, canApprove, leavesToApprove, isHR }: {
  myLeaves: Record<string, unknown>[],
  canApprove: boolean,
  leavesToApprove: Record<string, unknown>[],
  isHR: boolean
}) {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"mine" | "approve">("mine");
  const { toast } = useToast();

  const handleAction = async (action: (id: string, extra: string) => Promise<any>, id: string, extra?: string) => {
    try {
      const res = extra !== undefined ? await action(id, extra) : await action(id, "");
      if (res.success) {
        toast({ title: "Success", variant: "success" });
      } else {
        toast({ title: "Error", description: res.error, variant: "error" });
      }
    } catch (e: unknown) {
      console.error(e);
      toast({ title: "Error", description: "Unexpected error", variant: "error" });
    }
  };

  const statusColor = (status: string) => {
    switch(status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected':
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      {canApprove && (
        <div className="flex space-x-4 border-b">
          <button 
            className={`py-2 px-4 border-b-2 ${activeTab === 'mine' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
            onClick={() => setActiveTab('mine')}
          >
            My Leaves
          </button>
          <button 
            className={`py-2 px-4 border-b-2 ${activeTab === 'approve' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
            onClick={() => setActiveTab('approve')}
          >
            Leaves to Approve ({leavesToApprove.length})
          </button>
        </div>
      )}

      {activeTab === 'mine' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">My Leave History</h2>
            {!showForm && <Button onClick={() => setShowForm(true)}>Apply Leave</Button>}
          </div>

          {showForm && (
            <Card className="p-4 mb-6">
              <LeaveForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
            </Card>
          )}

          <div className="grid gap-4">
            {myLeaves.map((leave: Record<string, any>) => (
              <Card key={leave.id as string} className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium text-lg">{leave.leave_type}</div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(leave.start_date), "MMM dd, yyyy")} 
                    {!leave.is_half_day && ` to ${format(new Date(leave.end_date), "MMM dd, yyyy")}`}
                    {leave.is_half_day && " (Half Day)"}
                  </div>
                  <div className="text-sm mt-1">{leave.reason}</div>
                  {leave.rejection_reason && <div className="text-sm text-red-600 mt-1">Rejection: {leave.rejection_reason}</div>}
                  <div className="text-sm mt-1 font-medium text-gray-700">Paid: {leave.is_paid ? "Yes" : "No"}</div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${statusColor(leave.status)}`}>
                    {leave.status}
                  </span>
                  {leave.status === 'Approved' && isHR && (
                     <Button size="sm" variant="danger" onClick={() => handleAction(cancelApprovedLeaveAction as any, leave.id as string)}>Cancel</Button>
                  )}
                </div>
              </Card>
            ))}
            {myLeaves.length === 0 && <p className="text-gray-500 text-center py-4">No leave history found.</p>}
          </div>
        </div>
      )}

      {activeTab === 'approve' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Pending Approvals</h2>
          <div className="grid gap-4">
            {leavesToApprove.map((leave: Record<string, any>) => (
              <Card key={leave.id as string} className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium text-lg">{leave.profiles.first_name} {leave.profiles.last_name} - {leave.leave_type}</div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(leave.start_date), "MMM dd, yyyy")} 
                    {!leave.is_half_day && ` to ${format(new Date(leave.end_date), "MMM dd, yyyy")}`}
                    {leave.is_half_day && " (Half Day)"}
                  </div>
                  <div className="text-sm mt-1">{leave.reason}</div>
                  <div className="text-sm mt-1 font-medium text-gray-700">Paid: {leave.is_paid ? "Yes" : "No"}</div>
                  <span className={`px-2 py-0.5 rounded-full text-xs mt-2 inline-block ${statusColor(leave.status)}`}>
                    {leave.status}
                  </span>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  {leave.status === 'Pending First Level' && !isHR && (
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={() => handleAction(approveLeaveFirstLevelAction as any, leave.id as string)}>Approve</Button>
                      <Button size="sm" variant="danger" onClick={() => {
                        const reason = window.prompt("Rejection reason:");
                        if (reason) handleAction(rejectLeaveAction as any, leave.id as string, reason);
                      }}>Reject</Button>
                    </div>
                  )}
                  {leave.status === 'Pending HR' && isHR && (
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={() => handleAction(approveLeaveHRAction as any, leave.id as string)}>Approve HR</Button>
                      <Button size="sm" variant="danger" onClick={() => {
                        const reason = window.prompt("Rejection reason:");
                        if (reason) handleAction(rejectLeaveAction as any, leave.id as string, reason);
                      }}>Reject</Button>
                    </div>
                  )}
                  {leave.leave_type === 'Sick Leave' && !leave.is_paid && isHR && (
                    <Button size="sm" variant="outline" onClick={() => handleAction(verifyMedicalCertificateAction as any, leave.id as string)}>Verify Certificate</Button>
                  )}
                  {leave.status === 'Approved' && isHR && (
                     <Button size="sm" variant="danger" onClick={() => handleAction(cancelApprovedLeaveAction as any, leave.id as string)}>Cancel Approved</Button>
                  )}
                </div>
              </Card>
            ))}
            {leavesToApprove.length === 0 && <p className="text-gray-500 text-center py-4">No pending approvals.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
