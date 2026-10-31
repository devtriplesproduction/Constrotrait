"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Search,
  CheckCircle2,
  CheckSquare,
  Square,
  FlaskConical,
  Building2,
  Trees,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TestCatalogItem {
  id: string;
  specific_test?: string | null;
  component_parameter?: string | null;
  particulars?: string | null;
  test_method?: string | null;
  tested_as_per_is?: string | null;
  category?: string | null;
  is_nabl?: boolean | null;
  unit?: string | null;
  material_product?: string | null;
  sample_size?: string | number | null;
  rate?: number | string | null;
  [key: string]: any;
}

export function formatTestCatalogLabel(t: TestCatalogItem): string {
  const name =
    t.component_parameter?.trim() ||
    t.specific_test?.trim() ||
    t.particulars?.trim() ||
    "Laboratory Test";
  const method = t.test_method?.trim() || t.tested_as_per_is?.trim();
  return method ? `${name} (${method})` : name;
}

interface SelectTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: "NABL" | "Non-NABL";
  department: "Construction" | "Environment";
  onCategoryChange?: (category: "NABL" | "Non-NABL") => void;
  onDepartmentChange?: (department: "Construction" | "Environment") => void;
  allTests: TestCatalogItem[];
  onSelectTests: (selectedTests: TestCatalogItem[]) => void;
}

