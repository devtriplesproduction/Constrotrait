"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/modules/PageHeader";
import { Banknote, Receipt, FileText, Search, BarChart3, Building2, Landmark, Scale } from "lucide-react";
import {
  createInwardReceiptAction,
  cancelInwardReceiptAction,
  createExpenseAction,
  approveExpenseAction,
  createExpenseCategoryAction,
  createBankAccountAction,
  createQuotationAction,
  createInvoiceAction,
  recordInvoicePaymentAction,
  createProjectAction,
  searchAccountingAction,
  getProfitAndLossAction,
  getReconciliationAction,
} from "@/actions/accounting.actions";

interface AccountingClientProps {
  initialData: any;
}

const fmt = (n: number) => `\u20b9${Number(n || 0).toLocaleString("en-IN")}`;

export function AccountingClient({ initialData }: AccountingClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState("dashboard");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  const data = initialData || {};
  const cashBankTotal = (data.accounts || []).reduce((s: number, a: any) => s + Number(a.current_balance || 0), 0);

  function refresh() {
    startTransition(() => router.refresh());
  }

  function run(fn: () => Promise<any>, ok = "Saved") {
    setMsg("");
    startTransition(async () => {
      const res = await fn();
      setMsg(res?.success ? ok : res?.error || "Failed");
      if (res?.success) refresh();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Accounting" subtitle="Quotations, receipts, expenses, invoices, banks, reconciliation and reports." />
      {msg && <div className="p-3 rounded-lg bg-slate-100 text-sm">{msg}</div>}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {[
          { id: "dashboard", label: "Dashboard", icon: BarChart3 },
          { id: "receipts", label: "Receipts", icon: Receipt },
          { id: "expenses", label: "Expenses", icon: Banknote },
          { id: "invoices", label: "Invoices", icon: FileText },
          { id: "quotations", label: "Quotations", icon: FileText },
          { id: "banks", label: "Banks", icon: Landmark },
          { id: "recon", label: "Reconciliation", icon: Scale },
          { id: "reports", label: "Reports", icon: BarChart3 },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${tab === t.id ? "bg-primary text-white" : "bg-slate-100 text-slate-700"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card label="Cash / Bank Balance" value={fmt(cashBankTotal)} sub={`${data.accounts?.length || 0} accounts`} />
            <Card label="Projects" value={String(data.projectBalances?.length || 0)} />
            <Card label="Pending Approvals" value={String(data.pendingApprovals?.length || 0)} sub="Above \u20b91,00,000" />
            <Card label="Open Invoices" value={String(data.openInvoices?.length || 0)} />
          </div>
          {data.projectBalances?.length > 0 && (
            <div className="p-5 bg-white border rounded-2xl">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Building2 className="w-4 h-4" /> Project Financial Balances</h3>
              {data.projectBalances.map((p: any) => (
                <div key={p.id} className="flex justify-between text-sm border-b py-1">
                  <span>{p.name}</span>
                  <span className={p.balance >= 0 ? "text-emerald-600" : "text-red-600"}>{fmt(p.balance)}</span>
                </div>
              ))}
            </div>
          )}
          <ProjectForm onCreate={(name: string, desc?: string) => run(() => createProjectAction(name, desc), "Project created")} pending={pending} />
        </div>
      )}

      {tab === "receipts" && (
        <div className="grid md:grid-cols-2 gap-6">
          <ReceiptForm accounts={data.accounts || []} projects={data.projects || []} onSubmit={(p: any) => run(() => createInwardReceiptAction(p), "Receipt saved")} pending={pending} />
          <List title="Recent Receipts" items={data.recentReceipts || []} render={(r: any) => (
            <div className="flex justify-between items-center text-sm border-b py-2">
              <div>
                <div className="font-medium">{r.receipt_no}</div>
                <div className="text-xs text-slate-500">{r.party_name || r.party_type} \u00b7 {r.payment_mode} \u00b7 {r.status}</div>
              </div>
              <div className="text-right">
                <div>{fmt(r.amount)}</div>
                {r.status !== "cancelled" && (
                  <button className="text-xs text-red-600" onClick={() => {
                    const reason = prompt("Cancel reason?");
                    if (reason) run(() => cancelInwardReceiptAction(r.id, reason), "Cancelled");
                  }}>Cancel</button>
                )}
              </div>
            </div>
          )} />
        </div>
      )}

      {tab === "expenses" && (
        <div className="grid md:grid-cols-2 gap-6">
          <ExpenseForm accounts={data.accounts || []} projects={data.projects || []} onSubmit={(p: any) => run(() => createExpenseAction(p), "Expense saved")} onCategory={(name: string, scope: string) => run(() => createExpenseCategoryAction(name, scope), "Category added")} pending={pending} />
          <List title="Expenses & Approvals" items={[...(data.pendingApprovals || []), ...(data.recentExpenses || [])].filter((v: any, i: number, a: any[]) => a.findIndex((x: any) => x.id === v.id) === i)} render={(e: any) => (
            <div className="flex justify-between items-center text-sm border-b py-2">
              <div>
                <div className="font-medium">{fmt(e.amount)} \u00b7 {e.approval_status}</div>
                <div className="text-xs text-slate-500">{e.description || "\u2014"} \u00b7 {e.paid_through_person || ""}</div>
              </div>
              {e.approval_status === "pending" && (
                <div className="flex gap-2">
                  <button className="text-xs text-emerald-600" onClick={() => run(() => approveExpenseAction(e.id, true), "Approved")}>Approve</button>
                  <button className="text-xs text-red-600" onClick={() => run(() => approveExpenseAction(e.id, false), "Rejected")}>Reject</button>
                </div>
              )}
            </div>
          )} />
        </div>
      )}

      {tab === "invoices" && (
        <div className="grid md:grid-cols-2 gap-6">
          <InvoiceForm projects={data.projects || []} onSubmit={(p: any) => run(() => createInvoiceAction(p), "Invoice created")} pending={pending} />
          <List title="Invoices" items={data.invoices || data.openInvoices || []} render={(inv: any) => (
            <div className="flex justify-between items-center text-sm border-b py-2">
              <div>
                <div className="font-medium">{inv.invoice_no}</div>
                <div className="text-xs text-slate-500">{inv.status} \u00b7 Balance {fmt(inv.balance_amount)}</div>
              </div>
              <button className="text-xs text-primary" onClick={() => {
                const amt = prompt("Payment amount?");
                if (amt) run(() => recordInvoicePaymentAction(inv.id, Number(amt)), "Payment recorded");
              }}>Pay</button>
            </div>
          )} />
        </div>
      )}

      {tab === "quotations" && (
        <div className="grid md:grid-cols-2 gap-6">
          <QuotationForm projects={data.projects || []} onSubmit={(p: any) => run(() => createQuotationAction(p), "Quotation created")} pending={pending} />
          <List title="Quotations" items={data.quotations || []} render={(q: any) => (
            <div className="flex justify-between text-sm border-b py-2">
              <div><div className="font-medium">{q.quotation_no}</div><div className="text-xs text-slate-500">{q.status}</div></div>
              <div>{fmt(q.amount)}</div>
            </div>
          )} />
        </div>
      )}

      {tab === "banks" && (
        <div className="grid md:grid-cols-2 gap-6">
          <BankForm onSubmit={(p: any) => run(() => createBankAccountAction(p), "Account created")} pending={pending} />
          <List title="Cash & Bank Accounts" items={data.accounts || []} render={(a: any) => (
            <div className="flex justify-between text-sm border-b py-2">
              <div><div className="font-medium">{a.name}</div><div className="text-xs text-slate-500">{a.account_type} {a.bank_name || ""} {a.account_number || ""}</div></div>
              <div>{fmt(a.current_balance)}</div>
            </div>
          )} />
        </div>
      )}

      {tab === "recon" && <ReconTab />}
      {tab === "reports" && <ReportsTab />}
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-5 bg-white border rounded-2xl">
      <p className="text-xs uppercase text-slate-400 font-bold">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function List({ title, items, render }: { title: string; items: any[]; render: (item: any) => React.ReactNode }) {
  return (
    <div className="p-5 bg-white border rounded-2xl">
      <h3 className="font-semibold mb-3">{title}</h3>
      {items.length === 0 ? <p className="text-sm text-slate-400">No records yet.</p> : items.map((it, i) => <div key={it.id || i}>{render(it)}</div>)}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm mb-3">
      <span className="text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm";

function ProjectForm({ onCreate, pending }: any) {
  const [name, setName] = useState("");
  return (
    <form className="p-5 bg-white border rounded-2xl" onSubmit={(e) => { e.preventDefault(); if (name) onCreate(name); setName(""); }}>
      <h3 className="font-semibold mb-3">New Project</h3>
      <Field label="Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required /></Field>
      <button disabled={pending} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">Create</button>
    </form>
  );
}

function ReceiptForm({ accounts, projects, onSubmit, pending }: any) {
  const [form, setForm] = useState({ amount: "", party_type: "client", party_name: "", payment_mode: "neft", account_id: "", project_id: "", receipt_date: "", remarks: "", gst_amount: "", tds_amount: "", paid_through_person: "" });
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });
  return (
    <form className="p-5 bg-white border rounded-2xl" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        amount: Number(form.amount),
        party_type: form.party_type,
        party_name: form.party_name,
        payment_mode: form.payment_mode,
        account_id: form.account_id || null,
        project_id: form.project_id || null,
        receipt_date: form.receipt_date || undefined,
        remarks: form.remarks,
        gst_amount: Number(form.gst_amount) || 0,
        tds_amount: Number(form.tds_amount) || 0,
        paid_through_person: form.paid_through_person,
      });
    }}>
      <h3 className="font-semibold mb-3">New Inward Receipt (REC/YYYY-YY/0001)</h3>
      <Field label="Amount"><input type="number" step="0.01" className={inputCls} value={form.amount} onChange={(e) => set("amount", e.target.value)} required /></Field>
      <Field label="Party type">
        <select className={inputCls} value={form.party_type} onChange={(e) => set("party_type", e.target.value)}>
          <option value="client">Client / Customer</option>
          <option value="government">Government department</option>
          <option value="other">Other</option>
        </select>
      </Field>
      <Field label="Party name"><input className={inputCls} value={form.party_name} onChange={(e) => set("party_name", e.target.value)} /></Field>
      <Field label="Payment mode">
        <select className={inputCls} value={form.payment_mode} onChange={(e) => set("payment_mode", e.target.value)}>
          <option value="cash">Cash</option>
          <option value="neft">NEFT</option>
          <option value="rtgs">RTGS</option>
          <option value="upi">UPI</option>
          <option value="cheque">Cheque</option>
          <option value="bank">Bank</option>
        </select>
      </Field>
      <Field label="Account">
        <select className={inputCls} value={form.account_id} onChange={(e) => set("account_id", e.target.value)}>
          <option value="">\u2014</option>
          {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field label="Project">
        <select className={inputCls} value={form.project_id} onChange={(e) => set("project_id", e.target.value)}>
          <option value="">General</option>
          {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Date (previous allowed)"><input type="date" className={inputCls} value={form.receipt_date} onChange={(e) => set("receipt_date", e.target.value)} /></Field>
      <Field label="Paid through person"><input className={inputCls} value={form.paid_through_person} onChange={(e) => set("paid_through_person", e.target.value)} /></Field>
      <Field label="GST"><input type="number" className={inputCls} value={form.gst_amount} onChange={(e) => set("gst_amount", e.target.value)} /></Field>
      <Field label="TDS"><input type="number" className={inputCls} value={form.tds_amount} onChange={(e) => set("tds_amount", e.target.value)} /></Field>
      <Field label="Remarks"><input className={inputCls} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} /></Field>
      <button disabled={pending} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">Save Receipt</button>
      <p className="text-xs text-slate-400 mt-2">Saved first. Print later. Cancel retains audit history.</p>
    </form>
  );
}

function ExpenseForm({ accounts, projects, onSubmit, onCategory, pending }: any) {
  const [form, setForm] = useState({ amount: "", description: "", project_id: "", account_id: "", expense_date: "", payment_mode: "cash", vendor_name: "", bill_attached: false, is_reimbursement: false, site_name: "", department: "", paid_through_person: "", gst_amount: "", tds_amount: "" });
  const [catName, setCatName] = useState("");
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  return (
    <div className="p-5 bg-white border rounded-2xl space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, amount: Number(form.amount), project_id: form.project_id || null, account_id: form.account_id || null, gst_amount: Number(form.gst_amount) || 0, tds_amount: Number(form.tds_amount) || 0 }); }}>
        <h3 className="font-semibold mb-3">New Expense</h3>
        <Field label="Amount"><input type="number" step="0.01" className={inputCls} value={form.amount} onChange={(e) => set("amount", e.target.value)} required /></Field>
        <Field label="Description"><input className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Project (blank = general company expense)">
          <select className={inputCls} value={form.project_id} onChange={(e) => set("project_id", e.target.value)}>
            <option value="">General company expense</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Account">
          <select className={inputCls} value={form.account_id} onChange={(e) => set("account_id", e.target.value)}>
            <option value="">\u2014</option>
            {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="Date"><input type="date" className={inputCls} value={form.expense_date} onChange={(e) => set("expense_date", e.target.value)} /></Field>
        <Field label="Vendor"><input className={inputCls} value={form.vendor_name} onChange={(e) => set("vendor_name", e.target.value)} /></Field>
        <Field label="Site / Department">
          <div className="flex gap-2">
            <input className={inputCls} placeholder="Site" value={form.site_name} onChange={(e) => set("site_name", e.target.value)} />
            <input className={inputCls} placeholder="Department" value={form.department} onChange={(e) => set("department", e.target.value)} />
          </div>
        </Field>
        <Field label="Paid through person"><input className={inputCls} value={form.paid_through_person} onChange={(e) => set("paid_through_person", e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm mb-2"><input type="checkbox" checked={form.bill_attached} onChange={(e) => set("bill_attached", e.target.checked)} /> Bill attached</label>
        <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={form.is_reimbursement} onChange={(e) => set("is_reimbursement", e.target.checked)} /> Travel reimbursement (no bill under \u20b9500 allowed)</label>
        <Field label="GST / TDS">
          <div className="flex gap-2">
            <input type="number" className={inputCls} placeholder="GST" value={form.gst_amount} onChange={(e) => set("gst_amount", e.target.value)} />
            <input type="number" className={inputCls} placeholder="TDS" value={form.tds_amount} onChange={(e) => set("tds_amount", e.target.value)} />
          </div>
        </Field>
        <button disabled={pending} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">Save Expense</button>
        <p className="text-xs text-slate-400 mt-2">Approval required above \u20b91,00,000.</p>
      </form>
      <form className="border-t pt-3" onSubmit={(e) => { e.preventDefault(); if (catName) onCategory(catName, "general"); setCatName(""); }}>
        <h4 className="text-sm font-medium mb-2">Add category</h4>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="Subcontractor, Rent..." value={catName} onChange={(e) => setCatName(e.target.value)} />
          <button className="px-3 py-2 bg-slate-800 text-white rounded-lg text-sm">Add</button>
        </div>
      </form>
    </div>
  );
}

function InvoiceForm({ projects, onSubmit, pending }: any) {
  const [form, setForm] = useState({ amount: "", project_id: "", gst_amount: "", tds_amount: "", due_date: "", remarks: "" });
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });
  return (
    <form className="p-5 bg-white border rounded-2xl" onSubmit={(e) => { e.preventDefault(); onSubmit({ amount: Number(form.amount), project_id: form.project_id || null, gst_amount: Number(form.gst_amount) || 0, tds_amount: Number(form.tds_amount) || 0, due_date: form.due_date || null, remarks: form.remarks }); }}>
      <h3 className="font-semibold mb-3">New Invoice</h3>
      <Field label="Amount"><input type="number" step="0.01" className={inputCls} value={form.amount} onChange={(e) => set("amount", e.target.value)} required /></Field>
      <Field label="Project">
        <select className={inputCls} value={form.project_id} onChange={(e) => set("project_id", e.target.value)}>
          <option value="">\u2014</option>
          {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="GST / TDS">
        <div className="flex gap-2">
          <input type="number" className={inputCls} placeholder="GST" value={form.gst_amount} onChange={(e) => set("gst_amount", e.target.value)} />
          <input type="number" className={inputCls} placeholder="TDS" value={form.tds_amount} onChange={(e) => set("tds_amount", e.target.value)} />
        </div>
      </Field>
      <Field label="Due date"><input type="date" className={inputCls} value={form.due_date} onChange={(e) => set("due_date", e.target.value)} /></Field>
      <Field label="Remarks"><input className={inputCls} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} /></Field>
      <button disabled={pending} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">Create Invoice</button>
      <p className="text-xs text-slate-400 mt-2">Partial payments update balance automatically.</p>
    </form>
  );
}

function QuotationForm({ projects, onSubmit, pending }: any) {
  const [form, setForm] = useState({ amount: "", project_id: "", valid_until: "", remarks: "" });
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });
  return (
    <form className="p-5 bg-white border rounded-2xl" onSubmit={(e) => { e.preventDefault(); onSubmit({ amount: Number(form.amount), project_id: form.project_id || null, valid_until: form.valid_until || null, remarks: form.remarks, status: "draft" }); }}>
      <h3 className="font-semibold mb-3">New Quotation</h3>
      <Field label="Amount"><input type="number" step="0.01" className={inputCls} value={form.amount} onChange={(e) => set("amount", e.target.value)} required /></Field>
      <Field label="Project">
        <select className={inputCls} value={form.project_id} onChange={(e) => set("project_id", e.target.value)}>
          <option value="">\u2014</option>
          {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Valid until"><input type="date" className={inputCls} value={form.valid_until} onChange={(e) => set("valid_until", e.target.value)} /></Field>
      <Field label="Remarks"><input className={inputCls} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} /></Field>
      <button disabled={pending} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">Create Quotation</button>
    </form>
  );
}

function BankForm({ onSubmit, pending }: any) {
  const [form, setForm] = useState({ name: "", account_type: "bank", bank_name: "", account_number: "", ifsc: "", opening_balance: "" });
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });
  return (
    <form className="p-5 bg-white border rounded-2xl" onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, opening_balance: Number(form.opening_balance) || 0 }); }}>
      <h3 className="font-semibold mb-3">New Cash / Bank Account</h3>
      <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Cash / Bank of Baroda / SBI / HDFC" required /></Field>
      <Field label="Type">
        <select className={inputCls} value={form.account_type} onChange={(e) => set("account_type", e.target.value)}>
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
        </select>
      </Field>
      <Field label="Bank name"><input className={inputCls} value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} /></Field>
      <Field label="Account number"><input className={inputCls} value={form.account_number} onChange={(e) => set("account_number", e.target.value)} /></Field>
      <Field label="IFSC"><input className={inputCls} value={form.ifsc} onChange={(e) => set("ifsc", e.target.value)} /></Field>
      <Field label="Opening balance"><input type="number" className={inputCls} value={form.opening_balance} onChange={(e) => set("opening_balance", e.target.value)} /></Field>
      <button disabled={pending} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">Create Account</button>
    </form>
  );
}

