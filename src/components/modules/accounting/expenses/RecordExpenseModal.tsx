"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  X,
  Receipt,
  IndianRupee,
  Building2,
  Calendar,
  Loader2,
  FileText,
  AlertTriangle,
  Package,
  Layers,
  Landmark,
  CreditCard,
  User,
  Paperclip,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createExpenseAction } from "@/actions/accounting.actions";

interface RecordExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  inward?: any;
  inwards?: any[];
  categories?: any[];
  accounts?: any[];
  projects?: any[];
  onSuccess?: () => void;
}

const APPROVAL_THRESHOLD = 100000;

export function RecordExpenseModal({
  isOpen,
  onClose,
  inward,
  inwards = [],
  categories = [],
  accounts = [],
  projects = [],
  onSuccess,
}: RecordExpenseModalProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [expenseType, setExpenseType] = useState<"inward" | "inhouse" | "company">("inhouse");
  const [inwardId, setInwardId] = useState("");
  const [inwardSearch, setInwardSearch] = useState("");

  const [form, setForm] = useState({
    amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
    category_id: "",
    account_id: "",
    payment_mode: "cash",
    vendor_name: "",
    paid_through_person: "",
    bill_number: "",
    bill_attached: false,
    is_reimbursement: false,
    project_id: "",
    site_name: "",
    department: "",
    description: "",
    gst_amount: "",
    tds_amount: "",
  });

  useEffect(() => {
    if (inward) {
      setExpenseType("inward");
      setInwardId(inward.id);
      setForm((prev) => ({
        ...prev,
        site_name: inward.project_name || inward.clients?.site_name || prev.site_name,
        description: `Direct expense for Inward UID: ${inward.uid_label || inward.uid}`,
      }));
    } else {
      setExpenseType("inhouse");
      setInwardId("");
    }
  }, [inward, isOpen]);

  if (!isOpen) return null;

  const set = (k: string, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  const numAmount = Number(form.amount || 0);
  const requiresApproval =
    numAmount > APPROVAL_THRESHOLD ||
    (form.is_reimbursement && !form.bill_attached && numAmount >= 500);

  // Filter categories by type
  const inwardCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes("sample") ||
      c.name.toLowerCase().includes("testing") ||
      c.name.toLowerCase().includes("freight") ||
      c.name.toLowerCase().includes("lab") ||
      c.name.toLowerCase().includes("site") ||
      c.name.toLowerCase().includes("machinery") ||
      c.name.toLowerCase().includes("contractor") ||
      c.name.toLowerCase().includes("labour") ||
      c.name.toLowerCase().includes("material") ||
      c.scope === "site"
  );

  const inhouseCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes("calibration") ||
      c.name.toLowerCase().includes("chemical") ||
      c.name.toLowerCase().includes("consumable") ||
      c.name.toLowerCase().includes("proficiency") ||
      c.name.toLowerCase().includes("ilc") ||
      c.name.toLowerCase().includes("spares") ||
      c.name.toLowerCase().includes("curing") ||
      c.name.toLowerCase().includes("power") ||
      c.name.toLowerCase().includes("safety") ||
      c.name.toLowerCase().includes("ppe") ||
      c.name.toLowerCase().includes("amc") ||
      c.name.toLowerCase().includes("testing")
  );

  const companyCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes("salaries") ||
      c.name.toLowerCase().includes("rent") ||
      c.name.toLowerCase().includes("electricity") ||
      c.name.toLowerCase().includes("stationery") ||
      c.name.toLowerCase().includes("software") ||
      c.name.toLowerCase().includes("pantry") ||
      c.name.toLowerCase().includes("maintenance") ||
      c.name.toLowerCase().includes("legal") ||
      c.name.toLowerCase().includes("consultant") ||
      c.name.toLowerCase().includes("travel") ||
      c.name.toLowerCase().includes("department") ||
      c.scope === "branch" ||
      c.scope === "department"
  );

  const displayedCategories =
    expenseType === "inward"
      ? (inwardCategories.length > 0 ? inwardCategories : categories)
      : expenseType === "inhouse"
      ? (inhouseCategories.length > 0 ? inhouseCategories : categories)
      : (companyCategories.length > 0 ? companyCategories : categories);

  // Selected Inward metadata
  const selectedInward =
    inward || inwards.find((i) => i.id === inwardId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.amount || Number(form.amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid expense amount greater than 0.",
        variant: "error",
      });
      return;
    }

    if (expenseType === "inward" && !inwardId) {
      toast({
        title: "Inward Selection Required",
        description: "Please select an Inward UID to record an inward expense.",
        variant: "error",
      });
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          ...form,
          amount: Number(form.amount),
          gst_amount: Number(form.gst_amount || 0),
          tds_amount: Number(form.tds_amount || 0),
          expense_type: expenseType,
          inward_id: expenseType === "inward" ? inwardId : null,
          is_general_expense: expenseType === "company",
          project_id: form.project_id || null,
          category_id: form.category_id || null,
          account_id: form.account_id || null,
        };

        const res = await createExpenseAction(payload);

        if (res.success) {
          toast({
            title: "Expense Recorded",
            description: `${
              expenseType === "inward" ? "Inward-linked" : "Company"
            } expense of ₹${Number(form.amount).toLocaleString(
              "en-IN"
            )} recorded successfully. ${
              requiresApproval
                ? "Pending managerial approval."
                : "Approved."
            }`,
          });
          onSuccess?.();
          onClose();
        } else {
          toast({
            title: "Expense Recording Failed",
            description: res.error || "Could not record expense.",
            variant: "error",
          });
        }
      } catch (err: any) {
        toast({
          title: "Unexpected Error",
          description: err.message || "An unexpected error occurred.",
          variant: "error",
        });
      }
    });
  };

  const filteredInwardOptions = inwards.filter((item) => {
    if (!inwardSearch.trim()) return true;
    const q = inwardSearch.toLowerCase();
    const uidStr = String(item.uid_label || item.uid || "").toLowerCase();
    const clientStr = (item.clients?.name || "").toLowerCase();
    const projectStr = (item.project_name || "").toLowerCase();
    return uidStr.includes(q) || clientStr.includes(q) || projectStr.includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in-0 zoom-in-95 duration-200"
        role="dialog"
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-rose-400 border border-white/10">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Record Expense</h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    expenseType === "inward"
                      ? "bg-blue-500/20 text-blue-300 border-blue-400/30"
                      : expenseType === "inhouse"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                      : "bg-purple-500/20 text-purple-300 border-purple-400/30"
                  }`}
                >
                  {expenseType === "inward"
                    ? "INWARD DIRECT EXPENSE"
                    : expenseType === "inhouse"
                    ? "IN-HOUSE LAB EXPENSE"
                    : "COMPANY OVERHEAD"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Record material testing job costs, internal lab operations, or company overheads
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Segmented Type Switcher */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
              Expense Scope & Allocation
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setExpenseType("inward")}
                className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  expenseType === "inward"
                    ? "bg-white text-blue-700 shadow-md shadow-blue-500/10 border border-blue-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package className="w-4 h-4 text-blue-600" />
                <span>Inward Direct (Job UID)</span>
              </button>
              <button
                type="button"
                onClick={() => setExpenseType("inhouse")}
                className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  expenseType === "inhouse"
                    ? "bg-white text-emerald-700 shadow-md shadow-emerald-500/10 border border-emerald-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FlaskConical className="w-4 h-4 text-emerald-600" />
                <span>In-House Lab Operations</span>
              </button>
              <button
                type="button"
                onClick={() => setExpenseType("company")}
                className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  expenseType === "company"
                    ? "bg-white text-purple-700 shadow-md shadow-purple-500/10 border border-purple-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>Company Overhead</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 px-1">
              {expenseType === "inward"
                ? "Costs directly linked to sample testing, site inspection, logistics, or lab consumables for a specific job UID."
                : expenseType === "inhouse"
                ? "Internal testing laboratory expenses: calibration (NABL), test consumables/chemicals, PT/ILC charges, machine spares, curing & lab power."
                : "General overheads such as rent, salaries, electricity, tea/pantry, administration, and branch expenses."}
            </p>
          </div>

          {/* In-House Informational Notice */}
          {expenseType === "inhouse" && (
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-emerald-950">In-House Laboratory Operations Expense</div>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  This expense will be allocated to internal laboratory operational capacity (calibration, chemicals, power, maintenance) and factored into unit economics and test-wise profitability analysis.
                </p>
              </div>
            </div>
          )}

          {/* Inward Selector (if inward expense) */}
          {expenseType === "inward" && (
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-blue-600" />
                  Select Inward UID
                </span>
                {selectedInward && (
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    UID: {selectedInward.uid_label || selectedInward.uid}
                  </span>
                )}
              </div>

              {inward ? (
                <div className="p-3 bg-white rounded-xl border border-blue-200 text-xs text-slate-700 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900">
                      UID: {inward.uid_label || inward.uid}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Client: {inward.clients?.name || "N/A"} · Project: {inward.project_name || "N/A"}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                    Locked to Current Inward
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    required
                    value={inwardId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setInwardId(id);
                      const inv = inwards.find((i) => i.id === id);
                      if (inv) {
                        setForm((prev) => ({
                          ...prev,
                          site_name: inv.project_name || inv.clients?.site_name || prev.site_name,
                          description: prev.description || `Direct expense for Inward UID: ${inv.uid_label || inv.uid}`,
                        }));
                      }
                    }}
                    className="w-full h-10 px-3 bg-white border border-blue-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">— Select an Inward Job UID —</option>
                    {filteredInwardOptions.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        UID: {inv.uid_label || inv.uid} — {inv.clients?.name || "Client"} (
                        {inv.project_name || "Project"})
                      </option>
                    ))}
                  </select>

                  {inwards.length > 5 && (
                    <input
                      type="text"
                      placeholder="Quick filter inwards by UID or Client..."
                      value={inwardSearch}
                      onChange={(e) => setInwardSearch(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs bg-white/80 border border-blue-200 rounded-lg text-slate-700 placeholder-slate-400"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Amount and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                  ₹
                </span>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  className="pl-7 h-10 rounded-xl font-bold text-slate-900 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Expense Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  required
                  type="date"
                  value={form.expense_date}
                  onChange={(e) => set("expense_date", e.target.value)}
                  className="pl-9 h-10 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Category & Payment Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Category
              </label>
              <select
                value={form.category_id}
                onChange={(e) => set("category_id", e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-none"
              >
                <option value="">Select Category</option>
                {displayedCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Paid From Account
              </label>
              <select
                value={form.account_id}
                onChange={(e) => set("account_id", e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-none"
              >
                <option value="">Direct / Cash Drawer</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.account_type?.toUpperCase()}) — Balance: ₹
                    {Number(a.current_balance || 0).toLocaleString("en-IN")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Mode & Vendor / Beneficiary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Payment Mode
              </label>
              <select
                value={form.payment_mode}
                onChange={(e) => set("payment_mode", e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-none"
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer / NEFT</option>
                <option value="upi">UPI / QR Code</option>
                <option value="cheque">Cheque</option>
                <option value="rtgs">RTGS</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Vendor / Payee Name
              </label>
              <Input
                placeholder="e.g. Shree Ram Logistics, Sigma Chem Lab"
                value={form.vendor_name}
                onChange={(e) => set("vendor_name", e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Paid Through Person & Bill Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Disbursed By / Handler
              </label>
              <Input
                placeholder="Staff / Employee who paid"
                value={form.paid_through_person}
                onChange={(e) => set("paid_through_person", e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Bill / Voucher Ref No.
              </label>
              <Input
                placeholder="e.g. INV-9842, RECEIPT-01"
                value={form.bill_number}
                onChange={(e) => set("bill_number", e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Department / Site (for Company expense) */}
          {expenseType === "company" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Department
                </label>
                <Input
                  placeholder="e.g. Testing Lab, HR, Administration"
                  value={form.department}
                  onChange={(e) => set("department", e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Site / Location
                </label>
                <Input
                  placeholder="e.g. Main Lab, Site Office"
                  value={form.site_name}
                  onChange={(e) => set("site_name", e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          {/* Toggles: Bill attached & Employee Reimbursement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={form.bill_attached}
                onChange={(e) => set("bill_attached", e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700">
                Official Bill / Voucher Attached
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={form.is_reimbursement}
                onChange={(e) => set("is_reimbursement", e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700">
                Employee Reimbursement Claim
              </span>
            </label>
          </div>

          {/* GST & TDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                GST Component (₹)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.gst_amount}
                onChange={(e) => set("gst_amount", e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                TDS Withheld (₹)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.tds_amount}
                onChange={(e) => set("tds_amount", e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Description / Particulars
            </label>
            <textarea
              rows={2}
              placeholder="Provide context or description for the expense ledger entry..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>

          {/* Approval Warning Banner */}
          {requiresApproval && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Approval Workflow Triggered:</strong>
                <p className="mt-0.5 text-[11px] text-amber-700">
                  {numAmount > APPROVAL_THRESHOLD
                    ? "Amount exceeds ₹1,00,000 threshold. Will be queued for management approval."
                    : "Unbilled employee reimbursement of ₹500 or more requires approval."}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="h-10 px-5 text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-10 px-6 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isPending ? "Recording..." : "Record Expense"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