export function SelectTestModal({
  isOpen,
  onClose,
  category,
  department,
  onCategoryChange,
  onDepartmentChange,
  allTests = [],
  onSelectTests,
}: SelectTestModalProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset search and selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIds(new Set());
    }
  }, [isOpen, category, department]);

  // Filter tests based on active category & department
  const filteredTests = useMemo(() => {
    if (!Array.isArray(allTests)) return [];
    return allTests.filter((t) => {
      // 1. Category filter: NABL vs Non-NABL
      const isNabl = Boolean(t.is_nabl);
      if (category === "NABL" && !isNabl) return false;
      if (category === "Non-NABL" && isNabl) return false;

      // 2. Department filter: Construction vs Environment
      const testCat = (t.category || "").toLowerCase();
      if (department === "Construction" && !testCat.includes("construction")) return false;
      if (department === "Environment" && !testCat.includes("environ")) return false;

      // 3. Search query filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const param = (t.component_parameter || "").toLowerCase();
        const spec = (t.specific_test || "").toLowerCase();
        const part = (t.particulars || "").toLowerCase();
        const method = (t.test_method || "").toLowerCase();
        const isCode = (t.tested_as_per_is || "").toLowerCase();
        const mat = (t.material_product || "").toLowerCase();
        const label = formatTestCatalogLabel(t).toLowerCase();

        const match =
          param.includes(q) ||
          spec.includes(q) ||
          part.includes(q) ||
          method.includes(q) ||
          isCode.includes(q) ||
          mat.includes(q) ||
          label.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [allTests, category, department, search]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredTests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTests.map((t) => t.id)));
    }
  };

  const handleConfirm = () => {
    const selected = allTests.filter((t) => selectedIds.has(t.id));
    if (selected.length > 0) {
      onSelectTests(selected);
      onClose();
    }
  };

  const handleQuickAddSingle = (test: TestCatalogItem) => {
    onSelectTests([test]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-white">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Select Laboratory Tests
                </h3>
                <p className="text-xs text-slate-500">
                  Pick testing parameters to add to your quotation line items
                </p>
              </div>
            </div>

            {/* Scope Badges */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500">Active Scope:</span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  category === "NABL"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {category === "NABL" ? (
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                ) : (
                  <ShieldAlert className="w-3 h-3 text-amber-600" />
                )}
                {category}
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {department === "Construction" ? (
                  <Building2 className="w-3 h-3 text-blue-600" />
                ) : (
                  <Trees className="w-3 h-3 text-blue-600" />
                )}
                {department} Department
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                ({filteredTests.length} tests found)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 sm:px-6 bg-slate-50/70 border-b border-slate-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tests by name, parameter, IS code (e.g. Cube, Sieve, IS 516)..."
                className="w-full text-xs pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Switcher Tabs */}
            {onCategoryChange && (
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/90 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => onCategoryChange("NABL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    category === "NABL"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  NABL
                </button>
                <button
                  type="button"
                  onClick={() => onCategoryChange("Non-NABL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    category === "Non-NABL"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Non-NABL
                </button>
              </div>
            )}

            {/* Department Switcher Tabs */}
            {onDepartmentChange && (
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/90 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => onDepartmentChange("Construction")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    department === "Construction"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Construction
                </button>
                <button
                  type="button"
                  onClick={() => onDepartmentChange("Environment")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    department === "Environment"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Environment
                </button>
              </div>
            )}
          </div>

          {/* Selection Stats & Select All */}
          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={filteredTests.length === 0}
              className="flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-40 cursor-pointer"
            >
              {selectedIds.size === filteredTests.length && filteredTests.length > 0 ? (
                <>
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  <span>Deselect All ({filteredTests.length})</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-400" />
                  <span>Select All Visible ({filteredTests.length})</span>
                </>
              )}
            </button>

            <span className="text-[11px] font-medium text-slate-500">
              {selectedIds.size > 0 ? (
                <span className="font-bold text-blue-700">
                  {selectedIds.size} of {filteredTests.length} tests selected
                </span>
              ) : (
                `Showing ${filteredTests.length} tests`
              )}
            </span>
          </div>
        </div>

        {/* Test List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 divide-y divide-slate-100">
          {filteredTests.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="p-3 bg-slate-100 text-slate-400 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                <FlaskConical className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                No matching tests found for this combination
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No tests in the catalog match Category &ldquo;{category}&rdquo; and Department &ldquo;{department}&rdquo;
                {search ? ` with keyword &ldquo;${search}&rdquo;` : ""}. Try switching the department or category.
              </p>
            </div>
          ) : (
            filteredTests.map((t) => {
              const isSelected = selectedIds.has(t.id);
              const label = formatTestCatalogLabel(t);
              const isNabl = Boolean(t.is_nabl);
              const method = t.test_method || t.tested_as_per_is;

              return (
                <div
                  key={t.id}
                  onClick={() => toggleSelect(t.id)}
                  className={`pt-2.5 first:pt-0 p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-blue-50/70 border-blue-300 shadow-xs"
                      : "bg-white hover:bg-slate-50/80 border-slate-200/80"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(t.id);
                      }}
                      className="mt-0.5 text-blue-600 cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                      )}
                    </button>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                          {t.component_parameter || t.specific_test || t.particulars || "Test"}
                        </span>
                        {method && (
                          <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {method}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                        {t.material_product && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <span className="font-bold uppercase tracking-wider text-[9px] text-slate-400">
                              Mat:
                            </span>
                            <span>{t.material_product}</span>
                          </span>
                        )}

                        {t.unit && (
                          <span className="text-slate-400">• Unit: {t.unit}</span>
                        )}

                        {t.sample_size && (
                          <span className="text-slate-400">• Sample: {t.sample_size}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isNabl
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {isNabl ? "NABL" : "Non-NABL"}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickAddSingle(t);
                      }}
                      className="h-8 px-2.5 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                      title="Add this test immediately"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Add</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            {selectedIds.size > 0 ? (
              <span className="font-bold text-blue-700">
                {selectedIds.size} test{selectedIds.size > 1 ? "s" : ""} selected for quotation
              </span>
            ) : (
              <span className="text-slate-400">Select tests using the checkboxes above</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 px-4 text-xs font-bold text-slate-600 rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                Add {selectedIds.size > 0 ? `${selectedIds.size} ` : ""}Selected Test{selectedIds.size > 1 ? "s" : ""}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
