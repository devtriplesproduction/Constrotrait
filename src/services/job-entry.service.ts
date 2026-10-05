import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";
import { getAuthenticatedUserWithRoles } from "./auth.service";
import { canManageClientsAndJobs } from "@/config/roles";

export class JobEntryService {
  static async createJobEntryWithTests(
    jobData: Database["public"]["Tables"]["job_entries"]["Insert"],
    testsData: Omit<Database["public"]["Tables"]["job_entry_tests"]["Insert"], "job_entry_id">[],
    isDummyNabl?: boolean,
    dummyScheduledDays?: string
  ) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    if (!canManageClientsAndJobs(user.roles)) {
      throw new Error("Unauthorized: You do not have permission to manage job entries");
    }

    const supabase = await createClient() as any;
    
    let isNabl = false;

    if (testsData && testsData.length > 0) {
      const testMasterIds = testsData.map((t) => t.test_master_id).filter(Boolean);
      let testMasters: any[] = [];
      if (testMasterIds.length > 0) {
        const { data: tmData } = await supabase.from("test_master").select("id, is_nabl").in("id", testMasterIds as string[]);
        testMasters = tmData || [];
      }

      const isNablSet = new Set(testsData.map(test => {
        const tm = testMasters.find((x: any) => x.id === test.test_master_id);
        return !!tm?.is_nabl;
      }));

      if (isNablSet.size > 1) {
        throw new Error("All tests in a job entry must have the same NABL status");
      }

      isNabl = Array.from(isNablSet)[0] || false;
    } else if (isDummyNabl !== undefined) {
      isNabl = isDummyNabl;
    }

    const createdDate = new Date();
    const month = createdDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const jobYear = createdDate.getFullYear();
    let firstUidLabel: string | null = null;
    let firstUid: number | null = null;

    if (isNabl) {
      const { data, error } = await supabase.rpc("next_uid_seq", { p_name: "UID_NABL", p_year: jobYear });
      if (error) throw new Error("UID Generation failed: " + error.message);
      firstUidLabel = data.toString();
      firstUid = parseInt(firstUidLabel as string, 10);
    } else {
      const counterName = `UID_${month}`;
      const { data, error } = await supabase.rpc("next_uid_seq", { p_name: counterName, p_year: jobYear });
      if (error) throw new Error("UID Generation failed: " + error.message);
      firstUidLabel = `${month}-${data.toString().padStart(2, '0')}`;
    }
    
    const jobInsertData = { 
      ...jobData, 
      uid_label: firstUidLabel, 
      uid: firstUid, 
      is_nabl: isNabl 
    };

    const { data: jobEntry, error: jobError } = await supabase
      .from("job_entries")
      .insert([jobInsertData])
      .select()
      .single();
    if (jobError || !jobEntry) throw new Error(jobError?.message || "Failed to create job entry");

    let jobEntryTests: any[] | null = [];
    let uidsIssued: string[] = [firstUidLabel as string];

    if (testsData && testsData.length > 0) {
      for (const t of testsData) {
        (t as any).uid_label = firstUidLabel;
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

      const { error: qErr } = await supabase.rpc("enqueue_ulr_for_job", { p_job_entry_id: jobEntry.id });
      if (qErr) {
        await supabase.from("job_entries").delete().eq("id", jobEntry.id);
        throw new Error(qErr.message || "Failed to enqueue job");
      }
    } else {
      // It's a dummy job card, enqueue it with the scheduled date
      if (dummyScheduledDays) {
        let scheduledDate = new Date();
        const days = parseInt(dummyScheduledDays, 10);
        if (!isNaN(days) && days > 0) {
          scheduledDate.setDate(scheduledDate.getDate() + days);
        }
        const formattedDate = scheduledDate.toISOString().split('T')[0];
        
        const { error: qErr } = await supabase.from('ulr_generation_queue').insert({
          job_entry_id: jobEntry.id,
          scheduled_on: formattedDate,
          status: 'queued'
        });
        if (qErr) {
          console.error("Failed to enqueue dummy job card:", qErr);
        }
      } else {
        // Enqueue immediately if no schedule provided
        await supabase.from('ulr_generation_queue').insert({
          job_entry_id: jobEntry.id,
          scheduled_on: new Date().toISOString().split('T')[0],
          status: 'queued'
        });
      }
    }

    return { jobEntry, jobEntryTests, uidsIssued };
  }

