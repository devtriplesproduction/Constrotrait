"use client";

import React, { useState, useMemo } from "react";
import { Search, FilePlus2, Eye, Calendar, Building, CheckCircle2, AlertCircle, Hash, FlaskConical, ArrowRight, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InwardRegisterTableProps {
  inwards: any[];
  onCreateProforma: (inward: any, options?: { isRemainingBalance?: boolean; defaultBalanceAmount?: number; previousInvoice?: any }) => void;
  onViewInvoice?: (invoice: any) => void;
  onRecordExpense?: (inward: any) => void;
}

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export function InwardRegisterTable({
  inwards = [],
  onCreateProforma,
  onViewInvoice,
  onRecordExpense,
}: InwardRegisterTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "partial" | "invoiced">("all");

  const filteredInwards = useMemo(() => {
    return inwards.filter((item) => {
      const linkedInvoices = (Array.isArray(item.invoices) ? [...item.invoices] : []).sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || a.invoice_date || 0).getTime();
        const dateB = new Date(b.created_at || b.invoice_date || 0).getTime();
        return dateB - dateA;
      });
      const hasInvoice = linkedInvoices.length > 0;
      const latestInvoice = hasInvoice ? linkedInvoices[0] : null;
      const isPartial = latestInvoice && (latestInvoice.status === "partial" || (Number(latestInvoice.balance_amount || 0) > 0 && Number(latestInvoice.paid_amount || 0) > 0));

      // Status filter
      if (statusFilter === "pending" && hasInvoice) return false;
      if (statusFilter === "partial" && !isPartial) return false;
      if (statusFilter === "invoiced" && !hasInvoice) return false;

      // Search term
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const uidMatch = (item.uid_label || String(item.uid || "")).toLowerCase().includes(q);
      const clientMatch = item.clients?.name?.toLowerCase().includes(q);
      const projectMatch = item.project_name?.toLowerCase().includes(q) || item.clients?.site_name?.toLowerCase().includes(q);
      const testMatch = item.job_entry_tests?.some((t: any) =>
        t.test_master?.specific_test?.toLowerCase().includes(q) ||
        t.material_description?.toLowerCase().includes(q)
      );

      return uidMatch || clientMatch || projectMatch || testMatch;
    });
  }, [inwards, searchTerm, statusFilter]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
      {/* Search and Filters Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by UID, Client, or Project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <span className="text-xs text-slate-500 font-medium">Filter:</span>
          <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Inwards ({inwards.length})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === "pending" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Ready for Proforma
            </button>
            <button
              onClick={() => setStatusFilter("partial")}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === "partial" ? "bg-white text-amber-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Partial / Balance Due
            </button>
            <button
              onClick={() => setStatusFilter("invoiced")}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === "invoiced" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Invoiced
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200/80">
            <tr>
              <th className="py-3 px-4">UID / Inward Date</th>
              <th className="py-3 px-4">Client & Contact</th>
              <th className="py-3 px-4">Project / Site</th>
              <th className="py-3 px-4">Tests & Materials</th>
              <th className="py-3 px-4">Proforma / Invoice Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInwards.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FlaskConical className="w-8 h-8 text-slate-300" />
                    <p className="font-medium text-sm">No inward entries found</p>
                    <p className="text-xs text-slate-400">New inwards created in Client Inward will appear here automatically.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredInwards.map((job) => {
                const linkedInvoices = (Array.isArray(job.invoices) ? [...job.invoices] : []).sort((a: any, b: any) => {
                  const dateA = new Date(a.created_at || a.invoice_date || 0).getTime();
                  const dateB = new Date(b.created_at || b.invoice_date || 0).getTime();
                  return dateB - dateA;
                });
                const latestInvoice = linkedInvoices.length > 0 ? linkedInvoices[0] : null;
                const testCount = job.job_entry_tests?.length || 0;
                const bal = latestInvoice ? Number(latestInvoice.balance_amount || 0) : 0;
                const paid = latestInvoice ? Number(latestInvoice.paid_amount || 0) : 0;

                // Helper: check if a partial invoice's remaining balance has already been invoiced into another invoice
                const isInvoiceAlreadyContinued = (invId?: string, invNo?: string) => {
                  if (!invId) return false;
                  return linkedInvoices.some((other: any) =>
                    other.id !== invId && (
                      other.previous_invoice_id === invId ||
                      (invNo && other.notes?.includes(invNo)) ||
                      (invNo && Array.isArray(other.items) && other.items.some((it: any) => it.description?.includes(invNo)))
                    )
                  );
                };

                const isFullyPaid = Boolean(
                  latestInvoice && (latestInvoice.status === "paid" || (bal <= 0 && paid > 0))
                );

                // Has remaining balance to invoice ONLY IF:
                // 1. Not fully paid
                // 2. Latest invoice was partially paid (paid > 0 && bal > 0)
                // 3. This balance has NOT already been invoiced by a newer invoice!
                const hasRemainingBalance = Boolean(
                  latestInvoice &&
                  !isFullyPaid &&
                  paid > 0 &&
                  bal > 0 &&
                  !isInvoiceAlreadyContinued(latestInvoice.id, latestInvoice.invoice_no)
                );

                return (
                  <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* UID & Date */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                          {job.uid_label || `UID-${job.uid || "—"}`}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{job.inward_on || job.created_at?.slice(0, 10) || "Recent"}</span>
                      </div>
                    </td>

                    {/* Client */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {job.clients?.name || "Customer"}
                      </div>
                      {job.clients?.contact_person && (
                        <div className="text-[11px] text-slate-500">Attn: {job.clients.contact_person}</div>
                      )}
                      {job.clients?.mobile && (
                        <div className="text-[11px] text-slate-500">{job.clients.mobile}</div>
                      )}
                      {job.clients?.gst_no && (
                        <div className="text-[10px] text-slate-400">GST: {job.clients.gst_no}</div>
                      )}
                    </td>

                    {/* Project / Site */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {job.project_name || job.clients?.site_name || "General"}
                      </div>
                      {job.division && (
                        <div className="text-[11px] text-slate-500">Div: {job.division}</div>
                      )}
                      {job.branches?.name && (
                        <div className="text-[10px] text-slate-400">Branch: {job.branches.name}</div>
                      )}
                    </td>

                    {/* Tests */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <FlaskConical className="w-3.5 h-3.5 text-blue-500" />
                        <span>{testCount} Test{testCount !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                        {job.job_entry_tests?.slice(0, 2).map((t: any) =>
                          t.test_master?.specific_test || t.material_description
                        ).filter(Boolean).join(", ") || "Material Analysis"}
                        {testCount > 2 && ` +${testCount - 2} more`}
                      </div>
                    </td>

                    {/* Proforma / Invoice Status */}
                    <td className="py-3.5 px-4">
                      {latestInvoice ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              latestInvoice.invoice_type === "proforma"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}>
                              {latestInvoice.invoice_no}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                              latestInvoice.status === "paid"
                                ? "bg-emerald-50 text-emerald-700"
                                : latestInvoice.status === "partial"
                                ? "bg-amber-100 text-amber-800 border border-amber-200 font-bold"
                                : "bg-rose-50 text-rose-700"
                            }`}>
                              {latestInvoice.status === "partial" ? "Partial Paid" : latestInvoice.status}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500">
                            Total: <strong>{fmt(latestInvoice.total_amount)}</strong>
                            {paid > 0 && (
                              <span className="text-emerald-700 ml-1.5">
                                · Paid {fmt(paid)}
                              </span>
                            )}
                          </div>

                          {bal > 0 && (
                            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <span>Remaining Bal: {fmt(bal)}</span>
                            </div>
                          )}

                          {linkedInvoices.length > 1 && (
                            <div className="text-[10px] text-amber-700 font-medium">
                              Remaining balance invoice generated
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          <span>Ready for Proforma</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {onRecordExpense && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRecordExpense(job)}
                            className="h-8 text-xs font-semibold gap-1 text-rose-700 hover:text-rose-800 border-rose-200 hover:bg-rose-50 cursor-pointer"
                            title="Record direct testing or logistics expense for this inward"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Expense</span>
                          </Button>
                        )}

                        {latestInvoice && onViewInvoice && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewInvoice(latestInvoice)}
                            className="h-8 text-xs font-semibold gap-1 hover:bg-slate-100 text-slate-700 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </Button>
                        )}

                        {/* If inward is fully paid */}
                        {isFullyPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Paid in Full</span>
                          </span>
                        ) : hasRemainingBalance ? (
                          <Button
                            size="sm"
                            onClick={() => onCreateProforma(job, {
                              isRemainingBalance: true,
                              defaultBalanceAmount: bal,
                              previousInvoice: latestInvoice,
                            })}
                            className="h-8 text-xs font-bold gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-xs transition-all cursor-pointer"
                          >
                            <FilePlus2 className="w-3.5 h-3.5" />
                            <span>Invoice Remaining ({fmt(bal)})</span>
                          </Button>
                        ) : !latestInvoice ? (
                          <Button
                            size="sm"
                            onClick={() => onCreateProforma(job)}
                            className="h-8 text-xs font-bold gap-1.5 shadow-xs transition-all cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                          >
                            <FilePlus2 className="w-3.5 h-3.5" />
                            <span>Create Proforma</span>
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
