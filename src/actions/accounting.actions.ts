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
  if (result.success) revalidatePath("/accounting");
  return result;
}

export async function cancelInwardReceiptAction(receiptId: string, reason: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.cancelInwardReceipt(receiptId, reason);
  if (result.success) revalidatePath("/accounting");
  return result;
}

export async function createExpenseAction(payload: any) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.createExpense(payload);
  if (result.success) revalidatePath("/accounting");
  return result;
}

export async function approveExpenseAction(expenseId: string, approve: boolean, remarks?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canApproveAccounting(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.approveExpense(expenseId, approve, remarks);
  if (result.success) revalidatePath("/accounting");
  return result;
}

export async function createExpenseCategoryAction(name: string, scope?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageAccountingTransactions(user.roles)) return { success: false, error: "Unauthorized" };
  const result = await accounting.createExpenseCategory(name, scope);
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

export async function getProfitAndLossAction(fromDate?: string, toDate?: string, branchId?: string) {
  return accounting.getProfitAndLoss(fromDate, toDate, branchId);
}

export async function canExportExcelAction() {
  const user = await getAuthenticatedUserWithRoles();
  return { success: true, allowed: user ? canExportAccountingExcel(user.roles) : false };
}
