import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

export type TestResultRow = Database["public"]["Tables"]["test_results"]["Row"];
export type TestResultInsert = Database["public"]["Tables"]["test_results"]["Insert"];

export const TestResultService = {
  async listTestsForResults(branchId?: string | null) {
    const supabase = await createClient();
    let query = supabase
      .from("job_entry_tests")
      .select(`
        id,
        created_at,
        job_entries!job_entry_tests_job_entry_id_fkey ( id, uid, uid_label, branch_id ),
        test_master ( id, component_parameter, specific_test, is_nabl )
      `)
      .order("created_at", { ascending: false });

    if (branchId && branchId !== "all") {
      query = query.eq("job_entries.branch_id", branchId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("TestResultService.listTestsForResults error:", error);
      throw new Error("Failed to list tests for results");
    }
    return data || [];
  },

  async getResultRows(jobEntryTestId: string): Promise<TestResultRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("test_results")
      .select("id, job_entry_test_id, sr_no, id_mark, length_mm, width_mm, area_mm2, load_kn, strength_nmm2, particulars, result_value, specified_value, created_at, updated_at")
      .eq("job_entry_test_id", jobEntryTestId)
      .order("sr_no", { ascending: true });

    if (error) {
      console.error("TestResultService.getResultRows error:", error);
      throw new Error("Failed to retrieve test result rows");
    }
    return data || [];
  },

  async saveResultRows(jobEntryTestId: string, rows: Omit<TestResultInsert, "job_entry_test_id">[]) {
    const supabase = await createClient();

    // Delete existing rows for this test
    const { error: delError } = await supabase
      .from("test_results")
      .delete()
      .eq("job_entry_test_id", jobEntryTestId);

    if (delError) {
      console.error("TestResultService.saveResultRows delete error:", delError);
      throw new Error("Failed to clear previous test results");
    }

    // Insert new rows
    if (rows && rows.length > 0) {
      const rowsToInsert: TestResultInsert[] = rows.map((r) => {
        // Exclude 'id' so UUID autogeneration is preserved
        const rowObj = r as Record<string, unknown>;
        delete rowObj.id;
        return {
          ...r,
          job_entry_test_id: jobEntryTestId,
          updated_at: new Date().toISOString(),
        };
      });

      const { error: insError } = await supabase
        .from("test_results")
        .insert(rowsToInsert);

      if (insError) {
        console.error("TestResultService.saveResultRows insert error:", insError);
        throw new Error("Failed to save new test result rows");
      }
    }

    return true;
  },
};
