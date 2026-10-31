"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  FilePlus2,
  Eye,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  Hash,
  FlaskConical,
  ArrowRight,
  Plus,
  Receipt,
  X,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/Dropdown";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/use-pagination";

interface InwardRegisterTableProps {
  inwards: any[];
  onCreateProforma: (inward: any, options?: { isRemainingBalance?: boolean; defaultBalanceAmount?: number; previousInvoice?: any }) => void;
  onViewInvoice?: (invoice: any) => void;
  onRecordExpense?: (inward: any) => void;
  initialStatusFilter?: "all" | "pending" | "partial" | "invoiced";
  isUninvoicedView?: boolean;
}

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export function InwardRegisterTable({
  inwards = [],
  onCreateProforma,
  onViewInvoice,
  onRecordExpense,
  initialStatusFilter = "all",
  isUninvoicedView = false,
}: InwardRegisterTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "partial" | "invoiced">(initialStatusFilter);

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  const showStatusColumn = !isUninvoicedView && statusFilter !== "pending";

  const pendingCount = useMemo(() => {
    return inwards.filter((item) => !item.invoices || item.invoices.length === 0).length;
  }, [inwards]);

  const partialCount = useMemo(() => {
    return inwards.filter((item) => {
      const invs = item.invoices || [];
      if (invs.length === 0) return false;
      const latest = invs[0];
      return latest && (latest.status === "partial" || (Number(latest.balance_amount || 0) > 0 && Number(latest.paid_amount || 0) > 0));
    }).length;
  }, [inwards]);

  const invoicedCount = useMemo(() => {
    return inwards.filter((item) => Array.isArray(item.invoices) && item.invoices.length > 0).length;
  }, [inwards]);

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

      // In uninvoiced view, strictly exclude inwards that already have an invoice
      if (isUninvoicedView && hasInvoice) return false;

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
  }, [inwards, searchTerm, statusFilter, isUninvoicedView]);

  const pagination = usePagination({
    data: filteredInwards,
    initialPageSize: 10,
  });

  const hasActiveFilters = searchTerm.trim() !== "" || (!isUninvoicedView && statusFilter !== "all");

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden space-y-0">
      {/* Header Info & Filter Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 bg-slate-50/50">
        {/* Search Input */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by UID, client, site, or test name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8 h-9.5 text-xs bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills / Status Info */}
        {isUninvoicedView ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200/90 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>{filteredInwards.length} Inwards Awaiting Invoice</span>
            </span>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer ml-1"
              >
                Reset
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full lg:w-auto justify-start lg:justify-end flex-wrap">
            <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === "all" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Inwards ({inwards.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === "pending" ? "bg-white text-blue-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>Ready for Proforma</span>
                <span className="text-[10px] opacity-75">({pendingCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("partial")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === "partial" ? "bg-white text-amber-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Partial / Due</span>
                <span className="text-[10px] opacity-75">({partialCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("invoiced")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === "invoiced" ? "bg-white text-emerald-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Invoiced</span>
                <span className="text-[10px] opacity-75">({invoicedCount})</span>
              </button>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer ml-1"
              >
                Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200/80">
            <tr>
              <th className="py-3 px-4">UID / Inward Date</th>
              <th className="py-3 px-4">Customer & Contact</th>
              <th className="py-3 px-4">Project / Site</th>
              <th className="py-3 px-4">Tests & Scope</th>
              {showStatusColumn && <th className="py-3 px-4">Proforma / Billing Status</th>}
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInwards.length === 0 ? (
              <tr>
                <td colSpan={showStatusColumn ? 6 : 5} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FlaskConical className="w-8 h-8 text-slate-300" />
                    <p className="font-bold text-sm text-slate-700">No inward entries found</p>
                    <p className="text-xs text-slate-400">Inward job cards registered in Client Inward will appear here automatically.</p>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm("");
                          if (!isUninvoicedView) setStatusFilter("all");
                        }}
                        className="mt-2 text-xs h-8 cursor-pointer rounded-xl"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pagination.paginatedData.map((job) => {
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

                const hasRemainingBalance = Boolean(
                  latestInvoice &&
                  !isFullyPaid &&
                  paid > 0 &&
                  bal > 0 &&
                  !isInvoiceAlreadyContinued(latestInvoice.id, latestInvoice.invoice_no)
                );

                const uidStr = job.uid_label || (job.uid ? `UID-${job.uid}` : "—");

                return (
                  <tr key={job.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* UID & Date */}
                    <td className="py-4 px-4">
                      <div className="inline-flex">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/90">
                          {uidStr}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{job.inward_on || job.created_at?.slice(0, 10) || "Recent"}</span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {job.clients?.name || "Customer"}
                      </div>
                      {job.clients?.contact_person && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Attn: {job.clients.contact_person}
                        </div>
                      )}
                      {job.clients?.mobile && (
                        <div className="text-[11px] text-slate-400">{job.clients.mobile}</div>
                      )}
                      {job.clients?.gst_no && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          GST: {job.clients.gst_no}
                        </div>
                      )}
                    </td>

                    {/* Project / Site */}
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-800 text-xs">
                        {job.project_name || job.clients?.site_name || "General"}
                      </div>
                      {job.division && (
                        <div className="text-[11px] text-slate-500 mt-0.5">Div: {job.division}</div>
                      )}
                      {job.branches?.name && (
                        <div className="text-[10px] text-slate-400">Branch: {job.branches.name}</div>
                      )}
                    </td>

                    {/* Tests */}
                    <td className="py-4 px-4">
                      <div className="inline-flex items-center gap-1.5 font-bold text-slate-800 text-xs bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/70">
                        <FlaskConical className="w-3.5 h-3.5 text-blue-600" />
                        <span>{testCount} Test{testCount !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs mt-1">
                        {job.job_entry_tests?.slice(0, 2).map((t: any) =>
                          t.test_master?.specific_test || t.material_description
                        ).filter(Boolean).join(", ") || "Material Testing"}
                        {testCount > 2 && ` +${testCount - 2} more`}
                      </div>
                    </td>

                    {/* Proforma / Invoice Status */}
                    {showStatusColumn && (
                      <td className="py-4 px-4">
                        {latestInvoice ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wide ${
                                latestInvoice.invoice_type === "proforma"
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}>
                                {latestInvoice.invoice_no}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                latestInvoice.status === "paid"
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : latestInvoice.status === "partial"
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "bg-rose-50 text-rose-800 border border-rose-200"
                              }`}>
                                {latestInvoice.status === "partial" ? "Partial" : latestInvoice.status}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-500 mt-1">
                              Total: <strong className="font-mono text-slate-900">{fmt(latestInvoice.total_amount)}</strong>
                              {paid > 0 && (
                                <span className="text-emerald-700 ml-1.5 font-medium">
                                  · Paid <strong className="font-mono">{fmt(paid)}</strong>
                                </span>
                              )}
                            </div>

                            {bal > 0 && (
                              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                <span>Due: <strong className="font-mono">{fmt(bal)}</strong></span>
                              </div>
                            )}

                            {linkedInvoices.length > 1 && (
                              <div className="text-[10px] text-slate-400 font-medium">
                                Remaining balance invoice generated
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Ready for Proforma</span>
                          </span>
                        )}
                      </td>
                    )}

                    {/* Actions Dropdown */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {isFullyPaid && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Paid</span>
                          </span>
                        )}
                        <div className="w-[110px]" onClick={(e) => e.stopPropagation()}>
                          <Dropdown
                            placeholder={
                              <span className="font-semibold text-slate-700 text-xs tracking-wide">
                                Actions
                              </span>
                            }
                            options={[
                              ...(!latestInvoice
                                ? [
                                    {
                                      label: (
                                        <span className="flex items-center gap-2 text-blue-700 font-semibold">
                                          <FilePlus2 className="w-3.5 h-3.5 text-blue-600" />
                                          <span>Create Proforma</span>
                                        </span>
                                      ),
                                      value: "create_proforma",
                                    },
                                  ]
                                : []),
                              ...(hasRemainingBalance
                                ? [
                                    {
                                      label: (
                                        <span className="flex items-center gap-2 text-amber-700 font-semibold">
                                          <FilePlus2 className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Invoice Remaining ({fmt(bal)})</span>
                                        </span>
                                      ),
                                      value: "invoice_remaining",
                                    },
                                  ]
                                : []),
                              ...(latestInvoice && onViewInvoice
                                ? [
                                    {
                                      label: (
                                        <span className="flex items-center gap-2 text-slate-700 font-medium">
                                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                                          <span>View Invoice</span>
                                        </span>
                                      ),
                                      value: "view_invoice",
                                    },
                                  ]
                                : []),
                              ...(onRecordExpense
                                ? [
                                    {
                                      label: (
                                        <span className="flex items-center gap-2 text-rose-700 font-semibold">
                                          <Plus className="w-3.5 h-3.5 text-rose-600" />
                                          <span>Record Expense</span>
                                        </span>
                                      ),
                                      value: "record_expense",
                                    },
                                  ]
                                : []),
                            ]}
                            align="right"
                            menuWidth={180}
                            buttonClassName="h-8 py-0 px-3 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs rounded-xl transition-all text-slate-700 cursor-pointer group"
                            iconClassName="text-slate-400 group-hover:text-slate-600 w-3.5 h-3.5"
                            itemClassName="text-xs py-2 px-3 hover:bg-slate-50 cursor-pointer"
                            value=""
                            onChange={(val) => {
                              if (val === "create_proforma") {
                                onCreateProforma(job);
                              } else if (val === "invoice_remaining") {
                                onCreateProforma(job, {
                                  isRemainingBalance: true,
                                  defaultBalanceAmount: bal,
                                  previousInvoice: latestInvoice,
                                });
                              } else if (val === "view_invoice") {
                                onViewInvoice?.(latestInvoice);
                              } else if (val === "record_expense") {
                                onRecordExpense?.(job);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
        pageSizeOptions={[10, 25, 50]}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
        itemLabel="inward jobs"
      />
    </div>
  );
}
