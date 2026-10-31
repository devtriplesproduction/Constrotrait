"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Scroll,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Loader2,
  Tag,
  Check,
  ChevronDown,
  Edit3,
  Star,
  FileText,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  CategoryColor,
  ServiceCategory,
  COLOR_CONFIG,
  ClauseItem,
  TemplateData,
} from "./TemplateManager";

const SWATCH_OPTIONS: CategoryColor[] = [
  "blue",
  "teal",
  "emerald",
  "orange",
  "purple",
  "rose",
  "amber",
];

interface TemplateFormPageProps {
  template: TemplateData;
  onBack: () => void;
  onSave: (template: TemplateData) => Promise<void>;
  saving: boolean;
  categories: ServiceCategory[];
  onAddCategory: (name: string, color: CategoryColor) => void;
  onRenameCategory: (id: string, newName: string) => void;
  onDeleteCategory: (cat: ServiceCategory) => void;
  getCategoryConfig: (category: string) => any;
}

export function TemplateFormPage({
  template,
  onBack,
  onSave,
  saving,
  categories,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  getCategoryConfig,
}: TemplateFormPageProps) {
  const [formData, setFormData] = useState<TemplateData>(
    JSON.parse(JSON.stringify(template))
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Category dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [inlineAddName, setInlineAddName] = useState("");
  const [inlineAddColor, setInlineAddColor] = useState<CategoryColor>("teal");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setIsAddingInline(false);
        setEditingCategoryId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddClause = () => {
    const nextOrder = (formData.clauses?.length || 0) + 1;
    setFormData((prev) => ({
      ...prev,
      clauses: [
        ...(prev.clauses || []),
        {
          id: `cls-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          title: "",
          content: "",
          display_order: nextOrder,
        },
      ],
    }));
  };

  const handleRemoveClause = (index: number) => {
    setFormData((prev) => {
      const updated = prev.clauses.filter((_, i) => i !== index);
      return {
        ...prev,
        clauses: updated.map((c, i) => ({ ...c, display_order: i + 1 })),
      };
    });
  };

  const handleUpdateClause = (index: number, field: keyof ClauseItem, val: any) => {
    setFormData((prev) => {
      const clauses = [...prev.clauses];
      clauses[index] = { ...clauses[index], [field]: val };
      return { ...prev, clauses };
    });
  };

  const handleMoveClause = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === (formData.clauses?.length || 0) - 1) return;

    setFormData((prev) => {
      const clauses = [...prev.clauses];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      const temp = clauses[index];
      clauses[index] = clauses[targetIndex];
      clauses[targetIndex] = temp;

      return {
        ...prev,
        clauses: clauses.map((c, i) => ({ ...c, display_order: i + 1 })),
      };
    });
  };

  const handleInlineAddCategorySubmit = () => {
    const trimmed = (inlineAddName || dropdownSearch).trim();
    if (!trimmed) return;

    onAddCategory(trimmed, inlineAddColor);
    setFormData((prev) => ({ ...prev, category: trimmed }));

    setInlineAddName("");
    setDropdownSearch("");
    setIsAddingInline(false);
    setIsDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.name.trim()) {
      setErrorMsg("Template title is required.");
      return;
    }

    if (!formData.clauses || formData.clauses.length === 0) {
      setErrorMsg("At least one clause is required in the template.");
      return;
    }

    if (formData.clauses.some((c) => !c.title.trim() || !c.content.trim())) {
      setErrorMsg("All clauses must have both a title and description content.");
      return;
    }

    try {
      await onSave(formData);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save template.");
    }
  };

  const filteredCategoriesForDropdown = categories.filter((c) =>
    c.name.toLowerCase().includes(dropdownSearch.toLowerCase())
  );

  const currentCatConfig = getCategoryConfig(formData.category);

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {/* Top Header Actions Bar (In-Page) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 px-6 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xs shadow-xs">
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
            <Edit3 className="w-5 h-5 text-blue-600" />
          </div>

          <div>
            <h2 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
              {formData.id ? `Edit Template: ${formData.name}` : "Create New T&C Template"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Standardize legal clauses, warranty limitations, and commercial conditions
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={saving}
            className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{formData.id ? "Update Template" : "Save Template"}</span>
          </Button>
        </div>
      </div>

      {/* Main Form Container (In-Page) */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-800 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Basic Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Template Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Template Title *</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Standard Concrete Testing T&C 2026"
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>

          {/* Service Category Dropdown */}
          <div className="space-y-1.5 relative" ref={dropdownRef}>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              <span>Service Category *</span>
            </label>

            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
                setDropdownSearch("");
                setIsAddingInline(false);
                setEditingCategoryId(null);
              }}
              className={cn(
                "w-full h-11 px-3.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all cursor-pointer",
                isDropdownOpen
                  ? "bg-white border-blue-500 ring-2 ring-blue-500/10 shadow-xs"
                  : "bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300"
              )}
            >
              <div className="flex items-center gap-2 overflow-hidden pr-2">
                <span className={cn("w-2 h-2 rounded-full shrink-0", currentCatConfig.dot)} />
                <span className="text-slate-900 truncate font-semibold">
                  {formData.category || "Select Service Discipline"}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-slate-400 transition-transform shrink-0",
                  isDropdownOpen && "rotate-180"
                )}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={dropdownSearch}
                    onChange={(e) => setDropdownSearch(e.target.value)}
                    placeholder="Search or add category..."
                    className="w-full text-xs bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 font-medium"
                    autoFocus
                  />
                  {dropdownSearch && (
                    <button
                      type="button"
                      onClick={() => setDropdownSearch("")}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {filteredCategoriesForDropdown.map((cat) => {
                    const isSelected =
                      (formData.category || "").toLowerCase() === cat.name.toLowerCase();
                    const style = COLOR_CONFIG[cat.color] || COLOR_CONFIG.blue;
                    const isBeingEdited = editingCategoryId === cat.id;

                    if (isBeingEdited) {
                      return (
                        <div
                          key={cat.id}
                          className="flex items-center gap-1.5 p-1 bg-blue-50/50 rounded-lg border border-blue-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="flex-1 h-7 px-2 text-xs bg-white border border-blue-300 rounded font-medium outline-none"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                onRenameCategory(cat.id, editingCategoryName);
                                setEditingCategoryId(null);
                              } else if (e.key === "Escape") {
                                setEditingCategoryId(null);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              onRenameCategory(cat.id, editingCategoryName);
                              setEditingCategoryId(null);
                            }}
                            className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategoryId(null)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={cat.id || cat.name}
                        onClick={() => {
                          setFormData({ ...formData, category: cat.name });
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between group transition-colors cursor-pointer",
                          isSelected
                            ? "bg-blue-50 text-blue-900 font-semibold"
                            : "text-slate-700 hover:bg-slate-100"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={cn("w-2 h-2 rounded-full shrink-0", style.dot)} />
                          <span className="truncate">{cat.name}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 mr-1" />}
                          {cat.isCustom && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCategoryId(cat.id);
                                  setEditingCategoryName(cat.name);
                                  setTimeout(() => editInputRef.current?.focus(), 50);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Rename category"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteCategory(cat);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete category"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Inline Add Category Section */}
                <div className="pt-2 border-t border-slate-100">
                  {!isAddingInline ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingInline(true);
                        setInlineAddName(dropdownSearch);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50/70 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Service Category</span>
                    </button>
                  ) : (
                    <div
                      className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={inlineAddName}
                        onChange={(e) => setInlineAddName(e.target.value)}
                        placeholder="Category name (e.g. Chemical Analysis)"
                        className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg font-medium outline-none focus:border-blue-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleInlineAddCategorySubmit();
                        }}
                      />

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">
                          Color:
                        </span>
                        {SWATCH_OPTIONS.map((col) => {
                          const swatchConf = COLOR_CONFIG[col];
                          return (
                            <button
                              key={col}
                              type="button"
                              onClick={() => setInlineAddColor(col)}
                              className={cn(
                                "w-4 h-4 rounded-full transition-transform cursor-pointer",
                                swatchConf.swatch,
                                inlineAddColor === col
                                  ? "ring-2 ring-blue-500 ring-offset-1 scale-110"
                                  : "opacity-70 hover:opacity-100"
                              )}
                            />
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingInline(false)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleInlineAddCategorySubmit}
                          disabled={!inlineAddName.trim() && !dropdownSearch.trim()}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-md disabled:opacity-50"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Default Template Checkbox */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Star className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Default Quotation Specification
              </span>
              <span className="text-[11px] text-slate-500 block">
                Automatically pre-fill these clauses when creating a new quotation
              </span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Clauses Section */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Scroll className="w-3.5 h-3.5 text-blue-600" />
                <span>Clause Specifications ({formData.clauses?.length || 0})</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Order of clauses as they will appear in quotation documents and printouts
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddClause}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Clause</span>
            </button>
          </div>

          {/* Clauses List */}
          <div className="space-y-4">
            {formData.clauses?.map((clause, index) => (
              <div
                key={clause.id || index}
                className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all space-y-3"
              >
                {/* Clause Header Strip */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-700">Clause #{index + 1}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveClause(index, "up")}
                      disabled={index === 0}
                      title="Move Up"
                      className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveClause(index, "down")}
                      disabled={index === (formData.clauses?.length || 0) - 1}
                      title="Move Down"
                      className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveClause(index)}
                      title="Remove Clause"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Clause Inputs */}
                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={clause.title}
                    onChange={(e) => handleUpdateClause(index, "title", e.target.value)}
                    placeholder="Clause Title (e.g. Turnaround Time & Reporting)"
                    className="w-full h-10 px-3 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                  <div className="relative">
                    <textarea
                      value={clause.content}
                      onChange={(e) => handleUpdateClause(index, "content", e.target.value)}
                      placeholder="Detailed clause description or legal terms statement..."
                      rows={3}
                      maxLength={600}
                      className="w-full p-3 pb-6 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 outline-none resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all leading-relaxed"
                    />
                    <div className="absolute bottom-2 right-2.5 text-[10px] text-slate-400 font-medium pointer-events-none">
                      {clause.content?.length || 0}/600
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Form Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={saving}
            className="h-10 px-5 text-xs font-semibold rounded-xl cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={saving}
            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{formData.id ? "Update Template" : "Save Template"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
