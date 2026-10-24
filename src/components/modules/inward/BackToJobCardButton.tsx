"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackToJobCardButtonProps {
  assignmentId?: string | null;
  returnUrl?: string | null;
  className?: string;
  variant?: "primary" | "hero" | "outline" | "footer";
  label?: string;
}

export function BackToJobCardButton({
  assignmentId,
  returnUrl,
  className = "",
  variant = "primary",
  label = "Back to Job Card",
}: BackToJobCardButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (assignmentId) {
      router.push(`/job-assignments/${assignmentId}`);
    } else if (returnUrl) {
      router.push(returnUrl);
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/job-assignments");
    }
  };

  if (variant === "hero") {
    return (
      <button
        onClick={handleBack}
        className={`group inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 hover:border-white/30 backdrop-blur-md shadow-sm transition-all duration-200 text-xs font-bold ${className}`}
      >
        <div className="w-6 h-6 rounded-lg bg-white/15 group-hover:bg-orange-500 flex items-center justify-center transition-colors">
          <ArrowLeft className="w-3.5 h-3.5 text-white group-hover:-translate-x-0.5 transition-transform" />
        </div>
        <span>{label}</span>
      </button>
    );
  }

  if (variant === "footer") {
    return (
      <Button
        onClick={handleBack}
        size="lg"
        className={`group relative overflow-hidden bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] transition-all flex items-center gap-3 ${className}`}
      >
        <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-white group-hover:-translate-x-1 transition-transform" />
        </div>
        <span className="text-sm">{label}</span>
      </Button>
    );
  }

  return (
    <button
      onClick={handleBack}
      className={`group inline-flex items-center gap-3 text-sm font-bold text-slate-700 hover:text-orange-600 transition-all duration-200 bg-white hover:bg-orange-50/60 px-4 py-2.5 rounded-2xl border border-slate-200 hover:border-orange-200 shadow-sm hover:shadow-md ${className}`}
    >
      <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-orange-100 text-slate-500 group-hover:text-orange-600 flex items-center justify-center transition-colors border border-slate-200/60 group-hover:border-orange-200">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
      </div>
      <span>{label}</span>
    </button>
  );
}
