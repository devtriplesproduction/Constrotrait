"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/modules/PageHeader";
import { Banknote, Receipt, FileText, BarChart3, Landmark, Scale, Plus, Trash2, Check, X } from "lucide-react";
import {
  createInwardReceiptAction,
  cancelInwardReceiptAction,
  createExpenseAction,
  approveExpenseAction,
  createExpenseCategoryAction,
  createBankAccountAction,
  createQuotationWithItemsAction,
  createInvoiceWithItemsAction,
  recordInvoicePaymentAction,
  createProjectAction,
  searchAccountingAction,
  getProfitAndLossAction,
  getReconciliationAction,
  getQuotationsAction,
  getInvoicesAction,
  saveBankReconciliationAction,
  getBankReconciliationsAction,
} from "@/actions/accounting.actions";

interface Props { initialData: any; }
const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const inputCls = "w-full border rounded-lg px-3 py-2 text-sm";

export function AccountingClient({ initialData }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("dashboard");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const data = initialData || {};

  function refresh() { startTransition(() => router.refresh()); }
  function run(fn: () => Promise<any>, ok = "Saved") {
    setMsg("");
    startTransition(async () => {
      const res = await fn();
      setMsg(res?.success ? ok : res?.error || "Failed");
      if (res?.success) refresh();
    });
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "receipts", label: "Receipts", icon: Receipt },
    { id: "expenses", label: "Expenses", icon: Banknote },
    { id: "invoices", label: "Invoices", icon: FileText },
    { id: "quotations", label: "Quotations", icon: FileText },
    { id: "banks", label: "Banks", icon: Landmark },
    { id: "recon", label: "Reconciliation", icon: Scale },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Accounting" subtitle="Quotations, receipts, expenses, invoices, banks, reconciliation and reports." />
      {msg && <div className="p-3 rounded-lg bg-slate-100 text-sm">{msg}</div>}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${tab === t.id ? "bg-slate-900 text-white" : "bg-slate-100"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === "dashboard" && <Dashboard data={data} />}
      {tab === "receipts" && <ReceiptsTab data={data} run={run} pending={pending} />}
      {tab === "expenses" && <ExpensesTab data={data} run={run} pending={pending} />}
      {tab === "invoices" && <InvoicesTab data={data} run={run} pending={pending} />}
      {tab === "quotations" && <QuotationsTab data={data} run={run} pending={pending} />}
      {tab === "banks" && <BanksTab data={data} run={run} pending={pending} />}
      {tab === "recon" && <ReconTab data={data} run={run} pending={pending} />}
      {tab === "reports" && <ReportsTab />}
    </div>
  );
}

function Dashboard({ data }: { data: any }) {
  const cashBank = (data.accounts || []).reduce((s: number, a: any) => s + Number(a.current_balance || 0), 0);
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card label="Cash + Bank" value={fmt(cashBank)} />
      <Card label="Projects" value={String((data.projects || []).length)} />
      <Card label="Pending Approvals" value={String((data.pending || []).length)} />
      <div className="md:col-span-3">
        <List title="Recent Receipts" items={data.receipts || []} render={(r: any) => <div className="flex justify-between"><span>{r.receipt_no} · {r.party_name || "—"}</span><span>{fmt(r.amount)}</span></div>} />
      </div>
    </div>
  );
}

