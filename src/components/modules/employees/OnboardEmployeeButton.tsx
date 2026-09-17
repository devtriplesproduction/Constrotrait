"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { OnboardForm } from "./OnboardForm";

import { Button } from "@/components/ui/button";
interface OnboardEmployeeButtonProps {
  className?: string;
}

export function OnboardEmployeeButton({ 
  className = "flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold tracking-wide transition-all shadow-sm hover:shadow-md"
}: OnboardEmployeeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <Plus className="w-4 h-4" />
        Onboard Employee
      </Button>

      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div 
            className="relative w-full max-w-4xl my-auto animate-in zoom-in-95 duration-200"
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200">
              <OnboardForm onSuccess={() => setIsOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
