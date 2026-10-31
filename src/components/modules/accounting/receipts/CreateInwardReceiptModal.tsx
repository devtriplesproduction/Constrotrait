"use client";

import React, { useState, useTransition } from "react";
import { X, Receipt, IndianRupee, Landmark, Building, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createInwardReceiptAction } from "@/actions/accounting.actions";

interface CreateInwardReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts?: any[];
  projects?: any[];
  clients?: any[];
  onSuccess?: () => void;
}

export function CreateInwardReceiptModal({
  isOpen,
  onClose,
  accounts = [],
  projects = [],
  clients = [],
  onSuccess,
}: CreateInwardReceiptModalProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    amount: "",
    party_type: "client",
    client_id: "",
    party_name: "",
    payment_mode: "neft",
    account_id: "",
    project_id: "",
    receipt_date: new Date().toISOString().slice(0, 10),
    remarks: "",
    gst_amount: "",
    tds_amount: "",
    paid_through_person: "",
  });

  if (!isOpen) return null;

  const set = (k: string, v: any) => {
    if (k === "client_id") {
      const selectedClient = clients.find((c) => c.id === v);
      setForm((prev) => ({
        ...prev,
        client_id: v,
        party_name: selectedClient ? selectedClient.name : prev.party_name,
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      toast({ title: "Validation Error", description: "Please enter a valid amount.", variant: "error" });
      return;
    }

    startTransition(async () => {
      try {
        const res = await createInwardReceiptAction({
          ...form,
          amount: Number(form.amount),
          gst_amount: Number(form.gst_amount || 0),
          tds_amount: Number(form.tds_amount || 0),
        });

        if (res.success && "data" in res) {
          toast({
            title: "Receipt Created",
            description: `Inward receipt ${res.data?.receipt_no || ""} recorded successfully.`,
          });
          onSuccess?.();
          onClose();
        } else {
          toast({
            title: "Creation Failed",
            description: res.error || "Could not create inward receipt.",
            variant: "error",
          });
        }
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "An unexpected error occurred.",
          variant: "error",
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/80 via-slate-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Inward Receipt</h2>
              <p className="text-xs text-slate-500">Record a direct payment voucher and allocate funds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-slate-700">
          {/* Amount and Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Receipt Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  className="pl-7 h-9 text-sm font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Receipt Date</label>
              <Input
                type="date"
                required
                value={form.receipt_date}
                onChange={(e) => set("receipt_date", e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Party Type & Client */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Party Type</label>
              <select
                className="w-full h-9 border border-slate-300 rounded-lg px-2.5 text-xs bg-white text-slate-800"
                value={form.party_type}
                onChange={(e) => set("party_type", e.target.value)}
              >
                <option value="client">Client / Customer</option>
                <option value="government">Government Authority</option>
                <option value="other">Other Entity</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Select Client (Optional)</label>
              <select
                className="w-full h-9 border border-slate-300 rounded-lg px-2.5 text-xs bg-white text-slate-800"
                value={form.client_id}
                onChange={(e) => set("client_id", e.target.value)}
              >
                <option value="">— Direct / Custom Party —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Party Name */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Received From (Party / Client Name) <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="e.g. Acme Constructions Ltd"
              value={form.party_name}
              onChange={(e) => set("party_name", e.target.value)}
              className="h-9 text-xs font-medium"
            />
          </div>

          {/* Payment Mode & Bank Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Mode</label>
              <select
                className="w-full h-9 border border-slate-300 rounded-lg px-2.5 text-xs bg-white text-slate-800"
                value={form.payment_mode}
                onChange={(e) => set("payment_mode", e.target.value)}
              >
                <option value="neft">NEFT / RTGS</option>
                <option value="bank">Bank Transfer</option>
                <option value="upi">UPI / QR</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Deposited Into Account</label>
              <select
                className="w-full h-9 border border-slate-300 rounded-lg px-2.5 text-xs bg-white text-slate-800"
                value={form.account_id}
                onChange={(e) => set("account_id", e.target.value)}
              >
                <option value="">— Select Account —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.bank_name || a.account_type?.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Project & Paid Through */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Accounting Project</label>
              <select
                className="w-full h-9 border border-slate-300 rounded-lg px-2.5 text-xs bg-white text-slate-800"
                value={form.project_id}
                onChange={(e) => set("project_id", e.target.value)}
              >
                <option value="">— General / No Project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Paid Through Person / Rep</label>
              <Input
                placeholder="Optional name"
                value={form.paid_through_person}
                onChange={(e) => set("paid_through_person", e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* GST & TDS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">GST Component (₹)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.gst_amount}
                onChange={(e) => set("gst_amount", e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">TDS Deducted (₹)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.tds_amount}
                onChange={(e) => set("tds_amount", e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Remarks / Transaction Ref</label>
            <Input
              placeholder="e.g. UTR # or reference notes"
              value={form.remarks}
              onChange={(e) => set("remarks", e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
              className="h-9 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white gap-2 cursor-pointer shadow-sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording Receipt...</span>
                </>
              ) : (
                <>
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Create Receipt Voucher</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
