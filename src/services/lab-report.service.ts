import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserWithRoles } from "./auth.service";
import { canIssueLabReport } from "@/config/roles";

const REPORT_SELECT = `
  *,
  lab_report_lines (
    job_entry_test_id,
    job_entry_tests (
      id, material_description, date_of_testing, date_of_receiving, date_of_casting,
      testing_age, test_method, sample_quantity, ulr_number, qc_number, report_class,
      test_master (*),
      test_result_rows (*)
    )
  ),
  job_entries ( id, uid, clients (*) )
`;

export const LabReportService = {
  async ensureJobUid(jobEntryId: string) {
    const supabase = await createClient() as any;
    const { data, error } = await supabase.rpc("allocate_job_uid", { p_job_entry_id: jobEntryId });
    if (error) {
      const fallback = await supabase.rpc("ensure_job_uid", { p_job_id: jobEntryId });
      if (fallback.error) throw new Error(fallback.error.message);
      return fallback.data;
    }
    return data;
  },

  async issueForJob(jobEntryId: string) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    if (!canIssueLabReport(user.roles)) {
      throw new Error("Only Quality Manager, Technical Manager or Test Engineer may issue reports");
    }
    const supabase = await createClient() as any;
    const { data, error } = await supabase.rpc("issue_reports_for_job", {
      p_job_entry_id: jobEntryId,
      p_issued_by: user.id,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async getReportsForJob(jobEntryId: string) {
    const supabase = await createClient() as any;
    const { data, error } = await supabase.from("lab_reports").select(REPORT_SELECT).eq("job_entry_id", jobEntryId).order("issued_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  },

  async getReport(reportId: string) {
    const supabase = await createClient() as any;
    const { data, error } = await supabase.from("lab_reports").select(REPORT_SELECT).eq("id", reportId).single();
    if (error) throw new Error(error.message);
    return data;
  },
};
