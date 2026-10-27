"use client";

import React, { useState, useEffect, useTransition, useMemo, useCallback } from "react";
import {
  Upload,
  RefreshCw,
  Scale,
  Save,
  Clock,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  calculateAccountBalanceAsOfAction,
  getAccountTransactionsForReconciliationAction,
  saveBankReconciliationAction,
  getBankReconciliationsAction,
} from "@/actions/accounting.actions";

export interface FinancialAccount {
  id: string;
  name?: string;
  account_name?: string;
  bank_name?: string;
  account_number?: string;
  account_type?: string;
  current_balance?: number;
  opening_balance?: number;
  [key: string]: unknown;
}

export interface ReconTransaction {
  id: string;
  date?: string;
  voucher_no?: string;
  particulars?: string;
  party?: string;
  payment_mode?: string;
  description?: string;
  reference_no?: string;
  amount: number;
  is_deposit: boolean;
  type?: string;
  cleared?: boolean;
  [key: string]: unknown;
}

export interface ReconRecord {
  id?: string;
  statement_date: string;
  statement_balance: number;
  erp_balance: number;
  difference?: number | null;
  notes?: string | null;
  created_at?: string;
  reconciled_by?: string | null;
  [key: string]: unknown;
}

interface BankReconHubProps {
  accounts: FinancialAccount[];
  onRefresh?: () => void;
}

