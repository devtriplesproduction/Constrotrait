"use server";

import { JobEntryService } from "@/services/job-entry.service";
import { Database } from "@/types/database";
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";
import { canManageClientsAndJobs, canViewJobCardDetails, isSuperAdmin } from "@/config/roles";

export async function updateJobEntryTestAction(
  id: string,
  testData: Omit<Database["public"]["Tables"]["job_entry_tests"]["Update"], "uid">
) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || !canManageClientsAndJobs(user.roles)) {
      return { success: false, error: "Unauthorized" };
    }
    const data = await JobEntryService.updateJobEntryTest(id, testData);
    return { success: true, data };
  } catch (error) {
    console.error("updateJobEntryTestAction error:", error);
    return { success: false, error: "Failed to update test details" };
  }
}

export async function getJobEntriesByClientIdAction(clientId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    const data = await JobEntryService.getJobEntriesByClientId(clientId);
    return { success: true, data };
  } catch (error) {
    console.error("getJobEntriesByClientIdAction error:", error);
    return { success: false, error: "Failed to retrieve job entries" };
  }
}

export async function getAllJobEntryTestsAction(branchId?: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || !canViewJobCardDetails(user.roles)) {
      return { success: false, error: "Unauthorized" };
    }
    const isSuper = isSuperAdmin(user.roles);
    const effectiveBranchId = isSuper ? branchId : (user.branch_id || undefined);
    const data = await JobEntryService.getAllJobEntryTests(effectiveBranchId);
    return { success: true, data };
  } catch (error) {
    console.error("getAllJobEntryTestsAction error:", error);
    return { success: false, error: "Failed to retrieve job entry tests" };
  }
}

export async function getAllJobEntriesAction(branchId?: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || !canViewJobCardDetails(user.roles)) {
      return { success: false, error: "Unauthorized" };
    }
    const isSuper = isSuperAdmin(user.roles);
    const effectiveBranchId = isSuper ? branchId : (user.branch_id || undefined);
    const data = await JobEntryService.getAllJobEntries(effectiveBranchId);
    return { success: true, data };
  } catch (error) {
    console.error("getAllJobEntriesAction error:", error);
    return { success: false, error: "Failed to retrieve job entries" };
  }
}

export async function getJobEntryByUidOrIdAction(identifier: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user || !canViewJobCardDetails(user.roles)) {
      return { success: false, error: "Unauthorized" };
    }
    const data = await JobEntryService.getJobEntryByUidOrId(identifier);
    return { success: true, data };
  } catch (error: any) {
    console.error("getJobEntryByUidOrIdAction error:", error);
    return { success: false, error: error.message || "Failed to retrieve job entry" };
  }
}

export async function getJobEntryTestsByJobEntryIdAction(jobEntryId: string) {
  try {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    const data = await JobEntryService.getJobEntryTestsByJobEntryId(jobEntryId);
    return { success: true, data };
  } catch (error) {
    console.error("getJobEntryTestsByJobEntryIdAction error:", error);
    return { success: false, error: "Failed to retrieve test details" };
  }
}
