import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserWithRoles } from "./auth.service";
import { canManageAccountingTransactions, canViewAccounting, canApproveAccounting, isSuperAdmin } from "@/config/roles";

const APPROVAL_THRESHOLD = 100000;

function branchScope(user: { roles: string[]; branch_id: string | null }, branchId?: string) {
  return isSuperAdmin(user.roles) && branchId ? branchId : user.branch_id;
}

export async function getAccountingDashboard(branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const effectiveBranch = branchScope(user, branchId);
  if (!effectiveBranch && !isSuperAdmin(user.roles)) return { success: false, error: "Branch required" };

  let accountsQuery = supabase.from("financial_accounts").select("*").eq("is_active", true);
  if (effectiveBranch) accountsQuery = accountsQuery.eq("branch_id", effectiveBranch);
  const { data: accounts } = await accountsQuery;

  let projectsQuery = supabase.from("accounting_projects").select("id, name, status");
  if (effectiveBranch) projectsQuery = projectsQuery.eq("branch_id", effectiveBranch);
  const { data: projects } = await projectsQuery;

  const projectBalances: { id: string; name: string; balance: number }[] = [];
  if (projects) {
    for (const p of projects) {
      const { data: bal } = await supabase.rpc("get_project_financial_balance", { p_project_id: p.id });
      projectBalances.push({ id: p.id, name: p.name, balance: Number(bal) || 0 });
    }
  }

  let receiptsQuery = supabase.from("inward_receipts").select("*").order("created_at", { ascending: false }).limit(20);
  if (effectiveBranch) receiptsQuery = receiptsQuery.eq("branch_id", effectiveBranch);
  const { data: receipts } = await receiptsQuery;

  let expensesQuery = supabase.from("accounting_expenses").select("*").order("created_at", { ascending: false }).limit(20);
  if (effectiveBranch) expensesQuery = expensesQuery.eq("branch_id", effectiveBranch);
  const { data: expenses } = await expensesQuery;

  let pendingQuery = supabase.from("accounting_expenses").select("*").eq("approval_status", "pending");
  if (effectiveBranch) pendingQuery = pendingQuery.eq("branch_id", effectiveBranch);
  const { data: pending } = await pendingQuery;

  let invoicesQuery = supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(20);
  if (effectiveBranch) invoicesQuery = invoicesQuery.eq("branch_id", effectiveBranch);
  const { data: invoices } = await invoicesQuery;

  let quotationsQuery = supabase.from("quotations").select("*").order("created_at", { ascending: false }).limit(20);
  if (effectiveBranch) quotationsQuery = quotationsQuery.eq("branch_id", effectiveBranch);
  const { data: quotations } = await quotationsQuery;

  return {
    success: true,
    data: {
      accounts: accounts || [],
      projectBalances,
      projects: projects || [],
      recentReceipts: receipts || [],
      recentExpenses: expenses || [],
      pendingApprovals: pending || [],
      openInvoices: (invoices || []).filter((i: any) => ["unpaid", "partial"].includes(i.status)),
      invoices: invoices || [],
      quotations: quotations || [],
    },
  };
}

export async function createInwardReceipt(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const { data: receiptNo } = await supabase.rpc("next_receipt_no", { p_branch_id: user.branch_id });
  const { data, error } = await supabase.from("inward_receipts").insert({ branch_id: user.branch_id, receipt_no: receiptNo, ...payload, created_by: user.id }).select().single();
  if (error) return { success: false, error: error.message };
  await supabase.from("accounting_audit_log").insert({ branch_id: user.branch_id, table_name: "inward_receipts", record_id: data.id, action: "create", new_data: data, performed_by: user.id });
  return { success: true, data };
}

export async function cancelInwardReceipt(receiptId: string, reason: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  if (!reason?.trim()) return { success: false, error: "Cancel reason is required" };
  const supabase = await createClient();
  const { data: old } = await supabase.from("inward_receipts").select("*").eq("id", receiptId).single();
  const { data, error } = await supabase.from("inward_receipts").update({ status: "cancelled", cancel_reason: reason, cancelled_at: new Date().toISOString(), cancelled_by: user.id }).eq("id", receiptId).select().single();
  if (error) return { success: false, error: error.message };
  await supabase.from("accounting_audit_log").insert({ branch_id: user.branch_id, table_name: "inward_receipts", record_id: receiptId, action: "cancel", old_data: old, new_data: data, performed_by: user.id });
  return { success: true, data };
}

