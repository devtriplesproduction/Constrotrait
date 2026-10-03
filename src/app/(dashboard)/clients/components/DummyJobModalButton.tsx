"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { createDummyJobCardAction } from "@/actions/client-wizard.actions";
import { useToast } from "@/hooks/use-toast";

export default function DummyJobModalButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async (isNabl: boolean) => {
    setIsLoading(true);
    const result = await createDummyJobCardAction(isNabl);
    setIsLoading(false);
    if (result.success) {
      toast({ title: "Success", description: "Dummy Job Card created." });
      setIsOpen(false);
    } else {
      toast({ title: "Error", description: result.error, variant: "error" });
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="ml-2" variant="outline">
        <Plus className="mr-2 h-4 w-4" />
        Dummy Job Card
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isLoading && setIsOpen(false)} />
          <div className="relative z-10 w-full max-w-sm mx-auto shadow-2xl rounded-2xl p-6 bg-white animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-4 right-4 z-[60]">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 bg-slate-100/50 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            
            <h3 className="text-xl font-bold mb-4">Create Dummy Job Card</h3>
            <p className="mb-6 text-sm text-slate-500">Is this dummy job card for NABL or Non-NABL tests?</p>
            <div className="flex gap-4">
              <Button disabled={isLoading} className="flex-1" onClick={() => handleCreate(true)}>NABL</Button>
              <Button disabled={isLoading} variant="secondary" className="flex-1" onClick={() => handleCreate(false)}>Non-NABL</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
