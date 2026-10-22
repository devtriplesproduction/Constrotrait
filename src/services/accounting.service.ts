import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserWithRoles } from "./auth.service";
import { canManageAccountingTransactions, canViewAccounting, isSuperAdmin } from "@/config/roles";

export async function getAccountingDashboard(branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();
  const effectiveBranch = isSuperAdmin(user.roles) && branchId ? branchId : user.branch_id;

  if (!effectiveBranch && !isSuperAdmin(user.roles)) {
    return { success: false, error: "Branch required" };
  }

  // Cash / bank balances
  let accountsQuery = supabase.from("financial_accounts").select("*").eq("is_active", true);
  if (effectiveBranch) accountsQuery = accountsQuery.eq("branch_id", effectiveBranch);
  const { data: accounts } = await accountsQuery;

  // Recent receipts
  let receiptsQuery = supabase.from("inward_receipts").select("*").order("created_at", { ascending: false }).limit(10);
  if (effectiveBranch) receiptsQuery = receiptsQuery.eq("branch_id", effectiveBranch);
  const { data: receipts } = await receiptsQuery;

  // Recent expenses
  let expensesQuery = supabase.from("accounting_expenses").select("*").order("created_at", { ascending: false }).limit(10);
  if (effectiveBranch) expensesQuery = expensesQuery.eq("branch_id", effectiveBranch);
  const { data: expenses } = await expensesQuery;

  // Pending approvals
  let pendingQuery = supabase.from("accounting_expenses").select("*").eq("approval_status", "pending");
  if (effectiveBranch) pendingQuery = pendingQuery.eq("branch_id", effectiveBranch);
  const { data: pending } = await pendingQuery;

  // Unpaid / partial invoices
  let invoicesQuery = supabase.from("invoices").select("*").in("status", ["unpaid", "partial"]);
  if (effectiveBranch) invoicesQuery = invoicesQuery.eq("branch_id", effectiveBranch);
  const { data: invoices } = await invoicesQuery;

  return {
    success: true,
    data: {
      accounts: accounts || [],
      recentReceipts: receipts || [],
      recentExpenses: expenses || [],
      pendingApprovals: pending || [],
      openInvoices: invoices || [],
    },
  };
}

export async function createInwardReceipt(payload: {
  amount: number;
  project_id?: string;
  client_id?: string;
  payment_mode: string;
  account_id?: string;
  receipt_date?: string;
  remarks?: string;
  gst_amount?: number;
  tds_amount?: number;
}) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();
  const { data: receiptNo } = await supabase.rpc("next_receipt_no", { p_branch_id: user.branch_id });

  const { data, error } = await supabase.from("inward_receipts").insert({
    branch_id: user.branch_id,
    receipt_no: receiptNo,
    ...payload,
    created_by: user.id,
  }).select().single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function createExpense(payload: {
  amount: number;
  category_id?: string;
  project_id?: string;
  description?: string;
  expense_date?: string;
  payment_mode?: string;
  account_id?: string;
  vendor_name?: string;
  bill_number?: string;
  bill_attached?: boolean;
  gst_amount?: number;
  tds_amount?: number;
  is_reimbursement?: boolean;
  employee_id?: string;
}) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }

  // Approval rule: > ₹1000 or travel under ₹500 without bill
  let requires_approval = payload.amount > 1000;
  if (payload.is_reimbursement && payload.amount < 500 && !payload.bill_attached) {
    requires_approval = false; // travel under 500 no bill exception
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("accounting_expenses").insert({
    branch_id: user.branch_id,
    ...payload,
    requires_approval,
    approval_status: requires_approval ? "pending" : "approved",
    created_by: user.id,
  }).select().single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function createInvoice(payload: {
  amount: number;
  project_id?: string;
  client_id?: string;
  quotation_id?: string;
  gst_amount?: number;
  tds_amount?: number;
  invoice_date?: string;
  due_date?: string;
  remarks?: string;
}) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();
  // Simple invoice number (can be improved with sequence)
  const invoice_no = `INV/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;

  const { data, error } = await supabase.from("invoices").insert({
    branch_id: user.branch_id,
    invoice_no,
    ...payload,
    created_by: user.id,
  }).select().single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function recordInvoicePayment(invoiceId: string, amount: number, accountId?: string, remarks?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("invoice_payments").insert({
    invoice_id: invoiceId,
    amount,
    account_id: accountId,
    remarks,
    created_by: user.id,
  }).select().single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function searchQuotationsAndInvoices(query: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();
  const branchFilter = isSuperAdmin(user.roles) ? {} : { branch_id: user.branch_id };

  const { data: quotations } = await supabase
    .from("quotations")
    .select("*")
    .match(branchFilter)
    .or(`quotation_no.ilike.%${query}%,remarks.ilike.%${query}%`);

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .match(branchFilter)
    .or(`invoice_no.ilike.%${query}%,remarks.ilike.%${query}%`);

  return { success: true, data: { quotations: quotations || [], invoices: invoices || [] } };
}

export async function getProjects() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };

  const supabase = await createClient();
  let q = supabase.from("accounting_projects").select("*").order("created_at", { ascending: false });
  if (!isSuperAdmin(user.roles)) q = q.eq("branch_id", user.branch_id);
  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getAccounts() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };

  const supabase = await createClient();
  let q = supabase.from("financial_accounts").select("*").eq("is_active", true);
  if (!isSuperAdmin(user.roles)) q = q.eq("branch_id", user.branch_id);
  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getCategories() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };

  const supabase = await createClient();
  let q = supabase.from("expense_categories").select("*");
  if (!isSuperAdmin(user.roles)) q = q.eq("branch_id", user.branch_id);
  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}
