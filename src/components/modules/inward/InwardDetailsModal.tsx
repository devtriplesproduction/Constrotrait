"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Receipt, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InwardDetailsView } from "./InwardDetailsView";

interface InwardDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobEntry: any;
  tests?: any[];
  client?: any;
  branch?: any;
}

export function InwardDetailsModal({
  isOpen,
  onClose,
  jobEntry,
  tests = [],
  client,
  branch,
}: InwardDetailsModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || typeof document === "undefined" || !jobEntry) {
    return null;
  }

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-5xl max-h-[92vh] bg-slate-50/95 rounded-[2rem] shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-lg">Inward Full Details</h3>
                <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/60">
                  {jobEntry.uid_label || (jobEntry.uid ? `UID: ${jobEntry.uid}` : "Record")}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">All customer, site, material, billing and test parameters recorded at inward</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <InwardDetailsView
            jobEntry={jobEntry}
            tests={tests}
            client={client}
            branch={branch}
            onClose={onClose}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200/80 flex items-center justify-between shrink-0">
          <span className="text-xs font-medium text-slate-400">
            ConstroTrait Inward Management
          </span>
          <Button
            variant="outline"
            onClick={onClose}
            className="h-9 px-5 rounded-xl font-bold text-xs text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm"
          >
            Close
          </Button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