export async function createExpense(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  let requires_approval = false;
  if (Number(payload.amount) > APPROVAL_THRESHOLD) requires_approval = true;
  else if (payload.is_reimbursement && !payload.bill_attached && Number(payload.amount) >= 500) requires_approval = true;
  const supabase = await createClient();
  const { data, error } = await supabase.from("accounting_expenses").insert({ branch_id: user.branch_id, ...payload, is_general_expense: !payload.project_id, requires_approval, approval_status: requires_approval ? "pending" : "approved", created_by: user.id }).select().single();
  if (error) return { success: false, error: error.message };
  await supabase.from("accounting_audit_log").insert({ branch_id: user.branch_id, table_name: "accounting_expenses", record_id: data.id, action: "create", new_data: data, performed_by: user.id });
  return { success: true, data };
}

export async function approveExpense(expenseId: string, approve: boolean, remarks?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canApproveAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const { data: old } = await supabase.from("accounting_expenses").select("*").eq("id", expenseId).single();
  const { data, error } = await supabase.from("accounting_expenses").update({ approval_status: approve ? "approved" : "rejected", approved_by: user.id, approved_at: new Date().toISOString() }).eq("id", expenseId).select().single();
  if (error) return { success: false, error: error.message };
  await supabase.from("accounting_audit_log").insert({ branch_id: user.branch_id, table_name: "accounting_expenses", record_id: expenseId, action: approve ? "approve" : "reject", old_data: old, new_data: data, performed_by: user.id });
  return { success: true, data };
}

