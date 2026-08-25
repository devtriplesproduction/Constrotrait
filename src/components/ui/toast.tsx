"use client";

import * as React from "react";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useToast, type ToastVariant } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-0 right-0 z-[200] flex flex-col p-4 space-y-3 w-full max-w-[420px] pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ 
  toast, 
  onDismiss 
}: { 
  toast: { id: string; variant?: ToastVariant; title?: React.ReactNode; description?: React.ReactNode; }; 
  onDismiss: () => void 
}) {
  return (
    <div
      className="pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-xl p-4 shadow-2xl transition-all animate-in slide-in-from-right-full duration-300 bg-white border border-slate-200 pl-5"
    >
      {/* Premium left indicator strip that aligns with theme variants */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", getBorderLeftColor(toast.variant))} />
      
      <div className="flex gap-3">
        <div className="mt-0.5">
          {getIcon(toast.variant)}
        </div>
        <div className="grid gap-1">
          {toast.title && (
            <div className="text-sm font-bold text-slate-900 ">
              {toast.title}
            </div>
          )}
          {toast.description && (
            <div className="text-xs text-slate-500  leading-relaxed">
              {toast.description}
            </div>
          )}
        </div>
      </div>
      <Button
        onClick={onDismiss}
        className="absolute right-2 top-2 rounded-lg p-1 opacity-50 transition-opacity hover:opacity-100 hover:bg-slate-100 text-slate-400 "
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function getBorderLeftColor(variant: ToastVariant = "default") {
  switch (variant) {
    case "success":
      return "bg-emerald-500";
    case "error":
      return "bg-rose-500";
    case "warning":
      return "bg-amber-500";
    default:
      return "bg-orange-500";
  }
}

function getIcon(variant: ToastVariant = "default") {
  switch (variant) {
    case "success":
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    case "error":
      return <AlertCircle className="h-5 w-5 text-rose-500" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    default:
      return <Info className="h-5 w-5 text-orange-500" />;
  }
}
