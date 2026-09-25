import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";
import { getAuthenticatedUserWithRoles } from "./auth.service";
import { canManageClientsAndJobs } from "@/config/roles";

export class JobEntryService {
  /**
   * Create a new job entry and its associated tests
   */
  static async createJobEntryWithTests(
    jobData: Database["public"]["Tables"]["job_entries"]["Insert"],
    testsData: Omit<Database["public"]["Tables"]["job_entry_tests"]["Insert"], "job_entry_id">[]
  ) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    if (!canManageClientsAndJobs(user.roles)) throw new Error("Unauthorized: You do not have permission to manage job entries");

    const supabase = await createClient();

    // Get the maximum UID currently in the database for job_entries
    const { data: maxUidData, error: maxUidError } = await supabase
      .from('job_entries')
      .select('uid')
      .not('uid', 'is', null)
      .order('uid', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxUidError) {
      console.error("Error fetching max UID:", maxUidError);
      throw new Error(maxUidError.message);
    }

    const nextUid = (maxUidData?.uid || 0) + 1;

    // 1. Create the job entry with uid
    const { data: jobEntry, error: jobError } = await supabase
      .from("job_entries")
      .insert({ ...jobData, uid: nextUid })
      .select()
      .single();

    if (jobError) {
      console.error("Error creating job entry:", jobError);
      throw new Error(jobError.message);
    }

    if (!jobEntry) {
      throw new Error("Failed to create job entry");
    }

    let jobEntryTests: any[] | null = [];

    if (testsData && testsData.length > 0) {
      // 2. Create the associated tests without uid
      const testsToInsert = testsData.map((test) => ({
        ...test,
        job_entry_id: jobEntry.id,
      }));

      const { data: insertedTests, error: testsError } = await supabase
        .from("job_entry_tests")
        .insert(testsToInsert)
        .select();

      if (testsError) {
        console.error("Error creating job entry tests:", testsError);
        
        // Rollback: delete the created job entry
        const { error: rollbackError } = await supabase
          .from("job_entries")
          .delete()
          .eq("id", jobEntry.id);
          
        if (rollbackError) {
          console.error("Failed to rollback job entry after test insertion failure:", rollbackError);
          throw new Error(`Failed to create job entry tests: ${testsError.message}. Also failed to cleanup: ${rollbackError.message}`);
        }
        
        throw new Error(testsError.message);
      }

      jobEntryTests = insertedTests;
    }

    return { jobEntry, jobEntryTests };
  }

  /**
   * Get job entries by client ID
   */
  static async getJobEntriesByClientId(clientId: string) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");

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

  /**
   * Update an existing job entry test (inward)
   */
  static async updateJobEntryTest(
    id: string,
    testData: Database["public"]["Tables"]["job_entry_tests"]["Update"]
  ) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    if (!canManageClientsAndJobs(user.roles)) throw new Error("Unauthorized: You do not have permission to manage job entries");

    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("job_entry_tests")
      .update(testData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating job entry test:", error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Get all job entry tests (job cards) across all clients with client details
   */
  static async getAllJobEntryTests() {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    if (!canManageClientsAndJobs(user.roles)) throw new Error("Unauthorized: You do not have permission to view job entries");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_entry_tests")
      .select(`
        *,
        job_entries (
          id,
          created_at,
          client_id,
          clients (
            id,
            name,
            email,
            mobile
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all job entry tests:", error);
      throw new Error(error.message);
    }

    return data;
  }
}