export async function createExpenseCategory(name: string, scope: string = "general") {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("expense_categories").insert({ branch_id: user.branch_id, name, scope }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function createBankAccount(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("financial_accounts").insert({ branch_id: user.branch_id, ...payload, current_balance: payload.opening_balance || 0, created_by: user.id }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function createQuotation(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const quotation_no = payload.quotation_no || `QT/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;
  const { data, error } = await supabase.from("quotations").insert({ branch_id: user.branch_id, quotation_no, ...payload, created_by: user.id }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function createInvoice(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const invoice_no = payload.invoice_no || `INV/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;
  const { data, error } = await supabase.from("invoices").insert({ branch_id: user.branch_id, invoice_no, ...payload, created_by: user.id }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function recordInvoicePayment(invoiceId: string, amount: number, accountId?: string, remarks?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("invoice_payments").insert({ invoice_id: invoiceId, amount, account_id: accountId, remarks, created_by: user.id }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function createProject(name: string, description?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("accounting_projects").insert({ branch_id: user.branch_id, name, description, created_by: user.id }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function searchQuotationsAndInvoices(query: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const branchFilter = isSuperAdmin(user.roles) ? {} : { branch_id: user.branch_id };
  const { data: quotations } = await supabase.from("quotations").select("*").match(branchFilter).or(`quotation_no.ilike.%${query}%,remarks.ilike.%${query}%`);
  const { data: invoices } = await supabase.from("invoices").select("*").match(branchFilter).or(`invoice_no.ilike.%${query}%,remarks.ilike.%${query}%`);
  return { success: true, data: { quotations: quotations || [], invoices: invoices || [] } };
}

export async function getProjects() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  let q = supabase.from("accounting_projects").select("*").order("created_at", { ascending: false });
  if (!isSuperAdmin(user.roles) && user.branch_id) q = q.eq("branch_id", user.branch_id);
  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getAccounts() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  let q = supabase.from("financial_accounts").select("*").eq("is_active", true);
  if (!isSuperAdmin(user.roles) && user.branch_id) q = q.eq("branch_id", user.branch_id);
  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getCategories() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  let q = supabase.from("expense_categories").select("*");
  if (!isSuperAdmin(user.roles)) q = q.or(`branch_id.eq.${user.branch_id},branch_id.is.null`);
  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getProfitAndLoss(fromDate?: string, toDate?: string, branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const effectiveBranch = branchScope(user, branchId);
  let receiptsQ = supabase.from("inward_receipts").select("amount, gst_amount, tds_amount, status").eq("status", "received");
  let expensesQ = supabase.from("accounting_expenses").select("amount, gst_amount, tds_amount, category_id, status, approval_status").eq("status", "recorded");
  if (effectiveBranch) { receiptsQ = receiptsQ.eq("branch_id", effectiveBranch); expensesQ = expensesQ.eq("branch_id", effectiveBranch); }
  if (fromDate) { receiptsQ = receiptsQ.gte("receipt_date", fromDate); expensesQ = expensesQ.gte("expense_date", fromDate); }
  if (toDate) { receiptsQ = receiptsQ.lte("receipt_date", toDate); expensesQ = expensesQ.lte("expense_date", toDate); }
  const { data: receipts } = await receiptsQ;
  const { data: expenses } = await expensesQ;
  const totalIncome = (receipts || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const totalExpense = (expenses || []).filter((e: any) => e.approval_status === "approved").reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  return { success: true, data: { totalIncome, totalExpense, profit: totalIncome - totalExpense } };
}

export async function getReconciliation(branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const effectiveBranch = branchScope(user, branchId);
  let receiptsQ = supabase.from("inward_receipts").select("*").eq("status", "received").order("receipt_date", { ascending: false });
  let paymentsQ = supabase.from("invoice_payments").select("*, invoices(invoice_no, branch_id)").order("payment_date", { ascending: false });
  if (effectiveBranch) receiptsQ = receiptsQ.eq("branch_id", effectiveBranch);
  const { data: receipts } = await receiptsQ;
  const { data: payments } = await paymentsQ;
  const filteredPayments = (payments || []).filter((p: any) => !effectiveBranch || p.invoices?.branch_id === effectiveBranch);
  return { success: true, data: { receipts: receipts || [], payments: filteredPayments } };
}

export async function getQuotations(branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const effectiveBranch = branchScope(user, branchId);
  let q = supabase.from("quotations").select("*").order("created_at", { ascending: false });
  if (effectiveBranch) q = q.eq("branch_id", effectiveBranch);
  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getInvoices(branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const effectiveBranch = branchScope(user, branchId);
  let q = supabase.from("invoices").select("*").order("created_at", { ascending: false });
  if (effectiveBranch) q = q.eq("branch_id", effectiveBranch);
  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function createQuotationWithItems(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const items = payload.items || [];
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.qty || 0) * Number(i.rate || 0), 0);
  const discount = Number(payload.discount_amount || 0);
  const gstRate = Number(payload.gst_rate || 18);
  const taxable = Math.max(0, subtotal - discount);
  const gst = (taxable * gstRate) / 100;
  const total = taxable + gst;
  const quotation_no = payload.quotation_no || `QTN/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;
  const { data, error } = await supabase.from("quotations").insert({
    branch_id: user.branch_id,
    quotation_no,
    project_id: payload.project_id || null,
    client_id: payload.client_id || null,
    amount: total,
    subtotal,
    discount_amount: discount,
    gst_rate: gstRate,
    gst_amount: gst,
    total_amount: total,
    items,
    valid_until: payload.valid_until || null,
    terms: payload.terms || null,
    remarks: payload.remarks || null,
    status: "draft",
    created_by: user.id,
  }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function createInvoiceWithItems(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const items = payload.items || [];
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.qty || 0) * Number(i.rate || 0), 0);
  const gst = Number(payload.gst_amount || (subtotal * 0.18));
  const tds = Number(payload.tds_amount || 0);
  const total = subtotal + gst - tds;
  const invoice_no = payload.invoice_no || `INV/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;
  const { data, error } = await supabase.from("invoices").insert({
    branch_id: user.branch_id,
    invoice_no,
    project_id: payload.project_id || null,
    client_id: payload.client_id || null,
    quotation_id: payload.quotation_id || null,
    amount: subtotal,
    gst_amount: gst,
    tds_amount: tds,
    items,
    subtotal,
    notes: payload.notes || null,
    invoice_date: payload.invoice_date || new Date().toISOString().slice(0, 10),
    due_date: payload.due_date || null,
    status: "unpaid",
    created_by: user.id,
  }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function saveBankReconciliation(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("bank_reconciliations").insert({
    branch_id: user.branch_id,
    account_id: payload.account_id,
    statement_date: payload.statement_date,
    statement_balance: payload.statement_balance,
    erp_balance: payload.erp_balance,
    notes: payload.notes || null,
    reconciled_by: user.id,
  }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getBankReconciliations(accountId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  let q = supabase.from("bank_reconciliations").select("*").order("statement_date", { ascending: false });
  if (accountId) q = q.eq("account_id", accountId);
  if (!isSuperAdmin(user.roles) && user.branch_id) q = q.eq("branch_id", user.branch_id);
  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}
