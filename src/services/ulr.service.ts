import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserWithRoles } from "./auth.service";
import { canIssueLabReport, canManageClientsAndJobs } from "@/config/roles";

export const ULRService = {
  async enqueueJob(jobEntryId: string) {
    const supabase = await createClient() as any;
    const { error } = await supabase.rpc("enqueue_ulr_for_job", { p_job_entry_id: jobEntryId });
    if (error) throw new Error(error.message);
  },

  async generateForDate(date: string) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!canIssueLabReport(user.roles) && !canManageClientsAndJobs(user.roles)) {
      return { success: false, error: "Unauthorized" };
    }
    const supabase = await createClient() as any;
    const { data, error } = await supabase.rpc("process_ulr_queue_for_date", { p_date: date });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },
};
