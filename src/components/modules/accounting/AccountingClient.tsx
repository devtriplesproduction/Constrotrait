"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/modules/PageHeader";
import { Banknote, Receipt, FileText, Search, BarChart3, Building2 } from "lucide-react";

interface AccountingClientProps {
  initialData: any;
}

export function AccountingClient({ initialData }: AccountingClientProps) {
  const [tab, setTab] = useState<"dashboard" | "receipts" | "expenses" | "invoices" | "search" | "reports">("dashboard");

  const cashBankTotal = (initialData?.accounts || []).reduce(
    (s: number, a: any) => s + Number(a.current_balance || 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting"
        subtitle="Project financial balance + actual cash/bank. Receipts, expenses, GST/TDS, P&L and Balance Sheet."
      />

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {[
          { id: "dashboard", label: "Dashboard", icon: BarChart3 },
          { id: "receipts", label: "Inward Receipts", icon: Receipt },
          { id: "expenses", label: "Expenses", icon: Banknote },
          { id: "invoices", label: "Invoices", icon: FileText },
          { id: "search", label: "Search", icon: Search },
          { id: "reports", label: "Reports", icon: BarChart3 },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              tab === t.id ? "bg-primary text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white border rounded-2xl">
              <p className="text-xs uppercase text-slate-400 font-bold">Actual Cash / Bank Balance</p>
              <p className="text-2xl font-bold mt-1">₹{cashBankTotal.toLocaleString("en-IN")}</p>
              <p className="text-xs text-slate-500 mt-1">{initialData?.accounts?.length || 0} accounts (Cash, BOB, SBI, HDFC…)</p>
            </div>
            <div className="p-5 bg-white border rounded-2xl">
              <p className="text-xs uppercase text-slate-400 font-bold">Project Financial Balances</p>
              <p className="text-2xl font-bold mt-1">{initialData?.projectBalances?.length || 0} projects</p>
            </div>
            <div className="p-5 bg-white border rounded-2xl">
              <p className="text-xs uppercase text-slate-400 font-bold">Pending Approvals</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{initialData?.pendingApprovals?.length || 0}</p>
              <p className="text-xs text-slate-500 mt-1">Above ₹1,00,000</p>
            </div>
            <div className="p-5 bg-white border rounded-2xl">
              <p className="text-xs uppercase text-slate-400 font-bold">Pending Payments</p>
              <p className="text-2xl font-bold mt-1">{initialData?.openInvoices?.length || 0}</p>
              <p className="text-xs text-slate-500 mt-1">Weekly notification target</p>
            </div>
          </div>

          {initialData?.projectBalances?.length > 0 && (
            <div className="p-5 bg-white border rounded-2xl">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Building2 className="w-4 h-4" /> Project Financial Balances</h3>
              <div className="space-y-2">
                {initialData.projectBalances.map((p: any) => (
                  <div key={p.id} className="flex justify-between text-sm border-b pb-1">
                    <span>{p.name}</span>
                    <span className={p.balance >= 0 ? "text-emerald-600" : "text-red-600"}>
                      ₹{Number(p.balance).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "receipts" && (
        <div className="p-6 bg-white border rounded-2xl space-y-3">
          <h3 className="font-semibold">Inward Receipts — REC/2026-27/0001</h3>
          <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
            <li>Financial-year-based numbering (REC/YYYY-YY/0001)</li>
            <li>Party: Client/Customer or Government department</li>
            <li>Payment modes: Cash, NEFT, RTGS, UPI, Cheque, Bank</li>
            <li>Save first; generate / print professional receipt later</li>
            <li>Cancel with reason — history retained in audit log</li>
            <li>Previous / back-dated inward amounts allowed</li>
            <li>Paid-through person recorded</li>
            <li>GST and TDS fields</li>
          </ul>
        </div>
      )}

      {tab === "expenses" && (
        <div className="p-6 bg-white border rounded-2xl space-y-3">
          <h3 className="font-semibold">Expenses</h3>
          <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
            <li>Project expenses and general company expenses</li>
            <li>Categories: Subcontractor, Consultant, Electricity, Rent, Salaries + Site-wise, Department-wise, Branch-wise</li>
            <li>Add new category button available</li>
            <li>Only travel expenses with no bill under ₹500 are allowed without bill</li>
            <li>Approval required above ₹1,00,000 (Super Admin / Branch Manager)</li>
            <li>Paid-through person recorded</li>
            <li>Previous expenses can be entered</li>
            <li>Cancel with reason + full audit history</li>
            <li>GST and TDS</li>
          </ul>
        </div>
      )}

      {tab === "invoices" && (
        <div className="p-6 bg-white border rounded-2xl">
          <h3 className="font-semibold mb-2">Invoices & Partial Payments</h3>
          <p className="text-sm text-slate-500">Create invoices, record partial payments. Balance auto-synced. Weekly pending-payment notifications.</p>
        </div>
      )}

      {tab === "search" && (
        <div className="p-6 bg-white border rounded-2xl">
          <h3 className="font-semibold mb-4">Search Quotations & Invoices</h3>
          <input type="text" placeholder="Search by number or remarks..." className="w-full border rounded-lg px-3 py-2" />
        </div>
      )}

      {tab === "reports" && (
        <div className="p-6 bg-white border rounded-2xl space-y-3">
          <h3 className="font-semibold">Reports</h3>
          <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
            <li>Profit & Loss statement</li>
            <li>Balance Sheet</li>
            <li>Income and expense head-wise, branch-wise</li>
            <li>Monthly test count and revenue</li>
            <li>Excel export — Super Admin only</li>
          </ul>
          <p className="text-xs text-slate-400">Branch Manager sees own branch only. Super Admin can view all / approve / audit.</p>
        </div>
      )}
    </div>
  );
}
