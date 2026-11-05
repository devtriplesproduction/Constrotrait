"use client";

import React, { useRef } from "react";
import { DeliveryChallan } from "@/types/delivery-challan";
import { PrintableDeliveryChallan } from "./PrintableDeliveryChallan";
import { Button } from "@/components/ui/button";
import { Printer, X, Truck, Calendar, User, Building, Phone } from "lucide-react";
import { printElement } from "@/lib/print";
import { format } from "date-fns";

interface DeliveryChallanDetailModalProps {
  challan: DeliveryChallan | null;
  onClose: () => void;
}

export function DeliveryChallanDetailModal({
  challan,
  onClose,
}: DeliveryChallanDetailModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!challan) return null;

  const handlePrint = () => {
    if (printRef.current) {
      printElement(printRef.current, `Delivery_Challan_${challan.challan_no}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Top Bar */}
        <div className="print:hidden p-5 border-b border-slate-200/80 bg-white/95 backdrop-blur flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100/70 text-orange-600 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  Challan {challan.challan_no}
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200/60">
                  {challan.purpose_of_handover}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {challan.challan_date
                    ? format(new Date(challan.challan_date), "dd MMM yyyy")
                    : "—"}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-slate-700">
                  {challan.customer_name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs h-9 px-4 gap-2 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </Button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Preview Area */}
        <div className="p-4 sm:p-6 bg-slate-100/60 overflow-y-auto flex-1 flex justify-center">
          <div className="bg-white shadow-md border border-slate-200 rounded-lg w-full max-w-[820px]">
            <PrintableDeliveryChallan ref={printRef} challan={challan} />
          </div>
        </div>

        {/* Modal Footer / Metadata */}
        <div className="print:hidden border-t border-slate-200/80 bg-slate-50/90 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Taken By: <strong className="text-slate-800">{challan.material_taken_by}</strong></span>
            </div>
            {challan.mobile_no && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Mobile: <strong className="text-slate-800">{challan.mobile_no}</strong></span>
              </div>
            )}
            {challan.company_agency_name && (
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Agency: <strong className="text-slate-800">{challan.company_agency_name}</strong></span>
              </div>
            )}
            <div className="text-slate-400">
              Items: <strong className="text-slate-700">{challan.items.length}</strong>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl border-slate-200 text-xs font-medium self-end sm:self-center shrink-0"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
