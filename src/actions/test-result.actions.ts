"use server";

import { TestResultRow } from "@/types/lims";
import { createClient } from "@/lib/supabase/server";

export async function getResultRowsAction(testId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("test_result_rows")
      .select("*")
      .eq("job_entry_test_id", testId)
      .order("sr_no", { ascending: true });

    if (error) {
      console.warn("Could not fetch test result rows:", error);
      return { success: true, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveResultRowsAction(testId: string, rows: TestResultRow[]) {
  try {
    const supabase = await createClient();

    // delete existing
    await supabase
      .from("test_result_rows")
      .delete()
      .eq("job_entry_test_id", testId);

    if (rows.length > 0) {
      const { error } = await supabase.from("test_result_rows").insert(rows);
      if (error) {
        console.warn("Could not insert test result rows:", error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function listTestsForResultsAction() {
  try {
    const supabase = await createClient();
    // Fetch tests that require results entry. 
    // Usually these are from `job_entry_tests` where some condition is met, joined with job_entries and test_master
    const { data, error } = await supabase
      .from("job_entry_tests")
      .select(`
        id,
        job_entries (
          uid,
          uid_label
        ),
        test_master (
          specific_test,
          component_parameter,
          is_nabl
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Could not fetch list of tests for results:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
