"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Printer,
  Copy,
  Check,
  Scroll,
  FileText,
  Edit3,
  ShieldCheck,
  Star,
  Layers,
  Trash2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils/cn";
import type { TemplateData } from "./TemplateManager";

interface TemplateDetailPageProps {
  template: TemplateData;
  onBack: () => void;
  onEdit: (template: TemplateData) => void;
  onDuplicate: (templateId: string) => void;
  onSetDefault: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  getCategoryConfig: (category: string) => any;
}

export function TemplateDetailPage({
  template,
  onBack,
  onEdit,
  onDuplicate,
  onSetDefault,
  onDelete,
  getCategoryConfig,
}: TemplateDetailPageProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const catStyle = getCategoryConfig(template.category);
  const clauses = template.clauses || [];

  const handlePrint = () => {
    window.print();
  };

  const handleCopyClauses = () => {
    const text =
      `*CONSTROTRAIT TERMS & CONDITIONS SPECIFICATION*\n` +
      `Template: ${template.name}\n` +
      `Category: ${template.category || "General"}\n` +
      `Default Specification: ${template.is_default ? "YES" : "NO"}\n` +
      `Total Clauses: ${clauses.length}\n` +
      `==========================================\n\n` +
      clauses
        .map(
          (c, idx) =>
            `${idx + 1}. ${c.title.toUpperCase()}\n${c.content}`
        )
        .join("\n\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Clauses Copied",
      description: "Terms and conditions copied to clipboard in text format.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {/* Top Header Actions Bar (In-Page) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 px-6 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xs shadow-xs print:hidden">
        <div className="flex items-center gap-3.5 flex-wrap min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-slate-700 bg-slate-100/90 hover:bg-slate-200/90 border border-slate-200 text-xs font-semibold transition-all hover:shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span>Back to Templates</span>
          </button>

          <div className="h-7 w-px bg-slate-200 hidden sm:block" />

          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
            <Scroll className="w-5 h-5 text-blue-600" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight truncate">
                {template.name}
              </h2>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-2xs shrink-0",
                  catStyle.badge
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", catStyle.dot)} />
                {template.category || "General"}
              </span>
              {template.is_default && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1 border border-emerald-200 shrink-0">
                  <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                  Default Specification
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Standard commercial terms & conditions · {clauses.length} clause{clauses.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyClauses}
            className="h-9 px-3.5 text-xs gap-1.5 rounded-xl cursor-pointer hover:bg-slate-100 font-semibold text-slate-700 border-slate-200 shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copy Text</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-9 px-3.5 text-xs gap-1.5 rounded-xl cursor-pointer hover:bg-slate-100 font-semibold text-slate-700 border-slate-200 shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print</span>
          </Button>

          {template.id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDuplicate(template.id!)}
              className="h-9 px-3.5 text-xs gap-1.5 rounded-xl cursor-pointer hover:bg-indigo-50 font-semibold text-indigo-700 border-indigo-200/80 shadow-2xs"
            >
              <Copy className="w-4 h-4 text-indigo-600" />
              <span>Duplicate</span>
            </Button>
          )}

          {!template.is_default && template.id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSetDefault(template.id!)}
              className="h-9 px-3.5 text-xs gap-1.5 rounded-xl cursor-pointer hover:bg-emerald-50 font-semibold text-emerald-700 border-emerald-200/80 shadow-2xs"
            >
              <Star className="w-4 h-4 text-emerald-600" />
              <span>Make Default</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => onEdit(template)}
            className="h-9 px-4 text-xs gap-1.5 rounded-xl cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Template</span>
          </Button>
        </div>
      </div>

      {/* In-Page Document Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-10 space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b-2 border-slate-900 gap-4">
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900">
              CONSTROTRAIT<span className="text-blue-600">.</span>
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              Civil Engineering & Materials Testing Laboratory
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Standard Commercial Terms & Technical Specifications
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 mb-2">
              T&C Specification
            </span>
            <div className="text-base font-bold text-slate-900">{template.name}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              Discipline: <strong className="text-slate-800">{template.category || "General Testing"}</strong>
            </div>
          </div>
        </div>

        {/* Quick Specs Overview Banner (Grid of 4 cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 p-4 bg-slate-50/75 border border-slate-200 rounded-xl text-xs">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Service Discipline</span>
              <strong className="font-bold text-slate-800">{template.category || "General Testing"}</strong>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Specification Role</span>
              <span className="font-semibold text-slate-700">
                {template.is_default ? "Default Quotation Terms" : "Discipline Specification"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Clauses Quantity</span>
              <span className="font-semibold text-slate-700">{clauses.length} Defined Clauses</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Deployment Status</span>
              <span className="font-semibold text-slate-700">
                {template.is_default ? "Active Standard" : "Available in Quotation Engine"}
              </span>
            </div>
          </div>
        </div>

        {/* Clauses Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Scroll className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Contractual Terms & Conditions
            </h3>
          </div>

          {clauses.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No clauses defined in this template yet. Click &quot;Edit Template&quot; to add clauses.
            </div>
          ) : (
            <div className="space-y-4">
              {clauses.map((clause, idx) => (
                <div
                  key={clause.id || idx}
                  className="p-5 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-2 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {clause.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line">
                        {clause.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Document Footer Disclaimer */}
        <div className="pt-6 border-t border-slate-200 text-[11px] text-slate-400 leading-relaxed text-center">
          These terms &amp; conditions apply to all quotations, purchase orders, and testing contracts issued under this specification.
          Subject to standard ConstroTrait engineering regulations and national testing codes.
        </div>
      </div>

      {/* Bottom Actions Bar (In-Page, Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 px-6 rounded-2xl border border-slate-200 bg-white/95 shadow-xs print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold cursor-pointer transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
          <span>Back to Templates</span>
        </button>

        <div className="flex items-center gap-2">
          {template.id && (
            <button
              type="button"
              onClick={() => onDelete(template.id!)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold cursor-pointer transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Template</span>
            </button>
          )}

          <Button
            size="sm"
            onClick={() => onEdit(template)}
            className="h-9 px-4 text-xs gap-1.5 rounded-xl cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Template</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
