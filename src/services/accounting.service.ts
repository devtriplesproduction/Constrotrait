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
  if (effectiveBranch) {
    accountsQuery = accountsQuery.or(`branch_id.eq.${effectiveBranch},branch_id.is.null`);
  }
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

  let receiptsQuery = supabase
    .from("inward_receipts")
    .select(`
      *,
      clients ( id, name, email, mobile, address, gst_no, contact_person ),
      financial_accounts ( id, name, account_type, bank_name ),
      accounting_projects ( id, name ),
      invoice_payments (
        id,
        amount,
        payment_date,
        payment_mode,
        remarks,
        invoice_id,
        invoices (
          id,
          invoice_no,
          invoice_type,
          total_amount,
          balance_amount,
          job_entries ( id, uid, uid_label, project_name )
        )
      )
    `)
    .order("created_at", { ascending: false });
  if (effectiveBranch) {
    receiptsQuery = receiptsQuery.or(`branch_id.eq.${effectiveBranch},branch_id.is.null`);
  }
  const { data: receipts } = await receiptsQuery;

  let expensesQuery = supabase
    .from("accounting_expenses")
    .select(`
      *,
      expense_categories ( id, name, scope ),
      financial_accounts ( id, name, account_type, bank_name ),
      accounting_projects ( id, name ),
      job_entries ( id, uid, uid_label, inward_on, project_name, clients ( id, name ) )
    `)
    .order("created_at", { ascending: false })
    .limit(50);
  if (effectiveBranch) expensesQuery = expensesQuery.eq("branch_id", effectiveBranch);
  const { data: expenses } = await expensesQuery;

  let pendingQuery = supabase
    .from("accounting_expenses")
    .select(`
      *,
      expense_categories ( id, name, scope ),
      financial_accounts ( id, name, account_type, bank_name ),
      accounting_projects ( id, name ),
      job_entries ( id, uid, uid_label, inward_on, project_name, clients ( id, name ) )
    `)
    .eq("approval_status", "pending");
  if (effectiveBranch) pendingQuery = pendingQuery.eq("branch_id", effectiveBranch);
  const { data: pending } = await pendingQuery;

  let invoicesQuery = supabase
    .from("invoices")
    .select(`
      *,
      clients ( id, name, email, mobile, address, gst_no, contact_person ),
      job_entries ( id, uid, uid_label, inward_on, project_name ),
      invoice_payments (
        id,
        amount,
        payment_date,
        payment_mode,
        account_id,
        receipt_id,
        remarks,
        created_at,
        inward_receipts ( id, receipt_no, receipt_date, amount, payment_mode, remarks )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(50);
  if (effectiveBranch) invoicesQuery = invoicesQuery.eq("branch_id", effectiveBranch);
  const { data: invoices } = await invoicesQuery;

  let quotationsQuery = supabase.from("quotations").select(`
    *,
    clients ( id, name, email, mobile, address, gst_no, contact_person ),
    accounting_projects ( id, name )
  `).order("created_at", { ascending: false }).limit(50);
  if (effectiveBranch) quotationsQuery = quotationsQuery.eq("branch_id", effectiveBranch);
  const { data: quotations } = await quotationsQuery;

  let templatesQuery = supabase.from("quotation_templates").select("*").order("is_default", { ascending: false }).order("created_at", { ascending: false });
  if (effectiveBranch) {
    templatesQuery = templatesQuery.or(`branch_id.eq.${effectiveBranch},branch_id.is.null`);
  }
  const { data: templates } = await templatesQuery;

  let inwardsQuery = supabase
    .from("job_entries")
    .select(`
      id,
      uid,
      uid_label,
      inward_on,
      created_at,
      project_name,
      division,
      letter_reference,
      branch_id,
      branches ( id, name, code ),
      clients ( id, name, email, mobile, address, gst_no, contact_person, site_name ),
      job_entry_tests!job_entry_tests_job_entry_id_fkey (
        id,
        test_master_id,
        material_description,
        sample_quantity,
        date_of_receiving,
        test_master ( id, component_parameter, specific_test, discipline_group, material_product, unit )
      ),
      invoices (
        id,
        invoice_no,
        invoice_type,
        status,
        total_amount,
        paid_amount,
        balance_amount,
        invoice_date,
        due_date,
        items,
        created_at,
        previous_invoice_id,
        previous_balance_amount,
        notes
      ),
      accounting_expenses (
        id,
        amount,
        approval_status,
        description,
        expense_date,
        expense_type,
        vendor_name,
        category_id,
        job_entry_test_id
      )
    `)
    .order("created_at", { ascending: false })
    .limit(50);
  if (effectiveBranch) inwardsQuery = inwardsQuery.eq("branch_id", effectiveBranch);
  const { data: inwards } = await inwardsQuery;

  let categoriesQuery = supabase.from("expense_categories").select("*").order("name");
  if (effectiveBranch) {
    categoriesQuery = categoriesQuery.or(`branch_id.eq.${effectiveBranch},branch_id.is.null`);
  }
  const { data: categories } = await categoriesQuery;

  let clientsQuery = supabase.from("clients").select("id, name, email, mobile, address, gst_no, contact_person").order("name");
  if (effectiveBranch) clientsQuery = clientsQuery.eq("branch_id", effectiveBranch);
  const { data: clients } = await clientsQuery;

  return {
    success: true,
    data: {
      accounts: accounts || [],
      projectBalances,
      projects: projects || [],
      receipts: receipts || [],
      recentReceipts: receipts || [],
      expenses: expenses || [],
      recentExpenses: expenses || [],
      pendingApprovals: pending || [],
      openInvoices: (invoices || []).filter((i: any) => ["unpaid", "partial"].includes(i.status)),
      invoices: invoices || [],
      quotations: quotations || [],
      recentInwards: inwards || [],
      clients: clients || [],
      templates: templates || [],
      categories: categories || [],
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

  const resolvedExpenseType = payload.expense_type || (payload.inward_id ? "inward" : "company");
  const isCompany = (resolvedExpenseType === "company" || resolvedExpenseType === "inhouse") && !payload.inward_id && !payload.project_id;

  const supabase = await createClient();
  const insertPayload = {
    branch_id: user.branch_id,
    ...payload,
    expense_type: resolvedExpenseType,
    is_general_expense: isCompany,
    requires_approval,
    approval_status: requires_approval ? "pending" : "approved",
    created_by: user.id
  };

  const { data, error } = await supabase
    .from("accounting_expenses")
    .insert(insertPayload)
    .select(`
      *,
      expense_categories ( id, name, scope ),
      financial_accounts ( id, name, account_type, bank_name ),
      accounting_projects ( id, name ),
      job_entries ( id, uid, uid_label, inward_on, project_name, clients ( id, name ) ),
      job_entry_tests ( id, material_description, test_master ( id, specific_test, component_parameter, material_product ) )
    `)
    .single();

  if (error) return { success: false, error: error.message };

  // If approved immediately and account_id is present, deduct from financial account
  if (!requires_approval && payload.account_id && Number(payload.amount) > 0) {
    const { data: acc } = await supabase.from("financial_accounts").select("current_balance").eq("id", payload.account_id).single();
    if (acc) {
      await supabase.from("financial_accounts").update({
        current_balance: Number(acc.current_balance || 0) - Number(payload.amount),
      }).eq("id", payload.account_id);
    }
  }

  await supabase.from("accounting_audit_log").insert({
    branch_id: user.branch_id,
    table_name: "accounting_expenses",
    record_id: data.id,
    action: "create",
    new_data: data,
    performed_by: user.id
  });

  return { success: true, data };
}

export async function approveExpense(expenseId: string, approve: boolean, remarks?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canApproveAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const { data: old } = await supabase.from("accounting_expenses").select("*").eq("id", expenseId).single();
  const { data, error } = await supabase
    .from("accounting_expenses")
    .update({
      approval_status: approve ? "approved" : "rejected",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      approval_remarks: remarks || null
    } as any)
    .eq("id", expenseId)
    .select(`
      *,
      expense_categories ( id, name, scope ),
      financial_accounts ( id, name, account_type, bank_name ),
      accounting_projects ( id, name ),
      job_entries ( id, uid, uid_label, inward_on, project_name, clients ( id, name ) ),
      job_entry_tests ( id, material_description, test_master ( id, specific_test, component_parameter, material_product ) )
    `)
    .single();

  if (error) return { success: false, error: error.message };

  // If newly approved, debit financial account
  if (approve && old && old.approval_status !== "approved" && old.account_id && Number(old.amount) > 0) {
    const { data: acc } = await supabase.from("financial_accounts").select("current_balance").eq("id", old.account_id).single();
    if (acc) {
      await supabase.from("financial_accounts").update({
        current_balance: Number(acc.current_balance || 0) - Number(old.amount),
      }).eq("id", old.account_id);
    }
  }

  await supabase.from("accounting_audit_log").insert({
    branch_id: user.branch_id,
    table_name: "accounting_expenses",
    record_id: expenseId,
    action: approve ? "approve" : "reject",
    old_data: old,
    new_data: data,
    performed_by: user.id
  });

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

export async function updateBankAccount(id: string, payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  let query = supabase.from("financial_accounts").update({
    name: payload.name,
    account_type: payload.account_type,
    bank_name: payload.account_type === "cash" ? null : payload.bank_name,
    account_number: payload.account_type === "cash" ? null : payload.account_number,
    ifsc: payload.account_type === "cash" ? null : payload.ifsc,
    ...(payload.opening_balance !== undefined ? { opening_balance: payload.opening_balance } : {}),
  }).eq("id", id);
  if (!isSuperAdmin(user.roles) && user.branch_id) {
    query = query.eq("branch_id", user.branch_id);
  }
  const { data, error } = await query.select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function deleteBankAccount(id: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  let query = supabase.from("financial_accounts").update({ is_active: false }).eq("id", id);
  if (!isSuperAdmin(user.roles) && user.branch_id) {
    query = query.eq("branch_id", user.branch_id);
  }
  const { error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true };
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

export async function recordInvoicePayment(invoiceId: string, payloadOrAmount: any, accountId?: string, remarks?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();

  const isObj = typeof payloadOrAmount === "object" && payloadOrAmount !== null;
  const amount = Number(isObj ? payloadOrAmount.amount : payloadOrAmount);
  const paymentDate = isObj && payloadOrAmount.payment_date ? payloadOrAmount.payment_date : new Date().toISOString().slice(0, 10);
  const paymentMode = isObj && payloadOrAmount.payment_mode ? payloadOrAmount.payment_mode : "bank";
  const accId = isObj ? payloadOrAmount.account_id || accountId : accountId;
  const pRemarks = isObj ? payloadOrAmount.remarks || remarks : remarks;

  if (isNaN(amount) || amount <= 0) {
    return { success: false, error: "Payment amount must be greater than 0" };
  }

  // 1. Fetch current invoice details to get client, branch, project, and inward metadata
  const { data: currentInvoice, error: invErr } = await supabase
    .from("invoices")
    .select(`
      id,
      invoice_no,
      branch_id,
      client_id,
      project_id,
      inward_id,
      total_amount,
      paid_amount,
      balance_amount,
      clients ( id, name, email, mobile, address, gst_no, contact_person ),
      job_entries ( id, uid, uid_label, project_name )
    `)
    .eq("id", invoiceId)
    .single();

  if (invErr || !currentInvoice) {
    return { success: false, error: "Invoice not found" };
  }

  const effectiveBranchId = user.branch_id || currentInvoice.branch_id;

  // 2. Generate Next Serial Receipt Number (REC/YYYY-YY/XXXX)
  let receiptNo: string | null = null;
  try {
    const { data: rpcNo } = await supabase.rpc("next_receipt_no", { p_branch_id: effectiveBranchId || null });
    receiptNo = rpcNo;
  } catch (e) {
    console.error("Error generating receipt_no:", e);
  }
  if (!receiptNo) {
    receiptNo = `REC/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;
  }

  // 3. Create Inward Receipt (Official Money Receipt)
  const clientName = currentInvoice.clients?.name || "Customer";
  const { data: receipt, error: receiptErr } = await supabase
    .from("inward_receipts")
    .insert({
      branch_id: effectiveBranchId || null,
      receipt_no: receiptNo,
      project_id: currentInvoice.project_id || null,
      client_id: currentInvoice.client_id || null,
      party_type: "client",
      party_name: clientName,
      amount,
      payment_mode: paymentMode,
      account_id: accId || null,
      receipt_date: paymentDate,
      remarks: pRemarks || `Payment received against Invoice ${currentInvoice.invoice_no}`,
      status: "received",
      created_by: user.id,
    })
    .select()
    .single();

  if (receiptErr) {
    console.error("Error inserting inward receipt:", receiptErr);
    return { success: false, error: `Failed to create payment receipt: ${receiptErr.message}` };
  }

  // 4. Log to Audit Log for Receipt
  if (receipt?.id) {
    await supabase.from("accounting_audit_log").insert({
      branch_id: effectiveBranchId || null,
      table_name: "inward_receipts",
      record_id: receipt.id,
      action: "create",
      new_data: receipt,
      performed_by: user.id,
    });
  }

  // 5. Insert Payment record linked to both invoice and generated receipt
  const { data: payment, error: pmtErr } = await supabase
    .from("invoice_payments")
    .insert({
      invoice_id: invoiceId,
      amount,
      payment_date: paymentDate,
      payment_mode: paymentMode,
      account_id: accId || null,
      receipt_id: receipt.id,
      remarks: pRemarks || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (pmtErr) {
    return { success: false, error: pmtErr.message };
  }

  // 6. Update financial account current balance
  if (accId) {
    const { data: acc } = await supabase.from("financial_accounts").select("current_balance").eq("id", accId).single();
    if (acc) {
      await supabase.from("financial_accounts").update({
        current_balance: Number(acc.current_balance || 0) + amount,
      }).eq("id", accId);
    }
  }

  // 7. Fetch updated invoice with full payment and receipt embedding
  const { data: updatedInvoice } = await supabase
    .from("invoices")
    .select(`
      *,
      clients ( id, name, email, mobile, address, gst_no, contact_person ),
      job_entries ( id, uid, uid_label, inward_on, project_name ),
      invoice_payments (
        id,
        amount,
        payment_date,
        payment_mode,
        account_id,
        receipt_id,
        remarks,
        created_at,
        inward_receipts ( id, receipt_no, receipt_date, amount, payment_mode, remarks )
      )
    `)
    .eq("id", invoiceId)
    .single();

  const newPaidTotal = Number(updatedInvoice?.paid_amount || (Number(currentInvoice.paid_amount || 0) + amount));
  const newBalanceTotal = Math.max(0, Number(updatedInvoice?.balance_amount || (Number(currentInvoice.total_amount || 0) - newPaidTotal)));

  return {
    success: true,
    data: {
      payment,
      invoice: updatedInvoice,
      receipt: {
        ...receipt,
        invoice_no: currentInvoice.invoice_no,
        inward_uid: currentInvoice.job_entries?.uid_label || currentInvoice.job_entries?.uid,
        project_name: currentInvoice.job_entries?.project_name,
        client_name: currentInvoice.clients?.name,
        client_address: currentInvoice.clients?.address,
        client_gst: currentInvoice.clients?.gst_no,
        client_contact: currentInvoice.clients?.contact_person,
        total_invoice_amount: currentInvoice.total_amount,
        previously_paid: currentInvoice.paid_amount || 0,
        current_payment: amount,
        remaining_balance: newBalanceTotal,
      },
    },
  };
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

export async function getComprehensiveFinancialReports(fromDate?: string, toDate?: string, branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const effectiveBranch = branchScope(user, branchId);

  // 1. Inward Receipts
  let receiptsQ = supabase
    .from("inward_receipts")
    .select(`
      *,
      clients ( id, name, gst_no ),
      financial_accounts ( id, name, account_type )
    `)
    .neq("status", "cancelled");
  if (effectiveBranch) receiptsQ = receiptsQ.or(`branch_id.eq.${effectiveBranch},branch_id.is.null`);
  if (fromDate) receiptsQ = receiptsQ.gte("receipt_date", fromDate);
  if (toDate) receiptsQ = receiptsQ.lte("receipt_date", toDate);
  const { data: receipts } = await receiptsQ;

  // 2. Invoices & Payments (Revenue & GST & Aging)
  let invoicesQ = supabase
    .from("invoices")
    .select(`
      *,
      clients ( id, name, mobile, contact_person, gst_no ),
      invoice_payments ( id, amount, payment_date, payment_mode, account_id )
    `);
  if (effectiveBranch) invoicesQ = invoicesQ.eq("branch_id", effectiveBranch);
  const { data: allInvoices } = await invoicesQ;

  // 3. Expenses
  let expensesQ = supabase
    .from("accounting_expenses")
    .select(`
      *,
      expense_categories ( id, name, scope ),
      financial_accounts ( id, name, account_type )
    `)
    .eq("status", "recorded")
    .eq("approval_status", "approved");
  if (effectiveBranch) expensesQ = expensesQ.eq("branch_id", effectiveBranch);
  if (fromDate) expensesQ = expensesQ.gte("expense_date", fromDate);
  if (toDate) expensesQ = expensesQ.lte("expense_date", toDate);
  const { data: expenses } = await expensesQ;

  // 4. Financial Accounts (Liquid Assets)
  let accountsQ = supabase.from("financial_accounts").select("*").eq("is_active", true);
  if (effectiveBranch) accountsQ = accountsQ.or(`branch_id.eq.${effectiveBranch},branch_id.is.null`);
  const { data: accounts } = await accountsQ;

  // --- A. PROFIT & LOSS CALCULATIONS ---
  const totalIncome = (receipts || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  const inwardRevenue = (receipts || []).filter(r => !!(r as any).inward_id).reduce((s, r) => s + Number(r.amount || 0), 0);
  const directClientIncome = totalIncome - inwardRevenue;

  const directInwardExpenses = (expenses || []).filter(e => e.expense_type === "inward").reduce((s, e) => s + Number(e.amount || 0), 0);
  const inhouseLabExpenses = (expenses || []).filter(e => e.expense_type === "inhouse").reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalDirectCosts = directInwardExpenses + inhouseLabExpenses;
  const grossProfit = totalIncome - totalDirectCosts;
  const grossMargin = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

  const companyOverheads = (expenses || []).filter(e => e.expense_type === "company" || (!e.expense_type && !e.inward_id)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalExpenses = totalDirectCosts + companyOverheads;
  const netProfit = totalIncome - totalExpenses;
  const netMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  // Category breakdown for expenses
  const categoryMap: Record<string, { name: string; type: string; amount: number; count: number }> = {};
  (expenses || []).forEach(e => {
    const catName = e.expense_categories?.name || (e.expense_type === 'inward' ? 'Inward Direct Cost' : e.expense_type === 'inhouse' ? 'In-House Lab Operations' : 'General Overhead');
    if (!categoryMap[catName]) {
      categoryMap[catName] = { name: catName, type: e.expense_type || 'company', amount: 0, count: 0 };
    }
    categoryMap[catName].amount += Number(e.amount || 0);
    categoryMap[catName].count += 1;
  });
  const expenseCategories = Object.values(categoryMap).sort((a, b) => b.amount - a.amount);

  // --- B. BALANCE SHEET / LIQUIDITY SUMMARY ---
  const bankAccountsBalance = (accounts || []).filter(a => a.account_type === 'bank').reduce((s, a) => s + Number(a.current_balance || 0), 0);
  const cashAccountsBalance = (accounts || []).filter(a => a.account_type === 'cash').reduce((s, a) => s + Number(a.current_balance || 0), 0);
  const totalLiquidCashBank = bankAccountsBalance + cashAccountsBalance;

  const tradeReceivables = (allInvoices || [])
    .filter(i => (i.status === 'unpaid' || i.status === 'partial') && Number(i.balance_amount || 0) > 0)
    .reduce((s, i) => s + Number(i.balance_amount || 0), 0);

  const totalCurrentAssets = totalLiquidCashBank + tradeReceivables;

  const { data: pendingExpenses } = await supabase
    .from("accounting_expenses")
    .select("amount")
    .eq("status", "recorded")
    .eq("approval_status", "pending");
  const pendingLiabilities = (pendingExpenses || []).reduce((s, e) => s + Number(e.amount || 0), 0);
  const netWorkingCapital = totalCurrentAssets - pendingLiabilities;

  // --- C. DEBTORS / CLIENT AGING ANALYSIS ---
  const today = new Date();
  const agingBuckets = {
    current: 0,      // 0-30 days
    days31to60: 0,   // 31-60 days
    days61to90: 0,   // 61-90 days
    days90Plus: 0,   // 90+ days
  };

  const clientAgingMap: Record<string, {
    clientId: string;
    clientName: string;
    mobile: string;
    contactPerson: string;
    invoiceCount: number;
    totalDue: number;
    oldestDate: string;
    current: number;
    days31to60: number;
    days61to90: number;
    days90Plus: number;
  }> = {};

  (allInvoices || [])
    .filter(i => (i.status === 'unpaid' || i.status === 'partial') && Number(i.balance_amount || 0) > 0)
    .forEach(inv => {
      const balance = Number(inv.balance_amount || 0);
      const invDateStr = inv.invoice_date || inv.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10);
      const invDate = new Date(invDateStr);
      const diffTime = Math.abs(today.getTime() - invDate.getTime());
      const ageDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let bucket: "current" | "days31to60" | "days61to90" | "days90Plus" = "current";
      if (ageDays <= 30) {
        agingBuckets.current += balance;
        bucket = "current";
      } else if (ageDays <= 60) {
        agingBuckets.days31to60 += balance;
        bucket = "days31to60";
      } else if (ageDays <= 90) {
        agingBuckets.days61to90 += balance;
        bucket = "days61to90";
      } else {
        agingBuckets.days90Plus += balance;
        bucket = "days90Plus";
      }

      const cId = inv.client_id || "unspecified";
      const cName = inv.clients?.name || "Unspecified Client";
      if (!clientAgingMap[cId]) {
        clientAgingMap[cId] = {
          clientId: cId,
          clientName: cName,
          mobile: inv.clients?.mobile || "",
          contactPerson: inv.clients?.contact_person || "",
          invoiceCount: 0,
          totalDue: 0,
          oldestDate: invDateStr,
          current: 0,
          days31to60: 0,
          days61to90: 0,
          days90Plus: 0,
        };
      }

      const row = clientAgingMap[cId];
      row.invoiceCount += 1;
      row.totalDue += balance;
      row[bucket] += balance;
      if (new Date(invDateStr) < new Date(row.oldestDate)) {
        row.oldestDate = invDateStr;
      }
    });

  const clientAgingList = Object.values(clientAgingMap).sort((a, b) => b.totalDue - a.totalDue);

  // --- D. GST TAX SUMMARY ---
  let periodInvoices = allInvoices || [];
  if (fromDate) periodInvoices = periodInvoices.filter(i => (i.invoice_date || i.created_at?.slice(0, 10)) >= fromDate);
  if (toDate) periodInvoices = periodInvoices.filter(i => (i.invoice_date || i.created_at?.slice(0, 10)) <= toDate);

  const totalTaxableTurnover = periodInvoices.reduce((s, i) => s + Number(i.subtotal || i.amount || 0), 0);
  const totalOutputGst = periodInvoices.reduce((s, i) => s + Number(i.gst_amount || 0), 0);
  const totalInputGst = (expenses || []).reduce((s, e) => s + Number(e.gst_amount || 0), 0);
  const netGstPayable = totalOutputGst - totalInputGst;

  const gstInvoiceBreakdown = periodInvoices.map(inv => ({
    id: inv.id,
    invoiceNo: inv.invoice_no,
    invoiceDate: inv.invoice_date || inv.created_at?.slice(0, 10),
    invoiceType: inv.invoice_type || 'tax_invoice',
    clientName: inv.clients?.name || 'Customer',
    clientGst: inv.clients?.gst_no || 'Unregistered',
    taxableAmount: Number(inv.subtotal || inv.amount || 0),
    gstAmount: Number(inv.gst_amount || 0),
    totalAmount: Number(inv.total_amount || 0),
  })).sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());

  return {
    success: true,
    data: {
      dateRange: { fromDate: fromDate || null, toDate: toDate || null },
      pnl: {
        totalIncome,
        inwardRevenue,
        directClientIncome,
        directInwardExpenses,
        inhouseLabExpenses,
        totalDirectCosts,
        grossProfit,
        grossMargin,
        companyOverheads,
        totalExpenses,
        netProfit,
        netMargin,
        expenseCategories,
      },
      balanceSheet: {
        bankAccountsBalance,
        cashAccountsBalance,
        totalLiquidCashBank,
        tradeReceivables,
        totalCurrentAssets,
        pendingLiabilities,
        netWorkingCapital,
        accountsList: (accounts || []).map(a => ({
          id: a.id,
          name: a.name,
          account_type: a.account_type,
          bank_name: a.bank_name,
          current_balance: Number(a.current_balance || 0),
        })),
      },
      aging: {
        totalOutstanding: tradeReceivables,
        agingBuckets,
        clientAgingList,
      },
      gst: {
        totalTaxableTurnover,
        totalOutputGst,
        totalInputGst,
        netGstPayable,
        gstInvoiceBreakdown,
      }
    }
  };
}

export async function getReconciliation(branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const effectiveBranch = branchScope(user, branchId);
  let receiptsQ = supabase.from("inward_receipts").select("*").eq("status", "received").order("receipt_date", { ascending: false });
  const paymentsQ = supabase.from("invoice_payments").select("*, invoices(invoice_no, branch_id)").order("payment_date", { ascending: false });
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
  let q = supabase
    .from("quotations")
    .select(`
      *,
      clients ( id, name, email, mobile, address, gst_no, contact_person ),
      accounting_projects ( id, name )
    `)
    .order("created_at", { ascending: false });
  if (effectiveBranch) q = q.eq("branch_id", effectiveBranch);
  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updateQuotationStatus(
  id: string,
  status: "draft" | "sent" | "accepted" | "approved" | "rejected" | "rework" | "revision_requested" | "superseded",
  options?: { reason?: string; actionType?: string }
) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();

  const updateFields: any = { status };
  if (status === "sent") {
    updateFields.sent_at = new Date().toISOString();
  } else if (status === "approved" || status === "accepted") {
    updateFields.approved_at = new Date().toISOString();
    updateFields.approved_by = user.id;
  } else if (status === "rejected") {
    if (options?.reason) updateFields.rejection_reason = options.reason;
  } else if (status === "rework" || status === "revision_requested") {
    if (options?.reason) updateFields.rework_notes = options.reason;
  }

  const { data, error } = await supabase
    .from("quotations")
    .update(updateFields)
    .eq("id", id)
    .select(`
      *,
      clients ( id, name, email, mobile, address, gst_no, contact_person ),
      accounting_projects ( id, name )
    `)
    .single();

  if (error) return { success: false, error: error.message };

  // Log in quotation_versions for complete audit & revision history
  const actionType = options?.actionType || (
    status === "approved" || status === "accepted" ? "approved" :
    status === "rejected" ? "rejected" :
    status === "rework" || status === "revision_requested" ? "rework" :
    status === "sent" ? "sent" : "status_update"
  );

  await (supabase as any).from("quotation_versions").insert({
    quotation_id: id,
    version_number: data.version_number || 1,
    items: data.items || [],
    subtotal: data.subtotal || data.amount || 0,
    discount_amount: data.discount_amount || 0,
    gst_rate: data.gst_rate || 18,
    gst_amount: data.gst_amount || 0,
    total_amount: data.total_amount || data.amount || 0,
    terms: data.terms || "",
    clauses: data.clauses || [],
    remarks: data.remarks || "",
    status: status,
    action_type: actionType,
    action_reason: options?.reason || `Quotation status changed to ${status.toUpperCase()}`,
    performed_by: user.id,
  });

  await supabase.from("accounting_audit_log").insert({
    branch_id: user.branch_id,
    table_name: "quotations",
    record_id: id,
    action: "status_update",
    new_data: { status, ...options },
    performed_by: user.id
  });

  return { success: true, data };
}

export async function reviseQuotation(quotationId: string, payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();

  const { data: current, error: curErr } = await supabase
    .from("quotations")
    .select("*")
    .eq("id", quotationId)
    .single();

  if (curErr || !current) return { success: false, error: "Quotation not found" };

  const nextVersion = (current.version_number || 1) + 1;
  const items = payload.items || current.items || [];
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.qty || 0) * Number(i.rate || 0), 0);
  const discount = Number(payload.discount_amount !== undefined ? payload.discount_amount : (current.discount_amount || 0));
  const gstRate = Number(payload.gst_rate !== undefined ? payload.gst_rate : (current.gst_rate || 18));
  const taxable = Math.max(0, subtotal - discount);
  const gst = (taxable * gstRate) / 100;
  const total = taxable + gst;

  const { data, error } = await supabase
    .from("quotations")
    .update({
      version_number: nextVersion,
      client_id: payload.client_id !== undefined ? payload.client_id : current.client_id,
      project_id: payload.project_id !== undefined ? payload.project_id : current.project_id,
      items,
      subtotal,
      discount_amount: discount,
      gst_rate: gstRate,
      gst_amount: gst,
      total_amount: total,
      amount: total,
      valid_until: payload.valid_until || current.valid_until,
      clauses: payload.clauses || current.clauses || [],
      terms: payload.terms || current.terms,
      remarks: payload.remarks || current.remarks,
      rework_notes: payload.rework_notes || null,
      status: payload.status || "draft",
    })
    .eq("id", quotationId)
    .select(`
      *,
      clients ( id, name, email, mobile, address, gst_no, contact_person ),
      accounting_projects ( id, name )
    `)
    .single();

  if (error) return { success: false, error: error.message };

  await (supabase as any).from("quotation_versions").insert({
    quotation_id: quotationId,
    version_number: nextVersion,
    items,
    subtotal,
    discount_amount: discount,
    gst_rate: gstRate,
    gst_amount: gst,
    total_amount: total,
    terms: data.terms,
    clauses: data.clauses,
    remarks: data.remarks,
    status: data.status,
    action_type: "revised",
    action_reason: payload.revision_reason || `Revised to Version ${nextVersion}`,
    performed_by: user.id,
  });

  return { success: true, data };
}

