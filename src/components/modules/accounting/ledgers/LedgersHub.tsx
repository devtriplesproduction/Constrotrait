"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  Package,
  Building2,
  Landmark,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IncomeLedgerTable } from "./IncomeLedgerTable";
import { ExpenseLedgerTable } from "./ExpenseLedgerTable";
import { InwardProfitabilityLedger } from "./InwardProfitabilityLedger";

interface LedgersHubProps {
  initialLedgersData?: any;
  dashboardData: any;
  onOpenRecordExpense: (inward?: any) => void;
  onOpenViewReceipt?: (receipt: any) => void;
  onOpenCreateProforma?: (inward?: any) => void;
  onRefresh?: () => void;
}

export function LedgersHub({
  initialLedgersData,
  dashboardData,
  onOpenRecordExpense,
  onOpenViewReceipt,
  onOpenCreateProforma,
  onRefresh,
}: LedgersHubProps) {
  const [activeLedger, setActiveLedger] = useState<"expenses" | "income" | "inward_pnl">("expenses");

  // Construct combined income entries from dashboardData if initialLedgersData not loaded yet
  const incomeEntries =
    initialLedgersData?.incomeEntries ||
    (dashboardData.receipts || []).map((r: any) => {
      let inward = r.job_entries;
      if (!inward && r.invoice_payments?.length > 0) {
        inward = r.invoice_payments[0]?.invoices?.job_entries;
      }
      return {
        id: r.id,
        receipt_id: r.id,
        date: r.receipt_date || (r.created_at ? r.created_at.slice(0, 10) : ""),
        voucher_no: r.receipt_no,
        type_label: r.inward_id || inward ? "Inward Receipt" : "Direct Client Receipt",
        party_name: r.clients?.name || r.party_name || "General Party",
        client_id: r.client_id,
        inward_id: r.inward_id || inward?.id || null,
        inward_uid: inward?.uid_label || (inward?.uid ? `UID-${inward.uid}` : null),
        project_name: inward?.project_name || r.accounting_projects?.name || null,
        account_id: r.account_id,
        account_name: r.financial_accounts?.name || "Direct Cash / Bank",
        payment_mode: r.payment_mode || "cash",
        amount: Number(r.amount || 0),
        gst_amount: Number(r.gst_amount || 0),
        tds_amount: Number(r.tds_amount || 0),
        particulars: r.remarks || "Money Receipt",
        status: r.status,
        created_at: r.created_at,
      };
    });

  // Construct combined expenses from dashboardData
  const expenses = initialLedgersData?.expenseEntries || dashboardData.expenses || [];

  return (
    <div className="space-y-6">
      {/* Ledger Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl flex-wrap">
          <button
            onClick={() => setActiveLedger("expenses")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeLedger === "expenses"
                ? "bg-white text-rose-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TrendingDown className="w-4 h-4 text-rose-600" />
            <span>Expense Ledger</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
              {expenses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveLedger("income")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeLedger === "income"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Income Ledger</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
              {incomeEntries.length}
            </span>
          </button>

          <button
            onClick={() => setActiveLedger("inward_pnl")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeLedger === "inward_pnl"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Scale className="w-4 h-4 text-indigo-600" />
            <span>Inward Job P&L Ledger</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-bold">
              {(dashboardData.recentInwards || []).length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onOpenRecordExpense()}
            className="h-9 px-4 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </Button>
        </div>
      </div>

      {/* Active Ledger View */}
      {activeLedger === "expenses" && (
        <ExpenseLedgerTable
          expenses={expenses}
          onRecordExpense={() => onOpenRecordExpense()}
          onRefresh={onRefresh}
        />
      )}

      {activeLedger === "income" && (
        <IncomeLedgerTable
          incomeEntries={incomeEntries}
          onViewReceipt={onOpenViewReceipt}
          onRefresh={onRefresh}
        />
      )}

      {activeLedger === "inward_pnl" && (
        <InwardProfitabilityLedger
          inwards={dashboardData.recentInwards || []}
          expenses={expenses}
          receipts={dashboardData.receipts || []}
          onRecordExpense={onOpenRecordExpense}
          onCreateProforma={onOpenCreateProforma}
        />
      )}
    </div>
  );
}
