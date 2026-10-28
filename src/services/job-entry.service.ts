import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";
import { getAuthenticatedUserWithRoles } from "./auth.service";
import { canManageClientsAndJobs, isSuperAdmin } from "@/config/roles";
import { compareJobCardsByUidRecentFirst } from "@/utils/uid-sort";

export class JobEntryService {
  static toRoman(num: number): string {
    const roman: { [key: string]: number } = {
      M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90,
      L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1
    };
    let str = '';
    for (const i of Object.keys(roman)) {
      const q = Math.floor(num / roman[i]);
      num -= q * roman[i];
      str += i.repeat(q);
    }
    return str;
  }

  static deriveTestInitials(testName?: string | null): string {
    if (!testName || typeof testName !== "string") return "";
    const clean = testName.replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").trim();
    const words = clean.split(/[^a-zA-Z0-9]+/).filter(Boolean).filter(w => {
      const l = w.toLowerCase();
      return !["of", "the", "in", "for", "by", "to", "and", "as", "per", "a", "an", "on", "at", "with"].includes(l);
    });
    if (words.length === 0) return "";
    if (words.length === 1) {
      const w = words[0];
      if (w.toLowerCase() === "cube") return "CC";
      if (w.length <= 3) return w.toUpperCase();
      return w.slice(0, 2).toUpperCase();
    }
    return words.slice(0, 4).map(w => w[0]).join("").toUpperCase();
  }

  private static async buildSampleCodes(
    supabase: any,
    jobYear: number,
    materialInitials: string | undefined,
    testMasters: any[],
    testsData: any[]
  ): Promise<string[]> {
    if (!testsData || testsData.length === 0 || !testMasters || testMasters.length === 0) {
      return [];
    }

    const firstTestMaster = testMasters.find((x: any) => x.id === testsData[0].test_master_id);
    let initials = materialInitials?.trim();
    if (!initials) {
      const matOrTestName = firstTestMaster?.material_product || testsData[0]?.material_description || firstTestMaster?.component_parameter || firstTestMaster?.specific_test;
      initials = JobEntryService.deriveTestInitials(matOrTestName);
    }
    // Strictly sanitize initials: uppercase letters and digits only, no commas or slashes
    initials = (initials || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!initials) {
      initials = JobEntryService.deriveTestInitials(firstTestMaster?.material_product || testsData[0]?.material_description) || "GEN";
    }

    const category = firstTestMaster?.category === 'Environmental' ? 'ENV' : 'CON';
    const yy = jobYear.toString().slice(-2);
    const nextYy = (jobYear + 1).toString().slice(-2);
    const yearSegment = `${yy}-${nextYy}`;

    const seqName = category === 'ENV' ? 'SAMPLE_ENV' : 'SAMPLE_CON';
    const { data: sampleData, error: sampleError } = await supabase.rpc("next_uid_seq", { p_name: seqName, p_year: jobYear });
    if (sampleError || !sampleData) {
      throw new Error(`Sample Code Generation failed for ${seqName}: ` + (sampleError?.message || "No sequence returned"));
    }
    
    const sampleNo = sampleData.toString();
    const sampleQuantityStr = testsData[0].sample_quantity || "1";
    const sampleQuantityMatch = sampleQuantityStr.match(/\d+/);
    let qty = sampleQuantityMatch ? parseInt(sampleQuantityMatch[0], 10) : 1;
    const matId = testsData[0].material_id;
    if (qty === 1 && matId && typeof matId === 'string' && matId.includes(',')) {
      const matCount = matId.split(',').filter((s: string) => s.trim().length > 0).length;
      if (matCount > 1) qty = matCount;
    }
    if (isNaN(qty) || qty <= 0) qty = 1;

    const sampleCodes: string[] = [];
    for (let i = 1; i <= qty; i++) {
      sampleCodes.push(`CMTS/${category}/${initials}/${yearSegment}/${sampleNo}-${JobEntryService.toRoman(i)}`);
    }
    return sampleCodes;
  }
  static async createJobEntryWithTests(
    jobData: Database["public"]["Tables"]["job_entries"]["Insert"],
    testsData: Omit<Database["public"]["Tables"]["job_entry_tests"]["Insert"], "job_entry_id">[],
    isDummyNabl?: boolean,
    dummyScheduledDays?: string,
    nonNablMonth?: string,
    materialInitials?: string
  ) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    if (!canManageClientsAndJobs(user.roles)) {
      throw new Error("Unauthorized: You do not have permission to manage job entries");
    }