function ReconTab() {
  const [data, setData] = useState<any>(null);
  const [pending, start] = useTransition();
  return (
    <div className="p-5 bg-white border rounded-2xl space-y-3">
      <h3 className="font-semibold">Reconciliation</h3>
      <p className="text-sm text-slate-500">Match inward receipts against invoice payments for the branch.</p>
      <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm" disabled={pending} onClick={() => start(async () => {
        const res = await getReconciliationAction();
        if (res.success) setData(res.data);
      })}>Load</button>
      {data && (
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Receipts ({data.receipts?.length || 0})</h4>
            {(data.receipts || []).map((r: any) => <div key={r.id} className="text-sm border-b py-1 flex justify-between"><span>{r.receipt_no}</span><span>{fmt(r.amount)}</span></div>)}
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Invoice Payments ({data.payments?.length || 0})</h4>
            {(data.payments || []).map((p: any) => <div key={p.id} className="text-sm border-b py-1 flex justify-between"><span>{p.invoices?.invoice_no || p.invoice_id}</span><span>{fmt(p.amount)}</span></div>)}
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsTab() {
  const [pl, setPl] = useState<any>(null);
  const [pending, start] = useTransition();
  return (
    <div className="p-5 bg-white border rounded-2xl space-y-3">
      <h3 className="font-semibold">Profit & Loss / Balance Sheet</h3>
      <p className="text-sm text-slate-500">Income and expense head-wise, branch-wise. Excel export is Super Admin only.</p>
      <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm" disabled={pending} onClick={() => start(async () => {
        const res = await getProfitAndLossAction();
        if (res.success) setPl(res.data);
      })}>Generate P&L</button>
      {pl && (
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Card label="Income" value={fmt(pl.totalIncome)} />
          <Card label="Expense" value={fmt(pl.totalExpense)} />
          <Card label="Profit" value={fmt(pl.profit)} />
        </div>
      )}
    </div>
  );
}
