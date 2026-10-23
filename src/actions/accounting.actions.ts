"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canManageAccountingTransactions, canViewAccounting, canApproveAccounting, canExportAccountingExcel } from "@/config/roles";
import * as accounting from "@/services/accounting.service";

export async function getAccountingDashboardAction(branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  return accounting.getAccountingDashboard(branchId);
}

export async function createInwardReceiptAction(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.createInwardReceipt(payload);
  if (result.success) {
    revalidatePath("/accounting");
    revalidatePath("/accounting/billing");
    revalidatePath("/accounting/receipts");
  }
  return result;
}

export async function cancelInwardReceiptAction(receiptId: string, reason: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.cancelInwardReceipt(receiptId, reason);
  if (result.success) {
    revalidatePath("/accounting");
    revalidatePath("/accounting/billing");
    revalidatePath("/accounting/receipts");
  }
  return result;
}

export async function createExpenseAction(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.createExpense(payload);
  if (result.success) {
    revalidatePath("/accounting");
    revalidatePath("/accounting/billing");
    revalidatePath("/accounting/expenses");
    revalidatePath("/accounting/ledgers");
  }
  return result;
}

export async function approveExpenseAction(expenseId: string, approve: boolean, remarks?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canApproveAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.approveExpense(expenseId, approve, remarks);
  if (result.success) {
    revalidatePath("/accounting");
    revalidatePath("/accounting/billing");
    revalidatePath("/accounting/expenses");
    revalidatePath("/accounting/ledgers");
  }
  return result;
}

export async function createExpenseCategoryAction(name: string, scope?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.createExpenseCategory(name, scope);
  if (result.success) revalidatePath("/accounting");
  return result;
}

export async function createBankAccountAction(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.createBankAccount(payload);
  if (result.success) {
    revalidatePath("/accounting");
    revalidatePath("/accounting/banks");
  }
  return result;
}

export async function updateBankAccountAction(id: string, payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.updateBankAccount(id, payload);
  if (result.success) {
    revalidatePath("/accounting");
    revalidatePath("/accounting/banks");
  }
  return result;
}

export async function deleteBankAccountAction(id: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.deleteBankAccount(id);
  if (result.success) {
    revalidatePath("/accounting");
    revalidatePath("/accounting/banks");
  }
  return result;
}

export async function createQuotationAction(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.createQuotation(payload);
  if (result.success) revalidatePath("/accounting");
  return result;
}

export async function createInvoiceAction(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.createInvoice(payload);
  if (result.success) revalidatePath("/accounting");
  return result;
}

export async function recordInvoicePaymentAction(invoiceId: string, payloadOrAmount: any, accountId?: string, remarks?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.recordInvoicePayment(invoiceId, payloadOrAmount, accountId, remarks);
  if (result.success) {
    revalidatePath("/accounting");
    revalidatePath("/accounting/billing");
    revalidatePath("/accounting/invoices");
    revalidatePath("/accounting/receipts");
  }
  return result;
}

export async function createProjectAction(name: string, description?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.createProject(name, description);
  if (result.success) revalidatePath("/accounting");
  return result;
}

export async function searchAccountingAction(query: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  return accounting.searchQuotationsAndInvoices(query);
}

export async function getProjectsAction() { return accounting.getProjects(); }
export async function getAccountsAction() { return accounting.getAccounts(); }
export async function getCategoriesAction() { return accounting.getCategories(); }
export async function getProfitAndLossAction(fromDate?: string, toDate?: string, branchId?: string) { return accounting.getProfitAndLoss(fromDate, toDate, branchId); }
export async function getReconciliationAction(branchId?: string) { return accounting.getReconciliation(branchId); }
export async function canExportExcelAction() {
  const user = await getAuthenticatedUserWithRoles();
  return { success: true, allowed: user ? canExportAccountingExcel(user.roles) : false };
}

export async function getQuotationsAction(branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  return accounting.getQuotations(branchId);
}

export async function getInvoicesAction(branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  return accounting.getInvoices(branchId);
}

export async function createQuotationWithItemsAction(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.createQuotationWithItems(payload);
  if (result.success) revalidatePath("/accounting");
  return result;
}

export async function createInvoiceWithItemsAction(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.createInvoiceWithItems(payload);
  if (result.success) revalidatePath("/accounting");
  return result;
}

export async function saveBankReconciliationAction(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.saveBankReconciliation(payload);
  if (result.success) revalidatePath("/accounting");
  return result;
}

export async function getBankReconciliationsAction(accountId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  return accounting.getBankReconciliations(accountId);
}

export async function getInwardsForAccountingAction(branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  return accounting.getInwardsForAccounting(branchId);
}

export async function getClientPreviousInvoiceAction(clientId: string, excludeInvoiceId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  return accounting.getClientPreviousInvoice(clientId, excludeInvoiceId);
}

export async function convertProformaToTaxInvoiceAction(proformaId: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.convertProformaToTaxInvoice(proformaId);
  if (result.success) {
    revalidatePath("/accounting");
    revalidatePath("/accounting/billing");
    revalidatePath("/accounting/invoices");
  }
  return result;
}

export async function getInvoiceWithDetailsAction(invoiceId: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  return accounting.getInvoiceWithDetails(invoiceId);
}

export async function getQuotationTemplatesAction(branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  return accounting.getQuotationTemplates(branchId);
}

export async function saveQuotationTemplateAction(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.saveQuotationTemplate(payload);
  if (result.success) {
    revalidatePath("/accounting");
    revalidatePath("/accounting/templates");
    revalidatePath("/accounting/quotations");
  }
  return result;
}

export async function deleteQuotationTemplateAction(id: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.deleteQuotationTemplate(id);
  if (result.success) {
    revalidatePath("/accounting");
    revalidatePath("/accounting/templates");
    revalidatePath("/accounting/quotations");
  }
  return result;
}

export async function duplicateQuotationTemplateAction(id: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.duplicateQuotationTemplate(id);
  if (result.success) {
    revalidatePath("/accounting");
    revalidatePath("/accounting/templates");
    revalidatePath("/accounting/quotations");
  }
  return result;
}

export async function setDefaultQuotationTemplateAction(id: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.setDefaultQuotationTemplate(id);
  if (result.success) {
    revalidatePath("/accounting");
    revalidatePath("/accounting/templates");
    revalidatePath("/accounting/quotations");
  }
  return result;
}

export async function getReceiptDetailsAction(receiptId: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  return accounting.getReceiptDetails(receiptId);
}

export async function getLedgersDataAction(filters?: {
  fromDate?: string;
  toDate?: string;
  inwardId?: string;
  clientId?: string;
  accountId?: string;
  branchId?: string;
}) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  return accounting.getLedgersData(filters);
}



