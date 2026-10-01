"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function listTestsForResultsAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_entry_tests")
    .select(`
      id,
      job_entries!job_entry_tests_job_entry_id_fkey(uid, uid_label),
      test_master(id, component_parameter, specific_test, is_nabl)
    `)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getResultRowsAction(jobEntryTestId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("test_results")
    .select("*")
    .eq("job_entry_test_id", jobEntryTestId)
    .order("sr_no", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function saveResultRowsAction(jobEntryTestId: string, rows: any[]) {
  const supabase = await createClient();

  // First delete existing rows for this test
  const { error: delError } = await supabase
    .from("test_results")
    .delete()
    .eq("job_entry_test_id", jobEntryTestId);

  if (delError) return { success: false, error: delError.message };

  // Insert new rows
  if (rows && rows.length > 0) {
    const { error: insError } = await supabase
      .from("test_results")
      .insert(rows.map(r => {
        // Remove 'id' if it's there so we don't conflict with UUID autogeneration on re-inserts
        const { id, ...rest } = r; 
        return { ...rest, job_entry_test_id: jobEntryTestId };
      }));

    if (insError) return { success: false, error: insError.message };
  }
  
  revalidatePath("/results");
  return { success: true };
}
