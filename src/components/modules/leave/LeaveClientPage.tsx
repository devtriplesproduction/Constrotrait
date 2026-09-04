"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LeaveForm } from "./LeaveForm";
import { approveLeaveFirstLevelAction, approveLeaveHRAction, rejectLeaveAction, cancelApprovedLeaveAction, verifyMedicalCertificateAction } from "@/actions/leave.actions";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, FileText, UserCircle2, Ban, Plus } from "lucide-react";
import { PageHeader } from "@/components/modules/PageHeader";
import { Modal } from "@/components/common/Modal";
import { UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePrompt } from "@/hooks/use-prompt";

export function LeaveClientPage({ myLeaves, canApprove, leavesToApprove, isHR, compOffBalance, isSuperAdmin = false }: {
  myLeaves: Record<string, unknown>[],
  canApprove: boolean,
  leavesToApprove: Record<string, unknown>[],
  isHR: boolean,
  compOffBalance: number,
  isSuperAdmin?: boolean
}) {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"mine" | "approve">(isSuperAdmin ? "approve" : "mine");
  const [uploadingCertFor, setUploadingCertFor] = useState<string | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUploadAndVerify = async () => {
    if (!uploadingCertFor || !certFile) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const fileExt = certFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { data, error } = await supabase.storage
        .from("medical-certificates")
        .upload(filePath, certFile);

      if (error) {
        throw new Error(error.message);
      }

      let certificateUrl = "";
      if (data) {
        const { data: publicUrlData } = supabase.storage
          .from("medical-certificates")
          .getPublicUrl(filePath);
        certificateUrl = publicUrlData.publicUrl;
      }

      await handleAction(verifyMedicalCertificateAction as any, uploadingCertFor, certificateUrl);
      setUploadingCertFor(null);
      setCertFile(null);
    } catch (e: any) {
      toast({ title: "Upload Failed", description: e.message, variant: "error" });
    } finally {
      setUploading(false);
    }
  };
  const { toast } = useToast();
  const { prompt, PromptComponent } = usePrompt();

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

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'Approved': 
        return { color: 'bg-green-50/80 text-green-700 border-green-100/50', icon: CheckCircle2 };
      case 'Rejected':
      case 'Cancelled': 
        return { color: 'bg-red-50/80 text-red-700 border-red-100/50', icon: XCircle };
      case 'Pending First Level':
      case 'Pending HR':
      default: 
        return { color: 'bg-amber-50/80 text-amber-700 border-amber-100/50', icon: Clock };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-6">
        <PageHeader
          title="Leave Management"
          subtitle="Manage your leaves and approvals from one place."
          icon={Calendar}
          className="flex-1 w-auto"
        />

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full 2xl:w-auto overflow-x-auto pb-2 2xl:pb-0">
          {canApprove && (
            <div className="flex p-1.5 space-x-1.5 bg-white/40 backdrop-blur-xl rounded-2xl shrink-0 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              {!isSuperAdmin && (
                <button 
                  className={`py-2.5 px-4 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === 'mine' ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'}`}
                  onClick={() => setActiveTab('mine')}
                >
                  My Leaves
                </button>
              )}
              <button 
                className={`py-2.5 px-4 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === 'approve' ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'}`}
                onClick={() => setActiveTab('approve')}
              >
                <div className="flex items-center justify-center gap-2">
                  Approvals
                  {leavesToApprove.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm ${activeTab === 'approve' ? 'bg-white text-orange-600' : 'bg-red-500 text-white'}`}>
                      {leavesToApprove.length}
                    </span>
                  )}
                </div>
              </button>
            </div>
          )}

          {!isSuperAdmin && (
            <div className="bg-blue-50 text-blue-700 px-4 py-2.5 rounded-xl font-medium shrink-0">
              Comp-Off Balance: <span className="font-bold">{compOffBalance}</span> hours
            </div>
          )}

          {!showForm && activeTab === 'mine' && !isSuperAdmin && (
            <Button onClick={() => setShowForm(true)} className="rounded-xl shadow-lg shrink-0 shadow-orange-500/20 transition-all hover:shadow-orange-500/40 hover:-translate-y-0.5 h-[44px]">
              <Plus className="w-4 h-4 mr-2" /> Apply Leave
            </Button>
          )}
        </div>
      </div>
      {activeTab === 'mine' && (
        <div className="space-y-6">
          {showForm && (
            <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 mb-8 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-400/10 to-transparent rounded-bl-full -mr-16 -mt-16 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  New Leave Application
                </h3>
                <LeaveForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
              </div>
            </div>
          )}

          {myLeaves.length === 0 && !showForm ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white/40 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="w-20 h-20 bg-orange-100/50 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No Leave History</h3>
              <p className="text-slate-500 text-center max-w-sm">
                {isSuperAdmin ? "Super admins do not apply for leaves." : "You haven't applied for any leaves yet. Click the Apply Leave button to create your first request."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {myLeaves.map((leave: Record<string, any>, idx) => {
                const statusConfig = getStatusConfig(leave.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div 
                    key={leave.id as string} 
                    className="group relative bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(249,115,22,0.12)] rounded-3xl p-6 transition-all duration-500 hover:-translate-y-1 overflow-hidden"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110" />
                    
                    <div className="relative z-10 flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/40 transition-shadow">
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">{leave.start_date ? format(new Date(leave.start_date), "MMM") : ""}</span>
                          <span className="text-xl font-black leading-none mt-0.5">{leave.start_date ? format(new Date(leave.start_date), "dd") : ""}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{leave.leave_type}</h3>
                          <p className="text-sm font-medium text-slate-500">
                            {leave.start_date ? format(new Date(leave.start_date), "MMM dd, yyyy") : ""} 
                            {!leave.is_half_day && leave.end_date && ` - ${format(new Date(leave.end_date), "MMM dd, yyyy")}`}
                            {leave.is_half_day && " (Half Day)"}
                          </p>
                        </div>
                      </div>
                      
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border ${statusConfig.color} whitespace-nowrap`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {leave.status}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 mb-6 line-clamp-2 relative z-10">
                      {leave.reason}
                    </p>

                    {leave.rejection_reason && (
                      <div className="mb-6 relative z-10 p-3 rounded-2xl bg-red-50/80 border border-red-100/50 flex gap-2 text-sm text-red-700">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold block mb-0.5">Rejection Reason</span>
                          {leave.rejection_reason}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] font-bold border ${leave.is_paid ? 'bg-green-50/80 text-green-700 border-green-100/50' : 'bg-slate-100/80 text-slate-600 border-slate-200/50'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${leave.is_paid ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                          {leave.is_paid ? "Paid" : "Unpaid"}
                        </span>
                      </div>
                      
                      {leave.status === 'Approved' && isHR && (
                        <Button variant="danger" size="sm" className="rounded-xl shadow-sm h-8" onClick={() => handleAction(cancelApprovedLeaveAction as any, leave.id as string)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'approve' && (
        <div className="space-y-6">
          {leavesToApprove.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white/40 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="w-20 h-20 bg-green-100/50 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">All caught up!</h3>
              <p className="text-slate-500 text-center max-w-sm">
                There are no pending leave requests awaiting your approval right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {leavesToApprove.map((leave: Record<string, any>, idx) => {
                const statusConfig = getStatusConfig(leave.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div 
                    key={leave.id as string}
                    className="group relative bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(249,115,22,0.12)] rounded-3xl p-6 transition-all duration-500 hover:-translate-y-1 overflow-hidden"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-orange-400/10 to-transparent rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
                    
                    <div className="flex flex-col md:flex-row gap-6 relative z-10">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30">
                              <UserCircle2 className="w-7 h-7" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                                {leave.profiles?.first_name || 'Unknown'} {leave.profiles?.last_name || 'User'}
                              </h3>
                              <p className="text-sm font-bold text-orange-600">{leave.leave_type}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border ${statusConfig.color} whitespace-nowrap`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {leave.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 bg-white/50 p-4 rounded-2xl border border-white">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date</span>
                            <div className="font-medium text-slate-700 text-sm">
                              {leave.start_date ? format(new Date(leave.start_date), "MMM dd, yyyy") : ""} 
                              {!leave.is_half_day && leave.end_date && ` - ${format(new Date(leave.end_date), "MMM dd, yyyy")}`}
                              {leave.is_half_day && <span className="text-xs text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded ml-2">Half Day</span>}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Type</span>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${leave.is_paid ? 'bg-green-50/80 text-green-700 border-green-100/50' : 'bg-slate-100/80 text-slate-600 border-slate-200/50'}`}>
                              {leave.is_paid ? "Paid Leave" : "Unpaid Leave"}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Reason</span>
                          <p className="text-sm text-slate-600 line-clamp-2">{leave.reason}</p>
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col gap-2 md:min-w-[140px] justify-center md:border-l border-slate-200/60 md:pl-6">
                        {leave.status === 'Pending First Level' && (!isHR || isSuperAdmin) && (
                          <>
                            <Button className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 shadow-sm" onClick={() => handleAction(approveLeaveFirstLevelAction as any, leave.id as string)}>
                              Approve
                            </Button>
                            <Button variant="outline" className="w-full rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={async () => {
                              const reason = await prompt("Rejection reason:");
                              if (reason) handleAction(rejectLeaveAction as any, leave.id as string, reason);
                            }}>
                              Reject
                            </Button>
                          </>
                        )}
                        {leave.status === 'Pending HR' && isHR && (
                          <>
                            <Button className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 shadow-sm" onClick={() => handleAction(approveLeaveHRAction as any, leave.id as string)}>
                              Approve
                            </Button>
                            <Button variant="outline" className="w-full rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={async () => {
                              const reason = await prompt("Rejection reason:");
                              if (reason) handleAction(rejectLeaveAction as any, leave.id as string, reason);
                            }}>
                              Reject
                            </Button>
                          </>
                        )}
                        {leave.leave_type === 'Sick Leave' && !leave.is_paid && isHR && !leave.medical_certificate_url && (
                            <Button variant="secondary" className="w-full rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 shadow-sm" onClick={() => setUploadingCertFor(leave.id as string)}>
                              Upload Cert
                            </Button>
                          )}
                          {leave.leave_type === 'Sick Leave' && leave.medical_certificate_url && (
                            <Button variant="secondary" className="w-full rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-sm" onClick={() => window.open(leave.medical_certificate_url as string, '_blank')}>
                              View Cert
                            </Button>
                          )}
                        {leave.status === 'Approved' && isHR && (
                          <Button variant="danger" className="w-full rounded-xl shadow-sm" onClick={() => handleAction(cancelApprovedLeaveAction as any, leave.id as string)}>
                            Cancel Leave
                          </Button>
                        )}
                        
                        {!((leave.status === 'Pending First Level' && (!isHR || isSuperAdmin)) || (leave.status === 'Pending HR' && isHR) || (leave.leave_type === 'Sick Leave' && !leave.is_paid && isHR) || (leave.status === 'Approved' && isHR)) && (
                          <div className="text-center text-xs text-slate-400 font-bold uppercase tracking-wider py-4">
                            No Actions
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <PromptComponent />
      
      <Modal isOpen={!!uploadingCertFor} onClose={() => setUploadingCertFor(null)}>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-800">Upload Medical Certificate</h2>
        </div>
        <div className="space-y-4 pt-4">
          <div className="border-2 border-dashed border-orange-200 bg-white rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-center relative">
            <input 
              type="file" 
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setCertFile(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <UploadCloud className="w-8 h-8 text-orange-400" />
            <div className="text-sm text-slate-600">
              {certFile ? (
                <span className="font-medium text-orange-600">{certFile.name}</span>
              ) : (
                <span><span className="font-semibold text-orange-600">Click to upload</span> or drag and drop</span>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setUploadingCertFor(null); setCertFile(null); }} disabled={uploading}>Cancel</Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleUploadAndVerify} disabled={uploading || !certFile}>
              {uploading ? "Uploading..." : "Upload & Verify"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}







