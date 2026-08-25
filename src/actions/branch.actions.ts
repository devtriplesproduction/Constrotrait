"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { branchSchema, BranchFormData } from "@/lib/validations/branch";
import { createBranch, updateBranch, toggleBranchActive, getActiveBranches } from "@/services/branch.service";

export async function getActiveBranchesAction() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }
  
  if (!user.roles.includes("SUPER_ADMIN")) {
    return { success: false, error: "Forbidden. Only Super Admins can list active branches for assignment." };
  }

  return getActiveBranches();
}

export async function createBranchAction(data: BranchFormData) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const validationResult = branchSchema.safeParse(data);
  if (!validationResult.success) {
    return { success: false, error: "Validation failed. Please check your input." };
  }

  if (!user.roles.includes("SUPER_ADMIN")) {
    return { success: false, error: "Forbidden. Only Super Admins can create branches." };
  }

  const result = await createBranch(validationResult.data);
  if (result.success) {
    revalidatePath("/branches", "page");
  }
  return result;
}

export async function updateBranchAction(id: string, data: BranchFormData) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  if (!id || typeof id !== "string") {
    return { success: false, error: "Invalid branch ID." };
  }

  const validationResult = branchSchema.safeParse(data);
  if (!validationResult.success) {
    return { success: false, error: "Validation failed. Please check your input." };
  }

  if (!user.roles.includes("SUPER_ADMIN")) {
    return { success: false, error: "Forbidden. Only Super Admins can update branches." };
  }

  const result = await updateBranch(id, validationResult.data);
  if (result.success) {
    revalidatePath("/branches", "page");
  }
  return result;
}

export async function toggleBranchActiveAction(id: string, isActive: boolean) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  if (!id || typeof id !== "string") {
    return { success: false, error: "Invalid branch ID." };
  }

  if (typeof isActive !== "boolean") {
    return { success: false, error: "Invalid status value." };
  }

  if (!user.roles.includes("SUPER_ADMIN")) {
    return { success: false, error: "Forbidden. Only Super Admins can change branch status." };
  }

  const result = await toggleBranchActive(id, isActive);
  if (result.success) {
    revalidatePath("/branches", "page");
  }
  return result;
}
