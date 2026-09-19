"use server";

import { revalidatePath } from "next/cache";
import { testService } from "@/services/test.service";
import { CreateTestInput, createTestSchema } from "@/lib/validations/test";

export async function createTestMasterAction(data: CreateTestInput) {
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

export async function getTestsAction() {
  return await testService.getTests();
}
