"use server";

import { onboardEmployee } from "@/services/employee.service";
import { OnboardFormData } from "@/lib/validations/onboard";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser, getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canManageEmployees } from "@/config/roles";

export async function onboardEmployeeAction(data: OnboardFormData) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageEmployees(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }
  const result = await onboardEmployee(data);
  if (result.success) {
    revalidatePath("/employees", "page");
  }
  return result;
}

export async function getCurrentUserProfileAction() {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const { getCurrentUserProfile } = await import("@/services/employee.service");
  return getCurrentUserProfile();
}

export async function getTodayBirthdaysAction() {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const { getTodayBirthdays } = await import("@/services/employee.service");
  return getTodayBirthdays();
}
