"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Plus,
  Trash2,
  Scroll,
  Save,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  AlertCircle,
  Loader2,
  Calendar,
  Building,
  Briefcase,
  DollarSign,
} from "lucide-react";
import {
  createQuotationWithItemsAction,
  reviseQuotationAction,
  saveQuotationTemplateAction,
} from "@/actions/accounting.actions";

interface CreateQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  revisingQuotation?: any | null;
  data: any;
  onSuccess?: (msg?: string) => void;
  onRefresh?: () => void;
}

const fmt = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function CreateQuotationModal({
  isOpen,
  onClose,
  revisingQuotation,
  data,
  onSuccess,
  onRefresh,
}: CreateQuotationModalProps) {
  const [items, setItems] = useState<any[]>([
    { description: "Concrete Cube Compressive Strength Testing (IS 516)", qty: 3, rate: 450 },
  ]);
  const [form, setForm] = useState({
    project_id: "",
    client_id: "",
    valid_until: "",
    discount_amount: "",
    gst_rate: "18",
    remarks: "",
  });

  const templates: any[] = data?.templates || [];
  const defaultTemplate = templates.find((t) => t.is_default) || templates[0];

  const [activeClauses, setActiveClauses] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize or reset form when modal opens or revisingQuotation changes
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    if (revisingQuotation) {
      setForm({
        client_id: revisingQuotation.client_id || "",
        project_id: revisingQuotation.project_id || "",
        discount_amount: revisingQuotation.discount_amount ? String(revisingQuotation.discount_amount) : "",
        gst_rate: revisingQuotation.gst_rate ? String(revisingQuotation.gst_rate) : "18",
        valid_until: revisingQuotation.valid_until || "",
        remarks: revisingQuotation.remarks || "",
      });

      if (Array.isArray(revisingQuotation.items) && revisingQuotation.items.length > 0) {
        setItems(revisingQuotation.items.map((it: any) => ({
          description: it.description || "",
          qty: it.qty || 1,
          rate: it.rate || 0,
        })));
      } else {
        setItems([{ description: "Concrete Cube Compressive Strength Testing (IS 516)", qty: 3, rate: 450 }]);
      }

      if (Array.isArray(revisingQuotation.clauses) && revisingQuotation.clauses.length > 0) {
        setActiveClauses(JSON.parse(JSON.stringify(revisingQuotation.clauses)));
      } else {
        loadDefaultClauses();
      }
    } else {
      // Clean new quotation state
      setForm({
        project_id: "",
        client_id: "",
        valid_until: "",
        discount_amount: "",
        gst_rate: "18",
        remarks: "",
      });
      setItems([{ description: "Concrete Cube Compressive Strength Testing (IS 516)", qty: 3, rate: 450 }]);
      loadDefaultClauses();
    }
  }, [isOpen, revisingQuotation]);

  function loadDefaultClauses() {
    if (defaultTemplate?.clauses && defaultTemplate.clauses.length > 0) {
      setActiveClauses(JSON.parse(JSON.stringify(defaultTemplate.clauses)));
      setSelectedTemplateId(defaultTemplate.id);
    } else {
      setActiveClauses([
        {
          id: `cls-${Date.now()}-1`,
          title: "Testing Standards & Scope",
          content:
            "All tests are executed in strict accordance with relevant BIS / ASTM specifications. Results relate exclusively to the tested specimen.",
          display_order: 1,
        },
        {
          id: `cls-${Date.now()}-2`,
          title: "Payment Terms",
          content:
            "50% advance mobilization payment required. Remaining 50% balance due prior to formal stamped test certificate release.",
          display_order: 2,
        },
      ]);
    }
  }

  // Financial calculations
  const subtotal = items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.rate || 0), 0);
  const discount = Number(form.discount_amount || 0);
  const taxable = Math.max(0, subtotal - discount);
  const gstRate = Number(form.gst_rate || 18);
  const gst = (taxable * gstRate) / 100;
  const total = taxable + gst;

  // Item handlers
  function addItem() {
    setItems([...items, { description: "", qty: 1, rate: 0 }]);
  }
  function updateItem(i: number, k: string, v: any) {
    const n = [...items];
    n[i] = { ...n[i], [k]: v };
    setItems(n);
  }
  function removeItem(i: number) {
    if (items.length > 1) {
      setItems(items.filter((_, idx) => idx !== i));
    }
  }

  // Clause handlers
  const handleLoadTemplate = (append = false) => {
    if (!selectedTemplateId) return;
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;

    const newClauses = JSON.parse(JSON.stringify(tpl.clauses || [])).map((c: any, idx: number) => ({
      ...c,
      id: `cls-${Date.now()}-${idx + 1}`,
      display_order: idx + 1,
    }));

    if (append) {
      setActiveClauses((prev) => {
        const startIdx = prev.length;
        const appended = newClauses.map((c: any, i: number) => ({ ...c, display_order: startIdx + i + 1 }));
        return [...prev, ...appended];
      });
    } else {
      setActiveClauses(newClauses);
    }
  };

  const addCustomClause = () => {
    setActiveClauses((prev) => [
      ...prev,
      {
        id: `cls-custom-${Date.now()}`,
        title: "",
        content: "",
        display_order: prev.length + 1,
      },
    ]);
  };

  const updateClause = (idx: number, field: string, val: string) => {
    setActiveClauses((prev) => {
      const n = [...prev];
      n[idx] = { ...n[idx], [field]: val };
      return n;
    });
  };

  const removeClause = (idx: number) => {
    setActiveClauses((prev) => prev.filter((_, i) => i !== idx).map((c, i) => ({ ...c, display_order: i + 1 })));
  };

  const moveClause = (idx: number, dir: "up" | "down") => {
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === activeClauses.length - 1) return;
    setActiveClauses((prev) => {
      const n = [...prev];
      const target = dir === "up" ? idx - 1 : idx + 1;
      [n[idx], n[target]] = [n[target], n[idx]];
      return n.map((c, i) => ({ ...c, display_order: i + 1 }));
    });
  };

  const handleSaveAsTemplate = async () => {
    const templateName = window.prompt("Enter a title for the new T&C template:");
    if (!templateName || !templateName.trim()) return;

    const res = await saveQuotationTemplateAction({
      name: templateName.trim(),
      category: "Material Testing",
      is_default: false,
      clauses: activeClauses,
    });

    if (res.success) {
      alert("T&C Template saved successfully!");
      if (onRefresh) onRefresh();
    } else {
      alert("Failed to save template: " + (res.error || "Unknown error"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (items.some((it) => !it.description.trim())) {
      setErrorMsg("All line items must have a clear description.");
      return;
    }

    const compiledTerms = activeClauses
      .map((c) => `${(c.title || "").toUpperCase()}:\n${c.content || ""}`)
      .join("\n\n");

    setIsSubmitting(true);
    try {
      if (revisingQuotation) {
        const revReason = window.prompt(
          "Enter revision reason / modification summary (optional):",
          "Revised line items and commercial terms as requested"
        );
        const res = await reviseQuotationAction(revisingQuotation.id, {
          ...form,
          items,
          discount_amount: discount,
          gst_rate: gstRate,
          terms: compiledTerms,
          clauses: activeClauses,
          revision_reason: revReason || `Revised to Version ${(revisingQuotation.version_number || 1) + 1}`,
          status: "draft",
        });

        if (res.success) {
          if (onSuccess) onSuccess(`Quotation revised to Version ${(revisingQuotation.version_number || 1) + 1} successfully!`);
          if (onRefresh) onRefresh();
          onClose();
        } else {
          setErrorMsg(res.error || "Failed to revise quotation.");
        }
      } else {
        const res = await createQuotationWithItemsAction({
          ...form,
          items,
          discount_amount: discount,
          gst_rate: gstRate,
          terms: compiledTerms,
          clauses: activeClauses,
        });

        if (res.success) {
          if (onSuccess) onSuccess("Quotation created successfully!");
          if (onRefresh) onRefresh();
          onClose();
        } else {
          setErrorMsg(res.error || "Failed to create quotation.");
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred while saving quotation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputCls =
    "w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {revisingQuotation
                  ? `Revise Quotation (${revisingQuotation.quotation_no} V${(revisingQuotation.version_number || 1) + 1})`
                  : "Create New Quotation"}
              </h2>
              <p className="text-xs text-slate-500">
                Testing & Engineering Services · Detailed commercial proposal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-800 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {revisingQuotation && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold">
                <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
                <span>Revising {revisingQuotation.quotation_no}</span>
                <span className="text-amber-700 ml-1">
                  (Creating Version {(revisingQuotation.version_number || 1) + 1})
                </span>
              </div>
              {revisingQuotation.rework_notes && (
                <div className="text-[11px] text-amber-800 bg-amber-100/60 p-2 rounded-lg mt-1">
                  <strong>Rework Instructions:</strong> {revisingQuotation.rework_notes}
                </div>
              )}
              {revisingQuotation.rejection_reason && (
                <div className="text-[11px] text-rose-800 bg-rose-100/60 p-2 rounded-lg mt-1">
                  <strong>Rejection Note:</strong> {revisingQuotation.rejection_reason}
                </div>
              )}
            </div>
          )}

          {/* Section: Client & Project Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-600" /> Client Name <span className="text-rose-500">*</span>
              </label>
              <select
                required
                className={inputCls}
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              >
                <option value="">Select a Client</option>
                {(data?.clients || []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-600" /> Project / Site
              </label>
              <select
                className={inputCls}
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              >
                <option value="">General Project / Site</option>
                {(data?.projects || []).map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: Line Items & Testing Parameters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">Line Items & Testing Parameters</label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line Item
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              <div className="grid grid-cols-12 gap-2 bg-slate-50 p-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <div className="col-span-6">Description of Test / Service</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Rate (₹)</div>
                <div className="col-span-2 text-right">Amount (₹)</div>
              </div>

              {items.map((it, i) => {
                const rowAmt = (Number(it.qty) || 0) * (Number(it.rate) || 0);
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 p-2.5 items-center bg-white hover:bg-slate-50/50">
                    <div className="col-span-6">
                      <input
                        required
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-blue-500 outline-none"
                        placeholder="e.g. Compressive Strength Test"
                        value={it.description}
                        onChange={(e) => updateItem(i, "description", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        className="w-full text-xs text-center border border-slate-200 rounded-lg py-1.5 focus:border-blue-500 outline-none"
                        value={it.qty}
                        onChange={(e) => updateItem(i, "qty", Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        className="w-full text-xs text-right border border-slate-200 rounded-lg py-1.5 px-2 focus:border-blue-500 outline-none"
                        placeholder="0.00"
                        value={it.rate}
                        onChange={(e) => updateItem(i, "rate", Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-between text-xs font-semibold text-slate-800">
                      <span className="w-full text-right">{fmt(rowAmt)}</span>
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        disabled={items.length <= 1}
                        className="text-slate-400 hover:text-rose-600 ml-2 disabled:opacity-20 cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing & GST Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-blue-600" /> Discount Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                className={inputCls}
                placeholder="0.00"
                value={form.discount_amount}
                onChange={(e) => setForm({ ...form, discount_amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GST Rate</label>
              <select
                className={inputCls}
                value={form.gst_rate}
                onChange={(e) => setForm({ ...form, gst_rate: e.target.value })}
              >
                <option value="18">18% (Standard GST)</option>
                <option value="12">12% GST</option>
                <option value="5">5% GST</option>
                <option value="0">0% (Exempt)</option>
              </select>
            </div>

            <div className="sm:col-span-2 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div>
                Subtotal: <strong className="text-slate-900">{fmt(subtotal)}</strong>
              </div>
              {discount > 0 && <div className="text-emerald-700">Discount: -{fmt(discount)}</div>}
              <div>
                GST ({gstRate}%): <strong className="text-slate-900">{fmt(gst)}</strong>
              </div>
              <div className="text-sm font-bold text-blue-700">Total Quotation: {fmt(total)}</div>
            </div>
          </div>

          {/* Legal Terms & Conditions Clause Engine */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scroll className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900">Legal Terms & Conditions Specification</h4>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={addCustomClause}
                  className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Clause
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsTemplate}
                  disabled={activeClauses.length === 0}
                  className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  <Save className="w-3 h-3" /> Save as Template
                </button>
              </div>
            </div>

            {/* Template Selector Bar */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Select Pre-authorized T&C Template
                </label>
                <select
                  className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 bg-white outline-none focus:border-blue-500"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  <option value="">-- Choose a T&C Template --</option>
                  {templates.map((tpl: any) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.category}) {tpl.is_default ? "★ Default" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-4 sm:pt-0">
                <button
                  type="button"
                  onClick={() => handleLoadTemplate(false)}
                  disabled={!selectedTemplateId}
                  className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                >
                  Load Template
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadTemplate(true)}
                  disabled={!selectedTemplateId}
                  className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg transition-all disabled:opacity-40 cursor-pointer"
                >
                  Append Clauses
                </button>
              </div>
            </div>

            {/* Active Clauses Cards List */}
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {activeClauses.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                  No clauses loaded. Select a template above or click &quot;+ Add Clause&quot; to specify custom terms.
                </div>
              ) : (
                activeClauses.map((clause, idx) => (
                  <div key={clause.id || idx} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          value={clause.title}
                          onChange={(e) => updateClause(idx, "title", e.target.value)}
                          placeholder="Clause Heading (e.g. Payment Schedule, Warranty Limits)"
                          className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400"
                        />
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => moveClause(idx, "up")}
                          disabled={idx === 0}
                          title="Move Up"
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveClause(idx, "down")}
                          disabled={idx === activeClauses.length - 1}
                          title="Move Down"
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeClause(idx)}
                          title="Remove Clause"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="p-3 relative">
                      <textarea
                        value={clause.content}
                        onChange={(e) => updateClause(idx, "content", e.target.value)}
                        placeholder="Detailed contractual clause terms or testing limitations..."
                        rows={2}
                        maxLength={500}
                        className="w-full text-xs text-slate-700 bg-transparent border border-slate-200 rounded-lg p-2 pb-5 outline-none focus:border-blue-500 resize-none leading-relaxed"
                      />
                      <div className="absolute bottom-4 right-4 text-[10px] text-slate-400 pointer-events-none">
                        {clause.content?.length || 0}/500
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Valid until and remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Quotation Validity Date
              </label>
              <input
                type="date"
                className={inputCls}
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Internal Remarks / Notes</label>
              <input
                className={inputCls}
                placeholder="Internal tracking remarks..."
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 ${
                revisingQuotation
                  ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Quotation...
                </>
              ) : revisingQuotation ? (
                `Save & Issue Revision V${(revisingQuotation.version_number || 1) + 1}`
              ) : (
                "Create Quotation with Authorized T&C"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
