import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserWithRoles } from "./auth.service";
import { canManageClientsAndJobs } from "@/config/roles";

export const ULRService = {
  /**
   * Issue ULR / QC numbers for all pending tests on p_date.
   * NABL catalogue tests on one job share one 18-char ULR.
   * Non-NABL tests get QC-WAI-YY-###### only.
   */
  async generateForDate(date: string) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!canManageClientsAndJobs(user.roles)) {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = await createClient();

    const { error } = await supabase.rpc("generate_ulr_for_date", {
      p_date: date,
    });

    if (error) {
      console.error("Failed to generate ULRs:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  },
};
