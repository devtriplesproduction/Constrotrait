"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canManageAccountingTransactions, canViewAccounting } from "@/config/roles";
import * as accounting from "@/services/accounting.service";

export async function getAccountingDashboardAction(branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  return accounting.getAccountingDashboard(branchId);
}

export async function createInwardReceiptAction(payload: Parameters<typeof accounting.createInwardReceipt>[0]) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.createInwardReceipt(payload);
  if (result.success) revalidatePath("/accounting");
  return result;
}

export async function createExpenseAction(payload: Parameters<typeof accounting.createExpense>[0]) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.createExpense(payload);
  if (result.success) revalidatePath("/accounting");
  return result;
}

export async function createInvoiceAction(payload: Parameters<typeof accounting.createInvoice>[0]) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.createInvoice(payload);
  if (result.success) revalidatePath("/accounting");
  return result;
}

export async function recordInvoicePaymentAction(invoiceId: string, amount: number, accountId?: string, remarks?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.recordInvoicePayment(invoiceId, amount, accountId, remarks);
  if (result.success) revalidatePath("/accounting");
  return result;
}

export async function searchAccountingAction(query: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canViewAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  return accounting.searchQuotationsAndInvoices(query);
}

export async function getProjectsAction() {
  return accounting.getProjects();
}

export async function getAccountsAction() {
  return accounting.getAccounts();
}

export async function getCategoriesAction() {
  return accounting.getCategories();
}
