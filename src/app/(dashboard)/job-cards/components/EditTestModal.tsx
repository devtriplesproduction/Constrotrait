"use client";

import React, { useState } from "react";
import { Edit2, X } from "lucide-react";
import { ClientWizard } from "@/components/modules/clients/ClientWizard";
import { Button } from "@/components/ui/button";

export function EditTestModal({ client, test }: { client: any; test: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-slate-600 bg-white border-slate-200 hover:bg-slate-50 hover:text-orange-600 hover:border-orange-200 shadow-sm rounded-full transition-all"
      >
        <Edit2 className="w-3.5 h-3.5" />
        Edit
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative z-10 w-full max-w-5xl mx-auto shadow-2xl rounded-2xl overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-4 right-4 z-[60]">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-red-50 hover:text-red-600 text-slate-500 shadow-sm"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>

            <ClientWizard
              mode="edit"
              initialData={{ client, jobEntryTest: test }}
              onSuccess={() => setIsOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
