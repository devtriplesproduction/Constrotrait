import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

export class JobEntryService {
  /**
   * Create a new test request/job entry
   */
  static async createJobEntry(jobData: Database["public"]["Tables"]["job_entries"]["Insert"]) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_entries")
      .insert(jobData)
      .select()
      .single();

    if (error) {
      console.error("Error creating job entry:", error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Get job entries by client ID
   */
  static async getJobEntriesByClientId(clientId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_entries")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching job entries:", error);
      throw new Error(error.message);
    }

    return data;
  }
}
