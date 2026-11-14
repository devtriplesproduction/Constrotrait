"use client";

import React, { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import {
  Search,
  FilePlus2,
  Eye,
  Calendar,
  ClipboardList,
  FlaskConical,
  Plus,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/Dropdown";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/use-pagination";
import { compareJobCardsByUidRecentFirst, isNablJob } from "@/utils/uid-sort";

interface InwardRegisterTableProps {
  inwards: any[];
  onCreateProforma: (inward: any, options?: { isRemainingBalance?: boolean; defaultBalanceAmount?: number; previousInvoice?: any }) => void;
  onViewInvoice?: (invoice: any) => void;
  onRecordExpense?: (inward: any) => void;
  initialStatusFilter?: "all" | "pending" | "partial" | "invoiced";
  isUninvoicedView?: boolean;
  title?: string;
}

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export function InwardRegisterTable({
  inwards = [],
  onCreateProforma,
  onViewInvoice,
  onRecordExpense,
  initialStatusFilter = "all",
  isUninvoicedView = false,
  title = "Filter Inwards",
}: InwardRegisterTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "partial" | "invoiced">(initialStatusFilter);
  const [filterNabl, setFilterNabl] = useState<string>("all");

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

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
    const list = inwards.filter((item) => {
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

      // Accreditation filter
      if (filterNabl !== "all") {
        const isNabl = isNablJob(item);
        if (filterNabl === "nabl" && !isNabl) return false;
        if (filterNabl === "non_nabl" && isNabl) return false;
      }

      // Search term
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const uidMatch = (item.uid_label || String(item.uid || "")).toLowerCase().includes(q);
      const clientMatch = item.clients?.name?.toLowerCase().includes(q);
      const projectMatch = item.project_name?.toLowerCase().includes(q) || item.clients?.site_name?.toLowerCase().includes(q);
      const testMatch = item.job_entry_tests?.some((t: any) =>
        t.test_master?.specific_test?.toLowerCase().includes(q) ||
        t.test_master?.component_parameter?.toLowerCase().includes(q) ||
        t.material_description?.toLowerCase().includes(q)
      );

      return uidMatch || clientMatch || projectMatch || testMatch;
    });

    return list.sort(compareJobCardsByUidRecentFirst);
  }, [inwards, searchTerm, statusFilter, filterNabl, isUninvoicedView]);

  const pagination = usePagination({
    data: filteredInwards,
    initialPageSize: 10,
  });

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    (!isUninvoicedView && statusFilter !== initialStatusFilter) ||
    filterNabl !== "all";

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterNabl("all");
    if (!isUninvoicedView) setStatusFilter(initialStatusFilter);
  };

  return (
    <div className="animate-in fade-in duration-500 mt-2 space-y-5">
      {/* Filter Inwards Hub */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 mb-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <SlidersHorizontal className="w-5 h-5 text-orange-500" />
            <span>{title}</span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Search</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search Job Card, Material, Date, Client, Site..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-9 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors shadow-sm bg-white"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {!isUninvoicedView ? (
            <div className="w-full sm:w-56 shrink-0">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Inward Status</label>
              <Dropdown
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as any)}
                placeholder="All Inwards"
                buttonClassName="bg-white border-slate-200 shadow-sm rounded-xl h-10 text-xs font-semibold"
                options={[
                  {
                    value: "all",
                    label: (
                      <span className="flex items-center gap-1.5">
                        <span>All Inwards</span>
                        <span className="text-[10px] opacity-75 font-mono">({inwards.length})</span>
                      </span>
                    ),
                  },
                  {
                    value: "pending",
                    label: (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                        <span>Ready for Proforma</span>
                        <span className="text-[10px] opacity-75 font-mono">({pendingCount})</span>
                      </span>
                    ),
                  },
                  {
                    value: "partial",
                    label: (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>Partial / Due</span>
                        <span className="text-[10px] opacity-75 font-mono">({partialCount})</span>
                      </span>
                    ),
                  },
                  {
                    value: "invoiced",
                    label: (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>Invoiced</span>
                        <span className="text-[10px] opacity-75 font-mono">({invoicedCount})</span>
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          ) : (
            <div className="w-full sm:w-auto shrink-0">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Inward Status</label>
              <div className="h-10 px-3.5 bg-amber-50 border border-amber-200/90 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-900 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>{filteredInwards.length} Inwards Awaiting Invoice</span>
              </div>
            </div>
          )}

          <div className="w-full sm:w-40 shrink-0">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Job Type</label>
            <Dropdown
              value={filterNabl}
              onChange={setFilterNabl}
              placeholder="All Types"
              buttonClassName="bg-white border-slate-200 shadow-sm rounded-xl h-10 text-xs font-semibold"
              options={[
                { value: "all", label: "All Types" },
                { value: "nabl", label: "NABL" },
                { value: "non_nabl", label: "Non-NABL" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-sm bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/80 text-[11px] uppercase tracking-widest text-slate-400 font-bold border-b border-slate-200/80">
            <tr>
              <th className="px-6 py-4 rounded-tl-2xl">Job Card (UID)</th>
              <th className="px-6 py-4">Material</th>
              <th className="px-6 py-4">Received Date</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4 rounded-tr-2xl text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInwards.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-14 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3 py-4">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shadow-sm">
                      <FlaskConical className="w-7 h-7" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-bold text-sm sm:text-base text-slate-800">No inward entries found</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {hasActiveFilters
                          ? "No inwards match the active search or filters. Try clearing your filters."
                          : "Inward job cards registered in Client Inward will appear here automatically."}
                      </p>
                    </div>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetFilters}
                        className="mt-1 text-xs h-8 px-4 cursor-pointer rounded-xl border border-slate-200 hover:border-orange-300 hover:text-orange-600 font-semibold transition-all shadow-sm"
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
                const bal = latestInvoice ? Number(latestInvoice.balance_amount || 0) : 0;
                const paid = latestInvoice ? Number(latestInvoice.paid_amount || 0) : 0;

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

                const isNabl = isNablJob(job);
                const uidVal = job.uid_label || (job.uid ? String(job.uid) : "—");
                const branchName = job.branches?.name;

                // Material & Tests
                const tests = Array.isArray(job.job_entry_tests) ? job.job_entry_tests : [];
                const firstTest = tests[0];
                const materialName = firstTest?.material_description || firstTest?.test_master?.material_product || "General Materials";
                const testCount = tests.length;

                // Received Date formatted cleanly
                const dateRaw = job.inward_on || job.created_at;
                let receivedStr = "—";
                if (dateRaw) {
                  try {
                    receivedStr = format(new Date(dateRaw), "dd MMM, yyyy");
                  } catch {
                    receivedStr = String(dateRaw).slice(0, 10);
                  }
                }

                // Customer info & initial
                const clientName = job.clients?.name || "Customer";
                const clientInitial = (clientName.trim().charAt(0) || "C").toUpperCase();
                const projectName = job.project_name || job.clients?.site_name || "General";

                return (
                  <tr
                    key={job.id}
                    className="hover:bg-orange-50/30 transition-colors group cursor-pointer"
                  >
                    {/* Job Card (UID) */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                          <ClipboardList className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <div className="font-bold text-slate-800 text-[13px] flex items-center gap-1.5 flex-wrap">
                            <span>UID: {uidVal}</span>
                            {isNabl ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                NABL
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                Non-NABL
                              </span>
                            )}
                          </div>
                          {branchName && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/50 text-[10px] font-bold">
                              {branchName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Material */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 truncate max-w-[200px]" title={materialName}>
                          {materialName}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
                          {testCount > 0 ? `${testCount} test${testCount !== 1 ? "s" : ""} assigned` : "Inward received"}
                        </span>
                      </div>
                    </td>

                    {/* Received Date */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-semibold text-[13px]">{receivedStr}</span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm bg-blue-100 text-blue-700">
                          {clientInitial}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 text-[13px] truncate max-w-[190px]" title={clientName}>
                            {clientName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium truncate max-w-[190px]" title={projectName}>
                            {projectName}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {latestInvoice && hasRemainingBalance && (
                          <Button
                            onClick={() =>
                              onCreateProforma(job, {
                                isRemainingBalance: true,
                                defaultBalanceAmount: bal,
                                previousInvoice: latestInvoice,
                              })
                            }
                            size="sm"
                            variant="outline"
                            className="text-amber-700 hover:text-white border-amber-200 hover:bg-amber-600 hover:border-amber-600 shadow-sm rounded-xl h-8 px-2.5 text-xs font-bold transition-all cursor-pointer"
                            title={`Invoice Remaining Balance (${fmt(bal)})`}
                          >
                            <span>Invoice Bal</span>
                          </Button>
                        )}

                        <div className="w-[92px]">
                          <Dropdown
                            className="w-[92px] space-y-0"
                            placeholder={
                              <span className="font-semibold text-slate-700 text-xs">
                                Actions
                              </span>
                            }
                            options={[
                              ...(!latestInvoice
                                ? [
                                    {
                                      label: (
                                        <span className="flex items-center gap-2 text-orange-600 font-semibold">
                                          <FilePlus2 className="w-3.5 h-3.5 text-orange-500" />
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
                            buttonClassName="h-8 py-0 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded-xl transition-all text-slate-700 cursor-pointer group text-xs font-semibold"
                            iconClassName="text-slate-400 group-hover:text-slate-600 w-3 h-3"
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
