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

    let jobEntryTests: any[] | null = [];

    if (testsData && testsData.length > 0) {
      // Get the maximum UID currently in the database
      const { data: maxUidData, error: maxUidError } = await supabase
        .from('job_entry_tests')
        .select('uid')
        .order('uid', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxUidError) {
        console.error("Error fetching max UID:", maxUidError);
        throw new Error(maxUidError.message);
      }

      let nextUid = (maxUidData?.uid || 0) + 1;

      // 2. Create the associated tests
      const testsToInsert = testsData.map((test) => ({
        ...test,
        job_entry_id: jobEntry.id,
        uid: nextUid++,
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
   * Note: uid is excluded from the update type to enforce immutability
   */
  static async updateJobEntryTest(
    id: string,
    testData: Omit<Database["public"]["Tables"]["job_entry_tests"]["Update"], "uid">
  ) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    if (!canManageClientsAndJobs(user.roles)) throw new Error("Unauthorized: You do not have permission to manage job entries");

    const supabase = await createClient();
    
    // Explicitly ensure uid is not passed even if typescript is bypassed
    const dataToUpdate = { ...testData } as any;
    delete dataToUpdate.uid;

    const { data, error } = await supabase
      .from("job_entry_tests")
      .update(dataToUpdate)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating job entry test:", error);
      throw new Error(error.message);
    }

    return data;
  }
}
