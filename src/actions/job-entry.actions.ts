"use server";

import { JobEntryService } from "@/services/job-entry.service";
import { Database } from "@/types/database";

export async function updateJobEntryTestAction(
  id: string,
  testData: Omit<Database["public"]["Tables"]["job_entry_tests"]["Update"], "uid">
) {
  try {
    const data = await JobEntryService.updateJobEntryTest(id, testData);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getJobEntriesByClientIdAction(clientId: string) {
  try {
    const data = await JobEntryService.getJobEntriesByClientId(clientId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
