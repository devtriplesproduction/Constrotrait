"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/modules/PageHeader";
import { Banknote, Receipt, FileText, Search, BarChart3 } from "lucide-react";

interface AccountingClientProps {
  initialData: any;
}

export function AccountingClient({ initialData }: AccountingClientProps) {
  const [tab, setTab] = useState<"dashboard" | "receipts" | "expenses" | "invoices" | "search" | "reports">("dashboard");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting"
        subtitle="Project-wise receipts, expenses, invoices, GST/TDS and reports."
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-5 bg-white border rounded-2xl">
            <p className="text-xs uppercase text-slate-400 font-bold">Cash / Bank Accounts</p>
            <p className="text-2xl font-bold mt-1">{initialData?.accounts?.length || 0}</p>
          </div>
          <div className="p-5 bg-white border rounded-2xl">
            <p className="text-xs uppercase text-slate-400 font-bold">Pending Approvals</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{initialData?.pendingApprovals?.length || 0}</p>
          </div>
          <div className="p-5 bg-white border rounded-2xl">
            <p className="text-xs uppercase text-slate-400 font-bold">Open Invoices</p>
            <p className="text-2xl font-bold mt-1">{initialData?.openInvoices?.length || 0}</p>
          </div>
        </div>
      )}

      {tab === "receipts" && (
        <div className="p-6 bg-white border rounded-2xl">
          <h3 className="font-semibold mb-4">Inward Receipts (REC/YYYY-YY/0001)</h3>
          <p className="text-sm text-slate-500">Create and view receipts. Format auto-generated via next_receipt_no.</p>
        </div>
      )}

      {tab === "expenses" && (
        <div className="p-6 bg-white border rounded-2xl">
          <h3 className="font-semibold mb-4">Expenses</h3>
          <p className="text-sm text-slate-500">
            Amount &gt; ₹1000 requires approval. Travel under ₹500 without bill is allowed.
            Supports GST/TDS, reimbursements, and vendor payments.
          </p>
        </div>
      )}

      {tab === "invoices" && (
        <div className="p-6 bg-white border rounded-2xl">
          <h3 className="font-semibold mb-4">Invoices & Partial Payments</h3>
          <p className="text-sm text-slate-500">Create invoices, record partial payments. Balance auto-synced.</p>
        </div>
      )}

      {tab === "search" && (
        <div className="p-6 bg-white border rounded-2xl">
          <h3 className="font-semibold mb-4">Search Quotations & Invoices</h3>
          <input
            type="text"
            placeholder="Search by number or remarks..."
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
      )}

      {tab === "reports" && (
        <div className="p-6 bg-white border rounded-2xl">
          <h3 className="font-semibold mb-4">P&L, Balance Sheet & Monthly Test Revenue</h3>
          <p className="text-sm text-slate-500">
            Aggregates from receipts, expenses, and invoices. Super Admin can export to Excel.
            Monthly test count and revenue view available here.
          </p>
        </div>
      )}
    </div>
  );
}