export async function getQuotationVersions(quotationId: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("quotation_versions")
    .select(`
      *,
      performer:profiles ( id, first_name, last_name, email, roles )
    `)
    .eq("quotation_id", quotationId)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function convertQuotationToProforma(quotationId: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const { data: qtn, error: qErr } = await supabase
    .from("quotations")
    .select(`
      *,
      clients ( id, name, email, mobile, address, gst_no, contact_person )
    `)
    .eq("id", quotationId)
    .single();

  if (qErr || !qtn) return { success: false, error: "Quotation not found" };

  const subtotal = Number(qtn.subtotal || qtn.amount || 0);
  const gstAmount = Number(qtn.gst_amount || 0);
  const invoice_no = `PI/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      branch_id: user.branch_id || qtn.branch_id,
      invoice_no,
      invoice_type: "proforma",
      client_id: qtn.client_id || null,
      project_id: qtn.project_id || null,
      quotation_id: quotationId,
      amount: subtotal,
      gst_amount: gstAmount,
      tds_amount: 0,
      items: qtn.items || [],
      subtotal,
      notes: (qtn.remarks ? qtn.remarks + " | " : "") + `Generated from Quotation ${qtn.quotation_no}`,
      clauses: qtn.clauses || [],
      remarks: qtn.remarks || null,
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: qtn.valid_until || null,
      status: "unpaid",
      created_by: user.id,
    })
    .select(`
      *,
      clients ( id, name, email, mobile, address, gst_no, contact_person )
    `)
    .single();

  if (invErr) return { success: false, error: invErr.message };

  // Auto-mark quotation as accepted
  await supabase
    .from("quotations")
    .update({ status: "accepted" })
    .eq("id", quotationId);

  await supabase.from("accounting_audit_log").insert({
    branch_id: user.branch_id,
    table_name: "invoices",
    record_id: invoice.id,
    action: "create_from_quotation",
    new_data: { quotation_id: quotationId, invoice_no },
    performed_by: user.id
  });

  return { success: true, data: invoice };
}

export async function getInvoices(branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const effectiveBranch = branchScope(user, branchId);
  let q = supabase
    .from("invoices")
    .select(`
      *,
      clients ( id, name, email, mobile, address, gst_no, contact_person ),
      job_entries ( id, uid, uid_label, inward_on, project_name ),
      invoice_payments (
        id,
        amount,
        payment_date,
        payment_mode,
        account_id,
        receipt_id,
        remarks,
        created_at,
        inward_receipts ( id, receipt_no, receipt_date, amount, payment_mode, remarks )
      )
    `)
    .order("created_at", { ascending: false });
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
    terms: payload.terms || (payload.clauses && payload.clauses.length > 0 ? payload.clauses.map((c: any) => `${c.title || ''}:\n${c.content || ''}`).join('\n\n') : null),
    clauses: payload.clauses || [],
    remarks: payload.remarks || null,
    status: "draft",
    version_number: 1,
    created_by: user.id,
  }).select().single();
  if (error) return { success: false, error: error.message };

  await (supabase as any).from("quotation_versions").insert({
    quotation_id: data.id,
    version_number: 1,
    items,
    subtotal,
    discount_amount: discount,
    gst_rate: gstRate,
    gst_amount: gst,
    total_amount: total,
    terms: data.terms || "",
    clauses: data.clauses || [],
    remarks: data.remarks || "",
    status: "draft",
    action_type: "created",
    action_reason: "Initial quotation drafted",
    performed_by: user.id,
  });

  return { success: true, data };
}

export async function createInvoiceWithItems(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const items = payload.items || [];
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.qty || 0) * Number(i.rate || 0), 0);
  const gst = Number(payload.gst_amount !== undefined ? payload.gst_amount : (subtotal * 0.18));
  const tds = Number(payload.tds_amount || 0);
  const isProforma = payload.invoice_type === "proforma";
  const prefix = isProforma ? "PI" : "INV";
  const invoice_no = payload.invoice_no || `${prefix}/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;
  const { data, error } = await supabase.from("invoices").insert({
    branch_id: user.branch_id,
    invoice_no,
    invoice_type: isProforma ? "proforma" : "tax_invoice",
    inward_id: payload.inward_id || null,
    previous_invoice_id: payload.previous_invoice_id || null,
    previous_balance_amount: Number(payload.previous_balance_amount || 0),
    project_id: payload.project_id || null,
    client_id: payload.client_id || null,
    quotation_id: payload.quotation_id || null,
    amount: subtotal,
    gst_amount: gst,
    tds_amount: tds,
    items,
    subtotal,
    notes: payload.notes || null,
    clauses: payload.clauses || [],
    remarks: payload.remarks || null,
    invoice_date: payload.invoice_date || new Date().toISOString().slice(0, 10),
    due_date: payload.due_date || null,
    status: "unpaid",
    created_by: user.id,
  }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getInwardsForAccounting(branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const effectiveBranch = branchScope(user, branchId);

  let query = supabase
    .from("job_entries")
    .select(`
      id,
      uid,
      uid_label,
      inward_on,
      created_at,
      project_name,
      division,
      letter_reference,
      branch_id,
      branches ( id, name, code ),
      clients ( id, name, email, mobile, address, gst_no, contact_person, site_name ),
      job_entry_tests!job_entry_tests_job_entry_id_fkey (
        id,
        test_master_id,
        material_description,
        sample_quantity,
        date_of_receiving,
        test_master ( id, component_parameter, specific_test, discipline_group, material_product, unit )
      ),
      invoices (
        id,
        invoice_no,
        invoice_type,
        status,
        total_amount,
        paid_amount,
        balance_amount,
        invoice_date,
        due_date,
        items,
        created_at,
        previous_invoice_id,
        previous_balance_amount,
        notes
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (effectiveBranch) query = query.eq("branch_id", effectiveBranch);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: data || [] };
}

export async function getClientPreviousInvoice(clientId: string, excludeInvoiceId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();

  let query = supabase
    .from("invoices")
    .select(`
      *,
      clients ( id, name ),
      invoice_payments ( id, amount, payment_date, payment_mode, remarks, created_at )
    `)
    .eq("client_id", clientId)
    .order("invoice_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (excludeInvoiceId) {
    query = query.neq("id", excludeInvoiceId);
  }

  const { data: invoices, error } = await query;
  if (error) return { success: false, error: error.message };

  const previousInvoice = (invoices && invoices.length > 0) ? invoices[0] : null;
  const allPreviousOutstanding = (invoices || []).reduce((acc: number, inv: any) => {
    return acc + Number(inv.balance_amount || 0);
  }, 0);

  return {
    success: true,
    data: {
      previousInvoice,
      allPreviousInvoices: invoices || [],
      totalOutstanding: allPreviousOutstanding,
    },
  };
}

export async function convertProformaToTaxInvoice(proformaId: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();

  const { data: proforma, error: fetchErr } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", proformaId)
    .single();

  if (fetchErr || !proforma) return { success: false, error: "Proforma invoice not found" };

  const taxInvoiceNo = `INV/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;
  const { data, error } = await supabase
    .from("invoices")
    .update({
      invoice_type: "tax_invoice",
      invoice_no: taxInvoiceNo,
      notes: (proforma.notes ? proforma.notes + " | " : "") + `Converted from Proforma ${proforma.invoice_no}`,
    })
    .eq("id", proformaId)
    .select(`
      *,
      clients ( id, name, email, mobile, address, gst_no, contact_person ),
      job_entries ( id, uid, uid_label, inward_on, project_name ),
      invoice_payments ( id, amount, payment_date, payment_mode, account_id, remarks, created_at )
    `)
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getInvoiceWithDetails(invoiceId: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(`
      *,
      clients ( id, name, email, mobile, address, gst_no, contact_person ),
      job_entries ( id, uid, uid_label, inward_on, project_name, division ),
      invoice_payments (
        id,
        amount,
        payment_date,
        payment_mode,
        account_id,
        receipt_id,
        remarks,
        created_at,
        inward_receipts ( id, receipt_no, receipt_date, amount, payment_mode, remarks )
      )
    `)
    .eq("id", invoiceId)
    .single();

  if (error) return { success: false, error: error.message };

  let previousInvoice = null;
  if (invoice?.previous_invoice_id) {
    const { data: pInv } = await supabase
      .from("invoices")
      .select("*, invoice_payments(*)")
      .eq("id", invoice.previous_invoice_id)
      .maybeSingle();
    previousInvoice = pInv;
  } else if (invoice?.client_id) {
    const prevRes = await getClientPreviousInvoice(invoice.client_id, invoice.id);
    if (prevRes.success && prevRes.data) {
      previousInvoice = prevRes.data.previousInvoice;
    }
  }

  // Check if a child invoice was generated for this invoice's remaining balance
  let childInvoice = null;
  const { data: cInv } = await supabase
    .from("invoices")
    .select("id, invoice_no, total_amount, balance_amount, paid_amount, status, created_at, notes, items")
    .eq("previous_invoice_id", invoiceId)
    .maybeSingle();

  if (cInv) {
    childInvoice = cInv;
  } else if (invoice?.inward_id) {
    // Fallback: check if an invoice for the same inward has notes/items referencing this invoice_no
    const { data: related } = await supabase
      .from("invoices")
      .select("id, invoice_no, total_amount, balance_amount, paid_amount, status, created_at, notes, items")
      .eq("inward_id", invoice.inward_id)
      .neq("id", invoiceId)
      .order("created_at", { ascending: false });

    if (related && related.length > 0) {
      const match = related.find((r: any) =>
        r.notes?.includes(invoice.invoice_no) ||
        (Array.isArray(r.items) && r.items.some((it: any) => it.description?.includes(invoice.invoice_no)))
      );
      if (match) childInvoice = match;
    }
  }

  return { success: true, data: { ...invoice, previousInvoice, childInvoice } };
}

export async function getReceiptDetails(receiptId: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();

  const { data: receipt, error: rErr } = await supabase
    .from("inward_receipts")
    .select(`
      *,
      clients ( id, name, email, mobile, address, gst_no, contact_person ),
      financial_accounts ( id, name, account_number, bank_name ),
      branches ( id, name, code )
    `)
    .eq("id", receiptId)
    .single();

  if (rErr || !receipt) return { success: false, error: "Receipt not found" };

  const { data: payments } = await supabase
    .from("invoice_payments")
    .select(`
      id,
      amount,
      payment_date,
      payment_mode,
      remarks,
      invoices (
        id,
        invoice_no,
        invoice_type,
        total_amount,
        paid_amount,
        balance_amount,
        job_entries ( id, uid, uid_label, project_name )
      )
    `)
    .eq("receipt_id", receiptId)
    .limit(1);

  const linkedPayment = payments && payments.length > 0 ? payments[0] : null;
  const inv = linkedPayment?.invoices;

  return {
    success: true,
    data: {
      ...receipt,
      invoice_no: inv?.invoice_no,
      inward_uid: inv?.job_entries?.uid_label || inv?.job_entries?.uid,
      project_name: inv?.job_entries?.project_name,
      total_invoice_amount: inv?.total_amount,
      remaining_balance: inv?.balance_amount,
      client_name: receipt.clients?.name || receipt.party_name,
      client_address: receipt.clients?.address,
      client_gst: receipt.clients?.gst_no,
      client_contact: receipt.clients?.contact_person,
    },
  };
}

export async function saveBankReconciliation(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();

  const insertPayload = {
    branch_id: user.branch_id,
    account_id: payload.account_id,
    statement_date: payload.statement_date,
    statement_balance: Number(payload.statement_balance || 0),
    erp_balance: Number(payload.erp_balance || 0),
    notes: payload.notes || null,
    reconciled_by: user.id,
  };

  const { data, error } = await supabase
    .from("bank_reconciliations")
    .upsert(insertPayload, { onConflict: "account_id,statement_date" })
    .select(`
      *,
      financial_accounts ( id, name, account_type, bank_name )
    `)
    .single();

  if (error) return { success: false, error: error.message };

  await supabase.from("accounting_audit_log").insert({
    branch_id: user.branch_id,
    table_name: "bank_reconciliations",
    record_id: data.id,
    action: "reconcile",
    new_data: { ...insertPayload, difference: Number(payload.statement_balance || 0) - Number(payload.erp_balance || 0) },
    performed_by: user.id
  });

  return { success: true, data };
}

export async function getBankReconciliations(accountId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  let q = supabase
    .from("bank_reconciliations")
    .select(`
      *,
      financial_accounts ( id, name, account_type, bank_name )
    `)
    .order("statement_date", { ascending: false });
  if (accountId) q = q.eq("account_id", accountId);
  if (!isSuperAdmin(user.roles) && user.branch_id) q = q.eq("branch_id", user.branch_id);
  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function calculateAccountBalanceAsOf(accountId: string, asOfDate: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();

  const { data: account, error: accErr } = await supabase
    .from("financial_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (accErr || !account) return { success: false, error: "Account not found" };

  const openingBalance = Number(account.opening_balance || 0);

  // Inflows: Inward receipts deposited to this account up to asOfDate
  const { data: receipts } = await supabase
    .from("inward_receipts")
    .select("id, amount")
    .eq("account_id", accountId)
    .neq("status", "cancelled")
    .lte("receipt_date", asOfDate);

  // Inflows: Direct invoice payments deposited to this account up to asOfDate
  const { data: payments } = await supabase
    .from("invoice_payments")
    .select("id, amount, receipt_id")
    .eq("account_id", accountId)
    .lte("payment_date", asOfDate);

  const countedReceiptIds = new Set((receipts || []).map(r => r.id));
  const uncountedPayments = (payments || []).filter(p => !p.receipt_id || !countedReceiptIds.has(p.receipt_id));

  const totalInflows = (receipts || []).reduce((s, r) => s + Number(r.amount || 0), 0) +
    uncountedPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

  // Outflows: Approved recorded expenses paid from this account up to asOfDate
  const { data: expenses } = await supabase
    .from("accounting_expenses")
    .select("amount")
    .eq("account_id", accountId)
    .eq("approval_status", "approved")
    .neq("status", "cancelled")
    .lte("expense_date", asOfDate);

  const totalOutflows = (expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0);
  const erpBalance = openingBalance + totalInflows - totalOutflows;

  return {
    success: true,
    data: {
      accountId,
      accountName: account.name,
      asOfDate,
      openingBalance,
      totalInflows,
      totalOutflows,
      erpBalance,
      currentBalance: Number(account.current_balance || 0),
    }
  };
}

export async function getAccountTransactionsForReconciliation(accountId: string, fromDate?: string, toDate?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();

  // Inflows: Inward receipts
  let receiptsQ = supabase
    .from("inward_receipts")
    .select(`
      id,
      receipt_no,
      receipt_date,
      amount,
      payment_mode,
      remarks,
      party_name,
      clients ( name )
    `)
    .eq("account_id", accountId)
    .neq("status", "cancelled")
    .order("receipt_date", { ascending: false });

  if (fromDate) receiptsQ = receiptsQ.gte("receipt_date", fromDate);
  if (toDate) receiptsQ = receiptsQ.lte("receipt_date", toDate);

  const { data: receipts } = await receiptsQ;

  // Inflows: Invoice payments not already linked to an inward receipt
  let paymentsQ = supabase
    .from("invoice_payments")
    .select(`
      id,
      payment_date,
      amount,
      payment_mode,
      remarks,
      receipt_id,
      invoices ( invoice_no, clients ( name ) )
    `)
    .eq("account_id", accountId)
    .order("payment_date", { ascending: false });

  if (fromDate) paymentsQ = paymentsQ.gte("payment_date", fromDate);
  if (toDate) paymentsQ = paymentsQ.lte("payment_date", toDate);

  const { data: payments } = await paymentsQ;

  // Outflows: Approved expenses
  let expensesQ = supabase
    .from("accounting_expenses")
    .select(`
      id,
      bill_number,
      expense_date,
      amount,
      payment_mode,
      description,
      vendor_name,
      expense_type,
      expense_categories ( name )
    `)
    .eq("account_id", accountId)
    .eq("approval_status", "approved")
    .neq("status", "cancelled")
    .order("expense_date", { ascending: false });

  if (fromDate) expensesQ = expensesQ.gte("expense_date", fromDate);
  if (toDate) expensesQ = expensesQ.lte("expense_date", toDate);

  const { data: expenses } = await expensesQ;

  const transactions: any[] = [];
  const countedReceiptIds = new Set((receipts || []).map(r => r.id));

  (receipts || []).forEach(r => {
    transactions.push({
      id: r.id,
      type: "deposit",
      date: r.receipt_date,
      voucher_no: r.receipt_no,
      particulars: r.remarks || `Inward receipt from ${r.clients?.name || r.party_name || 'Customer'}`,
      party: r.clients?.name || r.party_name || "Customer",
      payment_mode: r.payment_mode,
      amount: Number(r.amount || 0),
      is_deposit: true,
    });
  });

  (payments || []).forEach(p => {
    if (!p.receipt_id || !countedReceiptIds.has(p.receipt_id)) {
      transactions.push({
        id: p.id,
        type: "deposit",
        date: p.payment_date,
        voucher_no: p.invoices?.invoice_no || `PMT-${p.id.slice(0, 6).toUpperCase()}`,
        particulars: p.remarks || `Payment against invoice ${p.invoices?.invoice_no || ''}`,
        party: p.invoices?.clients?.name || "Client",
        payment_mode: p.payment_mode,
        amount: Number(p.amount || 0),
        is_deposit: true,
      });
    }
  });

  (expenses || []).forEach(e => {
    transactions.push({
      id: e.id,
      type: "withdrawal",
      date: e.expense_date,
      voucher_no: e.bill_number || `EXP-${e.id.slice(0, 6).toUpperCase()}`,
      particulars: e.description || `${e.expense_categories?.name || 'Expense'} - ${e.vendor_name || 'Vendor'}`,
      party: e.vendor_name || "Vendor",
      payment_mode: e.payment_mode,
      amount: Number(e.amount || 0),
      is_deposit: false,
    });
  });

  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { success: true, data: transactions };
}

export async function getQuotationTemplates(branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const effectiveBranch = branchScope(user, branchId);
  let q = supabase.from("quotation_templates").select("*").order("is_default", { ascending: false }).order("created_at", { ascending: false });
  if (effectiveBranch) {
    q = q.or(`branch_id.eq.${effectiveBranch},branch_id.is.null`);
  }
  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data: data || [] };
}

export async function saveQuotationTemplate(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();

  // If setting default, unset previous default in the branch
  if (payload.is_default) {
    let unsetDefault = supabase.from("quotation_templates").update({ is_default: false });
    if (payload.id) unsetDefault = unsetDefault.neq("id", payload.id);
    if (user.branch_id) unsetDefault = unsetDefault.eq("branch_id", user.branch_id);
    await unsetDefault;
  }

  if (payload.id) {
    const { data: existing } = await supabase.from("quotation_templates").select("id").eq("id", payload.id).single();
    if (existing) {
      const { data, error } = await supabase.from("quotation_templates").update({
        name: payload.name,
        category: payload.category || "General",
        is_default: !!payload.is_default,
        clauses: payload.clauses || [],
        updated_at: new Date().toISOString(),
      }).eq("id", payload.id).select().single();
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    }
  }

  const id = payload.id || `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const { data, error } = await supabase.from("quotation_templates").insert({
    id,
    branch_id: user.branch_id || null,
    name: payload.name,
    category: payload.category || "General",
    is_default: !!payload.is_default,
    clauses: payload.clauses || [],
    created_by: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).select().single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function deleteQuotationTemplate(id: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const { error } = await supabase.from("quotation_templates").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function duplicateQuotationTemplate(id: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const { data: original, error: fetchErr } = await supabase.from("quotation_templates").select("*").eq("id", id).single();
  if (fetchErr || !original) return { success: false, error: "Template not found" };

  const rawClauses = Array.isArray(original.clauses) ? original.clauses : [];
  const clausesWithNewIds = rawClauses.map((c: any, i: number) => ({
    ...c,
    id: `cls-${Date.now()}-${i + 1}`,
    display_order: c.display_order || i + 1,
  }));

  const newId = `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const { data, error } = await supabase.from("quotation_templates").insert({
    id: newId,
    branch_id: user.branch_id || original.branch_id || null,
    name: `${original.name} (Copy)`,
    category: original.category,
    is_default: false,
    clauses: clausesWithNewIds,
    created_by: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).select().single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function setDefaultQuotationTemplate(id: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();

  // Reset defaults
  let resetQ = supabase.from("quotation_templates").update({ is_default: false }).neq("id", id);
  if (user.branch_id) resetQ = resetQ.eq("branch_id", user.branch_id);
  await resetQ;

  const { data, error } = await supabase.from("quotation_templates").update({ is_default: true, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getLedgersData(filters?: {
  fromDate?: string;
  toDate?: string;
  inwardId?: string;
  clientId?: string;
  accountId?: string;
  branchId?: string;
}) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const effectiveBranch = branchScope(user, filters?.branchId);

  // 1. Fetch Income Sources:
  // a) Inward receipts
  let receiptsQ = supabase
    .from("inward_receipts")
    .select(`
      *,
      clients ( id, name, email, mobile, address ),
      financial_accounts ( id, name, account_type, bank_name ),
      accounting_projects ( id, name ),
      job_entries ( id, uid, uid_label, project_name, inward_on, clients ( id, name ) ),
      invoice_payments (
        id,
        amount,
        payment_date,
        payment_mode,
        invoice_id,
        invoices (
          id,
          invoice_no,
          invoice_type,
          job_entries ( id, uid, uid_label, project_name )
        )
      )
    `)
    .neq("status", "cancelled")
    .order("receipt_date", { ascending: false });

  if (effectiveBranch) {
    receiptsQ = receiptsQ.or(`branch_id.eq.${effectiveBranch},branch_id.is.null`);
  }
  if (filters?.fromDate) receiptsQ = receiptsQ.gte("receipt_date", filters.fromDate);
  if (filters?.toDate) receiptsQ = receiptsQ.lte("receipt_date", filters.toDate);
  if (filters?.clientId) receiptsQ = receiptsQ.eq("client_id", filters.clientId);
  if (filters?.accountId) receiptsQ = receiptsQ.eq("account_id", filters.accountId);
  if (filters?.inwardId) receiptsQ = (receiptsQ as any).eq("inward_id", filters.inwardId);

  const { data: receiptsData } = await receiptsQ;

  // b) Invoice payments (to include direct invoice payments)
  let pmtQ = supabase
    .from("invoice_payments")
    .select(`
      *,
      financial_accounts ( id, name, account_type, bank_name ),
      invoices (
        id,
        invoice_no,
        invoice_type,
        client_id,
        clients ( id, name ),
        inward_id,
        job_entries ( id, uid, uid_label, project_name )
      )
    `)
    .order("payment_date", { ascending: false });

  if (filters?.fromDate) pmtQ = pmtQ.gte("payment_date", filters.fromDate);
  if (filters?.toDate) pmtQ = pmtQ.lte("payment_date", filters.toDate);
  if (filters?.accountId) pmtQ = pmtQ.eq("account_id", filters.accountId);

  const { data: paymentsData } = await pmtQ;

  const receiptIdsWithPayments = new Set((paymentsData || []).map((p: any) => p.receipt_id).filter(Boolean));
  const incomeEntries: any[] = [];

  (receiptsData || []).forEach((r: any) => {
    let inward = r.job_entries;
    if (!inward && r.invoice_payments?.length > 0) {
      inward = r.invoice_payments[0]?.invoices?.job_entries;
    }

    incomeEntries.push({
      id: r.id,
      source: "receipt",
      receipt_id: r.id,
      date: r.receipt_date || r.created_at?.slice(0, 10),
      voucher_no: r.receipt_no,
      type_label: r.inward_id || inward ? "Inward Receipt" : "Direct Client Receipt",
      party_name: r.clients?.name || r.party_name || "General Client / Party",
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
      particulars: r.remarks || (r.party_name ? `Received from ${r.party_name}` : "Money Receipt"),
      status: r.status,
      created_at: r.created_at,
    });
  });

  (paymentsData || []).forEach((p: any) => {
    if (!p.receipt_id || !receiptIdsWithPayments.has(p.receipt_id)) {
      const inv = p.invoices;
      const inward = inv?.job_entries;
      incomeEntries.push({
        id: p.id,
        source: "invoice_payment",
        payment_id: p.id,
        invoice_id: p.invoice_id,
        date: p.payment_date || p.created_at?.slice(0, 10),
        voucher_no: inv?.invoice_no || `PMT-${p.id.slice(0, 6).toUpperCase()}`,
        type_label: "Invoice Payment",
        party_name: inv?.clients?.name || "Client",
        client_id: inv?.client_id,
        inward_id: inv?.inward_id || inward?.id || null,
        inward_uid: inward?.uid_label || (inward?.uid ? `UID-${inward.uid}` : null),
        project_name: inward?.project_name || null,
        account_id: p.account_id,
        account_name: p.financial_accounts?.name || "Bank / Cash Account",
        payment_mode: p.payment_mode || "bank",
        amount: Number(p.amount || 0),
        gst_amount: 0,
        tds_amount: 0,
        particulars: p.remarks || `Payment against Invoice ${inv?.invoice_no || ''}`,
        status: "received",
        created_at: p.created_at,
      });
    }
  });

  incomeEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 2. Fetch Expenses:
  let expensesQ = supabase
    .from("accounting_expenses")
    .select(`
      *,
      expense_categories ( id, name, scope ),
      financial_accounts ( id, name, account_type, bank_name ),
      accounting_projects ( id, name ),
      job_entries ( id, uid, uid_label, inward_on, project_name, clients ( id, name ) ),
      job_entry_tests ( id, material_description, test_master ( id, specific_test, component_parameter, material_product ) )
    `)
    .eq("status", "recorded")
    .order("expense_date", { ascending: false });

  if (effectiveBranch) expensesQ = expensesQ.eq("branch_id", effectiveBranch);
  if (filters?.fromDate) expensesQ = expensesQ.gte("expense_date", filters.fromDate);
  if (filters?.toDate) expensesQ = expensesQ.lte("expense_date", filters.toDate);
  if (filters?.inwardId) expensesQ = expensesQ.eq("inward_id", filters.inwardId);
  if (filters?.accountId) expensesQ = expensesQ.eq("account_id", filters.accountId);

  const { data: expensesData } = await expensesQ;

  const expenseEntries = (expensesData || []).map((e: any) => {
    const isUnderInward = !!(e.inward_id || e.job_entries);
    const resolvedType = e.expense_type || (isUnderInward ? "inward" : "company");
    const inward = e.job_entries;

    return {
      id: e.id,
      date: e.expense_date || e.created_at?.slice(0, 10),
      voucher_no: e.bill_number || `EXP-${e.id.slice(0, 6).toUpperCase()}`,
      expense_type: resolvedType as "inward" | "company" | "inhouse",
      category_id: e.category_id,
      category_name: e.expense_categories?.name || (resolvedType === 'inward' ? 'Inward Direct Cost' : 'General Overhead'),
      inward_id: e.inward_id || inward?.id || null,
      job_entry_test_id: e.job_entry_test_id || null,
      test_name: e.job_entry_tests?.test_master?.specific_test || e.job_entry_tests?.test_master?.component_parameter || e.job_entry_tests?.material_description || null,
      inward_uid: inward?.uid_label || (inward?.uid ? `UID-${inward.uid}` : null),
      project_name: inward?.project_name || e.accounting_projects?.name || e.site_name || null,
      client_name: inward?.clients?.name || null,
      vendor_name: e.vendor_name || null,
      paid_through_person: e.paid_through_person || null,
      account_id: e.account_id,
      account_name: e.financial_accounts?.name || "Direct Expense",
      payment_mode: e.payment_mode || "cash",
      amount: Number(e.amount || 0),
      gst_amount: Number(e.gst_amount || 0),
      tds_amount: Number(e.tds_amount || 0),
      bill_number: e.bill_number || null,
      bill_attached: !!e.bill_attached,
      is_reimbursement: !!e.is_reimbursement,
      approval_status: e.approval_status || "approved",
      description: e.description || e.remarks || null,
      department: e.department || null,
      site_name: e.site_name || null,
      created_at: e.created_at,
    };
  });

  return {
    success: true,
    data: {
      incomeEntries,
      expenseEntries,
      summary: {
        totalIncome: incomeEntries.reduce((s, r) => s + r.amount, 0),
        inwardIncome: incomeEntries.filter(r => !!r.inward_id).reduce((s, r) => s + r.amount, 0),
        companyIncome: incomeEntries.filter(r => !r.inward_id).reduce((s, r) => s + r.amount, 0),
        cashIncome: incomeEntries.filter(r => r.payment_mode === "cash").reduce((s, r) => s + r.amount, 0),
        bankIncome: incomeEntries.filter(r => r.payment_mode !== "cash").reduce((s, r) => s + r.amount, 0),

        totalExpense: expenseEntries.filter(e => e.approval_status === "approved").reduce((s, e) => s + e.amount, 0),
        inwardExpense: expenseEntries.filter(e => e.expense_type === "inward" && e.approval_status === "approved").reduce((s, e) => s + e.amount, 0),
        inhouseExpense: expenseEntries.filter(e => e.expense_type === "inhouse" && e.approval_status === "approved").reduce((s, e) => s + e.amount, 0),
        companyExpense: expenseEntries.filter(e => e.expense_type === "company" && e.approval_status === "approved").reduce((s, e) => s + e.amount, 0),
        pendingExpense: expenseEntries.filter(e => e.approval_status === "pending").reduce((s, e) => s + e.amount, 0),
      }
    }
  };
}

export async function getTestWiseProfitabilityReport(fromDate?: string, toDate?: string, branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const effectiveBranch = branchScope(user, branchId);

  // 1. Fetch job_entry_tests with parent job_entry, client, and test_master
  let jetQ = supabase
    .from("job_entry_tests")
    .select(`
      id,
      job_entry_id,
      material_description,
      sample_quantity,
      grade,
      test_method,
      uid_label,
      created_at,
      test_master (
        id,
        material_product,
        component_parameter,
        specific_test,
        discipline_group,
        category,
        is_nabl,
        unit
      ),
      job_entries:job_entries!job_entry_tests_job_entry_id_fkey (
        id,
        uid,
        uid_label,
        client_id,
        project_name,
        branch_id,
        branches ( id, name ),
        clients ( id, name )
      )
    `);

  if (effectiveBranch) jetQ = jetQ.eq("job_entries.branch_id", effectiveBranch);
  if (fromDate) jetQ = jetQ.gte("created_at", fromDate);
  if (toDate) jetQ = jetQ.lte("created_at", toDate + "T23:59:59.999Z");

  const { data: testsData, error: testErr } = await jetQ;
  if (testErr) {
    console.error("Error fetching job_entry_tests for profitability:", testErr);
    return { success: false, error: testErr.message };
  }

  // 2. Fetch only settled/paid invoices at DB level (excluding unpaid invoices)
  let invQ = supabase
    .from("invoices")
    .select(`
      id,
      invoice_no,
      inward_id,
      amount,
      total_amount,
      paid_amount,
      balance_amount,
      status,
      items,
      created_at
    `)
    .neq("status", "cancelled")
    .or("paid_amount.gt.0,status.eq.paid");

  if (effectiveBranch) invQ = invQ.eq("branch_id", effectiveBranch);
  const { data: invoicesData } = await invQ;

  // Filter only invoices where payment has ACTUALLY been received (paid or partially paid)
  const paidInvoices = (invoicesData || []).filter((inv: any) => {
    const paidAmt = Number(inv.paid_amount || 0);
    const status = String(inv.status || "").toLowerCase();
    return (paidAmt > 0 || status === "paid") && status !== "cancelled";
  });

  const { data: allBranches } = await supabase.from("branches").select("id, name").order("name");

  // 3. Fetch all approved expenses
  let expQ = supabase
    .from("accounting_expenses")
    .select(`
      id,
      amount,
      expense_type,
      inward_id,
      job_entry_test_id,
      description,
      expense_categories ( name )
    `)
    .eq("status", "recorded")
    .eq("approval_status", "approved");
  if (effectiveBranch) expQ = expQ.eq("branch_id", effectiveBranch);
  if (fromDate) expQ = expQ.gte("expense_date", fromDate);
  if (toDate) expQ = expQ.lte("expense_date", toDate);
  const { data: expensesData } = await expQ;

  // Map inward_id to paid invoices
  const inwardPaidInvoicesMap: Record<
    string,
    Array<{
      id: string;
      invoice_no: string;
      amount: number;
      total_amount: number;
      paid_amount: number;
      status: string;
      items?: unknown;
    }>
  > = {};

  paidInvoices.forEach((inv: any) => {
    if (inv.inward_id) {
      if (!inwardPaidInvoicesMap[inv.inward_id]) inwardPaidInvoicesMap[inv.inward_id] = [];
      inwardPaidInvoicesMap[inv.inward_id].push(inv);
    }
  });

  // Separate expenses into direct test-tagged vs general inward expenses
  const testSpecificExpensesMap: Record<string, number> = {};
  const inwardGeneralExpensesMap: Record<string, number> = {};

  (expensesData || []).filter((e: any) => e.expense_type === "inward").forEach((e: any) => {
    const amt = Number(e.amount || 0);
    if (e.job_entry_test_id) {
      testSpecificExpensesMap[e.job_entry_test_id] = (testSpecificExpensesMap[e.job_entry_test_id] || 0) + amt;
    } else if (e.inward_id) {
      inwardGeneralExpensesMap[e.inward_id] = (inwardGeneralExpensesMap[e.inward_id] || 0) + amt;
    }
  });

  const totalInhouseExpenses = (expensesData || [])
    .filter((e: any) => e.expense_type === "inhouse")
    .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

  // Count tests per inward to apportion proportional amounts
  const testsPerInward: Record<string, number> = {};
  (testsData || []).forEach((t: { job_entry_id: string | null }) => {
    if (t.job_entry_id) {
      testsPerInward[t.job_entry_id] = (testsPerInward[t.job_entry_id] || 0) + 1;
    }
  });

  const totalTestsCount = (testsData || []).length;

  interface TestPaidInvoiceItem {
    invoiceNo: string;
    paidAmount: number;
    totalAmount: number;
    testRevenue: number;
    status: string;
  }

  interface TestAggregate {
    testId: string;
    testName: string;
    materialGroup: string;
    discipline: string;
    isNabl: boolean;
    category: string;
    branchId: string | null;
    branchName: string | null;
    testCount: number;
    inwardCount: number;
    inwardIds: Set<string>;
    clientNames: Set<string>;
    revenue: number;
    paidInvoices: TestPaidInvoiceItem[];
    taggedExpense: number;
    sharedInwardExpense: number;
    inhouseExpense: number;
    totalCost: number;
    grossProfit: number;
    grossMargin: number;
    avgRevenuePerTest: number;
    avgCostPerTest: number;
  }

  const aggregates: Record<string, TestAggregate> = {};

  (testsData || []).forEach((t: Record<string, unknown>) => {
    const tm = t.test_master as Record<string, unknown> | null;
    const je = t.job_entries as Record<string, unknown> | null;
    const clientObj = je?.clients as Record<string, unknown> | null;
    const jobEntryId = t.job_entry_id as string | null;
    const testInstanceId = t.id as string;
    const testMasterId = (tm?.id as string) || null;

    const testName = (tm?.component_parameter as string) || (tm?.specific_test as string) || (t.material_description as string) || "General Testing";
    const materialGroup = (tm?.material_product as string) || (tm?.discipline_group as string) || "General Material";
    const discipline = (tm?.discipline_group as string) || "Mechanical";
    const isNabl = tm?.is_nabl === true;
    const category = (tm?.category as string) || "Construction";
    const branchId = (je?.branch_id as string) || null;
    const branchName = ((je?.branches as any)?.name as string) || null;
    const key = `${materialGroup}___${testName}`;

    if (!aggregates[key]) {
      aggregates[key] = {
        testId: (tm?.id as string) || (t.id as string),
        testName,
        materialGroup,
        discipline,
        isNabl,
        category,
        branchId,
        branchName,
        testCount: 0,
        inwardCount: 0,
        inwardIds: new Set<string>(),
        clientNames: new Set<string>(),
        revenue: 0,
        paidInvoices: [],
        taggedExpense: 0,
        sharedInwardExpense: 0,
        inhouseExpense: 0,
        totalCost: 0,
        grossProfit: 0,
        grossMargin: 0,
        avgRevenuePerTest: 0,
        avgCostPerTest: 0,
      };
    }

    const agg = aggregates[key];
    agg.testCount += 1;
    if (jobEntryId) {
      agg.inwardIds.add(jobEntryId);
    }
    const clientName = clientObj?.name as string | undefined;
    if (clientName) agg.clientNames.add(clientName);

    // Calculate revenue for this test instance STRICTLY from PAID invoices:
    let testRevenue = 0;
    if (jobEntryId && inwardPaidInvoicesMap[jobEntryId]) {
      const parentInvs = inwardPaidInvoicesMap[jobEntryId];
      parentInvs.forEach((inv) => {
        const totalAmt = Number(inv.total_amount || inv.amount || 0);
        const paidAmt = Number(inv.paid_amount || 0);
        const status = String(inv.status || "").toLowerCase();

        // Calculate paid ratio: if status is 'paid' or paid_amount >= total_amount, 100% paid
        let paidRatio = 0;
        if (status === "paid" || (totalAmt > 0 && paidAmt >= totalAmt)) {
          paidRatio = 1.0;
        } else if (totalAmt > 0 && paidAmt > 0) {
          paidRatio = Math.min(1, paidAmt / totalAmt);
        }

        if (paidRatio <= 0) return; // Ignore unpaid invoices

        const items = Array.isArray(inv.items)
          ? (inv.items as Array<{
              job_entry_test_id?: string;
              test_master_id?: string;
              test_name?: string;
              description?: string;
              amount?: number;
              qty?: number;
              rate?: number;
            }>)
          : [];

        // 1. Direct match by job_entry_test_id or test_master_id
        const directMatch = items.find(
          (it) =>
            (it.job_entry_test_id && it.job_entry_test_id === testInstanceId) ||
            (it.test_master_id && testMasterId && it.test_master_id === testMasterId)
        );

        let recognizedForTest = 0;

        if (directMatch) {
          const itemBilled = Number(directMatch.amount ?? ((Number(directMatch.qty) || 1) * (Number(directMatch.rate) || 0)));
          recognizedForTest = itemBilled * paidRatio;
        } else {
          // 2. Fallback description match
          const matchingItem = items.find(
            (it) =>
              it.description &&
              (it.description.toLowerCase().includes(testName.toLowerCase()) ||
                it.description.toLowerCase().includes(materialGroup.toLowerCase()) ||
                (it.test_name && it.test_name.toLowerCase().includes(testName.toLowerCase())))
          );
          if (matchingItem) {
            const itemBilled = Number(matchingItem.amount ?? ((Number(matchingItem.qty) || 1) * (Number(matchingItem.rate) || 0)));
            recognizedForTest = itemBilled * paidRatio;
          } else {
            // 3. Fallback: Apportion the actual paid amount across tests in inward
            const countInInward = testsPerInward[jobEntryId] || 1;
            recognizedForTest = (status === "paid" && totalAmt > 0 ? totalAmt : paidAmt) / countInInward;
          }
        }

        if (recognizedForTest > 0) {
          testRevenue += recognizedForTest;
          const exists = agg.paidInvoices.find((p) => p.invoiceNo === inv.invoice_no);
          if (exists) {
            exists.testRevenue = Math.round((exists.testRevenue + recognizedForTest) * 100) / 100;
          } else {
            agg.paidInvoices.push({
              invoiceNo: inv.invoice_no,
              paidAmount: paidAmt,
              totalAmount: totalAmt,
              testRevenue: Math.round(recognizedForTest * 100) / 100,
              status: inv.status,
            });
          }
        }
      });
    }

    agg.revenue += testRevenue;

    // Direct tagged expense specifically linked to this test instance
    const tagged = testSpecificExpensesMap[testInstanceId] || 0;
    agg.taggedExpense += tagged;

    // General inward expenses apportioned to this test
    if (jobEntryId && inwardGeneralExpensesMap[jobEntryId]) {
      const countInInward = testsPerInward[jobEntryId] || 1;
      agg.sharedInwardExpense += inwardGeneralExpensesMap[jobEntryId] / countInInward;
    }

    // Allocate inhouse lab expense proportionally
    if (totalTestsCount > 0 && totalInhouseExpenses > 0) {
      agg.inhouseExpense += totalInhouseExpenses / totalTestsCount;
    }
  });

  const testBreakdown = Object.values(aggregates).map((a) => {
    const directExpense = a.taggedExpense + a.sharedInwardExpense;
    const totalCost = directExpense + a.inhouseExpense;
    const grossProfit = a.revenue - totalCost;
    const grossMargin = a.revenue > 0 ? (grossProfit / a.revenue) * 100 : (grossProfit === 0 ? 0 : -100);
    const avgRevenuePerTest = a.testCount > 0 ? a.revenue / a.testCount : 0;
    const avgCostPerTest = a.testCount > 0 ? totalCost / a.testCount : 0;

    return {
      testId: a.testId,
      testName: a.testName,
      materialGroup: a.materialGroup,
      discipline: a.discipline,
      isNabl: a.isNabl,
      category: a.category,
      branchId: a.branchId,
      branchName: a.branchName,
      testCount: a.testCount,
      inwardCount: a.inwardIds.size,
      clientCount: a.clientNames.size,
      revenue: Math.round(a.revenue * 100) / 100,
      paidInvoices: a.paidInvoices || [],
      taggedExpense: Math.round(a.taggedExpense * 100) / 100,
      sharedInwardExpense: Math.round(a.sharedInwardExpense * 100) / 100,
      directExpense: Math.round(directExpense * 100) / 100,
      inhouseExpense: Math.round(a.inhouseExpense * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMargin: Math.round(grossMargin * 10) / 10,
      avgRevenuePerTest: Math.round(avgRevenuePerTest * 100) / 100,
      avgCostPerTest: Math.round(avgCostPerTest * 100) / 100,
    };
  }).sort((a, b) => b.revenue - a.revenue || b.testCount - a.testCount);

  // Group by Material / Discipline
  const materialMap: Record<string, { material: string; count: number; revenue: number; expense: number; profit: number }> = {};
  testBreakdown.forEach((t) => {
    if (!materialMap[t.materialGroup]) {
      materialMap[t.materialGroup] = { material: t.materialGroup, count: 0, revenue: 0, expense: 0, profit: 0 };
    }
    materialMap[t.materialGroup].count += t.testCount;
    materialMap[t.materialGroup].revenue += t.revenue;
    materialMap[t.materialGroup].expense += t.totalCost;
    materialMap[t.materialGroup].profit += t.grossProfit;
  });

  const materialBreakdown = Object.values(materialMap).sort((a, b) => b.revenue - a.revenue);

  const totalTests = testBreakdown.reduce((s, t) => s + t.testCount, 0);
  const totalRev = testBreakdown.reduce((s, t) => s + t.revenue, 0);
  const totalTaggedExp = testBreakdown.reduce((s, t) => s + (t.taggedExpense || 0), 0);
  const totalCost = testBreakdown.reduce((s, t) => s + t.totalCost, 0);
  const totalProfit = totalRev - totalCost;
  const overallMargin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;

  return {
    success: true,
    data: {
      dateRange: { fromDate: fromDate || null, toDate: toDate || null },
      summary: {
        totalTests,
        totalRevenue: Math.round(totalRev * 100) / 100,
        totalTaggedExpense: Math.round(totalTaggedExp * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        grossProfit: Math.round(totalProfit * 100) / 100,
        overallMargin: Math.round(overallMargin * 10) / 10,
      },
      testBreakdown,
      materialBreakdown,
      branches: allBranches || [],
    }
  };
}

export async function getExpenseFormData(branchId?: string, inwardId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const supabase = await createClient();
  const effectiveBranch = branchScope(user, branchId);

  // 1. Financial Accounts (active)
  let accountsQ = supabase
    .from("financial_accounts")
    .select("id, name, account_type, bank_name, current_balance")
    .eq("is_active", true)
    .order("name");
  if (effectiveBranch) {
    accountsQ = accountsQ.or(`branch_id.eq.${effectiveBranch},branch_id.is.null`);
  }
  const { data: accounts } = await accountsQ;

  // 2. Expense Categories
  const { data: categories } = await supabase
    .from("expense_categories")
    .select("id, name, scope")
    .order("name");

  // 3. Accounting Projects
  let projQ = supabase
    .from("accounting_projects")
    .select("id, name, status")
    .order("name");
  if (effectiveBranch) projQ = projQ.eq("branch_id", effectiveBranch);
  const { data: projects } = await projQ;

  // 4. Inwards / Job Entries (recent 100 with tests)
  let inwardsQ = supabase
    .from("job_entries")
    .select(`
      id,
      uid,
      uid_label,
      inward_on,
      created_at,
      project_name,
      division,
      letter_reference,
      branch_id,
      clients ( id, name, site_name, mobile ),
      job_entry_tests!job_entry_tests_job_entry_id_fkey (
        id,
        test_master_id,
        material_description,
        sample_quantity,
        test_master ( id, component_parameter, specific_test, discipline_group, material_product, unit )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (effectiveBranch) inwardsQ = inwardsQ.eq("branch_id", effectiveBranch);
  const { data: inwards } = await inwardsQ;

  // 5. If specific inwardId was requested and not in top 100, fetch it
  let specificInward = null;
  if (inwardId) {
    const found = (inwards || []).find((i: any) => i.id === inwardId);
    if (!found) {
      const { data: singleInv } = await supabase
        .from("job_entries")
        .select(`
          id,
          uid,
          uid_label,
          inward_on,
          created_at,
          project_name,
          division,
          letter_reference,
          branch_id,
          clients ( id, name, site_name, mobile ),
          job_entry_tests!job_entry_tests_job_entry_id_fkey (
            id,
            test_master_id,
            material_description,
            sample_quantity,
            test_master ( id, component_parameter, specific_test, discipline_group, material_product, unit )
          )
        `)
        .eq("id", inwardId)
        .single();
      if (singleInv) specificInward = singleInv;
    } else {
      specificInward = found;
    }
  }

  return {
    success: true,
    data: {
      accounts: accounts || [],
      categories: categories || [],
      projects: projects || [],
      inwards: specificInward && !(inwards || []).some((i: any) => i.id === specificInward.id)
        ? [specificInward, ...(inwards || [])]
        : (inwards || []),
      specificInward,
    },
  };
}

