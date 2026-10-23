"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Landmark,
  Wallet,
  Search,
  Plus,
  Copy,
  Check,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Scale,
  ArrowUpRight,
  TrendingUp,
  Building,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { deleteBankAccountAction } from "@/actions/accounting.actions";

export interface BankAccount {
  id: string;
  name: string;
  account_type: "bank" | "cash";
  bank_name?: string | null;
  account_number?: string | null;
  ifsc?: string | null;
  opening_balance?: number;
  current_balance?: number;
  is_active?: boolean;
  branch_id?: string | null;
  created_at?: string;
}

interface BankCardsProps {
  accounts: BankAccount[];
  onAddNew: () => void;
  onEdit: (account: BankAccount) => void;
  onRefresh?: () => void;
}

const fmt = (n: number | string | undefined | null) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function BankCards({ accounts = [], onAddNew, onEdit, onRefresh }: BankCardsProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "bank" | "cash">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Metrics calculations
  const totalBalance = accounts.reduce((acc, a) => acc + Number(a.current_balance || 0), 0);
  const bankAccounts = accounts.filter((a) => a.account_type === "bank");
  const bankBalance = bankAccounts.reduce((acc, a) => acc + Number(a.current_balance || 0), 0);
  const cashAccounts = accounts.filter((a) => a.account_type === "cash");
  const cashBalance = cashAccounts.reduce((acc, a) => acc + Number(a.current_balance || 0), 0);

  // Filtering
  const filtered = accounts.filter((acc) => {
    if (typeFilter !== "all" && acc.account_type !== typeFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      acc.name?.toLowerCase().includes(q) ||
      acc.bank_name?.toLowerCase().includes(q) ||
      acc.account_number?.toLowerCase().includes(q) ||
      acc.ifsc?.toLowerCase().includes(q)
    );
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast({
      title: "Copied to clipboard",
      description: `${label}: ${text}`,
      variant: "default",
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
    setDeletingId(id);
    const res = await deleteBankAccountAction(id);
    setDeletingId(null);
    if (res?.success) {
      toast({
        title: "Account removed",
        description: `${name} has been archived.`,
        variant: "success",
      });
      if (onRefresh) onRefresh();
    } else {
      toast({
        title: "Error",
        description: res?.error || "Failed to remove account.",
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Financial Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Liquid Balance */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 text-white rounded-3xl p-5 shadow-lg border border-slate-700/50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Liquid Funds
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-orange-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
            {fmt(totalBalance)}
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span>{accounts.length} active ledger account{accounts.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Bank Accounts Balance */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              In Bank Accounts
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-1">
            {fmt(bankBalance)}
          </div>
          <div className="text-xs text-slate-500">
            {bankAccounts.length} registered bank account{bankAccounts.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Cash in Hand */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cash In Hand
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-1">
            {fmt(cashBalance)}
          </div>
          <div className="text-xs text-slate-500">
            {cashAccounts.length} cash ledger account{cashAccounts.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by account name, bank, account number, or IFSC..."
            className="pl-9 pr-4 py-2 bg-slate-50/70 border-slate-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
          />
        </div>

        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl flex-shrink-0">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              typeFilter === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({accounts.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("bank")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              typeFilter === "bank"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Banks ({bankAccounts.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("cash")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              typeFilter === "cash"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Cash ({cashAccounts.length})
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center bg-white/50 backdrop-blur-sm">
          <div className="w-20 h-20 bg-orange-50 border border-orange-100 rounded-3xl flex items-center justify-center mb-4 text-orange-500 shadow-sm">
            <Landmark className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">
            {accounts.length === 0 ? "No Bank Accounts Found" : "No Matching Accounts"}
          </h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md">
            {accounts.length === 0
              ? "There are no bank or cash accounts recorded yet. Click the button below to add your first account."
              : "Try adjusting your search query or filter to find what you're looking for."}
          </p>
          {accounts.length === 0 && (
            <Button
              onClick={onAddNew}
              className="mt-6 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 hover:scale-105 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Bank Account
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((acc, idx) => {
            const isBank = acc.account_type === "bank";
            const isRevealed = !!revealedIds[acc.id];
            const accNum = acc.account_number || "";
            const displayAccNum = isRevealed
              ? accNum
              : accNum.length > 4
              ? `•••• •••• •••• ${accNum.slice(-4)}`
              : accNum || "—";

            return (
              <div
                key={acc.id}
                className="group relative bg-white rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgb(249,115,22,0.12)] hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col justify-between overflow-hidden"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Decorative Background Accent */}
                <div
                  className={`absolute top-0 right-0 w-36 h-36 rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110 ${
                    isBank
                      ? "bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent"
                      : "bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent"
                  }`}
                />

                {/* Top Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    {/* Icon + Title */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 ${
                          isBank
                            ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/25"
                            : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/25"
                        }`}
                      >
                        {isBank ? (
                          <Landmark className="w-6 h-6" />
                        ) : (
                          <Wallet className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider ${
                              isBank
                                ? "bg-blue-50 text-blue-700 border border-blue-100"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            }`}
                          >
                            {isBank ? "Bank Account" : "Cash Ledger"}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors mt-1 line-clamp-1">
                          {acc.name}
                        </h3>
                      </div>
                    </div>

                    {/* Actions Menu (Edit & Delete) */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => onEdit(acc)}
                        title="Edit Account"
                        className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-orange-50 text-slate-500 hover:text-orange-600 flex items-center justify-center transition-colors border border-slate-100"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(acc.id, acc.name)}
                        disabled={deletingId === acc.id}
                        title="Archive Account"
                        className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors border border-slate-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Bank Details section */}
                  {isBank ? (
                    <div className="space-y-2.5 my-4 p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 text-xs">
                      {/* Bank Name */}
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Bank
                        </span>
                        <span className="font-bold text-slate-800">
                          {acc.bank_name || "—"}
                        </span>
                      </div>

                      {/* Account Number */}
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          A/C No.
                        </span>
                        <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-800">
                          <span>{displayAccNum}</span>
                          {accNum && (
                            <>
                              <button
                                type="button"
                                onClick={() => toggleReveal(acc.id)}
                                className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                                title={isRevealed ? "Hide number" : "Reveal number"}
                              >
                                {isRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopy(accNum, "Account Number")}
                                className="text-slate-400 hover:text-orange-600 p-0.5 rounded transition-colors"
                                title="Copy account number"
                              >
                                {copiedId === accNum ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* IFSC Code */}
                      {acc.ifsc && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            IFSC
                          </span>
                          <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-800">
                            <span>{acc.ifsc}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(acc.ifsc || "", "IFSC")}
                              className="text-slate-400 hover:text-orange-600 p-0.5 rounded transition-colors"
                              title="Copy IFSC code"
                            >
                              {copiedId === acc.ifsc ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="my-4 p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Type
                        </span>
                        <span className="font-bold text-slate-800">Physical Cash Ledger</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Purpose
                        </span>
                        <span className="text-slate-600">Daily expenses & cash receipts</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: Balance & Action */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Current Balance
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {fmt(acc.current_balance)}
                      </span>
                    </div>
                    {acc.opening_balance !== undefined && (
                      <div className="text-right">
                        <span className="text-[10px] font-semibold text-slate-400 block">
                          Opening
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {fmt(acc.opening_balance)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom quick links */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/accounting/reconciliation?account=${acc.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Scale className="w-3.5 h-3.5 text-slate-500" />
                      Reconciliation
                    </Link>
                    <button
                      type="button"
                      onClick={() => onEdit(acc)}
                      className="flex items-center justify-center gap-1 py-2 px-3 border border-slate-200 hover:border-orange-300 hover:text-orange-600 text-slate-600 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
