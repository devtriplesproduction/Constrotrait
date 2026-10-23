"use client";

import React, { useState, useTransition } from "react";
import { X, CreditCard, Calendar, IndianRupee, Landmark, Loader2, CheckCircle2, AlertCircle, ArrowRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { recordInvoicePaymentAction } from "@/actions/accounting.actions";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  accounts?: any[];
  onSuccess?: () => void;
  onViewReceipt?: (receipt: any) => void;
}

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export function RecordPaymentModal({
  isOpen,
  onClose,
  invoice,
  accounts = [],
  onSuccess,
  onViewReceipt,
}: RecordPaymentModalProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const currentBalance = invoice ? Math.max(0, Number(invoice.balance_amount || 0)) : 0;
  const totalAmount = invoice ? Number(invoice.total_amount || 0) : 0;
  const alreadyPaid = invoice ? Number(invoice.paid_amount || 0) : 0;

  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<string>("bank");
  const [accountId, setAccountId] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  // Receipt generation state
  const [generatedReceipt, setGeneratedReceipt] = useState<any>(null);
  const [paymentComplete, setPaymentComplete] = useState<boolean>(false);

  // Reset completion state when opening modal
  React.useEffect(() => {
    if (isOpen) {
      setGeneratedReceipt(null);
      setPaymentComplete(false);
      setPaymentAmount("");
      setReference("");
      setRemarks("");
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const enteredAmount = Number(paymentAmount || 0);
  const newTotalPaid = alreadyPaid + enteredAmount;
  const newBalance = Math.max(0, totalAmount - newTotalPaid);
  const isFullyPaid = enteredAmount >= currentBalance && currentBalance > 0;
  const isPartial = enteredAmount > 0 && enteredAmount < currentBalance;

  const handlePayFull = () => {
    setPaymentAmount(String(currentBalance));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isNaN(enteredAmount) || enteredAmount <= 0) {
      toast({ title: "Invalid Amount", description: "Payment amount must be greater than 0.", variant: "error" });
      return;
    }

    startTransition(async () => {
      const fullRemarks = [
        reference ? `Ref/UTR: ${reference.trim()}` : "",
        remarks ? remarks.trim() : "",
      ].filter(Boolean).join(" - ");

      const res = await recordInvoicePaymentAction(invoice.id, {
        amount: enteredAmount,
        payment_date: paymentDate,
        payment_mode: paymentMode,
        account_id: accountId || null,
        remarks: fullRemarks || null,
      });

      if (res.success && "data" in res) {
        const receiptData = res.data?.receipt;
        setGeneratedReceipt(receiptData);
        setPaymentComplete(true);
        toast({
          title: "Payment Recorded & Receipt Generated",
          description: `Recorded ${fmt(enteredAmount)} against ${invoice.invoice_no}. Receipt: ${receiptData?.receipt_no || "REC/—"}.`,
        });
        onSuccess?.();
      } else {
        toast({
          title: "Failed to Record Payment",
          description: res.error || "Could not record payment.",
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
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/70 via-teal-50/30 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Record Payment</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200/60">
                  {invoice.invoice_no}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Client: {invoice.clients?.name || "Customer"}
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

        {/* Invoice Balance Snapshot */}
        <div className="px-6 py-3.5 bg-slate-50/90 border-b border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-white rounded-lg border border-slate-200/80">
            <span className="text-slate-500 block mb-0.5">Total Invoice</span>
            <span className="font-bold text-slate-900">{fmt(totalAmount)}</span>
          </div>
          <div className="p-2 bg-white rounded-lg border border-slate-200/80">
            <span className="text-slate-500 block mb-0.5">Already Paid</span>
            <span className="font-bold text-emerald-600">{fmt(alreadyPaid)}</span>
          </div>
          <div className="p-2 bg-white rounded-lg border border-slate-200/80">
            <span className="text-slate-500 block mb-0.5">Current Balance Due</span>
            <span className="font-bold text-amber-700">{fmt(currentBalance)}</span>
          </div>
        </div>

        {/* Form Body or Receipt Confirmation View */}
        {paymentComplete && generatedReceipt ? (
          <div className="p-8 text-center space-y-5 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Payment Confirmed & Receipt Generated</h3>
              <p className="text-xs text-slate-500">
                Official Money Receipt has been issued and linked to Invoice {invoice.invoice_no}.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2 max-w-sm mx-auto text-left shadow-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Official Receipt #</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">
                  {generatedReceipt?.receipt_no || "REC/—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Amount Received</span>
                <span className="font-bold text-slate-900 text-sm">{fmt(enteredAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Payment Mode</span>
                <span className="font-bold text-slate-700 uppercase">{paymentMode}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500">Remaining Balance Due</span>
                <span className={`font-bold text-sm ${newBalance > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                  {newBalance > 0 ? fmt(newBalance) : "Settled (₹0)"}
                </span>
              </div>
            </div>

            {newBalance > 0 && (
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 max-w-sm mx-auto">
                Remaining balance of <strong>{fmt(newBalance)}</strong> is tracked against Inward UID: {invoice.job_entries?.uid_label || "—"}. You can generate a Remaining Balance Invoice for this inward from the Inward Register.
              </p>
            )}

            <div className="pt-2 flex items-center justify-center gap-3">
              {onViewReceipt && (
                <Button
                  onClick={() => {
                    onClose();
                    onViewReceipt(generatedReceipt);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2 text-xs h-9 px-5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>View / Print Receipt</span>
                </Button>
              )}

              <Button
                variant="outline"
                onClick={onClose}
                className="text-xs h-9 px-5 font-semibold cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Payment Amount with Quick Full Pay */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <IndianRupee className="w-3.5 h-3.5 text-slate-500" />
                <span>Amount Received (₹) *</span>
              </label>
              {currentBalance > 0 && (
                <button
                  type="button"
                  onClick={handlePayFull}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2 cursor-pointer"
                >
                  Pay Full Balance ({fmt(currentBalance)})
                </button>
              )}
            </div>
            <Input
              required
              type="number"
              min="0.01"
              step="0.01"
              max={currentBalance > 0 ? currentBalance : undefined}
              placeholder={`Enter amount (up to ${fmt(currentBalance)})`}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="text-base font-bold text-slate-900 h-10"
              autoFocus
            />
          </div>

          {/* Date and Mode Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Date *</label>
              <Input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Mode *</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full h-9 border border-slate-300 rounded-lg px-2.5 text-xs bg-white text-slate-800"
              >
                <option value="bank">Bank Transfer (NEFT/RTGS)</option>
                <option value="upi">UPI / QR Code</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="neft">NEFT</option>
                <option value="rtgs">RTGS</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Deposit Bank Account */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Landmark className="w-3.5 h-3.5 text-slate-400" />
                <span>Deposited Into Account</span>
              </label>
              {accounts.length === 0 && (
                <a
                  href="/accounting/banks"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 hover:underline font-medium"
                >
                  + Add Bank Account
                </a>
              )}
            </div>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full h-9 border border-slate-300 rounded-lg px-2.5 text-xs bg-white text-slate-800"
            >
              <option value="">
                {accounts.length === 0 ? "No accounts found (Optional)" : "Select Account (Optional)"}
              </option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.account_type === "cash" ? "Cash" : acc.bank_name || "Bank"}) - Bal: {fmt(acc.current_balance || 0)}
                </option>
              ))}
            </select>
            {accounts.length === 0 && (
              <p className="text-[10px] text-slate-400 mt-1">
                No bank accounts created yet in the system. You can add them under the <strong>Bank Accounts</strong> tab.
              </p>
            )}
          </div>

          {/* Reference & Remarks */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Reference / UTR / Cheque #</label>
              <Input
                placeholder="Transaction ID / UTR"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Remarks</label>
              <Input
                placeholder="Optional notes"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Dynamic Live Balance Preview Card */}
          {enteredAmount > 0 && (
            <div className={`p-3 rounded-xl border text-xs transition-all ${
              isFullyPaid
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}>
              <div className="flex items-center justify-between font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  {isFullyPaid ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                  <span>{isFullyPaid ? "Invoice will be Fully Settled" : "Partial Payment Recorded"}</span>
                </span>
                <span className="uppercase text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/80 border border-current">
                  {isFullyPaid ? "Status: PAID" : "Status: PARTIAL"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-current/20 text-[11px]">
                <span>Total Received to Date: <strong>{fmt(newTotalPaid)}</strong></span>
                <span>Remaining Balance Due: <strong className="text-sm">{fmt(newBalance)}</strong></span>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || enteredAmount <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Record Payment ({enteredAmount > 0 ? fmt(enteredAmount) : ""})
                </>
              )}
            </Button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
