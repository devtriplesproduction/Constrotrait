"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canManageTestResults, isSuperAdmin } from "@/config/roles";
import { TestResultService, TestResultInsert } from "@/services/test-result.service";

export async function listTestsForResultsAction() {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) {
      return { success: false, error: "Unauthorized access" };
    }

    if (!canManageTestResults(user.roles)) {
      return { success: false, error: "Insufficient permissions to view tests" };
    }

    const branchFilter = isSuperAdmin(user.roles) ? null : user.branch_id;
    const data = await TestResultService.listTestsForResults(branchFilter);
    return { success: true, data };
  } catch (error) {
    console.error("listTestsForResultsAction error:", error);
    return { success: false, error: "Failed to retrieve tests for results" };
  }
}

export async function getResultRowsAction(jobEntryTestId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) {
      return { success: false, error: "Unauthorized access" };
    }

    if (!canManageTestResults(user.roles)) {
      return { success: false, error: "Insufficient permissions to view test results" };
    }

    if (!jobEntryTestId || typeof jobEntryTestId !== "string") {
      return { success: false, error: "Invalid test ID provided" };
    }

    const data = await TestResultService.getResultRows(jobEntryTestId);
    return { success: true, data };
  } catch (error) {
    console.error("getResultRowsAction error:", error);
    return { success: false, error: "Failed to retrieve test result rows" };
  }
}

export async function saveResultRowsAction(
  jobEntryTestId: string,
  rows: Omit<TestResultInsert, "job_entry_test_id">[]
) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) {
      return { success: false, error: "Unauthorized access" };
    }

    if (!canManageTestResults(user.roles)) {
      return { success: false, error: "Insufficient permissions to save test results" };
    }

    if (!jobEntryTestId || typeof jobEntryTestId !== "string") {
      return { success: false, error: "Invalid test ID provided" };
    }

    await TestResultService.saveResultRows(jobEntryTestId, rows);
    revalidatePath("/results");
    revalidatePath("/job-assignments");
    return { success: true };
  } catch (error) {
    console.error("saveResultRowsAction error:", error);
    return { success: false, error: "Failed to save test results" };
  }
}
