"use client";

import React, { useState, useTransition } from "react";
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Send,
  Loader2,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  Edit3,
  ArrowRight
} from "lucide-react";
import { updateQuotationStatusAction } from "@/actions/accounting.actions";
import { useToast } from "@/hooks/use-toast";

interface QuotationApprovalPanelProps {
  quotation: any;
  onRefresh?: () => void;
  onRevise?: (quotation: any) => void;
  onConvertToInward?: (quotation: any) => void;
  onConvertToProforma?: (quotation: any) => void;
}

type ActionType = "approve" | "reject" | "rework" | "send" | null;

export function QuotationApprovalPanel({
  quotation,
  onRefresh,
  onRevise,
  onConvertToInward,
  onConvertToProforma,
}: QuotationApprovalPanelProps) {
  const { toast } = useToast();
  const [selectedAction, setSelectedAction] = useState<ActionType>(null);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const currentStatus = (quotation.status || "draft").toLowerCase();

  // Determine available workflow operations based on status
  const canSend = currentStatus === "draft";
  const canApprove = currentStatus === "draft" || currentStatus === "sent" || currentStatus === "rework" || currentStatus === "revision_requested";
  const canRework = currentStatus === "draft" || currentStatus === "sent" || currentStatus === "approved" || currentStatus === "accepted";
  const canReject = currentStatus !== "rejected";
  const canRevise = currentStatus === "rework" || currentStatus === "revision_requested" || currentStatus === "rejected" || currentStatus === "draft";
  const isApproved = currentStatus === "approved" || currentStatus === "accepted";

  const handleActionSubmit = () => {
    if (!selectedAction) return;
    if (selectedAction === "reject" && !reason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please enter the reason why this quotation is rejected.",
        variant: "destructive",
      });
      return;
    }
    if (selectedAction === "rework" && !reason.trim()) {
      toast({
        title: "Rework Instructions Required",
        description: "Please specify what needs to be revised or reworked.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      let targetStatus: "draft" | "sent" | "accepted" | "approved" | "rejected" | "rework" | "revision_requested" | "superseded" = "draft";
      let actionTypeStr = "status_update";

      if (selectedAction === "send") {
        targetStatus = "sent";
        actionTypeStr = "sent";
      } else if (selectedAction === "approve") {
        targetStatus = "approved";
        actionTypeStr = "approved";
      } else if (selectedAction === "rework") {
        targetStatus = "rework";
        actionTypeStr = "rework";
      } else if (selectedAction === "reject") {
        targetStatus = "rejected";
        actionTypeStr = "rejected";
      }

      const res = await updateQuotationStatusAction(quotation.id, targetStatus, {
        reason: reason.trim() || undefined,
        actionType: actionTypeStr,
      });

      if (res.success) {
        toast({
          title: "Quotation Updated",
          description: `Status changed to ${targetStatus.toUpperCase()}.`,
        });
        setSelectedAction(null);
        setReason("");
        if (onRefresh) onRefresh();
      } else {
        toast({
          title: "Update Failed",
          description: res.error || "Could not update status.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Workflow Action Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Send to Client */}
        {canSend && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setSelectedAction(selectedAction === "send" ? null : "send");
              setReason("");
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              selectedAction === "send"
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-blue-50/80 text-blue-700 border-blue-200/80 hover:bg-blue-100 hover:border-blue-300"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send to Client</span>
          </button>
        )}

        {/* Approve */}
        {canApprove && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setSelectedAction(selectedAction === "approve" ? null : "approve");
              setReason("");
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              selectedAction === "approve"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-emerald-50/80 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100 hover:border-emerald-300"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approve Quotation</span>
          </button>
        )}

        {/* Rework / Revision */}
        {canRework && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setSelectedAction(selectedAction === "rework" ? null : "rework");
              setReason("");
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              selectedAction === "rework"
                ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                : "bg-amber-50/80 text-amber-800 border-amber-200/80 hover:bg-amber-100 hover:border-amber-300"
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Rework / Revision</span>
          </button>
        )}

        {/* Reject */}
        {canReject && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setSelectedAction(selectedAction === "reject" ? null : "reject");
              setReason("");
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              selectedAction === "reject"
                ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                : "bg-rose-50/80 text-rose-700 border-rose-200/80 hover:bg-rose-100 hover:border-rose-300"
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject</span>
          </button>
        )}

        {/* Revise / Re-draft Button */}
        {canRevise && onRevise && (
          <button
            type="button"
            onClick={() => onRevise(quotation)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-all cursor-pointer shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Revise (Draft Next Version)</span>
          </button>
        )}

        {/* Convert to Inward Button (if Approved and no Inward yet) */}
        {isApproved && !quotation.inward_id && onConvertToInward && (
          <button
            type="button"
            onClick={() => onConvertToInward(quotation)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-orange-500 text-white shadow-xs hover:bg-orange-600 transition-all cursor-pointer ml-auto"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Convert to Inward</span>
          </button>
        )}

        {/* Create Proforma Invoice Button (if Inward created or accepted) */}
        {(quotation.inward_id || currentStatus === "inward_created" || currentStatus === "accepted") && onConvertToProforma && (
          <button
            type="button"
            onClick={() => onConvertToProforma(quotation)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 transition-all cursor-pointer ml-auto"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Create Proforma Invoice</span>
          </button>
        )}
      </div>

      {/* Confirmation & Comment Box for Selected Action */}
      {selectedAction && (
        <div className="p-4 rounded-2xl border bg-slate-50/90 border-slate-200/90 space-y-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            {selectedAction === "approve" && (
              <>
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900">
                  Confirm Quotation Approval
                </span>
              </>
            )}
            {selectedAction === "send" && (
              <>
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900">
                  Confirm Sending Quotation to Client
                </span>
              </>
            )}
            {selectedAction === "rework" && (
              <>
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900">
                  Request Quotation Rework / Revision
                </span>
              </>
            )}
            {selectedAction === "reject" && (
              <>
                <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900">
                  Reject Quotation
                </span>
              </>
            )}
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            {selectedAction === "approve" &&
              "This marks the quotation as Approved and enables conversion to a Proforma or Final Invoice."}
            {selectedAction === "send" &&
              "This logs the quotation as officially dispatched to the client for technical & commercial review."}
            {selectedAction === "rework" &&
              "Specify the requested modifications (e.g. rate change, discount, tests to adjust). The team can then revise it into a new version."}
            {selectedAction === "reject" &&
              "Enter the formal reason for rejection. This will be recorded in the audit history."}
          </p>

          {(selectedAction === "rework" || selectedAction === "reject" || selectedAction === "approve") && (
            <div>
              <input
                required={selectedAction === "reject" || selectedAction === "rework"}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  selectedAction === "reject"
                    ? "Reason for rejection (e.g., Client chose competitor, budget constraints)..."
                    : selectedAction === "rework"
                    ? "Modification instructions (e.g., Apply 5% discount on cube testing)..."
                    : "Optional approval remarks or PO reference number..."
                }
                className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all placeholder:text-slate-400"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setSelectedAction(null);
                setReason("");
              }}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleActionSubmit}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                selectedAction === "reject"
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                  : selectedAction === "rework"
                  ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                  : selectedAction === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
              }`}
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {selectedAction === "approve"
                  ? "Confirm Approval"
                  : selectedAction === "send"
                  ? "Confirm Sent"
                  : selectedAction === "rework"
                  ? "Submit Rework"
                  : "Confirm Rejection"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
