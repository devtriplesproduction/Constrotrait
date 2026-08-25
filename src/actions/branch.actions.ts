"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { BranchFormData } from "@/lib/validations/branch";
import { createBranch, updateBranch, toggleBranchActive } from "@/services/branch.service";

export async function createBranchAction(data: BranchFormData) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !user.roles.includes("SUPER_ADMIN")) {
    return { success: false, error: "Unauthorized. Only Super Admins can create branches." };
  }

  const result = await createBranch(data);
  if (result.success) {
    revalidatePath("/branches", "page");
  }
  return result;
}

export async function updateBranchAction(id: string, data: BranchFormData) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !user.roles.includes("SUPER_ADMIN")) {
    return { success: false, error: "Unauthorized. Only Super Admins can update branches." };
  }

  const result = await updateBranch(id, data);
  if (result.success) {
    revalidatePath("/branches", "page");
  }
  return result;
}

export async function toggleBranchActiveAction(id: string, isActive: boolean) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !user.roles.includes("SUPER_ADMIN")) {
    return { success: false, error: "Unauthorized. Only Super Admins can change branch status." };
  }

  const result = await toggleBranchActive(id, isActive);
  if (result.success) {
    revalidatePath("/branches", "page");
  }
  return result;
}
