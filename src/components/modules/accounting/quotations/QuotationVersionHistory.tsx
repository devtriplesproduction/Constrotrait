"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  X,
  ChevronDown,
  Clock,
  User,
  Package,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  FileText
} from "lucide-react";
import { getQuotationVersionsAction } from "@/actions/accounting.actions";

interface QuotationVersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  quotationNo?: string;
  currentVersion?: number;
}

const statusBadgeConfig: Record<string, { label: string; bg: string; icon: React.ReactNode }> = {
  draft: { label: "Draft", bg: "bg-slate-100 text-slate-700 border-slate-200", icon: <Clock className="w-3 h-3 text-slate-500" /> },
  sent: { label: "Sent to Client", bg: "bg-blue-50 text-blue-700 border-blue-200", icon: <Send className="w-3 h-3 text-blue-500" /> },
  approved: { label: "Approved", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" /> },
  accepted: { label: "Accepted", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" /> },
  rejected: { label: "Rejected", bg: "bg-rose-50 text-rose-700 border-rose-200", icon: <XCircle className="w-3 h-3 text-rose-600" /> },
  rework: { label: "Rework Requested", bg: "bg-amber-50 text-amber-700 border-amber-200", icon: <RefreshCw className="w-3 h-3 text-amber-600" /> },
  revision_requested: { label: "Revision Needed", bg: "bg-amber-50 text-amber-700 border-amber-200", icon: <RefreshCw className="w-3 h-3 text-amber-600" /> },
  superseded: { label: "Superseded", bg: "bg-slate-100 text-slate-500 border-slate-200", icon: <History className="w-3 h-3 text-slate-400" /> },
};

const fmt = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function QuotationVersionHistory({
  isOpen,
  onClose,
  quotationId,
  quotationNo,
  currentVersion = 1,
}: QuotationVersionHistoryProps) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && quotationId) {
      setLoading(true);
      getQuotationVersionsAction(quotationId).then((res) => {
        if (res.success && res.data) {
          setVersions(res.data);
          if (res.data.length > 0) {
            setExpandedId(res.data[0].id);
          }
        }
        setLoading(false);
      });
    }
  }, [isOpen, quotationId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Quotation History & Versions</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  {quotationNo || "QTN"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Audited version history, approvals, reworks, and revision snapshots.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              <span className="text-xs font-semibold">Loading version history...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">No version snapshots recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Version snapshots are automatically created when quotations are drafted, revised, reworked, or approved.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6">
              {/* Timeline bar */}
              <div className="absolute left-2.5 top-2 bottom-4 w-0.5 bg-gradient-to-b from-purple-500 via-slate-200 to-transparent" />

              {versions.map((ver, idx) => {
                const status = (ver.status || "draft").toLowerCase();
                const badge = statusBadgeConfig[status] || statusBadgeConfig.draft;
                const isLatest = idx === 0;
                const isExpanded = expandedId === ver.id;
                const items = Array.isArray(ver.items) ? ver.items : [];
                const performerName = ver.performer
                  ? `${ver.performer.first_name || ""} ${ver.performer.last_name || ""}`.trim() || ver.performer.email
                  : "System User";

                return (
                  <div key={ver.id || idx} className="relative group">
                    {/* Timeline node */}
                    <div
                      className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isLatest
                          ? "border-purple-600 bg-purple-600 shadow-sm"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isLatest && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>

                    {/* Card */}
                    <div
                      className={`rounded-xl border transition-all ${
                        isLatest
                          ? "bg-purple-50/20 border-purple-200 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* Card header button */}
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : ver.id)}
                        className="w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left cursor-pointer"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              Version {ver.version_number || 1}
                            </span>
                            {isLatest && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white uppercase tracking-wider">
                                Current
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${badge.bg}`}
                            >
                              {badge.icon}
                              <span>{badge.label}</span>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <User className="w-3 h-3 text-slate-400" />
                              {performerName}
                            </span>
                            <span>•</span>
                            <span>
                              {ver.created_at
                                ? new Date(ver.created_at).toLocaleString("en-IN", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })
                                : "N/A"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="text-right">
                            <div className="text-xs font-bold text-slate-900 nums">
                              {fmt(ver.total_amount || 0)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {items.length} item{items.length !== 1 ? "s" : ""}
                            </div>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </button>

                      {/* Action Reason / Notes callout */}
                      {ver.action_reason && (
                        <div className="px-4 pb-3">
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-slate-800 font-semibold mr-1">Action Note:</strong>
                              <span>{ver.action_reason}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expandable Snapshot Details */}
                      {isExpanded && (
                        <div className="p-4 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3">
                          {/* Items Table */}
                          {items.length > 0 && (
                            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden text-xs">
                              <div className="bg-slate-100 p-2 font-bold text-[10px] text-slate-600 uppercase tracking-wider grid grid-cols-12 gap-2">
                                <div className="col-span-6">Description</div>
                                <div className="col-span-2 text-center">Qty</div>
                                <div className="col-span-2 text-right">Rate</div>
                                <div className="col-span-2 text-right">Total</div>
                              </div>
                              <div className="divide-y divide-slate-100">
                                {items.map((it: any, i: number) => (
                                  <div key={i} className="p-2 grid grid-cols-12 gap-2 text-slate-700">
                                    <div className="col-span-6 font-medium text-slate-900">{it.description}</div>
                                    <div className="col-span-2 text-center">{it.qty}</div>
                                    <div className="col-span-2 text-right nums">{fmt(it.rate)}</div>
                                    <div className="col-span-2 text-right font-semibold text-slate-900 nums">
                                      {fmt(Number(it.qty || 0) * Number(it.rate || 0))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Financials Breakdown */}
                          <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 p-2 rounded-lg bg-white border border-slate-200">
                            <div>Subtotal: <strong>{fmt(ver.subtotal || 0)}</strong></div>
                            {Number(ver.discount_amount || 0) > 0 && (
                              <div className="text-emerald-700">Discount: -{fmt(ver.discount_amount)}</div>
                            )}
                            <div>GST ({ver.gst_rate || 18}%): <strong>{fmt(ver.gst_amount || 0)}</strong></div>
                            <div className="text-sm font-bold text-purple-700">Total: {fmt(ver.total_amount || 0)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
