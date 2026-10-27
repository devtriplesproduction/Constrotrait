import { createClient } from "@/lib/supabase/server";
import { canManageJobAssignments, isHR, isTestEngineer, isSuperAdmin } from "@/config/roles";
import { compareJobCardsByUidRecentFirst } from "@/utils/uid-sort";

const TEST_SELECT = `
  id,
  job_entry_id,
  uid_label,
  ulr_number,
  ulr_status,
  ulr_generated_at,
  qc_number,
  report_class,
  date_of_casting,
  date_of_receiving,
  date_of_testing,
  testing_age,
  testing_day,
  grade,
  sample_quantity,
  material_description,
  material_details_location,
  test_method,
  additional_details_values,
  sample_code_no:additional_details_values->>sample_code_no,
  test_master ( component_parameter, specific_test, test_method, category, is_nabl, datasheet_qr, material_product, sample_size ),
  job_entries!job_entry_tests_job_entry_id_fkey ( 
    id, uid, uid_label, created_at, inward_on, branch_id, client_id,
    division, agency, project_name, dispatch_name, dispatch_address,
    collected_by, invoice_no, invoice_date, letter_reference, payment_status, is_nabl,
    clients ( id, name, company_name, email, mobile, address, gst_no, branch_id, site_name, contact_person ),
    branches ( id, name, code )
  )
`;

