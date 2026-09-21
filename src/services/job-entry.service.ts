import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

export class JobEntryService {
  /**
   * Create a new job entry and its associated tests
   */
  static async createJobEntryWithTests(
    jobData: Database["public"]["Tables"]["job_entries"]["Insert"],
    testsData: Omit<Database["public"]["Tables"]["job_entry_tests"]["Insert"], "job_entry_id">[]
  ) {
    const supabase = await createClient();

    // 1. Create the job entry
    const { data: jobEntry, error: jobError } = await supabase
      .from("job_entries")
      .insert(jobData)
      .select()
      .single();

    if (jobError) {
      console.error("Error creating job entry:", jobError);
      throw new Error(jobError.message);
    }

    if (!jobEntry) {
      throw new Error("Failed to create job entry");
    }

    // 2. Create the associated tests
    const testsToInsert = testsData.map((test) => ({
      ...test,
      job_entry_id: jobEntry.id,
    }));

    const { data: jobEntryTests, error: testsError } = await supabase
      .from("job_entry_tests")
      .insert(testsToInsert)
      .select();

    if (testsError) {
      console.error("Error creating job entry tests:", testsError);
      // We should ideally rollback here or have a transaction if Supabase provides RPC
      // but without RPC, we'll just throw
      throw new Error(testsError.message);
    }

    return { jobEntry, jobEntryTests };
  }

  /**
   * Get job entries by client ID
   */
  static async getJobEntriesByClientId(clientId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_entries")
      .select("*, job_entry_tests(*)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching job entries:", error);
      throw new Error(error.message);
    }

    return data;
  }
}
