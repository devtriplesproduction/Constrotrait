"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { ClientWizard } from "@/components/modules/clients/ClientWizard";

export default function NewInwardModalButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New Inward
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-5xl mx-auto shadow-2xl rounded-2xl overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <div className="absolute top-4 right-4 z-[60]">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full h-8 w-8 bg-slate-100/50 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            
            <ClientWizard onSuccess={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
