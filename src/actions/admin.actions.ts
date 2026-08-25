"use server";

import { 
  toggleUserActive, 
  offboardEmployee,
  onboardEmployee,
  deleteEmployee, 
  resetEmployeePassword, 
  getAdminAuditLogs,
  updateEmployeeRoles
} from "@/services/admin.service";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUserWithRoles, getAuthenticatedUser } from "@/services/auth.service";
import { canManageEmployees } from "@/config/roles";

export async function toggleUserActiveAction(userId: string, isActive: boolean) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageEmployees(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }
  const result = await toggleUserActive(userId, isActive);
  if (result.success) {
    revalidatePath("/employees", "page");
  }
  return result;
}

export async function offboardEmployeeAction(userId: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageEmployees(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }
  const result = await offboardEmployee(userId);
  if (result.success) {
    revalidatePath("/employees", "page");
  }
  return result;
}

export async function onboardEmployeeAction(userId: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageEmployees(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }
  const result = await onboardEmployee(userId);
  if (result.success) {
    revalidatePath("/employees", "page");
  }
  return result;
}

export async function deleteEmployeeAction(userId: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !user.roles.includes("SUPER_ADMIN")) {
    return { success: false, error: "Unauthorized" };
  }
  const result = await deleteEmployee(userId);
  if (result.success) {
    revalidatePath("/employees", "page");
  }
  return result;
}

export async function resetEmployeePasswordAction(userId: string, newPassword: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageEmployees(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }
  const result = await resetEmployeePassword(userId, newPassword);
  return result;
}

export async function getAdminAuditLogsAction() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !user.roles.includes("SUPER_ADMIN")) {
    return { success: false, error: "Unauthorized" };
  }
  const result = await getAdminAuditLogs();
  return result;
}

export async function updateEmployeeRolesAction(userId: string, newRoles: string[]) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageEmployees(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }
  const result = await updateEmployeeRoles(userId, newRoles);
  if (result.success) {
    revalidatePath("/employees", "page");
  }
  return result;
}

export async function updateEmployeeProfileAction(userId: string, data: Record<string, unknown>) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageEmployees(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }
  const { updateEmployeeProfile } = await import("@/services/admin.service");
  const result = await updateEmployeeProfile(userId, data);
  if (result.success) {
    revalidatePath("/employees", "page");
  }
  return result;
}

export async function getSalaryHikesAction(employeeId: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const { getSalaryHikes } = await import("@/services/admin.service");
  const result = await getSalaryHikes(employeeId);
  return result;
}

export async function addSalaryHikeAction(employeeId: string, previousSalary: number, newSalary: number, effectiveDate: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageEmployees(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }
  const { addSalaryHike } = await import("@/services/admin.service");
  const result = await addSalaryHike(employeeId, previousSalary, newSalary, effectiveDate);
  if (result.success) {
    revalidatePath("/employees", "page");
  }
  return result;
}
