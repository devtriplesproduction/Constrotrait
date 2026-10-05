"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateAssignmentStatusAction } from "@/actions/job-assignment.actions";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Check, X, Download, Play, Upload, Eye, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function JobAssignmentActions({ assignment, currentUserId }: { assignment: any, currentUserId: string }) {
  const [loading, setLoading] = useState(false);
  const [remarkMode, setRemarkMode] = useState<"approve" | "reject" | null>(null);
  const [remark, setRemark] = useState("");
  const router = useRouter();

  const handleStatusUpdate = async (status: string, payload?: any) => {
    setLoading(true);
    try {
      const res = await updateAssignmentStatusAction(assignment.id, status, payload);
      if (res.success) {
        toast({ title: "Success", description: "Status updated successfully.", variant: "success" });
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error || "Failed to update status.", variant: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "error" });
    } finally {
      setLoading(false);
      setRemarkMode(null);
      setRemark("");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const fileName = `${assignment.id}_${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("reports").upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("reports").getPublicUrl(fileName);
      
      const res = await updateAssignmentStatusAction(assignment.id, "report_uploaded", { report_url: urlData.publicUrl });
      if (res.success) {
        toast({ title: "Success", description: "Report uploaded successfully.", variant: "success" });
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error, variant: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Upload error: " + err.message, variant: "error" });
    }
    setLoading(false);
  };

  const isMine = assignment.assigned_to === currentUserId || 
                 assignment.teams?.team_members?.some((m: any) => m.employee_id === currentUserId);

  // We could strictly enforce isMine here, but backend already validates permissions.
  // For UI sake, we display relevant actions if the status allows it.

  if (remarkMode) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl mt-4">
        <input
          type="text"
          autoFocus
          placeholder={`Enter remark for ${remarkMode}...`}
          className="text-sm border border-slate-300 rounded-md px-3 py-2 w-full focus:outline-none focus:border-orange-400"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          disabled={loading}
        />
        <div className="flex gap-2 justify-end w-full">
          <Button 
            size="sm" 
            onClick={() => {
              if (remarkMode === "reject" && !remark.trim()) {
                toast({ title: "Error", description: "Remark is required for rejection.", variant: "error" });
                return;
              }
              handleStatusUpdate(remarkMode === "approve" ? "approved" : "rejected", { reviewer_remark: remark });
            }}
            disabled={loading}
            className={remarkMode === "approve" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}
          >
            {loading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            Confirm
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRemarkMode(null)} disabled={loading}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end w-full gap-3">
      {assignment.status === 'accepted' && (
        <Button size="sm" onClick={() => handleStatusUpdate('in_testing')} disabled={loading} className="bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white border border-orange-200">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
          Start Testing
        </Button>
      )}

      {assignment.status === 'in_testing' && (
        <>
          <input 
            type="file" 
            id={`file-upload-${assignment.id}`} 
            className="hidden" 
            onChange={handleFileUpload} 
          />
          <Button size="sm" disabled={loading} onClick={() => document.getElementById(`file-upload-${assignment.id}`)?.click()} className="bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white border border-blue-200">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload Report
          </Button>
        </>
      )}

      {assignment.status === 'report_uploaded' && (
        <Button size="sm" onClick={() => handleStatusUpdate('in_review')} disabled={loading} className="bg-fuchsia-50 text-fuchsia-600 hover:bg-fuchsia-500 hover:text-white border border-fuchsia-200">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
          Submit for Review
        </Button>
      )}

      {assignment.status === 'in_review' && (
        <>
          <Button size="sm" onClick={() => setRemarkMode('approve')} disabled={loading} className="bg-green-50 text-green-600 hover:bg-green-500 hover:text-white border border-green-200">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Approve
          </Button>
          <Button size="sm" onClick={() => setRemarkMode('reject')} disabled={loading} className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-200">
            <X className="w-4 h-4 mr-2" />
            Reject
          </Button>
        </>
      )}
    </div>
  );
}
