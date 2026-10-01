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
    let uidsIssued: string[] = [];

    if (testsData && testsData.length > 0) {
      const testMasterIds = testsData.map((t) => t.test_master_id).filter(Boolean);
      let testMasters: any[] = [];
      if (testMasterIds.length > 0) {
        const { data: tmData } = await supabase.from("test_master").select("id, category, is_nabl").in("id", testMasterIds as string[]);
        testMasters = tmData || [];
      }

      const groups = new Map<string, typeof testsData>();
      for (const test of testsData) {
        const tm = testMasters.find((x: any) => x.id === test.test_master_id);
        const isNabl = tm?.is_nabl ? 'true' : 'false';
        let category = tm?.category?.trim();
        if (!category) category = 'Construction';
        
        let age = '0';
        if (test.testing_age) {
          const ta = String(test.testing_age).trim();
          if (ta.includes('28')) age = '28';
          else if (ta === '7' || ta.startsWith('7 ') || ta.startsWith('7-') || ta.toLowerCase().startsWith('7d')) age = '7';
        }
        const key = `${isNabl}|${category}|${age}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(test);
      }

      const createdDate = jobEntry.created_at ? new Date(jobEntry.created_at) : new Date();
      const month = createdDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const jobYear = createdDate.getFullYear();
      let firstUidLabel: string | null = null;

      for (const [key, groupTests] of Array.from(groups.entries())) {
        const [isNabl, category, age] = key.split('|');
        let currentUidLabel = "";

        if (isNabl === 'true') {
          const { data, error } = await supabase.rpc("next_uid_seq", { p_name: "UID_NABL", p_year: jobYear });
          if (error) throw new Error("UID Generation failed: " + error.message);
          currentUidLabel = data.toString();
        } else {
          const counterName = `UID_${month}`;
          const { data, error } = await supabase.rpc("next_uid_seq", { p_name: counterName, p_year: jobYear });
          if (error) throw new Error("UID Generation failed: " + error.message);
          currentUidLabel = `${month}-${data.toString().padStart(2, '0')}`;
        }

        if (!firstUidLabel) firstUidLabel = currentUidLabel;

        uidsIssued.push(currentUidLabel);

        for (const t of groupTests) {
          (t as any).uid_label = currentUidLabel;
        }
      }

      if (firstUidLabel) {
        const isAllDigits = /^\d+$/.test(firstUidLabel);
        await supabase.from("job_entries").update({ 
          uid_label: firstUidLabel, 
          uid: isAllDigits ? parseInt(firstUidLabel, 10) : null 
        }).eq("id", jobEntry.id);
        jobEntry.uid_label = firstUidLabel;
      }

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
      // On enqueue_ulr_for_job failure: do not leave a half job. 
      // Delete job (CASCADE tests) but document that the counter will skip a number — acceptable.
      await supabase.from("job_entries").delete().eq("id", jobEntry.id);
      throw new Error(qErr.message || "Failed to enqueue job");
    }

    return { jobEntry, jobEntryTests, uidsIssued };
  }

  static async getJobEntriesByClientId(clientId: string) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_entries")
      .select("*, job_entry_tests!job_entry_tests_job_entry_id_fkey(*)")
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
      .select(`*, job_assignments ( id, status, report_url, reviewer_remark ), job_entries!job_entry_tests_job_entry_id_fkey ( id, created_at, client_id, uid, uid_label, clients ( id, name, email, mobile ) )`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }
}
