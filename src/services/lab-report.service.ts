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

import { Database } from "@/types/database";

type LabReportRow = Database["public"]["Tables"]["lab_reports"]["Row"] & {
  lab_report_lines?: unknown[];
  job_entries?: unknown;
};

interface GenericRpcClient {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
  from: (table: string) => {
    select: (query: string) => {
      eq: (col: string, val: unknown) => {
        order: (col: string, opts?: { ascending?: boolean }) => Promise<{ data: LabReportRow[] | null; error: { message: string } | null }>;
        single: () => Promise<{ data: LabReportRow | null; error: { message: string } | null }>;
      };
    };
  };
}

export const LabReportService = {
  async ensureJobUid(jobEntryId: string) {
    const rawSupabase = await createClient();
    const supabase = (rawSupabase as unknown) as GenericRpcClient;
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
    const rawSupabase = await createClient();
    const supabase = (rawSupabase as unknown) as GenericRpcClient;
    const { data, error } = await supabase.rpc("issue_reports_for_job", {
      p_job_entry_id: jobEntryId,
      p_issued_by: user.id,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async getReportsForJob(jobEntryId: string): Promise<LabReportRow[]> {
    const rawSupabase = await createClient();
    const supabase = (rawSupabase as unknown) as GenericRpcClient;
    const { data, error } = await supabase.from("lab_reports").select(REPORT_SELECT).eq("job_entry_id", jobEntryId).order("issued_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getReport(reportId: string): Promise<LabReportRow | null> {
    const rawSupabase = await createClient();
    const supabase = (rawSupabase as unknown) as GenericRpcClient;
    const { data, error } = await supabase.from("lab_reports").select(REPORT_SELECT).eq("id", reportId).single();
    if (error) throw new Error(error.message);
    return data;
  },
};