  static async createDummyJobCard(isNabl: boolean) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    const supabase = await createClient() as any;

    let clientId = "";
    const { data: existingDummy } = await supabase.from('clients').select('id').eq('name', 'Dummy Client').limit(1).single();
    if (existingDummy) {
      clientId = existingDummy.id;
    } else {
      const { data: newDummy, error: err } = await supabase.from('clients').insert({ name: 'Dummy Client', company_name: 'DUMMY' }).select('id').single();
      if (err) throw err;
      clientId = newDummy.id;
    }

    const createdDate = new Date();
    const month = createdDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const jobYear = createdDate.getFullYear();

    let currentUidLabel = "";
    let uidInt = null;

    if (isNabl) {
      const { data, error } = await supabase.rpc("next_uid_seq", { p_name: "UID_NABL", p_year: jobYear });
      if (error) throw new Error("UID Generation failed: " + error.message);
      currentUidLabel = data.toString();
      uidInt = parseInt(data.toString(), 10);
    } else {
      const counterName = `UID_${month}`;
      const { data, error } = await supabase.rpc("next_uid_seq", { p_name: counterName, p_year: jobYear });
      if (error) throw new Error("UID Generation failed: " + error.message);
      currentUidLabel = `${month}-${data.toString().padStart(2, '0')}`;
    }

    const { data: jobEntry, error: jobError } = await supabase
      .from("job_entries")
      .insert({ client_id: clientId, uid_label: currentUidLabel, uid: uidInt, is_nabl: isNabl })
      .select()
      .single();
    if (jobError) throw new Error(jobError.message);

    return jobEntry;
  }

  static async addTestsToJobEntry(
    jobEntryId: string,
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
      .select("*")
      .eq("id", jobEntryId)
      .single();
    if (jobError || !jobEntry) throw new Error("Job entry not found");

    if (!testsData || testsData.length === 0) return { jobEntryTests: [], uidsIssued: [] };

    const testMasterIds = testsData.map((t) => t.test_master_id).filter(Boolean);
    let testMasters: any[] = [];
    if (testMasterIds.length > 0) {
      const { data: tmData } = await supabase.from("test_master").select("id, category, is_nabl").in("id", testMasterIds as string[]);
      testMasters = tmData || [];
    }

    const isNablCard = !!jobEntry.is_nabl;
    const uidsIssued: string[] = [];
    if (jobEntry.uid_label) uidsIssued.push(jobEntry.uid_label);

    for (const test of testsData) {
      const tm = testMasters.find((x: any) => x.id === test.test_master_id);
      const isTestNabl = !!tm?.is_nabl;
      if (isTestNabl !== isNablCard) {
        throw new Error(`Test NABL status (${isTestNabl ? 'NABL' : 'Non-NABL'}) does not match the Job Card (${isNablCard ? 'NABL' : 'Non-NABL'}).`);
      }
      (test as any).uid_label = jobEntry.uid_label;
    }

    const testsToInsert = testsData.map((test) => ({ ...test, job_entry_id: jobEntry.id }));
    const { data: insertedTests, error: testsError } = await supabase
      .from("job_entry_tests")
      .insert(testsToInsert)
      .select();
      
    if (testsError) throw new Error(testsError.message);

    await supabase.rpc("enqueue_ulr_for_job", { p_job_entry_id: jobEntry.id });

    return { jobEntryTests: insertedTests, uidsIssued };
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
      .select(`*, job_assignments ( id, status, report_url, reviewer_remark ), job_entries!job_entry_tests_job_entry_id_fkey ( id, created_at, client_id, uid, uid_label, inward_on, clients ( id, name, email, mobile, address, site_name, dispatch_name, dispatch_address, contact_person ) ), test_master ( id, component_parameter, specific_test )`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  static async getAllJobEntries() {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    if (!canManageClientsAndJobs(user.roles)) {
      throw new Error("Unauthorized: You do not have permission to view job entries");
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_entries")
      .select(`*, job_entry_tests!job_entry_tests_job_entry_id_fkey (*, job_assignments(id, status, report_url, reviewer_remark), test_master(id, component_parameter, specific_test)), clients ( id, name, email, mobile, address, site_name, dispatch_name, dispatch_address, contact_person )`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }
}