function ReceiptsTab({ data, run, pending }: any) {
  const [form, setForm] = useState({ amount: "", party_type: "client", party_name: "", payment_mode: "neft", account_id: "", project_id: "", receipt_date: "", remarks: "", gst_amount: "", tds_amount: "", paid_through_person: "" });
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form className="p-5 bg-white border rounded-2xl space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => createInwardReceiptAction({ ...form, amount: Number(form.amount), gst_amount: Number(form.gst_amount || 0), tds_amount: Number(form.tds_amount || 0) }), "Receipt created"); }}>
        <h3 className="font-medium">New Inward Receipt</h3>
        <Field label="Amount"><input required type="number" step="0.01" className={inputCls} value={form.amount} onChange={(e) => set("amount", e.target.value)} /></Field>
        <Field label="Party Type"><select className={inputCls} value={form.party_type} onChange={(e) => set("party_type", e.target.value)}><option value="client">Client</option><option value="government">Government</option><option value="other">Other</option></select></Field>
        <Field label="Party Name"><input className={inputCls} value={form.party_name} onChange={(e) => set("party_name", e.target.value)} /></Field>
        <Field label="Payment Mode"><select className={inputCls} value={form.payment_mode} onChange={(e) => set("payment_mode", e.target.value)}><option value="cash">Cash</option><option value="bank">Bank</option><option value="upi">UPI</option><option value="cheque">Cheque</option><option value="neft">NEFT</option><option value="rtgs">RTGS</option></select></Field>
        <Field label="Account"><select className={inputCls} value={form.account_id} onChange={(e) => set("account_id", e.target.value)}><option value="">—</option>{(data.accounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="Project"><select className={inputCls} value={form.project_id} onChange={(e) => set("project_id", e.target.value)}><option value="">—</option>{(data.projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Date"><input type="date" className={inputCls} value={form.receipt_date} onChange={(e) => set("receipt_date", e.target.value)} /></Field>
        <Field label="GST"><input type="number" step="0.01" className={inputCls} value={form.gst_amount} onChange={(e) => set("gst_amount", e.target.value)} /></Field>
        <Field label="TDS"><input type="number" step="0.01" className={inputCls} value={form.tds_amount} onChange={(e) => set("tds_amount", e.target.value)} /></Field>
        <Field label="Paid Through"><input className={inputCls} value={form.paid_through_person} onChange={(e) => set("paid_through_person", e.target.value)} /></Field>
        <Field label="Remarks"><textarea className={inputCls} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} /></Field>
        <button disabled={pending} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm">Create Receipt</button>
      </form>
      <List title="Recent Receipts" items={data.receipts || []} render={(r: any) => (
        <div className="flex justify-between items-center text-sm">
          <div><div className="font-medium">{r.receipt_no}</div><div className="text-slate-500">{r.party_name} · {r.payment_mode}</div></div>
          <div className="text-right"><div>{fmt(r.amount)}</div>{r.status === "received" && <button className="text-xs text-red-600" onClick={() => { const reason = prompt("Cancel reason?"); if (reason) run(() => cancelInwardReceiptAction(r.id, reason), "Cancelled"); }}>Cancel</button>}</div>
        </div>
      )} />
    </div>
  );
}

function ExpensesTab({ data, run, pending }: any) {
  const [form, setForm] = useState({ amount: "", description: "", project_id: "", account_id: "", expense_date: "", payment_mode: "cash", vendor_name: "", bill_attached: false, is_reimbursement: false, site_name: "", department: "", paid_through_person: "", gst_amount: "", tds_amount: "" });
  const [catName, setCatName] = useState("");
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form className="p-5 bg-white border rounded-2xl space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => createExpenseAction({ ...form, amount: Number(form.amount), gst_amount: Number(form.gst_amount || 0), tds_amount: Number(form.tds_amount || 0) }), "Expense recorded"); }}>
        <h3 className="font-medium">New Expense</h3>
        <Field label="Amount"><input required type="number" step="0.01" className={inputCls} value={form.amount} onChange={(e) => set("amount", e.target.value)} /></Field>
        <Field label="Description"><input className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Vendor"><input className={inputCls} value={form.vendor_name} onChange={(e) => set("vendor_name", e.target.value)} /></Field>
        <Field label="Project"><select className={inputCls} value={form.project_id} onChange={(e) => set("project_id", e.target.value)}><option value="">General</option>{(data.projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Account"><select className={inputCls} value={form.account_id} onChange={(e) => set("account_id", e.target.value)}><option value="">—</option>{(data.accounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="Mode"><select className={inputCls} value={form.payment_mode} onChange={(e) => set("payment_mode", e.target.value)}><option value="cash">Cash</option><option value="bank">Bank</option><option value="upi">UPI</option></select></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.bill_attached} onChange={(e) => set("bill_attached", e.target.checked)} /> Bill attached</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_reimbursement} onChange={(e) => set("is_reimbursement", e.target.checked)} /> Employee reimbursement</label>
        <Field label="Site"><input className={inputCls} value={form.site_name} onChange={(e) => set("site_name", e.target.value)} /></Field>
        <Field label="Department"><input className={inputCls} value={form.department} onChange={(e) => set("department", e.target.value)} /></Field>
        <Field label="Paid Through"><input className={inputCls} value={form.paid_through_person} onChange={(e) => set("paid_through_person", e.target.value)} /></Field>
        <button disabled={pending} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm">Record Expense</button>
      </form>
      <div className="space-y-4">
        <form className="p-4 border rounded-xl flex gap-2" onSubmit={(e) => { e.preventDefault(); if (catName) run(() => createExpenseCategoryAction(catName), "Category added"); setCatName(""); }}>
          <input className={inputCls} placeholder="New category name" value={catName} onChange={(e) => setCatName(e.target.value)} />
          <button className="px-3 py-2 bg-slate-200 rounded-lg text-sm">Add</button>
        </form>
        <List title="Recent Expenses" items={data.expenses || []} render={(e: any) => (
          <div className="flex justify-between text-sm">
            <div><div>{e.description || e.vendor_name || "Expense"}</div><div className="text-xs text-slate-500">{e.approval_status}</div></div>
            <div className="text-right">{fmt(e.amount)}{e.approval_status === "pending" && <div className="space-x-2"><button className="text-xs text-green-600" onClick={() => run(() => approveExpenseAction(e.id, true), "Approved")}>Approve</button><button className="text-xs text-red-600" onClick={() => run(() => approveExpenseAction(e.id, false), "Rejected")}>Reject</button></div>}</div>
          </div>
        )} />
      </div>
    </div>
  );
}

function InvoicesTab({ data, run, pending }: any) {
  const [items, setItems] = useState([{ description: "", qty: 1, rate: 0 }]);
  const [form, setForm] = useState({ project_id: "", invoice_date: "", due_date: "", gst_amount: "", tds_amount: "", notes: "" });
  const subtotal = items.reduce((s, i) => s + Number(i.qty) * Number(i.rate), 0);
  function addItem() { setItems([...items, { description: "", qty: 1, rate: 0 }]); }
  function updateItem(i: number, k: string, v: any) { const n = [...items]; (n[i] as any)[k] = v; setItems(n); }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)); }
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form className="p-5 bg-white border rounded-2xl space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => createInvoiceWithItemsAction({ ...form, items, gst_amount: Number(form.gst_amount || subtotal * 0.18), tds_amount: Number(form.tds_amount || 0) }), "Invoice created"); }}>
        <h3 className="font-medium">Create Invoice (line items)</h3>
        {items.map((it, i) => (
          <div key={i} className="flex gap-2 items-end">
            <input className={inputCls} placeholder="Description" value={it.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
            <input type="number" className="w-16 border rounded px-2 py-1 text-sm" value={it.qty} onChange={(e) => updateItem(i, "qty", Number(e.target.value))} />
            <input type="number" step="0.01" className="w-24 border rounded px-2 py-1 text-sm" placeholder="Rate" value={it.rate} onChange={(e) => updateItem(i, "rate", Number(e.target.value))} />
            <button type="button" onClick={() => removeItem(i)} className="text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        <button type="button" onClick={addItem} className="text-sm text-blue-600 flex items-center gap-1"><Plus className="w-4 h-4" /> Add line</button>
        <div className="text-sm">Subtotal: {fmt(subtotal)}</div>
        <Field label="Project"><select className={inputCls} value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}><option value="">—</option>{(data.projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="GST Amount"><input type="number" step="0.01" className={inputCls} value={form.gst_amount} onChange={(e) => setForm({ ...form, gst_amount: e.target.value })} placeholder="auto 18%" /></Field>
        <Field label="TDS"><input type="number" step="0.01" className={inputCls} value={form.tds_amount} onChange={(e) => setForm({ ...form, tds_amount: e.target.value })} /></Field>
        <Field label="Due Date"><input type="date" className={inputCls} value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
        <Field label="Notes"><textarea className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        <button disabled={pending} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm">Create Invoice</button>
      </form>
      <List title="Invoices" items={data.invoices || []} render={(inv: any) => (
        <div className="flex justify-between text-sm">
          <div><div className="font-medium">{inv.invoice_no}</div><div className="text-xs text-slate-500">{inv.status} · Bal {fmt(inv.balance_amount)}</div></div>
          <button className="text-xs text-blue-600" onClick={() => { const amt = prompt("Payment amount?"); if (amt) run(() => recordInvoicePaymentAction(inv.id, Number(amt)), "Payment recorded"); }}>Pay</button>
        </div>
      )} />
    </div>
  );
}

function QuotationsTab({ data, run, pending }: any) {
  const [items, setItems] = useState([{ description: "", qty: 1, rate: 0 }]);
  const [form, setForm] = useState({ project_id: "", valid_until: "", discount_amount: "", gst_rate: "18", terms: "", remarks: "" });
  const subtotal = items.reduce((s, i) => s + Number(i.qty) * Number(i.rate), 0);
  const discount = Number(form.discount_amount || 0);
  const gst = ((subtotal - discount) * Number(form.gst_rate || 18)) / 100;
  const total = subtotal - discount + gst;
  function addItem() { setItems([...items, { description: "", qty: 1, rate: 0 }]); }
  function updateItem(i: number, k: string, v: any) { const n = [...items]; (n[i] as any)[k] = v; setItems(n); }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)); }
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form className="p-5 bg-white border rounded-2xl space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => createQuotationWithItemsAction({ ...form, items, discount_amount: discount, gst_rate: Number(form.gst_rate) }), "Quotation created"); }}>
        <h3 className="font-medium">Create Quotation</h3>
        {items.map((it, i) => (
          <div key={i} className="flex gap-2 items-end">
            <input className={inputCls} placeholder="Service / item" value={it.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
            <input type="number" className="w-16 border rounded px-2 py-1 text-sm" value={it.qty} onChange={(e) => updateItem(i, "qty", Number(e.target.value))} />
            <input type="number" step="0.01" className="w-24 border rounded px-2 py-1 text-sm" placeholder="Rate" value={it.rate} onChange={(e) => updateItem(i, "rate", Number(e.target.value))} />
            <button type="button" onClick={() => removeItem(i)} className="text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        <button type="button" onClick={addItem} className="text-sm text-blue-600 flex items-center gap-1"><Plus className="w-4 h-4" /> Add line</button>
        <Field label="Discount"><input type="number" step="0.01" className={inputCls} value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} /></Field>
        <Field label="GST %"><input type="number" className={inputCls} value={form.gst_rate} onChange={(e) => setForm({ ...form, gst_rate: e.target.value })} /></Field>
        <div className="text-sm space-y-1"><div>Subtotal {fmt(subtotal)}</div><div>GST {fmt(gst)}</div><div className="font-medium">Total {fmt(total)}</div></div>
        <Field label="Project"><select className={inputCls} value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}><option value="">—</option>{(data.projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Valid Until"><input type="date" className={inputCls} value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></Field>
        <Field label="Terms"><textarea className={inputCls} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></Field>
        <Field label="Remarks"><textarea className={inputCls} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
        <button disabled={pending} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm">Create Quotation</button>
      </form>
      <List title="Quotations" items={data.quotations || []} render={(q: any) => <div className="flex justify-between text-sm"><span>{q.quotation_no}</span><span>{fmt(q.total_amount || q.amount)}</span></div>} />
    </div>
  );
}

function BanksTab({ data, run, pending }: any) {
  const [form, setForm] = useState({ name: "", account_type: "bank", bank_name: "", account_number: "", ifsc: "", opening_balance: "" });
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form className="p-5 bg-white border rounded-2xl space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => createBankAccountAction({ ...form, opening_balance: Number(form.opening_balance || 0) }), "Account created"); }}>
        <h3 className="font-medium">Add Bank / Cash Account</h3>
        <Field label="Name"><input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Type"><select className={inputCls} value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })}><option value="bank">Bank</option><option value="cash">Cash</option></select></Field>
        <Field label="Bank Name"><input className={inputCls} value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></Field>
        <Field label="Account Number"><input className={inputCls} value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} /></Field>
        <Field label="IFSC"><input className={inputCls} value={form.ifsc} onChange={(e) => setForm({ ...form, ifsc: e.target.value })} /></Field>
        <Field label="Opening Balance"><input type="number" step="0.01" className={inputCls} value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} /></Field>
        <button disabled={pending} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm">Create Account</button>
      </form>
      <List title="Accounts" items={data.accounts || []} render={(a: any) => <div className="flex justify-between text-sm"><span>{a.name} ({a.account_type})</span><span>{fmt(a.current_balance)}</span></div>} />
    </div>
  );
}

function ReconTab({ data, run, pending }: any) {
  const [accountId, setAccountId] = useState("");
  const [statementDate, setStatementDate] = useState("");
  const [statementBalance, setStatementBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [erpBalance, setErpBalance] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (accountId) {
      getBankReconciliationsAction(accountId).then((r) => setHistory(r.success ? r.data || [] : []));
    }
  }, [accountId]);

  async function calc() {
    // Simple ERP balance from account current_balance for demo; real calc would sum receipts - expenses for date
    const acc = (data.accounts || []).find((a: any) => a.id === accountId);
    setErpBalance(acc ? Number(acc.current_balance) : 0);
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="p-5 bg-white border rounded-2xl space-y-3">
        <h3 className="font-medium">Bank Reconciliation</h3>
        <Field label="Account"><select className={inputCls} value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Select</option>{(data.accounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="Statement Date"><input type="date" className={inputCls} value={statementDate} onChange={(e) => setStatementDate(e.target.value)} /></Field>
        <button type="button" onClick={calc} className="px-3 py-2 bg-slate-200 rounded text-sm">Calculate ERP Balance</button>
        {erpBalance !== null && <div className="text-sm">ERP Balance: {fmt(erpBalance)}</div>}
        <Field label="Statement Balance"><input type="number" step="0.01" className={inputCls} value={statementBalance} onChange={(e) => setStatementBalance(e.target.value)} /></Field>
        {erpBalance !== null && statementBalance && <div className="text-sm">Difference: {fmt(Number(statementBalance) - erpBalance)}</div>}
        <Field label="Notes"><textarea className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <button disabled={pending || !accountId || !statementDate || !statementBalance} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm" onClick={() => run(() => saveBankReconciliationAction({ account_id: accountId, statement_date: statementDate, statement_balance: Number(statementBalance), erp_balance: erpBalance || 0, notes }), "Reconciliation saved")}>Save Reconciliation</button>
      </div>
      <List title="Reconciliation History" items={history} render={(h: any) => <div className="text-sm">{h.statement_date} · Diff {fmt(h.difference)}</div>} />
    </div>
  );
}

function ReportsTab() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pnl, setPnl] = useState<any>(null);
  return (
    <div className="p-5 bg-white border rounded-2xl space-y-3 max-w-lg">
      <h3 className="font-medium">Profit & Loss</h3>
      <div className="flex gap-2"><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /><input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></div>
      <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm" onClick={async () => { const r = await getProfitAndLossAction(from, to); if (r.success) setPnl(r.data); }}>Generate</button>
      {pnl && <div className="text-sm space-y-1"><div>Income: {fmt(pnl.totalIncome)}</div><div>Expense: {fmt(pnl.totalExpense)}</div><div className="font-medium">Profit: {fmt(pnl.profit)}</div></div>}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return <div className="p-4 bg-white border rounded-2xl"><div className="text-xs text-slate-500">{label}</div><div className="text-xl font-semibold">{value}</div></div>;
}
function List({ title, items, render }: { title: string; items: any[]; render: (item: any) => React.ReactNode }) {
  return <div className="p-4 bg-white border rounded-2xl"><h4 className="font-medium mb-3">{title}</h4><div className="space-y-2">{items.length === 0 ? <div className="text-sm text-slate-400">None</div> : items.map((it, i) => <div key={i}>{render(it)}</div>)}</div></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="text-slate-600">{label}</span><div className="mt-1">{children}</div></label>;
}
