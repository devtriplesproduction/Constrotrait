"use client";

import React, { useState, useEffect, useTransition } from "react";
import { X, Plus, Trash2, FileText, AlertCircle, CheckCircle2, IndianRupee, Loader2, Building, Calendar, Hash, Scroll, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createInvoiceWithItemsAction, getClientPreviousInvoiceAction, getQuotationTemplatesAction } from "@/actions/accounting.actions";

interface LineItem {
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

interface InwardJob {
  id: string;
  uid: number | null;
  uid_label: string | null;
  inward_on: string | null;
  created_at: string;
  project_name: string | null;
  division?: string | null;
  client_id?: string;
  clients?: {
    id: string;
    name: string;
    email?: string | null;
    mobile?: string | null;
    address?: string | null;
    gst_no?: string | null;
    contact_person?: string | null;
    site_name?: string | null;
  } | null;
  job_entry_tests?: Array<{
    id: string;
    material_description?: string | null;
    sample_quantity?: string | null;
    test_master?: {
      id: string;
      component_parameter?: string | null;
      specific_test?: string | null;
      material_product?: string | null;
      unit?: string | null;
    } | null;
  }>;
  invoices?: Array<{
    id: string;
    invoice_no: string;
    invoice_type?: string;
    status: string;
    total_amount: number;
    paid_amount: number;
    balance_amount: number;
    invoice_date?: string;
    due_date?: string;
    items?: any;
  }>;
}

interface CreateProformaInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  inward?: InwardJob | null;
  isRemainingBalance?: boolean;
  defaultBalanceAmount?: number;
  initialPreviousInvoice?: any;
  clients?: any[];
  projects?: any[];
  onSuccess?: () => void;
}

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export function CreateProformaInvoiceModal({
  isOpen,
  onClose,
  inward,
  isRemainingBalance,
  defaultBalanceAmount,
  initialPreviousInvoice,
  clients = [],
  projects = [],
  onSuccess,
}: CreateProformaInvoiceModalProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [selectedClientId, setSelectedClientId] = useState<string>(inward?.clients?.id || inward?.client_id || "");
  const [selectedInwardId, setSelectedInwardId] = useState<string>(inward?.id || "");
  const [projectId, setProjectId] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState<string>("Proforma invoice for material testing and laboratory evaluation.");
  const [gstRate, setGstRate] = useState<number>(18);
  const [tdsAmount, setTdsAmount] = useState<string>("");

  // T&C Templates state
  const [tcTemplates, setTcTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedClauses, setSelectedClauses] = useState<any[]>([]);

  // Previous invoice tracking state
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [previousInvoice, setPreviousInvoice] = useState<any>(null);
  const [carryForwardPrev, setCarryForwardPrev] = useState(true);

  // Remaining balance mode state
  const [remainingBalanceMode, setRemainingBalanceMode] = useState<boolean>(false);

  // Line items state
  const [items, setItems] = useState<LineItem[]>([]);

  // Load T&C templates
  useEffect(() => {
    if (!isOpen) return;
    getQuotationTemplatesAction()
      .then((res) => {
        if (res.success && "data" in res && res.data) {
          setTcTemplates(res.data);
          const def = res.data.find((t: any) => t.is_default);
          if (def && selectedClauses.length === 0) {
            setSelectedTemplateId(def.id);
            setSelectedClauses((def.clauses as any[]) || []);
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const handleApplyTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = tcTemplates.find(t => t.id === tplId);
    if (tpl) {
      const cls = (tpl.clauses as any[]) || [];
      setSelectedClauses(cls);
      const compiled = cls.map((c: any) => `${c.title}: ${c.content}`).join("\n");
      setNotes(compiled);
    }
  };

  // Target partial invoice for this inward (only if it has not already been followed by a remaining balance invoice)
  const targetPartialInvoice = initialPreviousInvoice || (() => {
    const invs = Array.isArray(inward?.invoices) ? inward.invoices : [];
    return invs.find((i: any) => {
      const hasBal = Number(i.balance_amount || 0) > 0;
      const hasPaid = Number(i.paid_amount || 0) > 0;
      if (!hasBal || !hasPaid) return false;
      const alreadyInvoiced = invs.some((other: any) =>
        other.id !== i.id && (
          other.previous_invoice_id === i.id ||
          other.notes?.includes(i.invoice_no) ||
          (Array.isArray(other.items) && other.items.some((it: any) => it.description?.includes(i.invoice_no)))
        )
      );
      return !alreadyInvoiced;
    }) || null;
  })();

  // Initialize line items from inward when modal opens or inward changes
  useEffect(() => {
    if (!isOpen) return;

    if (inward) {
      setSelectedInwardId(inward.id);
      const cId = inward.clients?.id || inward.client_id || "";
      setSelectedClientId(cId);

      const shouldBeRemainingMode = Boolean(isRemainingBalance || (targetPartialInvoice && Number(targetPartialInvoice.balance_amount || 0) > 0));
      setRemainingBalanceMode(shouldBeRemainingMode);

      if (shouldBeRemainingMode && targetPartialInvoice) {
        const balAmount = defaultBalanceAmount !== undefined ? defaultBalanceAmount : Number(targetPartialInvoice.balance_amount || 0);
        setItems([
          {
            description: `Remaining Unpaid Balance for Inward UID: ${inward.uid_label || inward.uid || "—"} (Ref: ${targetPartialInvoice.invoice_no})`,
            qty: 1,
            rate: balAmount,
            amount: balAmount,
          },
        ]);
        setGstRate(0); // If remaining balance is gross balance due, default 0% GST to match exact balance
        setNotes(`Invoice generated for remaining balance amount of Inward UID: ${inward.uid_label || ""}. Previous Invoice: ${targetPartialInvoice.invoice_no} (Total: ₹${targetPartialInvoice.total_amount || 0}, Paid: ₹${targetPartialInvoice.paid_amount || 0}, Balance Due: ₹${balAmount}).`);
        setPreviousInvoice(targetPartialInvoice);
        setCarryForwardPrev(false);
      } else {
        // Prepopulate line items from inward tests
        const tests = inward.job_entry_tests || [];
        if (tests.length > 0) {
          const initialItems: LineItem[] = tests.map((t) => {
            const tm = t.test_master;
            const nameParts = [
              tm?.material_product || tm?.component_parameter,
              tm?.specific_test,
            ].filter(Boolean);

            const desc = nameParts.length > 0
              ? nameParts.join(" - ")
              : t.material_description || "Laboratory Test Analysis";

            return {
              description: desc,
              qty: 1,
              rate: 0,
              amount: 0,
            };
          });
          setItems(initialItems);
        } else {
          setItems([
            {
              description: inward.project_name
                ? `Testing Charges for ${inward.project_name}`
                : "Testing Charges",
              qty: 1,
              rate: 0,
              amount: 0,
            },
          ]);
        }
      }
    } else {
      setSelectedInwardId("");
      setRemainingBalanceMode(false);
      setItems([{ description: "Testing and inspection services", qty: 1, rate: 0, amount: 0 }]);
    }
  }, [inward, isOpen, isRemainingBalance, defaultBalanceAmount, initialPreviousInvoice]);

  // Load previous invoice for selected client
  useEffect(() => {
    if (!selectedClientId) {
      setPreviousInvoice(null);
      return;
    }

    setLoadingPrev(true);
    getClientPreviousInvoiceAction(selectedClientId)
      .then((res) => {
        if (res.success && "data" in res && res.data) {
          setPreviousInvoice(res.data.previousInvoice);
        } else {
          setPreviousInvoice(null);
        }
      })
      .catch(() => setPreviousInvoice(null))
      .finally(() => setLoadingPrev(false));
  }, [selectedClientId]);

  if (!isOpen) return null;

  const resolvedClient = inward?.clients || clients.find((c) => c.id === selectedClientId);

  const addItem = () => {
    setItems((prev) => [...prev, { description: "", qty: 1, rate: 0, amount: 0 }]);
  };

  const updateItem = (index: number, key: keyof LineItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [key]: value };
      if (key === "qty" || key === "rate") {
        const q = key === "qty" ? Number(value || 0) : item.qty;
        const r = key === "rate" ? Number(value || 0) : item.rate;
        item.amount = Math.round(q * r * 100) / 100;
      }
      copy[index] = item;
      return copy;
    });
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const gstAmount = Math.round(((subtotal * gstRate) / 100) * 100) / 100;
  const tds = Number(tdsAmount || 0);
  const currentProformaTotal = Math.max(0, subtotal + gstAmount - tds);

  const prevBalance = previousInvoice?.balance_amount ? Number(previousInvoice.balance_amount) : 0;
  const netPayableWithPrevious = currentProformaTotal + (carryForwardPrev ? prevBalance : 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId) {
      toast({ title: "Client Required", description: "Please select a client for this proforma invoice.", variant: "error" });
      return;
    }

    if (items.length === 0 || subtotal <= 0) {
      toast({ title: "Valid Line Items Required", description: "Please enter at least one line item with a rate greater than 0.", variant: "error" });
      return;
    }

    startTransition(async () => {
      const res = await createInvoiceWithItemsAction({
        invoice_type: "proforma",
        inward_id: selectedInwardId || null,
        client_id: selectedClientId,
        project_id: projectId || null,
        previous_invoice_id: remainingBalanceMode
          ? (targetPartialInvoice?.id || previousInvoice?.id || null)
          : ((carryForwardPrev && previousInvoice?.id) ? previousInvoice.id : null),
        previous_balance_amount: carryForwardPrev ? prevBalance : 0,
        items,
        subtotal,
        gst_amount: gstAmount,
        tds_amount: tds,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        notes: notes.trim() || null,
        clauses: selectedClauses,
        remarks: inward?.uid_label ? `Generated from Inward UID: ${inward.uid_label}` : undefined,
      });

      if (res.success && "data" in res) {
        toast({
          title: "Proforma Invoice Created",
          description: `Proforma Invoice ${res.data?.invoice_no || ""} generated successfully with inward linkage.`,
        });
        onSuccess?.();
        onClose();
      } else {
        toast({
          title: "Failed to Create Proforma Invoice",
          description: res.error || "An error occurred while saving the proforma invoice.",
          variant: "error",
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between ${
          remainingBalanceMode
            ? "bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-white"
            : "bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-white"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-md font-bold ${
              remainingBalanceMode
                ? "bg-amber-600 shadow-amber-500/20"
                : "bg-blue-600 shadow-blue-500/20"
            }`}>
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {remainingBalanceMode ? "Create Remaining Balance Invoice" : "Create Proforma Invoice"}
                </h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  remainingBalanceMode
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : "bg-blue-100 text-blue-700 border border-blue-200/60"
                }`}>
                  {remainingBalanceMode ? "Remaining Amount Due" : "Proforma"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {remainingBalanceMode
                  ? `Invoice showing remaining unpaid amount of Inward UID: ${inward?.uid_label || "—"}`
                  : inward?.uid_label ? `Based on Inward UID: ${inward.uid_label}` : "Generate proforma invoice and track client outstanding balance"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Remaining Balance Mode Alert & Switcher */}
          {targetPartialInvoice && (
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              remainingBalanceMode
                ? "bg-amber-50/90 border-amber-200 text-amber-950"
                : "bg-blue-50/60 border-blue-200 text-blue-900"
            }`}>
              <div className="flex items-start gap-2.5">
                <Clock className={`w-4 h-4 mt-0.5 shrink-0 ${remainingBalanceMode ? "text-amber-600" : "text-blue-600"}`} />
                <div>
                  <div className="font-bold">
                    {remainingBalanceMode
                      ? `Billing Remaining Amount for Inward UID: ${inward?.uid_label || "—"}`
                      : `Inward UID: ${inward?.uid_label || "—"} has an outstanding balance`}
                  </div>
                  <p className="mt-0.5 text-slate-600">
                    Previous Invoice <strong>{targetPartialInvoice.invoice_no}</strong>: Total {fmt(targetPartialInvoice.total_amount)} · Paid {fmt(targetPartialInvoice.paid_amount)} ·
                    Remaining Due: <strong className="text-rose-700 font-bold">{fmt(targetPartialInvoice.balance_amount)}</strong>
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newMode = !remainingBalanceMode;
                    setRemainingBalanceMode(newMode);
                    if (newMode) {
                      const bal = defaultBalanceAmount !== undefined ? defaultBalanceAmount : Number(targetPartialInvoice.balance_amount || 0);
                      setItems([{
                        description: `Remaining Unpaid Balance for Inward UID: ${inward?.uid_label || inward?.uid || "—"} (Ref: ${targetPartialInvoice.invoice_no})`,
                        qty: 1,
                        rate: bal,
                        amount: bal,
                      }]);
                      setGstRate(0);
                    } else {
                      const tests = inward?.job_entry_tests || [];
                      if (tests.length > 0) {
                        setItems(tests.map(t => ({
                          description: t.test_master?.specific_test || t.material_description || "Laboratory Test Analysis",
                          qty: 1,
                          rate: 0,
                          amount: 0,
                        })));
                      }
                      setGstRate(18);
                    }
                  }}
                  className="h-7 text-xs font-semibold bg-white hover:bg-slate-50 cursor-pointer shadow-xs"
                >
                  {remainingBalanceMode ? "Switch to All Test Items" : "Invoice Remaining Balance"}
                </Button>
              </div>
            </div>
          )}

          {/* Inward & Client Info Banner */}
          <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-sm">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Client Information
              </span>
              {resolvedClient ? (
                <div>
                  <div className="font-bold text-slate-900 text-base">{resolvedClient.name}</div>
                  {resolvedClient.gst_no && <div className="text-xs text-slate-600">GST: {resolvedClient.gst_no}</div>}
                  {resolvedClient.address && <div className="text-xs text-slate-500 truncate max-w-sm">{resolvedClient.address}</div>}
                  {resolvedClient.mobile && <div className="text-xs text-slate-500">Contact: {resolvedClient.mobile}</div>}
                </div>
              ) : (
                <select
                  required
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm bg-white"
                >
                  <option value="">Select a Client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="border-t sm:border-t-0 sm:border-l border-slate-200 sm:pl-4 pt-3 sm:pt-0">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Inward & Project Details
              </span>
              <div className="space-y-1 text-xs text-slate-600">
                {inward?.uid_label && (
                  <div className="flex items-center gap-1.5 font-medium text-slate-800">
                    <Hash className="w-3.5 h-3.5 text-blue-500" />
                    <span>Inward UID: <strong>{inward.uid_label}</strong></span>
                  </div>
                )}
                {inward?.inward_on && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Inward Date: {inward.inward_on}</span>
                  </div>
                )}
                {(inward?.project_name || resolvedClient?.site_name) && (
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>Site / Project: {inward?.project_name || resolvedClient?.site_name}</span>
                  </div>
                )}
                <div>Tests under Inward: <strong className="text-slate-900">{inward?.job_entry_tests?.length || items.length}</strong></div>
              </div>
            </div>
          </div>

          {/* Previous Invoice & Outstanding Balance Tracker Alert */}
          {loadingPrev ? (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span>Checking previous invoice & outstanding balance for this client...</span>
            </div>
          ) : previousInvoice ? (
            <div className={`p-4 rounded-xl border transition-all ${
              prevBalance > 0
                ? "bg-amber-50/70 border-amber-200/90 text-amber-900"
                : "bg-emerald-50/60 border-emerald-200/80 text-emerald-900"
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {prevBalance > 0 ? (
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs space-y-1">
                    <div className="font-semibold text-sm">
                      Previous Invoice Found: {previousInvoice.invoice_no} ({previousInvoice.invoice_date || "Date N/A"})
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span>Total Billed: <strong>{fmt(previousInvoice.total_amount)}</strong></span>
                      <span>Amount Received: <strong className="text-emerald-700">{fmt(previousInvoice.paid_amount || 0)}</strong></span>
                      <span>Outstanding Balance: <strong className={prevBalance > 0 ? "text-amber-800" : "text-emerald-700"}>{fmt(prevBalance)}</strong></span>
                    </div>

                    {/* Show previous payments list if any */}
                    {previousInvoice.invoice_payments && previousInvoice.invoice_payments.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-amber-200/50">
                        <span className="font-medium text-[11px] block text-amber-950">Recorded Payments on Previous Invoice:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {previousInvoice.invoice_payments.map((p: any) => (
                            <span key={p.id} className="inline-flex items-center gap-1 bg-white/80 border border-amber-200 px-2 py-0.5 rounded text-[11px] text-slate-700">
                              <span>{p.payment_date || "Date"}</span>
                              <strong className="text-emerald-700">{fmt(p.amount)}</strong>
                              <span className="text-slate-400">({p.payment_mode || "Bank"})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {prevBalance > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer shrink-0 text-xs font-semibold bg-white/80 px-3 py-1.5 rounded-lg border border-amber-300/80 shadow-xs">
                    <input
                      type="checkbox"
                      checked={carryForwardPrev}
                      onChange={(e) => setCarryForwardPrev(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Include on Invoice</span>
                  </label>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>No previous outstanding balance found for this client. Clean ledger.</span>
            </div>
          )}

          {/* Line Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Line Items (Tests & Material Evaluation)</span>
                <span className="text-xs font-normal text-slate-500">({items.length} items)</span>
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="h-8 text-xs font-medium text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Line Item
              </Button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="grid grid-cols-12 gap-2 bg-slate-100/70 p-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <div className="col-span-6 sm:col-span-7">Description / Test Parameter</div>
                <div className="col-span-2 sm:col-span-1 text-center">Qty</div>
                <div className="col-span-2 text-right">Rate (₹)</div>
                <div className="col-span-2 text-right">Amount (₹)</div>
              </div>

              <div className="divide-y divide-slate-100 bg-white">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 p-2.5 items-center hover:bg-slate-50/50 transition-colors">
                    <div className="col-span-6 sm:col-span-7">
                      <Input
                        required
                        placeholder="Description of test or service"
                        value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Input
                        required
                        type="number"
                        min="1"
                        step="1"
                        value={item.qty}
                        onChange={(e) => updateItem(idx, "qty", e.target.value)}
                        className="h-8 text-xs text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.rate || ""}
                        onChange={(e) => updateItem(idx, "rate", e.target.value)}
                        className="h-8 text-xs text-right"
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <span className="font-semibold text-xs text-slate-800">
                        {fmt(item.amount)}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dates & Financial Settings Grid */}
          <div className="grid sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Invoice Date</label>
              <Input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">GST Rate</label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full h-9 border border-slate-300 rounded-lg px-3 text-xs bg-white text-slate-800"
              >
                <option value={18}>18% (Standard GST)</option>
                <option value={12}>12% GST</option>
                <option value={5}>5% GST</option>
                <option value={0}>0% (Exempted)</option>
                <option value={28}>28% GST</option>
              </select>
            </div>
          </div>

          {/* Summary & Calculations Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            {remainingBalanceMode && targetPartialInvoice && (
              <div className="p-3 mb-2 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-1.5 text-xs text-amber-950">
                <div className="font-bold flex items-center gap-1.5 text-amber-900 border-b border-amber-200 pb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Inward Ledger Reference ({targetPartialInvoice.invoice_no})</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Original Inward Amount:</span>
                  <span className="font-semibold text-slate-900">{fmt(targetPartialInvoice.total_amount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Amount Already Received:</span>
                  <span>{fmt(targetPartialInvoice.paid_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-950 pt-1 border-t border-amber-200">
                  <span>Remaining Unpaid Balance:</span>
                  <span className="text-rose-700">{fmt(targetPartialInvoice.balance_amount)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between text-xs text-slate-600">
              <span>{remainingBalanceMode ? "Remaining Amount Subtotal" : "Line Items Subtotal"}</span>
              <span className="font-medium text-slate-900">{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>GST ({gstRate}%)</span>
              <span className="font-medium text-slate-900">{fmt(gstAmount)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600 items-center">
              <span>TDS Deduction (if applicable)</span>
              <div className="w-28">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={tdsAmount}
                  onChange={(e) => setTdsAmount(e.target.value)}
                  className="h-7 text-xs text-right bg-white"
                />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
              <span>{remainingBalanceMode ? "This Balance Invoice Total" : "Current Proforma Total"}</span>
              <span className={remainingBalanceMode ? "text-amber-700" : "text-blue-700"}>{fmt(currentProformaTotal)}</span>
            </div>

            {/* Previous Outstanding Balance row */}
            {prevBalance > 0 && carryForwardPrev && (
              <div className="flex justify-between text-xs font-semibold text-amber-800 pt-1 border-t border-amber-200/60">
                <span>+ Previous Invoice Outstanding Due ({previousInvoice?.invoice_no})</span>
                <span>{fmt(prevBalance)}</span>
              </div>
            )}

            {/* Net Total Payable */}
            {prevBalance > 0 && carryForwardPrev && (
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 flex justify-between items-center text-sm font-bold text-blue-950 mt-2">
                <span>Net Total Payable by Customer</span>
                <span className="text-base text-blue-700">{fmt(netPayableWithPrevious)}</span>
              </div>
            )}
          </div>

          {/* Terms & Conditions / Notes */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Scroll className="w-3.5 h-3.5 text-blue-600" />
                Terms & Conditions / Client Notes
              </label>

              {tcTemplates.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">Apply Template:</span>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleApplyTemplate(e.target.value)}
                    className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- Custom Terms --</option>
                    {tcTemplates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} {tpl.is_default ? "★" : ""} ({tpl.clauses?.length || 0} clauses)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {selectedClauses && selectedClauses.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1.5 max-h-36 overflow-y-auto">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <span>Structured Clauses ({selectedClauses.length}):</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId("");
                      setSelectedClauses([]);
                      setNotes("");
                    }}
                    className="text-red-500 hover:text-red-700 text-[10px]"
                  >
                    Clear clauses
                  </button>
                </div>
                <div className="space-y-1">
                  {selectedClauses.map((c: any, idx: number) => (
                    <div key={c.id || idx} className="text-[11px] text-slate-600 flex gap-1.5 items-start">
                      <span className="font-bold text-blue-600 shrink-0">{idx + 1}. {c.title}:</span>
                      <span className="text-slate-500 truncate">{c.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Terms of payment, testing timelines, account details or remarks for the customer"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>

          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isPending || items.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/20 px-6 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Proforma...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate Proforma Invoice
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
