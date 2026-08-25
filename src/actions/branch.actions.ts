"use server";

import { revalidatePath } from "next/cache";
import { getBranches, createBranch, updateBranch } from "@/services/branch.service";

export async function getBranchesAction() {
  return getBranches();
}

export async function createBranchAction(name: string, code: string, address?: string, is_active: boolean = true) {
  const result = await createBranch(name, code, address, is_active);
  if (result.success) {
    revalidatePath("/branches", "page");
  }
  return result;
}

export async function updateBranchAction(id: string, updates: { name?: string, code?: string, address?: string, is_active?: boolean }) {
  const result = await updateBranch(id, updates);
  if (result.success) {
    revalidatePath("/branches", "page");
  }
  return result;
}
