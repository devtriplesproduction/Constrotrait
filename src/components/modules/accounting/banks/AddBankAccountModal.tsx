"use client";

import React, { useState, useTransition } from "react";
import { X, Landmark, Wallet, Loader2, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createBankAccountAction, updateBankAccountAction } from "@/actions/accounting.actions";

export interface BankAccountData {
  id?: string;
  name: string;
  account_type: "bank" | "cash";
  bank_name?: string | null;
  account_number?: string | null;
  ifsc?: string | null;
  opening_balance?: number | string;
  current_balance?: number;
  is_active?: boolean;
}

interface AddBankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account?: BankAccountData | null;
  onSuccess?: () => void;
}

export function AddBankAccountModal({
  isOpen,
  onClose,
  account,
  onSuccess,
}: AddBankAccountModalProps) {
  const isEditing = !!account?.id;
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(account?.name || "");
  const [accountType, setAccountType] = useState<"bank" | "cash">(account?.account_type || "bank");
  const [bankName, setBankName] = useState(account?.bank_name || "");
  const [accountNumber, setAccountNumber] = useState(account?.account_number || "");
  const [ifsc, setIfsc] = useState(account?.ifsc || "");
  const [openingBalance, setOpeningBalance] = useState<string>(
    account?.opening_balance !== undefined ? String(account.opening_balance) : ""
  );
  const [errorMsg, setErrorMsg] = useState("");

  // Sync state if account changes
  React.useEffect(() => {
    if (account) {
      setName(account.name || "");
      setAccountType(account.account_type || "bank");
      setBankName(account.bank_name || "");
      setAccountNumber(account.account_number || "");
      setIfsc(account.ifsc || "");
      setOpeningBalance(account.opening_balance !== undefined ? String(account.opening_balance) : "");
    } else {
      setName("");
      setAccountType("bank");
      setBankName("");
      setAccountNumber("");
      setIfsc("");
      setOpeningBalance("");
    }
    setErrorMsg("");
  }, [account, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Account name is required.");
      return;
    }

    if (accountType === "bank") {
      if (!bankName.trim()) {
        setErrorMsg("Bank name is required for bank accounts.");
        return;
      }
      if (!accountNumber.trim()) {
        setErrorMsg("Account number is required for bank accounts.");
        return;
      }
    }

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        account_type: accountType,
        bank_name: accountType === "bank" ? bankName.trim() : null,
        account_number: accountType === "bank" ? accountNumber.trim() : null,
        ifsc: accountType === "bank" ? ifsc.trim().toUpperCase() : null,
        opening_balance: openingBalance ? parseFloat(openingBalance) : 0,
      };

      let res;
      if (isEditing && account?.id) {
        res = await updateBankAccountAction(account.id, payload);
      } else {
        res = await createBankAccountAction(payload);
      }

      if (res?.success) {
        toast({
          title: isEditing ? "Account Updated" : "Bank Account Created",
          description: `${name} has been successfully ${isEditing ? "updated" : "added"}.`,
          variant: "success",
        });
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const errorText = res?.error || "Failed to save bank account.";
        setErrorMsg(errorText);
        toast({
          title: "Error",
          description: errorText,
          variant: "error",
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={isPending ? undefined : onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 via-white to-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 shadow-sm">
              {accountType === "bank" ? (
                <Landmark className="w-5 h-5" />
              ) : (
                <Wallet className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isEditing ? "Edit Account" : "Add Bank Account"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEditing
                  ? "Update ledger and banking details"
                  : "Enter bank or cash account details to track balances"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            disabled={isPending}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {/* Account Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Account Type <span className="text-orange-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountType("bank")}
                className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border text-sm font-semibold transition-all ${
                  accountType === "bank"
                    ? "bg-orange-50 border-orange-500 text-orange-700 shadow-sm ring-1 ring-orange-500"
                    : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Landmark className={`w-4 h-4 ${accountType === "bank" ? "text-orange-600" : "text-slate-400"}`} />
                Bank Account
              </button>
              <button
                type="button"
                onClick={() => setAccountType("cash")}
                className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border text-sm font-semibold transition-all ${
                  accountType === "cash"
                    ? "bg-orange-50 border-orange-500 text-orange-700 shadow-sm ring-1 ring-orange-500"
                    : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Wallet className={`w-4 h-4 ${accountType === "cash" ? "text-orange-600" : "text-slate-400"}`} />
                Cash Account
              </button>
            </div>
          </div>

          {/* Account Display Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Account Display Name <span className="text-orange-500">*</span>
            </label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={accountType === "bank" ? "e.g. HDFC Main Operations" : "e.g. Petty Cash - HQ Office"}
              className="w-full px-4 py-2.5 bg-slate-50/70 border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
              disabled={isPending}
            />
          </div>

          {/* Conditional Bank Details */}
          {accountType === "bank" && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Bank Name <span className="text-orange-500">*</span>
                  </label>
                  <Input
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank, SBI, ICICI"
                    className="w-full px-4 py-2.5 bg-slate-50/70 border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    IFSC Code
                  </label>
                  <Input
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0001234"
                    maxLength={11}
                    className="w-full px-4 py-2.5 bg-slate-50/70 border-slate-200 rounded-xl text-sm font-mono font-medium focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 uppercase transition-all"
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Account Number <span className="text-orange-500">*</span>
                </label>
                <Input
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 50200012345678"
                  className="w-full px-4 py-2.5 bg-slate-50/70 border-slate-200 rounded-xl text-sm font-mono font-medium focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                  disabled={isPending}
                />
              </div>
            </div>
          )}

          {/* Opening Balance */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Opening Balance (₹)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <IndianRupee className="w-4 h-4" />
              </div>
              <Input
                type="number"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50/70 border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                disabled={isPending}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Initial ledger balance for this account. Defaults to ₹0 if left empty.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all text-sm flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Account"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