    const isSuper = isSuperAdmin(user.roles);
    const targetBranchId = jobData.branch_id || (isSuper ? jobData.branch_id : user.branch_id) || user.branch_id;
    if (!targetBranchId) {
      throw new Error("A valid branch must be assigned to create an inward job entry.");
    }

    const supabase = await createClient() as any;
    
    let isNabl = false;
    let testMasters: any[] = [];

    if (testsData && testsData.length > 0) {
      const testMasterIds = testsData.map((t) => t.test_master_id).filter(Boolean);
      if (testMasterIds.length > 0) {
        const { data: tmData } = await supabase.from("test_master").select("id, is_nabl, category, material_product").in("id", testMasterIds as string[]);
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
    const jobYear = createdDate.getFullYear();
    let firstUidLabel: string | null = null;
    let firstUid: number | null = null;

    if (isNabl) {
      const { data, error } = await supabase.rpc("next_uid_seq", { p_name: "UID_NABL", p_year: jobYear });
      if (error) throw new Error("UID Generation failed: " + error.message);
      firstUidLabel = data.toString();
      firstUid = parseInt(firstUidLabel as string, 10);
    } else {
      if (!nonNablMonth) throw new Error("A valid month must be provided for non-NABL tests.");
      const month = nonNablMonth;
      const counterName = `UID_${month}`;
      const { data, error } = await supabase.rpc("next_uid_seq", { p_name: counterName, p_year: jobYear });
      if (error) throw new Error("UID Generation failed: " + error.message);
      firstUidLabel = `${month}-${data.toString().padStart(2, '0')}`;
    }
    
    const jobInsertData = { 
      ...jobData, 
      branch_id: targetBranchId,
      uid_label: firstUidLabel, 
      uid: firstUid, 
      is_nabl: isNabl 
    };

    const { data: jobEntry, error: jobError } = await supabase
      .from("job_entries")
      .insert([jobInsertData])
      .select("*, branches ( id, name, code )")
      .single();
    if (jobError || !jobEntry) throw new Error(jobError?.message || "Failed to create job entry");

    let jobEntryTests: any[] | null = [];
    const uidsIssued: string[] = [firstUidLabel as string];

    const sampleCodes: string[] = await JobEntryService.buildSampleCodes(supabase, jobYear, materialInitials, testMasters, testsData);

    if (testsData && testsData.length > 0) {
      for (const t of testsData) {
        (t as any).uid_label = firstUidLabel;
        if (!t.additional_details_values) t.additional_details_values = {};
        if (sampleCodes.length > 0) {
          (t.additional_details_values as any).sample_code_no = sampleCodes.join(', ');
        }
        const effectiveInitials = materialInitials || (t.additional_details_values as any)?.test_initials || (t.additional_details_values as any)?.material_initials;
        if (effectiveInitials) {
          (t.additional_details_values as any).material_initials = effectiveInitials;
          (t.additional_details_values as any).test_initials = effectiveInitials;
        }
      }

      const testsToInsert = testsData.map((test) => {
        const tm = testMasters.find((x: any) => x.id === test.test_master_id);
        return {
          ...test,
          material_description: test.material_description || tm?.material_product || null,
          job_entry_id: jobEntry.id,
        };
      });
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
        const scheduledDate = new Date();
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

  static async createDummyJobCard(isNabl: boolean, branchId?: string) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    const supabase = await createClient() as any;

    const isSuper = isSuperAdmin(user.roles);
    const targetBranchId = (isSuper && branchId && branchId !== "all") ? branchId : user.branch_id;
    if (!targetBranchId) throw new Error("A valid branch is required to create a dummy job card.");

    let clientId = "";
    const { data: existingDummy } = await supabase.from('clients').select('id').eq('name', 'Dummy Client').eq('branch_id', targetBranchId).limit(1).maybeSingle();
    if (existingDummy) {
      clientId = existingDummy.id;
    } else {
      const { data: newDummy, error: err } = await supabase.from('clients').insert({ name: 'Dummy Client', company_name: 'DUMMY', branch_id: targetBranchId }).select('id').single();
      if (err) throw err;
      clientId = newDummy.id;
    }

    const createdDate = new Date();
    const jobYear = createdDate.getFullYear();

    const { data, error } = await supabase.rpc("next_uid_seq", { p_name: "UID_NABL", p_year: jobYear });
    if (error) throw new Error("UID Generation failed: " + error.message);
    const currentUidLabel = data.toString();
    const uidInt = parseInt(data.toString(), 10);

    const { data: jobEntry, error: jobError } = await supabase
      .from("job_entries")
      .insert({ client_id: clientId, branch_id: targetBranchId, uid_label: currentUidLabel, uid: uidInt, is_nabl: true })
      .select("*, branches ( id, name, code )")
      .single();
    if (jobError) throw new Error(jobError.message);

    return jobEntry;
  }

  static async addTestsToJobEntry(
    jobEntryId: string,
    testsData: Omit<Database["public"]["Tables"]["job_entry_tests"]["Insert"], "job_entry_id">[],
    materialInitials?: string
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

    const { data: existingTests } = await supabase
      .from("job_entry_tests")
      .select("additional_details_values")
      .eq("job_entry_id", jobEntryId);

    let existingSampleCodeNo: string | null = null;
    const valid5Part = /^CMTS\/(?:CON|ENV)\/[^\/]+\/\d{2}-\d{2}\/\d+/i;
    if (existingTests && existingTests.length > 0) {
      for (const t of existingTests) {
        const code = (t.additional_details_values as any)?.sample_code_no;
        if (code && valid5Part.test(code.split(',')[0].trim())) {
          existingSampleCodeNo = code;
          break;
        }
      }
    }

    let sampleCodesStr = existingSampleCodeNo;
    if (!sampleCodesStr) {
      const jobYear = new Date(jobEntry.created_at).getFullYear();
      const sampleCodes = await JobEntryService.buildSampleCodes(supabase, jobYear, materialInitials, testMasters, testsData);
      if (sampleCodes.length > 0) {
        sampleCodesStr = sampleCodes.join(', ');
      }
    }

    for (const test of testsData) {
      const tm = testMasters.find((x: any) => x.id === test.test_master_id);
      const isTestNabl = !!tm?.is_nabl;
      if (isTestNabl !== isNablCard) {
        throw new Error(`Test NABL status (${isTestNabl ? 'NABL' : 'Non-NABL'}) does not match the Job Card (${isNablCard ? 'NABL' : 'Non-NABL'}).`);
      }
      (test as any).uid_label = jobEntry.uid_label;
      if (!test.additional_details_values) test.additional_details_values = {};
      if (sampleCodesStr) {
        (test.additional_details_values as any).sample_code_no = sampleCodesStr;
      }
      const effectiveInitials = materialInitials || (test.additional_details_values as any)?.test_initials || (test.additional_details_values as any)?.material_initials;
      if (effectiveInitials) {
        (test.additional_details_values as any).material_initials = effectiveInitials;
        (test.additional_details_values as any).test_initials = effectiveInitials;
      }
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
      .select("*, job_entry_tests!job_entry_tests_job_entry_id_fkey(*, test_master(*))")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).sort(compareJobCardsByUidRecentFirst);
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

  static async getAllJobEntryTests(branchId?: string) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    if (!canManageClientsAndJobs(user.roles)) {
      throw new Error("Unauthorized: You do not have permission to view job entries");
    }
    const supabase = await createClient();
    let query = supabase
      .from("job_entry_tests")
      .select(`*, job_assignments ( id, status, report_url, reviewer_remark ), job_entries!job_entry_tests_job_entry_id_fkey!inner ( *, clients ( * ), branches ( id, name, code ) ), test_master ( * )`)
      .order("created_at", { ascending: false });

    const isSuper = isSuperAdmin(user.roles);
    if (isSuper) {
      if (branchId && branchId !== "all") {
        query = query.eq("job_entries.branch_id", branchId);
      }
    } else {
      if (user.branch_id) {
        query = query.eq("job_entries.branch_id", user.branch_id);
      } else {
        return [];
      }
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  static async getAllJobEntries(branchId?: string) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    if (!canManageClientsAndJobs(user.roles)) {
      throw new Error("Unauthorized: You do not have permission to view job entries");
    }
    const supabase = await createClient();
    let query = supabase
      .from("job_entries")
      .select(`*, branches ( id, name, code ), job_entry_tests!job_entry_tests_job_entry_id_fkey (*, job_assignments(id, status, report_url, reviewer_remark), test_master(*)), clients ( * )`)
      .order("created_at", { ascending: false });

    const isSuper = isSuperAdmin(user.roles);
    if (isSuper) {
      if (branchId && branchId !== "all") {
        query = query.eq("branch_id", branchId);
      }
    } else {
      if (user.branch_id) {
        query = query.eq("branch_id", user.branch_id);
      } else {
        return [];
      }
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).sort(compareJobCardsByUidRecentFirst);
  }

  static async getJobEntryByUidOrId(identifier: string) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    if (!canManageClientsAndJobs(user.roles)) {
      throw new Error("Unauthorized: You do not have permission to view job entries");
    }
    const supabase = await createClient();

    let query = supabase
      .from("job_entries")
      .select(`
        *,
        branches ( id, name, code ),
        clients ( * ),
        job_entry_tests!job_entry_tests_job_entry_id_fkey (
          *,
          test_master ( * ),
          job_assignments (
            id,
            status,
            report_url,
            reviewer_remark,
            assigned_to,
            team_id,
            assigned_to_profile:profiles!job_assignments_assigned_to_fkey ( id, first_name, last_name ),
            teams ( id, name )
          )
        )
      `);

    const isNum = !isNaN(Number(identifier));
    if (isNum) {
      query = query.or(`uid_label.eq.${identifier},uid.eq.${Number(identifier)},id.eq.${identifier}`);
    } else {
      query = query.or(`uid_label.eq.${identifier},id.eq.${identifier}`);
    }

    const isSuper = isSuperAdmin(user.roles);
    if (!isSuper && user.branch_id) {
      query = query.eq("branch_id", user.branch_id);
    }

    const { data, error } = await query.maybeSingle();
    if (data) return data;

    // Fallback: Check if identifier is a job_entry_test id or test uid_label
    let testQuery = supabase
      .from("job_entry_tests")
      .select(`
        job_entry_id,
        job_entries!job_entry_tests_job_entry_id_fkey (
          *,
          branches ( id, name, code ),
          clients ( * ),
          job_entry_tests!job_entry_tests_job_entry_id_fkey (
            *,
            test_master ( * ),
            job_assignments (
              id,
              status,
              report_url,
              reviewer_remark,
              assigned_to,
              team_id,
              assigned_to_profile:profiles!job_assignments_assigned_to_fkey ( id, first_name, last_name ),
              teams ( id, name )
            )
          )
        )
      `)
      .or(`id.eq.${identifier},uid_label.eq.${identifier}`);

    if (!isSuper && user.branch_id) {
      testQuery = testQuery.eq("job_entries.branch_id", user.branch_id);
    }

    const { data: testData } = await testQuery.maybeSingle();
    if (testData?.job_entries) {
      return Array.isArray(testData.job_entries) ? testData.job_entries[0] : testData.job_entries;
    }

    return null;
  }

  static async getNextUid(): Promise<number> {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");

    const supabase = await createClient();
    const currentYear = new Date().getFullYear();

    const { data: counterData, error: counterError } = await supabase
      .from("lab_uid_counters")
      .select("counter_value")
      .eq("counter_name", "UID_NABL")
      .eq("counter_year", currentYear)
      .maybeSingle();

    if (!counterError && counterData) {
      return (counterData.counter_value || 0) + 1;
    }

    const { data: testsData } = await supabase
      .from("job_entry_tests")
      .select("uid_label")
      .not("uid_label", "is", null);

    let maxVal = 0;
    if (testsData) {
      for (const t of testsData) {
        if (t.uid_label && /^\d+$/.test(t.uid_label)) {
          const val = parseInt(t.uid_label, 10);
          if (val > maxVal) maxVal = val;
        }
      }
    }
    return maxVal + 1;
  }

  static async getJobCardDetailsForPdf(jobEntryTestId: string) {
    const supabase = await createClient();
    const { data: testData, error: testError } = await supabase
      .from("job_entry_tests")
      .select(`
        *,
        test_master (*),
        job_entries!job_entry_tests_job_entry_id_fkey (
          *,
          clients (*)
        )
      `)
      .eq("id", jobEntryTestId)
      .single();

    if (testError || !testData) {
      throw new Error("Job card not found");
    }

    const { data: allTests, error: allTestsError } = await supabase
      .from("job_entry_tests")
      .select(`
        *,
        test_master (*)
      `)
      .eq("job_entry_id", testData.job_entry_id)
      .eq("uid_label", testData.uid_label || '');

    const jobsToPass = allTests && !allTestsError ? allTests : [testData];
    const jobEntries = Array.isArray(testData.job_entries) ? testData.job_entries[0] : testData.job_entries;
    const client = (jobEntries as unknown as { clients?: Record<string, unknown> | null })?.clients;

    return {
      testData,
      jobsToPass,
      jobEntries,
      client,
    };
  }
}


