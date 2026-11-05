"use client";

import React, { useState, useRef } from "react";
import { DeliveryChallan } from "@/types/delivery-challan";
import { DeliveryChallanDetailModal } from "./DeliveryChallanDetailModal";
import { PrintableDeliveryChallan } from "./PrintableDeliveryChallan";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { 
  Printer, 
  Eye, 
  Trash2, 
  Calendar, 
  User, 
  Truck, 
  FileText, 
  RotateCcw, 
  Plus, 
  Building,
  CheckCircle2,
  Phone
} from "lucide-react";
import { printElement } from "@/lib/print";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/use-pagination";
import { Dropdown } from "@/components/ui/Dropdown";
import { deleteDeliveryChallan } from "@/actions/delivery-challan.actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface DeliveryChallanListProps {
  challans: DeliveryChallan[];
  canManage?: boolean;
  onOpenNewChallan?: () => void;
  hasFiltersActive?: boolean;
  onResetFilters?: () => void;
}

export function DeliveryChallanList({
  challans,
  canManage = true,
  onOpenNewChallan,
  hasFiltersActive,
  onResetFilters,
}: DeliveryChallanListProps) {
  const [selectedChallan, setSelectedChallan] = useState<DeliveryChallan | null>(null);
  const [challanToPrint, setChallanToPrint] = useState<DeliveryChallan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const directPrintRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedData: paginatedChallans,
    setCurrentPage,
    setPageSize,
  } = usePagination({
    data: challans,
    initialPageSize: 10,
  });

  const handleDirectPrint = (challan: DeliveryChallan) => {
    setChallanToPrint(challan);
    setTimeout(() => {
      if (directPrintRef.current) {
        printElement(directPrintRef.current, `Delivery_Challan_${challan.challan_no}`);
      }
    }, 100);
  };

  const handleDelete = async (challan: DeliveryChallan) => {
    if (!window.confirm(`Are you sure you want to delete delivery challan ${challan.challan_no}?`)) {
      return;
    }

    setDeletingId(challan.id);
    try {
      const res = await deleteDeliveryChallan(challan.id);
      if (res.success) {
        toast({ title: "Challan deleted successfully" });
        router.refresh();
      } else {
        toast({ title: "Failed to delete", description: res.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {/* Hidden print element for direct row print action */}
      <div style={{ display: "none" }}>
        {challanToPrint && (
          <PrintableDeliveryChallan ref={directPrintRef} challan={challanToPrint} />
        )}
      </div>

      {/* Table Container */}
      <div className="w-full overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-xs">
        <table className="table-fixed w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3.5 w-28">Challan #</th>
              <th className="py-3 px-3.5 w-28">Date</th>
              <th className="py-3 px-3.5">Customer &amp; Site</th>
              <th className="py-3 px-3.5 w-44">Handed Over To</th>
              <th className="py-3 px-3.5 w-36">Issued By</th>
              <th className="py-3 px-3.5 w-24 text-right">Actions</th>
            </tr>
          </thead>
            <tbody className="divide-y divide-slate-100">
              {challans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4 ring-8 ring-orange-50/50 shadow-inner">
                        <Truck className="w-8 h-8 stroke-[1.5]" />
                      </div>
                      <h4 className="text-base font-bold text-slate-800">
                        {hasFiltersActive ? "No Matching Delivery Challans" : "No Delivery Challans Yet"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1.5 mb-5 leading-relaxed">
                        {hasFiltersActive
                          ? "Try clearing your filters or search keywords to view other records."
                          : "Create and print official material delivery challans for material handovers, testing, and collections."}
                      </p>
                      {hasFiltersActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onResetFilters}
                          className="rounded-xl border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
                        </Button>
                      ) : (
                        onOpenNewChallan && (
                          <Button
                            size="sm"
                            onClick={onOpenNewChallan}
                            className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-md shadow-orange-500/20 gap-1.5 px-4"
                          >
                            <Plus className="w-4 h-4" /> Create First Challan
                          </Button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedChallans.map((challan) => (
                  <tr
                    key={challan.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Challan # */}
                    <td className="py-3 px-3.5 whitespace-nowrap align-middle">
                      <span className="font-mono text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200/80 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 shadow-2xs group-hover:bg-orange-100/70 group-hover:border-orange-300 transition-colors">
                        {challan.challan_no}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-xs text-slate-600 font-medium align-middle">
                      {challan.challan_date
                        ? format(new Date(challan.challan_date), "dd MMM yyyy")
                        : "—"}
                    </td>

                    {/* Customer & Site */}
                    <td className="py-3 px-3.5 align-middle">
                      <div className="flex flex-col min-w-0 max-w-xs">
                        <span className="font-bold text-xs text-slate-900 truncate" title={challan.customer_name}>
                          {challan.customer_name}
                        </span>
                        {challan.project_site_name && (
                          <span className="text-[11px] text-slate-500 truncate mt-0.5" title={challan.project_site_name}>
                            {challan.project_site_name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Handed Over To */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-xs align-middle">
                      <span className="font-medium text-slate-800 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[130px]">{challan.material_taken_by}</span>
                      </span>
                    </td>

                    {/* Issued By */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-xs text-slate-700 font-medium align-middle">
                      <span className="truncate max-w-[120px] inline-block">{challan.issued_by_name}</span>
                    </td>

                    {/* Actions Dropdown */}
                    <td className="py-3 px-3.5 text-right whitespace-nowrap align-middle">
                      <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                        <Dropdown
                          className="w-[84px] space-y-0"
                          placeholder={
                            <span className="font-semibold text-slate-700 text-xs tracking-tight">
                              Actions
                            </span>
                          }
                          options={[
                            {
                              label: (
                                <span className="flex items-center gap-2 text-slate-700 font-medium">
                                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  <span>View Details</span>
                                </span>
                              ),
                              value: "view",
                            },
                            {
                              label: (
                                <span className="flex items-center gap-2 text-slate-700 font-medium">
                                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Print / Save PDF</span>
                                </span>
                              ),
                              value: "print",
                            },
                            ...(canManage
                              ? [
                                  {
                                    label: (
                                      <span className="flex items-center gap-2 text-rose-600 font-medium">
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                        <span>Delete Challan</span>
                                      </span>
                                    ),
                                    value: "delete",
                                  },
                                ]
                              : []),
                          ]}
                          align="right"
                          menuWidth={170}
                          buttonClassName="h-7 py-0 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs rounded-lg transition-all text-slate-700 cursor-pointer group text-xs font-semibold"
                          iconClassName="text-slate-400 group-hover:text-slate-600 w-3 h-3"
                          itemClassName="text-xs py-2 px-3 hover:bg-slate-50 cursor-pointer"
                          value=""
                          onChange={(val) => {
                            if (val === "view") setSelectedChallan(challan);
                            else if (val === "print") handleDirectPrint(challan);
                            else if (val === "delete") handleDelete(challan);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>

      {/* Pagination */}
      {challans.length > 0 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50]}
            itemLabel="challans"
          />
        </div>
      )}

      {/* View & Print Modal */}
      <DeliveryChallanDetailModal
        challan={selectedChallan}
        onClose={() => setSelectedChallan(null)}
      />
    </div>
  );
}
