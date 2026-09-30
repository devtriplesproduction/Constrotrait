import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";
import { getAuthenticatedUserWithRoles } from "./auth.service";
import { canManageClientsAndJobs } from "@/config/roles";

export class JobEntryService {
  static async createJobEntryWithTests(
    jobData: Database["public"]["Tables"]["job_entries"]["Insert"],
    testsData: Omit<Database["public"]["Tables"]["job_entry_tests"]["Insert"], "job_entry_id">[]
  ) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    if (!canManageClientsAndJobs(user.roles)) {
      throw new Error("Unauthorized: You do not have permission to manage job entries");
    }

    const supabase = await createClient() as any;
    const { data: jobEntry, error: jobError } = await supabase
      .from("job_entries")
      .insert({ ...jobData })
      .select()
      .single();
    if (jobError || !jobEntry) throw new Error(jobError?.message || "Failed to create job entry");

    let jobEntryTests: any[] | null = [];
    if (testsData && testsData.length > 0) {
      const testsToInsert = testsData.map((test) => ({ ...test, job_entry_id: jobEntry.id }));
      const { data: insertedTests, error: testsError } = await supabase
        .from("job_entry_tests")
        .insert(testsToInsert)
        .select();
      if (testsError) {
        await supabase.from("job_entries").delete().eq("id", jobEntry.id);
        throw new Error(testsError.message);
      }
      jobEntryTests = insertedTests;
    }

    const { error: qErr } = await supabase.rpc("enqueue_ulr_for_job", { p_job_entry_id: jobEntry.id });
    if (qErr) {
      await supabase.from("job_entries").delete().eq("id", jobEntry.id);
      throw new Error(qErr.message || "Failed to enqueue job");
    }

    return { jobEntry, jobEntryTests };
  }

  static async getJobEntriesByClientId(clientId: string) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_entries")
      .select("*, job_entry_tests(*)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  static async updateJobEntryTest(
    id: string,
    testData: Database["public"]["Tables"]["job_entry_tests"]["Update"]
  ) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    if (!canManageClientsAndJobs(user.roles)) {
      throw new Error("Unauthorized: You do not have permission to manage job entries");
    }
    const supabase = await createClient() as any;
    const { data, error } = await supabase.from("job_entry_tests").update(testData).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    if (data?.job_entry_id) {
      await supabase.rpc("enqueue_ulr_for_job", { p_job_entry_id: data.job_entry_id });
    }
    return data;
  }

  static async getAllJobEntryTests() {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    if (!canManageClientsAndJobs(user.roles)) {
      throw new Error("Unauthorized: You do not have permission to view job entries");
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_entry_tests")
      .select(`*, job_entries ( id, created_at, client_id, uid, uid_label, clients ( id, name, email, mobile ) )`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }
}
