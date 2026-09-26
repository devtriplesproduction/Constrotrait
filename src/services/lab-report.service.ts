import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserWithRoles } from "./auth.service";
import { canManageClientsAndJobs } from "@/config/roles";

export const LabReportService = {
  async ensureJobUid(jobEntryId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("ensure_job_uid", {
      p_job_id: jobEntryId,
    });
    if (error) throw new Error(error.message);
    return data as number;
  },

  async issueForJob(jobEntryId: string) {
    const user = await getAuthenticatedUserWithRoles();
    if (!user) throw new Error("Unauthorized");
    if (!canManageClientsAndJobs(user.roles)) throw new Error("Unauthorized");

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("issue_reports_for_job", {
      p_job_entry_id: jobEntryId,
      p_issued_by: user.id,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async getReportsForJob(jobEntryId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lab_reports")
      .select(`
        *,
        lab_report_lines (
          job_entry_test_id,
          job_entry_tests (
            id,
            material_description,
            date_of_testing,
            date_of_receiving,
            date_of_casting,
            testing_age,
            test_method,
            sample_quantity,
            ulr_number,
            qc_number,
            report_class,
            test_master (*)
          )
        ),
        job_entries (
          id,
          uid,
          clients (*)
        )
      `)
      .eq("job_entry_id", jobEntryId)
      .order("issued_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  },

  async getReport(reportId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lab_reports")
      .select(`
        *,
        lab_report_lines (
          job_entry_test_id,
          job_entry_tests (
            id,
            material_description,
            date_of_testing,
            date_of_receiving,
            date_of_casting,
            testing_age,
            test_method,
            sample_quantity,
            ulr_number,
            qc_number,
            report_class,
            test_master (*)
          )
        ),
        job_entries (
          id,
          uid,
          clients (*)
        )
      `)
      .eq("id", reportId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
};