const fmt = (n: number | string | undefined | null) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function BankReconHub({ accounts = [], onRefresh }: BankReconHubProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    const firstBank = accounts.find((a) => a.account_type === "bank") || accounts[0];
    return firstBank?.id || "";
  });

  const [statementDate, setStatementDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [statementBalance, setStatementBalance] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Calculated ERP balance breakdown
  const [erpCalc, setErpCalc] = useState<{
    openingBalance: number;
    totalInflows: number;
    totalOutflows: number;
    erpBalance: number;
    currentBalance: number;
  } | null>(null);

  // Transactions list and cleared IDs state
  const [transactions, setTransactions] = useState<ReconTransaction[]>([]);
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());
  const [searchTx, setSearchTx] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState<"all" | "deposit" | "withdrawal">("all");

  // Reconciliation history for selected account
  const [history, setHistory] = useState<ReconRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  const loadHistory = useCallback(async (accId: string) => {
    setLoadingHistory(true);
    try {
      const histRes = await getBankReconciliationsAction(accId);
      if (histRes.success && "data" in histRes && histRes.data) {
        setHistory(histRes.data as unknown as ReconRecord[]);
      }
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Load ERP balance calculation and transactions when account or statement date changes
  const loadReconData = useCallback(() => {
    if (!selectedAccountId) return;
    startTransition(async () => {
      // 1. Calculate ERP balance as of date
      const calcRes = await calculateAccountBalanceAsOfAction(selectedAccountId, statementDate);
      if (calcRes.success && "data" in calcRes && calcRes.data) {
        setErpCalc(calcRes.data);
      }

      // 2. Load account transactions up to statement date
      const txRes = await getAccountTransactionsForReconciliationAction(
        selectedAccountId,
        undefined,
        statementDate
      );
      if (txRes.success && "data" in txRes && txRes.data) {
        const txList = txRes.data as unknown as ReconTransaction[];
        setTransactions(txList);
        // By default, mark all as cleared or leave to user
        const allIds = new Set<string>(txList.map((t: ReconTransaction) => t.id));
        setClearedIds(allIds);
      }

      // 3. Load reconciliation history
      loadHistory(selectedAccountId);
    });
  }, [selectedAccountId, statementDate, loadHistory]);

  useEffect(() => {
    if (selectedAccountId) {
      loadReconData();
    }
  }, [selectedAccountId, statementDate, loadReconData]);

  // Toggle individual transaction clearance
  const toggleCleared = (id: string) => {
    setClearedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setClearedIds(new Set(transactions.map((t) => t.id)));
  };

  const handleClearAll = () => {
    setClearedIds(new Set());
  };

  // CSV Statement File Parser
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) {
          toast({ title: "Invalid File", description: "CSV file is empty.", variant: "destructive" });
          return;
        }

        // Scan amounts in CSV
        const csvAmounts = new Set<number>();
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.replace(/["'₹,\s]/g, ""));
          for (const val of cols) {
            const num = parseFloat(val);
            if (!isNaN(num) && num > 0) csvAmounts.add(Math.round(num * 100) / 100);
          }
        }

        // Auto-check transactions matching amounts in CSV
        let matchedCount = 0;
        const newCleared = new Set<string>();
        transactions.forEach((tx) => {
          const rounded = Math.round(Number(tx.amount || 0) * 100) / 100;
          if (csvAmounts.has(rounded)) {
            newCleared.add(tx.id);
            matchedCount++;
          }
        });

        setClearedIds(newCleared);
        toast({
          title: "Statement Auto-Matched",
          description: `Automatically matched and checked ${matchedCount} transactions from bank statement.`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to parse CSV file.";
        toast({ title: "Parse Error", description: msg, variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Computed Cleared amounts
  const clearedDeposits = transactions
    .filter((t) => t.is_deposit && clearedIds.has(t.id))
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const clearedWithdrawals = transactions
    .filter((t) => !t.is_deposit && clearedIds.has(t.id))
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const unclearedDeposits = transactions
    .filter((t) => t.is_deposit && !clearedIds.has(t.id))
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const unclearedWithdrawals = transactions
    .filter((t) => !t.is_deposit && !clearedIds.has(t.id))
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const effectiveErpBalance = erpCalc ? erpCalc.erpBalance : Number(selectedAccount?.current_balance || 0);
  const enteredStatementBalance = statementBalance !== "" ? Number(statementBalance) : null;
  const difference =
    enteredStatementBalance !== null ? enteredStatementBalance - effectiveErpBalance : null;
  const isBalanced = difference !== null && Math.abs(difference) < 0.01;

  // Filtered transactions for display
  const filteredTransactions = transactions.filter((t) => {
    if (txTypeFilter === "deposit" && !t.is_deposit) return false;
    if (txTypeFilter === "withdrawal" && t.is_deposit) return false;
    if (!searchTx.trim()) return true;
    const q = searchTx.toLowerCase();
    return (
      (t.voucher_no || "").toLowerCase().includes(q) ||
      (t.particulars || "").toLowerCase().includes(q) ||
      (t.party || "").toLowerCase().includes(q) ||
      String(t.amount || "").includes(q)
    );
  });

  const handleSaveReconciliation = () => {
    if (!selectedAccountId) {
      toast({ title: "Account Required", description: "Please select a bank account.", variant: "destructive" });
      return;
    }
    if (enteredStatementBalance === null) {
      toast({ title: "Statement Balance Required", description: "Please enter the bank statement ending balance.", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      const res = await saveBankReconciliationAction({
        account_id: selectedAccountId,
        statement_date: statementDate,
        statement_balance: enteredStatementBalance,
        erp_balance: effectiveErpBalance,
        notes: notes.trim() || `Reconciliation on ${statementDate}. Diff: ${fmt(difference)}. Cleared: ${clearedIds.size}/${transactions.length}`,
      });

      if (res.success) {
        toast({
          title: "Reconciliation Saved!",
          description: `Bank statement reconciled. Difference: ${fmt(difference)}.`,
        });
        loadHistory(selectedAccountId);
        if (onRefresh) onRefresh();
      } else {
        toast({
          title: "Failed to Save",
          description: res.error || "Could not save reconciliation.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Configuration & Overview Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-600" />
              <span>Bank Statement Reconciliation</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify and reconcile ERP book records against official bank statement balances.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-all shadow-xs">
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Import Statement (CSV)</span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCsvUpload}
              />
            </label>

            <Button
              variant="outline"
              size="sm"
              onClick={loadReconData}
              disabled={isPending}
              className="h-8 px-3 text-xs gap-1.5 rounded-xl cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
              <span>Recalculate</span>
            </Button>
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Select Financial Account
            </label>
            <select
              className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-medium focus:border-blue-500 outline-none"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {(a.name || a.account_name || "Account")} ({a.bank_name || (a.account_type ? a.account_type.toUpperCase() : "BANK")}) - {fmt(a.current_balance)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Statement Cut-off Date
            </label>
            <input
              type="date"
              className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-medium focus:border-blue-500 outline-none"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Bank Statement Ending Balance (₹)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 250450.00"
              className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 outline-none"
              value={statementBalance}
              onChange={(e) => setStatementBalance(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Reconciliation Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Month-end statement match"
              className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-medium focus:border-blue-500 outline-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Three-Way Comparison Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Statement Balance Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Bank Statement Ending Balance
            </span>
            <div className="text-xl font-bold text-slate-900">
              {enteredStatementBalance !== null ? fmt(enteredStatementBalance) : "Enter Balance Above"}
            </div>
            <div className="text-[11px] text-slate-400">
              As per official bank statement on {statementDate}
            </div>
          </div>

          {/* ERP Calculated Ledger Balance Card */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-1">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
              ERP Calculated Ledger Balance
            </span>
            <div className="text-xl font-bold text-blue-900">
              {fmt(effectiveErpBalance)}
            </div>
            <div className="text-[11px] text-blue-600 flex items-center justify-between">
              <span>Opening: {fmt(erpCalc?.openingBalance || 0)}</span>
              <span>Inflows: +{fmt(erpCalc?.totalInflows || 0)}</span>
              <span>Outflows: -{fmt(erpCalc?.totalOutflows || 0)}</span>
            </div>
          </div>

          {/* Difference / Discrepancy Card */}
          <div
            className={`p-4 rounded-xl border space-y-1 transition-all ${
              isBalanced
                ? "border-emerald-200 bg-emerald-50/40 text-emerald-900"
                : difference !== null
                ? "border-amber-200 bg-amber-50/40 text-amber-900"
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Reconciliation Difference
              </span>
              {isBalanced ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-900">
                  MATCHED
                </span>
              ) : difference !== null ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900">
                  DISCREPANCY
                </span>
              ) : null}
            </div>

            <div className="text-xl font-bold">
              {difference !== null ? fmt(difference) : "—"}
            </div>

            <div className="text-[11px]">
              {isBalanced
                ? "Exact match! ERP ledger agrees with bank statement."
                : difference !== null
                ? difference > 0
                  ? "Bank balance exceeds ERP books (unrecorded deposit or delayed charges)."
                  : "ERP books exceed bank balance (uncleared cheques or uncharged debits)."
                : "Enter statement balance to calculate difference."}
            </div>
          </div>
        </div>

        {/* Save Reconciliation Button */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button
            onClick={handleSaveReconciliation}
            disabled={isPending || enteredStatementBalance === null}
            className="h-10 px-6 font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Save Reconciliation Record</span>
          </Button>
        </div>
      </div>

      {/* Interactive Transactions Clearance Checklist Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Transaction Clearance Checklist</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                {clearedIds.size} of {transactions.length} Cleared
              </span>
            </h4>
            <p className="text-xs text-slate-500">
              Check off transactions that appear on your bank statement to isolate uncleared items.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Filters and search */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <input
              type="text"
              placeholder="Search voucher, party, particulars..."
              className="w-full bg-transparent border-none outline-none text-xs"
              value={searchTx}
              onChange={(e) => setSearchTx(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTxTypeFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                txTypeFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              type="button"
              onClick={() => setTxTypeFilter("deposit")}
              className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                txTypeFilter === "deposit" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600"
              }`}
            >
              Deposits ({transactions.filter((t) => t.is_deposit).length})
            </button>
            <button
              type="button"
              onClick={() => setTxTypeFilter("withdrawal")}
              className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                txTypeFilter === "withdrawal" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600"
              }`}
            >
              Withdrawals ({transactions.filter((t) => !t.is_deposit).length})
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                <th className="p-3 text-center w-12">Cleared</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Voucher No</th>
                <th className="p-3 text-left">Party / Particulars</th>
                <th className="p-3 text-center">Mode</th>
                <th className="p-3 text-right">Inflow (₹)</th>
                <th className="p-3 text-right">Outflow (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No transactions found up to {statementDate}.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isCleared = clearedIds.has(tx.id);
                  return (
                    <tr
                      key={tx.id}
                      onClick={() => toggleCleared(tx.id)}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        isCleared ? "bg-white" : "bg-amber-50/30"
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isCleared}
                          onChange={() => {}} // handled by row click
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-medium text-slate-600 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="p-3 font-mono text-[11px] font-semibold text-slate-800">
                        {tx.voucher_no}
                      </td>
                      <td className="p-3 text-slate-800">
                        <div className="font-semibold">{tx.party}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{tx.particulars}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 text-slate-700">
                          {tx.payment_mode || "BANK"}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-700">
                        {tx.is_deposit ? fmt(tx.amount) : "—"}
                      </td>
                      <td className="p-3 text-right font-bold text-rose-700">
                        {!tx.is_deposit ? fmt(tx.amount) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-600">
            <div>
              Cleared Deposits: <strong className="text-emerald-700">+{fmt(clearedDeposits)}</strong>
            </div>
            <div>
              Cleared Withdrawals: <strong className="text-rose-700">-{fmt(clearedWithdrawals)}</strong>
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            {unclearedDeposits > 0 && (
              <div className="text-amber-700">
                Uncleared Deposits: +{fmt(unclearedDeposits)}
              </div>
            )}
            {unclearedWithdrawals > 0 && (
              <div className="text-amber-700">
                Uncleared Withdrawals: -{fmt(unclearedWithdrawals)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historical Reconciliation Sessions Log */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>Past Reconciliation Sessions</span>
        </h4>

        {loadingHistory ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No previous reconciliations saved for this account.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase">
                <tr className="border-b border-slate-200">
                  <th className="p-2.5 text-left">Statement Date</th>
                  <th className="p-2.5 text-right">Statement Balance</th>
                  <th className="p-2.5 text-right">ERP Balance</th>
                  <th className="p-2.5 text-right">Difference</th>
                  <th className="p-2.5 text-left">Notes</th>
                  <th className="p-2.5 text-right">Reconciled At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h) => {
                  const diff = Number(h.difference || 0);
                  const isMatch = Math.abs(diff) < 0.01;
                  return (
                    <tr key={h.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{h.statement_date}</td>
                      <td className="p-2.5 text-right font-semibold text-slate-800">
                        {fmt(h.statement_balance)}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-blue-700">
                        {fmt(h.erp_balance)}
                      </td>
                      <td className="p-2.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isMatch
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {fmt(diff)}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600 max-w-xs truncate">{h.notes || "—"}</td>
                      <td className="p-2.5 text-right text-slate-400 text-[11px]">
                        {h.created_at ? new Date(h.created_at).toLocaleDateString("en-IN") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
