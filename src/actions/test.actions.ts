"use server";

import { revalidatePath } from "next/cache";
import { testService } from "@/services/test.service";
import { CreateTestInput, createTestSchema } from "@/lib/validations/test";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canManageTestMaster } from "@/config/roles";

export async function createTestMasterAction(data: CreateTestInput) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageTestMaster(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }

  // Validate input
  const validationResult = createTestSchema.safeParse(data);
  if (!validationResult.success) {
    return { success: false, error: "Invalid test data provided" };
  }

  const result = await testService.createTestMaster(validationResult.data);
  
  if (result.success) {
    revalidatePath("/tests");
  }
  
  return result;
}

export async function getTestsAction(branchId?: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user) return { success: false, error: "Unauthorized" };
  return await testService.getTests(branchId);
}

export async function getQrDocumentsAction() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user) return { success: false, error: "Unauthorized" };
  return await testService.getQrDocuments();
}

export async function updateTestMasterAction(id: string, data: CreateTestInput) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageTestMaster(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }

  const validationResult = createTestSchema.safeParse(data);
  if (!validationResult.success) {
    return { success: false, error: "Invalid test data provided" };
  }

  const result = await testService.updateTestMaster(id, validationResult.data);
  
  if (result.success) {
    revalidatePath("/tests");
  }
  
  return result;
}

export async function deleteTestMasterAction(id: string) {
  const user = await getAuthenticatedUserWithRoles();
  if (!user || !canManageTestMaster(user.roles)) {
    return { success: false, error: "Unauthorized" };
  }

  const result = await testService.deleteTestMaster(id);
  if (result.success) {
    revalidatePath("/tests");
  }
  return result;
}
