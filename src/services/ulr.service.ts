import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserWithRoles } from "./auth.service";
import { canIssueLabReport, canManageClientsAndJobs } from "@/config/roles";

interface GenericRpcClient {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data?: unknown; error: { message: string; code?: string } | null }>;
}

export const ULRService = {
  async enqueueJob(jobEntryId: string) {
    const rawSupabase = await createClient();
    const supabase = (rawSupabase as unknown) as GenericRpcClient;
    const { error } = await supabase.rpc("enqueue_ulr_for_job", { p_job_entry_id: jobEntryId });
    if (error) throw new Error(error.message);
  },

  async generateForDate(date: string) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!canIssueLabReport(user.roles) && !canManageClientsAndJobs(user.roles)) {
      return { success: false, error: "Unauthorized" };
    }
    const rawSupabase = await createClient();
    const supabase = (rawSupabase as unknown) as GenericRpcClient;
    const { data, error } = await supabase.rpc("process_ulr_queue_for_date", { p_date: date });
    if (error) {
      if (error.message?.includes("Could not find function") || error.message?.includes("process_ulr_queue_for_date") || error.code === '42883') {
        return { success: false, error: "RPC missing. Please apply migrations 00001, 00002, 00003." };
      }
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },
};