export class JobAssignmentService {
  private static async checkViewPermission(supabase: any) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("roles")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) throw new Error("Failed to verify permissions");
    const roles = profile.roles || [];
    if (!canManageJobAssignments(roles) && !isHR(roles) && !isTestEngineer(roles)) {
      throw new Error("Insufficient permissions to view job assignments");
    }
    return user;
  }

  private static async checkPermission(supabase: any) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("roles")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) throw new Error("Failed to verify permissions");
    if (!canManageJobAssignments(profile.roles)) {
      throw new Error("Insufficient permissions to manage job assignments");
    }
    return user;
  }

  static async getUnassignedJobCards(branchId?: string) {
    const supabase = await createClient();
    const user = await this.checkPermission(supabase);
    const { data: profile } = await supabase.from("profiles").select("roles, branch_id").eq("id", user.id).single();
    const isSuper = isSuperAdmin(profile?.roles);

    let query = supabase
      .from("job_entry_tests")
      .select(`
        id, job_entry_id, date_of_testing, uid_label, test_master_id,
        test_master:test_master_id ( component_parameter, specific_test, category, is_nabl ),
        job_entries!job_entry_tests_job_entry_id_fkey!inner ( id, uid, uid_label, branch_id, branches ( id, name, code ) )
      `);

    if (isSuper) {
      if (branchId && branchId !== "all") {
        query = query.eq("job_entries.branch_id", branchId);
      }
    } else {
      if (profile?.branch_id) {
        query = query.eq("job_entries.branch_id", profile.branch_id);
      } else {
        return [];
      }
    }

    const { data: tests, error: testsErr } = await query;
    if (testsErr) throw new Error(testsErr.message);

    const { data: assignments, error: asgnErr } = await supabase
      .from("job_assignments")
      .select("job_entry_test_id");
    if (asgnErr) throw new Error(asgnErr.message);

    const assignedIds = new Set(assignments.map((a: any) => a.job_entry_test_id));
    return (tests || []).filter((test: any) => !assignedIds.has(test.id)).sort(compareJobCardsByUidRecentFirst);
  }

  static async getAssignments(filters?: { team_id?: string; employee_id?: string; status?: string; branch_id?: string }) {
    const supabase = await createClient();
    const user = await this.checkViewPermission(supabase);
    const { data: profile } = await supabase.from("profiles").select("roles, branch_id").eq("id", user.id).single();
    
    let query = supabase
      .from("job_assignments")
      .select(`
        *,
        job_entry_tests!inner ( ${TEST_SELECT} ),
        teams ( id, name, branch_id, team_members(employee_id) ),
        assigned_to_profile:profiles!job_assignments_assigned_to_fkey ( id, first_name, last_name, branch_id ),
        assigned_by_profile:profiles!job_assignments_assigned_by_fkey ( id, first_name, last_name, branch_id ),
        branches ( id, name, code )
      `)
      .order("created_at", { ascending: false });
      
    if (filters?.team_id) query = query.eq("team_id", filters.team_id);
    if (filters?.employee_id) query = query.eq("assigned_to", filters.employee_id);
    if (filters?.status) query = query.eq("status", filters.status);
    
    const isSuper = isSuperAdmin(profile?.roles);
    if (isSuper) {
      if (filters?.branch_id && filters.branch_id !== "all") {
        query = query.eq("branch_id", filters.branch_id);
      }
    } else {
      if (profile?.branch_id) {
        query = query.eq("branch_id", profile.branch_id);
      } else {
        return [];
      }
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    
    return (data || []).sort(compareJobCardsByUidRecentFirst);
  }

  static async getAssignmentById(id: string) {
    const supabase = await createClient();
    await this.checkViewPermission(supabase);
    
    const { data, error } = await supabase
      .from("job_assignments")
      .select(`
        *,
        job_entry_tests!inner ( ${TEST_SELECT} ),
        teams ( id, name, branch_id, team_members(employee_id) ),
        assigned_to_profile:profiles!job_assignments_assigned_to_fkey ( id, first_name, last_name, branch_id ),
        assigned_by_profile:profiles!job_assignments_assigned_by_fkey ( id, first_name, last_name, branch_id ),
        branches ( id, name, code )
      `)
      .eq("id", id)
      .single();
      
    if (error) throw new Error(error.message);
    return data;
  }

  static async getRelatedAssignmentsAndTests(jobEntryId: string) {
    const supabase = await createClient();
    await this.checkViewPermission(supabase);

    const [{ data: assignments, error: asgnError }, { data: tests, error: testsError }] = await Promise.all([
      supabase
        .from("job_assignments")
        .select(`
          *,
          job_entry_tests!inner (
            id, job_entry_id, test_master ( component_parameter, specific_test, test_method )
          )
        `)
        .eq("job_entry_tests.job_entry_id", jobEntryId),
      supabase
        .from("job_entry_tests")
        .select(`
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
        `)
        .eq("job_entry_id", jobEntryId)
        .order("created_at", { ascending: true })
    ]);

    if (asgnError) {
      console.error("Error fetching related assignments:", asgnError);
    }
    if (testsError) {
      console.error("Error fetching related tests:", testsError);
    }

    return {
      assignments: assignments || [],
      tests: tests || []
    };
  }

  static async getTestsDueToday(userId: string) {
    const supabase = await createClient();
    const { data: userTeams } = await supabase.from("team_members").select("team_id").eq("employee_id", userId);
    const teamIds = (userTeams || []).map((t: { team_id: string }) => t.team_id).filter(Boolean);

    const todayStr = new Date().toISOString().split("T")[0];

    let query = supabase
      .from("job_assignments")
      .select(`
        id,
        status,
        due_date,
        job_entry_tests!inner (
          id,
          uid_label,
          date_of_testing,
          material_description,
          test_master ( component_parameter, specific_test ),
          job_entries!job_entry_tests_job_entry_id_fkey (
            id,
            project_name,
            clients ( name )
          )
        )
      `)
      .not("status", "in", '("approved","completed")');

    if (teamIds.length > 0) {
      query = query.or(`assigned_to.eq.${userId},team_id.in.(${teamIds.join(",")})`);
    } else {
      query = query.eq("assigned_to", userId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("getTestsDueToday error:", error);
      return [];
    }

    return (data || []).filter((a: any) => {
      const testDate = a.job_entry_tests?.date_of_testing || a.due_date;
      return testDate && testDate <= todayStr;
    });
  }

  static async getMyAssignments(_userId?: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");
    const { data: userTeams } = await supabase.from("team_members").select("team_id").eq("employee_id", user.id);
    const teamIds = userTeams?.map((t: any) => t.team_id) || [];
    let query = supabase
      .from("job_assignments")
      .select(`
        *,
        job_entry_tests!inner ( ${TEST_SELECT} ),
        teams ( id, name, team_members(employee_id) ),
        assigned_to_profile:profiles!job_assignments_assigned_to_fkey ( id, first_name, last_name ),
        assigned_by_profile:profiles!job_assignments_assigned_by_fkey ( id, first_name, last_name ),
        branches ( id, name, code )
      `)
      .order("created_at", { ascending: false });
    if (teamIds.length > 0) query = query.or(`assigned_to.eq.${user.id},team_id.in.(${teamIds.join(",")})`);
    else query = query.eq("assigned_to", user.id);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).sort(compareJobCardsByUidRecentFirst);
  }

  static async assignJobCard(data: {
    job_entry_test_id: string;
    team_id?: string;
    assigned_to?: string;
    due_date?: string;
    notes?: string;
    branch_id?: string;
  }) {
    const supabase = await createClient();
    const user = await this.checkPermission(supabase);
    if (!data.team_id && !data.assigned_to) {
      throw new Error("Must provide either a team_id or an assigned_to employee.");
    }

    const actualJobEntryTestId = data.job_entry_test_id;

    const { data: testRow, error: testErr } = await supabase
      .from("job_entry_tests")
      .select("id, job_entry_id, job_entries!job_entry_tests_job_entry_id_fkey!inner ( id, branch_id )")
      .eq("id", actualJobEntryTestId)
      .single();
    if (testErr || !testRow) throw new Error("Job card test not found");

    const jobBranchId = (testRow as any)?.job_entries?.branch_id || data.branch_id;

    const { data: existing, error: existingError } = await supabase
      .from("job_assignments").select("id").eq("job_entry_test_id", actualJobEntryTestId).maybeSingle();
    if (existingError) throw new Error("Error checking existing assignments");

    const payload = {
      team_id: data.team_id || null,
      assigned_to: data.assigned_to || null,
      assigned_by: user.id,
      branch_id: jobBranchId,
      due_date: data.due_date,
      notes: data.notes,
      status: "assigned",
    };

    if (existing) {
      const { data: updated, error } = await supabase.from("job_assignments")
        .update({ ...payload, updated_at: new Date().toISOString() }).eq("id", existing.id).select().single();
      if (error) throw new Error(error.message);
      return updated;
    }

    const { data: inserted, error } = await supabase.from("job_assignments")
      .insert([{ job_entry_test_id: actualJobEntryTestId, ...payload }]).select().single();
    if (error) throw new Error(error.message);
    return inserted;
  }

  static async updateAssignmentStatus(id: string, status: string, payload?: { report_url?: string; reviewer_remark?: string }) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");
    const { data: profile, error: profileError } = await supabase.from("profiles").select("roles").eq("id", user.id).single();
    if (profileError || !profile) throw new Error("Failed to verify permissions");
    const isManager = canManageJobAssignments(profile.roles);
    const { data: assignment, error: assignmentError } = await supabase
      .from("job_assignments")
      .select("*, teams(team_members(employee_id)), job_entry_tests ( id, job_entry_id )")
      .eq("id", id).single();
    if (assignmentError || !assignment) throw new Error("Assignment not found");
    let canUpdate = isManager;
    if (!canUpdate) {
      if (assignment.assigned_to === user.id) canUpdate = true;
      else if (assignment.teams?.team_members?.some((m: any) => m.employee_id === user.id)) canUpdate = true;
    }
    if (!canUpdate) throw new Error("Insufficient permissions to update this assignment");

    const { canTransition } = await import("@/config/jobTransitions");
    
    let actualStatus = status;
    if (status === 'report_uploaded' && payload?.report_url) {
      actualStatus = 'in_review';
    }

    if (!canTransition(assignment.status as any, actualStatus as any, profile.roles)) {
      throw new Error(`Invalid state transition from ${assignment.status} to ${actualStatus}`);
    }
    
    if (actualStatus === 'rejected' && (!payload?.reviewer_remark || payload.reviewer_remark.trim() === '')) {
      throw new Error("A reviewer remark is required when rejecting a job.");
    }
    
    const updateData: any = { status: actualStatus };
    if (payload?.report_url !== undefined) updateData.report_url = payload.report_url;
    if (payload?.reviewer_remark !== undefined) updateData.reviewer_remark = payload.reviewer_remark;

    const { data, error } = await supabase.from("job_assignments").update(updateData).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async deleteAssignment(id: string) {
    const supabase = await createClient();
    const user = await this.checkPermission(supabase);
    
    const { error } = await supabase.from("job_assignments").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  }
}
